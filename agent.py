import asyncio
import logging
import os
import json
import time
import tempfile
import threading
from pathlib import Path
from dotenv import load_dotenv
import aiohttp

# ── Load .env immediately — layer singletons read env vars at import time ─────
_root_dir = Path(__file__).resolve().parent
for _ep in (_root_dir / "backend" / ".env.local", _root_dir / ".env.local", _root_dir / ".env"):
    if _ep.exists():
        load_dotenv(_ep, override=True)

# ── 3-Layer speech architecture ───────────────────────────────────────────────
try:
    from layers.layer1_prerecorded import prerecorded as _layer1
    from layers.layer2_fillers import filler_layer as _layer2
    _HAS_LAYERS = True
except ImportError:
    _HAS_LAYERS = False

# ── Latency tracker ────────────────────────────────────────────────────────────
try:
    from latency.tracker import tracker as _latency_tracker
    _HAS_LATENCY = True
except ImportError:
    _HAS_LATENCY = False

# ── Transcription validator ────────────────────────────────────────────────────
try:
    from transcription.validator import validate as _validate_transcript, broadcast_transcript
    _HAS_TRANSCRIPTION = True
except ImportError:
    _HAS_TRANSCRIPTION = False

# ---------------------------------------------------------------------------
# Concurrent call limiter — cross-process safe via fcntl (Linux/Railway).
# Falls back to in-process threading.Lock only (sufficient for single-process
# deployments or Windows dev machines).
# ---------------------------------------------------------------------------
try:
    import fcntl as _fcntl
    _HAS_FCNTL = True
except ImportError:
    _HAS_FCNTL = False  # Windows

_SLOTS_FILE = Path(tempfile.gettempdir()) / "voice_agent_active_calls"
_slots_thread_lock = threading.Lock()


def _get_int_env_early(name: str, default: int) -> int:
    """Read an int env var before _get_int_env is defined."""
    try:
        return int(os.getenv(name, str(default)).strip())
    except ValueError:
        return default


MAX_CONCURRENT_CALLS: int = _get_int_env_early("MAX_CONCURRENT_CALLS", 3)


def _slots_read_write(increment: int) -> tuple[int, bool]:
    """
    Atomically read the active-call count, optionally increment it, and write back.

    increment=+1 → try to acquire a slot; returns (new_count, acquired).
    increment=-1 → release a slot; returns (new_count, True always).
    increment=0  → read only; returns (count, True always).

    The file stores a plain ASCII integer. fcntl.LOCK_EX provides cross-process
    atomicity on Linux; the threading.Lock guards in-process races on all platforms.
    """
    with _slots_thread_lock:
        try:
            f = open(_SLOTS_FILE, "a+b")
            try:
                if _HAS_FCNTL:
                    _fcntl.flock(f, _fcntl.LOCK_EX)
                f.seek(0)
                raw = f.read().strip()
                count = int(raw) if raw else 0

                if increment == 1:
                    if count >= MAX_CONCURRENT_CALLS:
                        return count, False
                    count += 1
                elif increment == -1:
                    count = max(0, count - 1)

                f.seek(0)
                f.truncate()
                f.write(str(count).encode())
                f.flush()
                return count, True
            finally:
                f.close()
        except Exception as exc:
            logging.getLogger("outbound-agent").warning(
                "Call slot file error: %s", exc
            )
            return 0, True  # fail open: allow call if counter is broken


def _try_acquire_call_slot() -> bool:
    """Return True if a slot was acquired (active calls < MAX_CONCURRENT_CALLS)."""
    _, acquired = _slots_read_write(+1)
    return acquired


def _release_call_slot() -> None:
    """Decrement the active-call counter."""
    _slots_read_write(-1)

# Agent conversation script — edit scripts/agent_script.py to change call flow.
# Loaded at startup so Railway/Docker deployments don't need scripts/ on sys.path.
_SCRIPTS_DIR = Path(__file__).resolve().parent / "scripts" / "agent_script.py"
if _SCRIPTS_DIR.exists():
    _ns: dict = {}
    exec(_SCRIPTS_DIR.read_text(encoding="utf-8"), _ns)
    AGENT_SCRIPT: str = _ns["AGENT_SCRIPT"]
else:
    # Fallback: inline copy so the agent still starts if the file is missing.
    # Keep this in sync with scripts/agent_script.py.
    AGENT_SCRIPT = """
You are {agent_name}, a polite and professional real estate calling assistant from {company}.

═══════════════════════════════════════════════════════════
CRITICAL RULES — read these before every reply
═══════════════════════════════════════════════════════════

RULE 1 — NOISE FILTERING (most important rule):
Telephone calls from India produce carrier line artefacts. These are NOT user
speech. Produce ZERO output for any of the following — no filler word, no
acknowledgment, no question. Absolute silence. Continue as if that turn
never happened.

Noise type A — marker tokens (always noise, regardless of surrounding text):
  <noise>   <crosstalk>   <inaudible>   <silence>

Noise type B — punctuation-only turns (no letters or digits at all):
  "."   ".."   "..."   "!"   "?"   or any turn containing zero letters/digits.

Noise type C — wrong-script tokens (carrier audio transcribed as foreign text):
  Bengali, Telugu, Tamil, Thai, Malayalam, Kannada, Cyrillic, Arabic.
  If a user turn contains ONLY characters from one of these scripts, ignore it.

Noise type D — carrier announcements (automated recordings, not the caller):
  Short phrases like "टाइम ऑन टाइम", "this call is being recorded",
  "please hold", or similar automated messages. Ignore silently.

ALLOWED scripts (real user speech to respond to):
  Devanagari (Hindi): नमस्ते   हाँ   ठीक है
  Latin (English / Hinglish): "okay haan"   "yes"   "flat chahiye"

RULE 2 — CONVERSATION MEMORY (never re-ask):
You MUST remember everything the caller has said in this conversation.
Track what has been confirmed:
  • If caller said ANYTHING after the greeting (even just "Hello", "Haan", "Ji",
    "Yes", "Okay") → availability is confirmed, do NOT ask again, go to Step 2
  • If caller gave property type → do NOT ask again, move to Step 3
  • If caller gave location → do NOT ask again, move to Step 4
  • If caller gave budget → do NOT ask again, move to Step 5

RULE 3 — ONE QUESTION PER REPLY:
Ask only one question at a time. Never combine two questions.

RULE 4 — SHORT REPLIES:
Every reply must be 1-2 short sentences. This is a phone call.

RULE 5 — LANGUAGE:
Default language: Hindi or Hinglish (Hindi + English mix). Always start and stay
in Hindi/Hinglish unless the caller speaks multiple full English sentences in a row.
A single English word or short phrase like "Hello", "Yes", "Okay", "fine", "good"
does NOT mean the caller wants English — respond in Hindi/Hinglish.
Only switch fully to English if the caller speaks 2+ consecutive full English sentences.
Occasionally use a natural filler word to start a reply (e.g. "Achha," "Bilkul,")
but do NOT force it on every response — it sounds robotic.

RULE 6 — IDENTITY:
NEVER say you are an AI, bot, or virtual assistant.
You are {agent_name}, a real person from {company}.

RULE 7 — CLARIFICATION (only for genuinely unclear real speech):
Only ask "Aap thoda dobara bol sakte hain?" if the caller's Hindi/English
utterance was genuinely inaudible. NEVER ask this for noise-type tokens.
After asking clarification ONCE, wait for the caller to respond before doing
anything else — do NOT auto-advance to the next step on noise/silence.
If clarification is asked and the caller's next response is ALSO noise or
inaudible, do NOT ask again. Return silently to waiting for a real answer
to the original question.

RULE 8 — NO REPEAT GREETING:
The system delivers the Step 1 greeting. If the caller speaks BEFORE or DURING
the greeting (you see a user message while you were supposed to be saying Step 1),
that is an interruption. Do NOT repeat "Namaste". Ask ONLY:
  "Kya abhi aapka thoda time hai?" and wait.
If the caller speaks AFTER the greeting is done (greeting is in your history),
treat their response per Step 2.
  • Never jump to Step 2 without the caller having answered the availability question.

RULE 9 — NEVER ADVANCE ON NOISE:
Only move to the next step when the caller gives a clear, real answer.
Noise tokens, marker tokens, punctuation-only turns, and silence do NOT count
as answers. If only noise arrives after a question, stay on that question and
wait silently. Do not re-ask the question either — just wait.

RULE 10 — CALL CLOSE:
After Step 6, if the caller has no more questions, say a warm goodbye:
  "Bahut bahut dhanyavaad! Aapka din shubh ho. Namaste!"
Then the call ends. Do NOT continue asking questions after Step 6.

═══════════════════════════════════════════════════════════
CALL FLOW — follow steps in order
═══════════════════════════════════════════════════════════

Step 1 — Opening greeting (say WORD FOR WORD, in Hindi):
  "Namaste, mera naam {agent_name} hai aur main {company} se bol rahi hoon. Kya abhi aapka thoda time hai?"

Step 2 — After caller answers "Kya abhi aapka thoda time hai?" with YES:
  Any positive answer ("Haan", "Ji", "Ha", "Yes", "Okay", "Hello", "Fine", "Bol",
  "Boliye", or any similar positive/neutral response) = YES, move to:
  Hindi:   "Bahut achha! Aap kaise property mein interested hain?"
  English: "Great! What kind of property are you looking for?"
  Only if caller EXPLICITLY says "abhi nahi", "baad mein", "busy hoon", or "not now":
  → "Koi baat nahi. Main aapko kab call back kar sakti hoon?"

Step 3 — After property type is given, ask location:
  Hindi:   "Achha, aap kaunse city ya area mein property dhundh rahe hain?"
  English: "Got it. Which city or area are you looking in?"

Step 4 — After location is given, ask budget:
  Hindi:   "Theek hai, aur aapka approximate budget kya hai?"
  English: "Sure, and what is your approximate budget?"

Step 5 — After budget is given, ask sub-type:
  Hindi:   "Bilkul. Flat, villa, plot, ya commercial space — kya prefer karenge?"
  English: "Right. Would you prefer a flat, villa, plot, or commercial space?"

Step 6 — After all details collected:
  Say: "Dhanyavaad! Main aapko jald hi suitable property options share karungi."
  Then wait for caller to say anything. If they have a question, answer it briefly.
  Then say: "Bahut bahut dhanyavaad aapka! Aapka din shubh ho. Namaste!"
  End the call (per RULE 10).

Step 7 — If not interested at any point:
  "Theek hai, aapka samay dene ke liye shukriya. Aapka din shubh rahe!"
  Then end the call (per RULE 10).

═══════════════════════════════════════════════════════════
FILLER WORDS (optional — use naturally, not on every reply)
═══════════════════════════════════════════════════════════
  Hindi:   "Haan ji," / "Achha," / "Bilkul," / "Theek hai,"
  English: "Right," / "Got it," / "Sure," / "I see,"

TRANSFER: Use transfer_call ONLY if caller clearly says "transfer me" or
"connect me to an agent". Never transfer on noisy or ambiguous input.
"""

from livekit import agents, api
from livekit.agents import AgentSession, Agent
from livekit.agents.voice.room_io import RoomOptions, AudioInputOptions
from livekit.plugins import (
    openai as lk_openai,
    noise_cancellation,
)
# Register Deepgram + Silero on the main thread (livekit-agents requirement).
try:
    from livekit.plugins import deepgram as _lk_deepgram  # noqa: F401
    from livekit.plugins import silero as _lk_silero      # noqa: F401
except ImportError:
    pass
from livekit.agents import llm
from typing import Optional

# ── Pipeline services (Deepgram STT + Sarvam TTS) ─────────────────────────────
try:
    from services.sarvam_tts import SarvamTTS
    from services.audio_pipeline import build_pipeline
    _HAS_PIPELINE_SERVICES = True
except ImportError as _pipeline_err:
    _HAS_PIPELINE_SERVICES = False
    logging.getLogger("outbound-agent").warning(
        "Pipeline services not available (%s). Falling back to OpenAI Realtime.",
        _pipeline_err,
    )

# Load environment variables
def load_environment() -> None:
    """Load env files with project-local values taking precedence."""
    root_dir = Path(__file__).resolve().parent
    # Load broader/default files first, then override with local project env.
    for env_path in (root_dir / "backend" / ".env.local", root_dir / ".env.local", root_dir / ".env"):
        if env_path.exists():
            load_dotenv(env_path, override=True)


load_environment()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("outbound-agent")


# TRUNK ID - This needs to be set after you crate your trunk
# You can find this by running 'python setup_trunk.py --list' or checking LiveKit Dashboard
OUTBOUND_TRUNK_ID = os.getenv("OUTBOUND_TRUNK_ID")

# In-process cache for resolved non-direct trunk IDs (name/number lookup).
# Avoids a LiveKit list_outbound_trunk API round-trip (100-300ms) on every call.
# Credential sync via _sync_trunk_credentials still runs separately per call.
_trunk_id_cache: dict[str, tuple[str, float]] = {}
_TRUNK_CACHE_TTL = float(os.getenv("TRUNK_CACHE_TTL_SEC", "3600"))
_trunk_cache_lock = threading.Lock()


def _normalize_domain(value: str | None) -> str | None:
    """Normalize SIP URI/domain to plain host portion."""
    if not value:
        return None
    domain = value.strip()
    if domain.startswith("sip:"):
        domain = domain[4:]
    if "@" in domain:
        domain = domain.split("@", 1)[1]
    return domain.strip()


# For SIP transfer destinations, prefer provider domain (VoBiz), not LiveKit SIP URI.
SIP_DOMAIN = _normalize_domain(os.getenv("VOBIZ_SIP_DOMAIN") or os.getenv("LIVEKIT_SIP_URI"))


def _is_trunk_id(value: str | None) -> bool:
    return bool(value and value.startswith("ST_"))


def _get_float_env(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        logger.warning(f"Invalid float for {name}='{raw}', using default {default}")
        return default


def _get_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        logger.warning(f"Invalid int for {name}='{raw}', using default {default}")
        return default


def _get_bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    if raw in {"1", "true", "yes", "on"}:
        return True
    if raw in {"0", "false", "no", "off"}:
        return False
    logger.warning(f"Invalid bool for {name}='{raw}', using default {default}")
    return default


def _get_default_language() -> str:
    return os.getenv("AGENT_DEFAULT_LANGUAGE", "hi").strip().lower() or "hi"


def _get_realtime_language_code() -> str:
    language = _get_default_language()
    return {
        "hi": "hi-IN",
        "en": "en-US",
    }.get(language, language)


def _validate_runtime_provider_keys() -> bool:
    ok = True
    openai_key  = os.getenv("OPENAI_API_KEY",  "").strip()
    deepgram_key = os.getenv("DEEPGRAM_API_KEY", "").strip()
    sarvam_key   = os.getenv("SARVAM_API_KEY",   "").strip()

    if not openai_key:
        logger.error("OPENAI_API_KEY is missing — LLM will fail.")
        ok = False
    if not deepgram_key:
        logger.warning("DEEPGRAM_API_KEY is missing — STT will fail.")
        ok = False
    if not sarvam_key:
        logger.warning("SARVAM_API_KEY is missing — TTS will fail.")
        ok = False
    return ok


def _repair_mojibake(value: str | None) -> str | None:
    """Repair common UTF-8 text that was mis-decoded as latin-1/cp1252."""
    if not value:
        return value
    text = value.strip()
    if not text or ("à" not in text and "Ã" not in text):
        return text
    for encoding in ("latin-1", "cp1252"):
        try:
            repaired = text.encode(encoding).decode("utf-8")
            if repaired:
                return repaired
        except UnicodeError:
            continue
    return text


def _default_first_message(agent_name: str, company: str, language: str) -> str:
    if language == "hi":
        return f"Namaste, main {agent_name} {company} se bol rahi hoon. Kya abhi baat karna theek rahega?"
    return f"Hello, this is {agent_name} from {company}. Can you hear me?"


def _default_reprompt(language: str) -> str:
    if language == "hi":
        return "Hello? Kya aap wahan hain? Kya aap mujhe sun pa rahe hain?"
    return "Hello? Are you still there? Can you hear me?"


# Carrier auto-announcement phrases spoken by the telephony provider — NOT real user
# speech. Filtering these prevents the watchdog / reprompt from firing prematurely.
_CARRIER_PHRASES: frozenset[str] = frozenset([
    "this call is now being recorded",
    "this call may be recorded",
    "this call is being recorded",
    "call is being recorded",
    "call may be recorded",
    "we are going to",
    "we are going to record",
    "we will be recording",
    "this call will be recorded",
    "call is recorded",
    "yah call record ki ja rahi hai",
    "yeh call record ki ja rahi hai",
    "is call ko record kiya ja raha hai",
    "is call ki recording",
])


def _is_carrier_announcement(text: str) -> bool:
    lower = text.lower().strip()
    # Full match: text contains a complete carrier phrase
    if any(phrase in lower for phrase in _CARRIER_PHRASES):
        return True
    # Prefix match: text is the beginning of a known carrier phrase
    # e.g. "This" is a prefix of "this call is now being recorded"
    if any(phrase.startswith(lower + " ") for phrase in _CARRIER_PHRASES):
        return True
    return False


def _is_stt_noise_token(text: str) -> bool:
    """Return True for unambiguous STT artifacts that are never real speech.

    Case 1: Literal engine markers  — <noise>, <crosstalk>, <inaudible>, etc.
    Case 2: Punctuation/symbol-only — ".", "...", "!" etc. (zero letters/digits).
    """
    stripped = text.strip()
    if not stripped:
        return True
    # Case 1: literal noise markers emitted by the STT engine
    if (
        stripped.startswith("<")
        and stripped.endswith(">")
        and len(stripped) <= 30
        and " " not in stripped
    ):
        return True
    # Case 2: no alphanumeric characters at all — cannot be speech
    if not any(c.isalnum() for c in stripped):
        return True
    return False


def _is_foreign_script(text: str) -> bool:
    """Return True when every alphabetic character is outside Latin + Devanagari.

    Used to classify carrier-line artefacts that appear as foreign-script words
    (Telugu, Arabic, Cyrillic, Malayalam, Tamil, Thai, etc.) without hard-blocking
    them from Gemini's context. Tokens that pass this check are handed to Gemini
    but do NOT reset the silence / reprompt timers, so the 7-second no-speech
    reprompt still fires when only carrier noise is present.
    """
    stripped = text.strip()
    alpha_chars = [c for c in stripped if c.isalpha()]
    if not alpha_chars:
        return False  # no alpha → handled by _is_stt_noise_token already
    def _is_expected(c: str) -> bool:
        cp = ord(c)
        return cp <= 0x024F or 0x0900 <= cp <= 0x097F   # Latin + Devanagari
    return all(not _is_expected(c) for c in alpha_chars)


def _safe_log_text(value: str, limit: int = 200) -> str:
    """Escape unicode for Windows terminals that still default to cp1252."""
    return value[:limit].encode("unicode_escape").decode("ascii")


def _normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    phone = value.strip().replace(" ", "").replace("-", "")
    if not phone:
        return None
    if phone.startswith("+"):
        return phone
    return f"+{phone}"


def _get_vobiz_trunk_config() -> tuple[str | None, str | None, str | None, str | None]:
    """Return (sip_domain, auth_id, auth_token, caller_id) from env."""
    sip_domain = _normalize_domain(os.getenv("VOBIZ_SIP_DOMAIN"))
    auth_id = (os.getenv("VOBIZ_AUTH_ID") or os.getenv("VOBIZ_USERNAME") or "").strip() or None
    auth_token = (os.getenv("VOBIZ_AUTH_TOKEN") or os.getenv("VOBIZ_PASSWORD") or "").strip() or None
    caller_id = _normalize_phone(os.getenv("VOBIZ_CALLER_ID") or os.getenv("VOBIZ_OUTBOUND_NUMBER"))
    return sip_domain, auth_id, auth_token, caller_id


async def _ensure_outbound_trunk(ctx: agents.JobContext) -> str | None:
    """
    Find or create an outbound trunk using VoBiz credentials.
    Returns a trunk ID (ST_...) when successful.
    """
    sip_domain, auth_id, auth_token, caller_id = _get_vobiz_trunk_config()
    if not all([sip_domain, auth_id, auth_token, caller_id]):
        logger.error(
            "Cannot create outbound trunk. Missing one of: "
            "VOBIZ_SIP_DOMAIN, VOBIZ_AUTH_ID/VOBIZ_USERNAME, "
            "VOBIZ_AUTH_TOKEN/VOBIZ_PASSWORD, VOBIZ_CALLER_ID/VOBIZ_OUTBOUND_NUMBER."
        )
        return None

    trunk_name = (os.getenv("VOBIZ_TRUNK_NAME") or "vobiz-outbound-auto").strip()

    try:
        trunks = await ctx.api.sip.list_outbound_trunk(api.ListSIPOutboundTrunkRequest())
        for trunk in trunks.items:
            matches_name = trunk.name == trunk_name
            matches_address = getattr(trunk, "address", "") == sip_domain
            matches_number = bool(getattr(trunk, "numbers", None) and caller_id in trunk.numbers)
            if matches_name or (matches_address and matches_number):
                return await _sync_trunk_credentials(ctx, trunk.sip_trunk_id)
    except Exception as e:
        logger.warning(f"Could not list outbound trunks before create: {e}")

    try:
        created = await ctx.api.sip.create_sip_outbound_trunk(
            api.CreateSIPOutboundTrunkRequest(
                trunk=api.SIPOutboundTrunkInfo(
                    name=trunk_name,
                    address=sip_domain,
                    numbers=[caller_id],
                    auth_username=auth_id,
                    auth_password=auth_token,
                )
            )
        )
        logger.info(f"Created outbound trunk: {created.sip_trunk_id}")
        return created.sip_trunk_id
    except Exception as e:
        logger.error(f"Failed to create outbound trunk automatically: {e}")
        return None


async def _sync_trunk_credentials(ctx: agents.JobContext, trunk_id: str) -> str:
    """
    Ensure the credentials stored in LiveKit for *trunk_id* match the current env vars.

    Strategy:
    1. Try update_outbound_trunk_fields (works when LiveKit supports it).
    2. If that fails, delete the stale trunk and recreate it so the fresh
       credentials are written into LiveKit — this fixes SIP 412 auth errors
       caused by outdated stored credentials.

    Returns the trunk ID to use (may differ from input if trunk was recreated).
    """
    sip_domain, auth_id, auth_token, caller_id = _get_vobiz_trunk_config()
    if not all([sip_domain, auth_id, auth_token, caller_id]):
        return trunk_id  # No credentials to sync — use as-is

    trunk_name = (os.getenv("VOBIZ_TRUNK_NAME") or "vobiz-outbound-auto").strip()

    # Attempt in-place update first (zero-downtime path).
    try:
        updated = await ctx.api.sip.update_outbound_trunk_fields(
            trunk_id,
            name=trunk_name,
            address=sip_domain,
            numbers=[caller_id],
            auth_username=auth_id,
            auth_password=auth_token,
        )
        logger.info("Synced credentials for trunk %s", trunk_id)
        return getattr(updated, "sip_trunk_id", trunk_id)
    except Exception as e:
        logger.warning("Could not update trunk %s (%s) — will delete and recreate.", trunk_id, e)

    # Delete stale trunk, then recreate with current credentials.
    try:
        await ctx.api.sip.delete_sip_trunk(api.DeleteSIPTrunkRequest(sip_trunk_id=trunk_id))
        logger.info("Deleted stale trunk %s", trunk_id)
    except Exception as del_e:
        logger.warning("Could not delete stale trunk %s: %s", trunk_id, del_e)

    try:
        created = await ctx.api.sip.create_sip_outbound_trunk(
            api.CreateSIPOutboundTrunkRequest(
                trunk=api.SIPOutboundTrunkInfo(
                    name=trunk_name,
                    address=sip_domain,
                    numbers=[caller_id],
                    auth_username=auth_id,
                    auth_password=auth_token,
                )
            )
        )
        logger.info("Recreated trunk with fresh credentials: %s", created.sip_trunk_id)
        return created.sip_trunk_id
    except Exception as create_e:
        logger.error("Failed to recreate trunk: %s. Using original %s (may still fail).", create_e, trunk_id)
        return trunk_id


async def _resolve_outbound_trunk_id(ctx: agents.JobContext, configured: str | None) -> str | None:
    """
    Resolve an outbound trunk ID. Supports:
    1) Direct trunk id (ST_xxx) — credentials always synced from env
    2) Trunk name
    3) Auto-match by caller number
    4) Fallback to first available outbound trunk
    """
    if _is_trunk_id(configured):
        # Always sync credentials even for direct trunk IDs so stale LiveKit
        # credentials don't silently cause SIP 412 authentication failures.
        return await _sync_trunk_credentials(ctx, configured)

    requested = (configured or "").strip()
    caller_number = os.getenv("VOBIZ_CALLER_ID") or os.getenv("VOBIZ_OUTBOUND_NUMBER")
    cache_key = f"{requested}:{caller_number or ''}"

    # Return cached trunk ID to skip the list_outbound_trunk API call (~100-300ms).
    with _trunk_cache_lock:
        cached = _trunk_id_cache.get(cache_key)
        if cached and (time.time() - cached[1]) < _TRUNK_CACHE_TTL:
            logger.debug(f"Trunk cache hit '{cache_key}': {cached[0]}")
            return cached[0]

    try:
        trunks = await ctx.api.sip.list_outbound_trunk(api.ListSIPOutboundTrunkRequest())
    except Exception as e:
        logger.error(f"Failed to list outbound trunks: {e}")
        return configured

    trunk_id: str | None = None

    if not trunks.items:
        trunk_id = await _ensure_outbound_trunk(ctx)
    elif requested:
        # 1) Match by trunk id/name when non-ST value is provided
        for trunk in trunks.items:
            if trunk.sip_trunk_id == requested or trunk.name == requested:
                logger.info(f"Resolved outbound trunk '{requested}' -> {trunk.sip_trunk_id}")
                trunk_id = await _ensure_outbound_trunk(ctx)
                break

    if trunk_id is None and caller_number:
        # 2) Match by caller number
        for trunk in trunks.items:
            if getattr(trunk, "numbers", None) and caller_number in trunk.numbers:
                logger.info(f"Resolved outbound trunk by caller number {caller_number} -> {trunk.sip_trunk_id}")
                trunk_id = await _ensure_outbound_trunk(ctx)
                break

    if trunk_id is None:
        # 3) Try to create/fetch trunk using VoBiz credentials
        created_or_found = await _ensure_outbound_trunk(ctx)
        if _is_trunk_id(created_or_found):
            trunk_id = created_or_found

    if trunk_id is None and trunks.items:
        # 4) Fallback to first configured trunk
        trunk_id = trunks.items[0].sip_trunk_id
        logger.warning(f"Using fallback outbound trunk: {trunk_id}")

    if trunk_id:
        with _trunk_cache_lock:
            _trunk_id_cache[cache_key] = (trunk_id, time.time())

    return trunk_id




def _build_pipeline_components():
    """
    Build STT (Deepgram) + LLM (OpenAI) + TTS (Sarvam) + VAD (Silero).

    Returns (stt, llm, tts, vad).  Falls back to OpenAI Realtime if
    pipeline services are not installed.
    """
    if not _HAS_PIPELINE_SERVICES:
        logger.warning("Falling back to OpenAI Realtime (pipeline services unavailable).")
        return _build_realtime_fallback(), None, None, None

    lang = _get_default_language()
    # Map hi → hi-IN, en → en-IN for Sarvam
    sarvam_lang = {"hi": "hi-IN", "en": "en-IN"}.get(lang, "hi-IN")

    stt, llm_inst, tts, vad = build_pipeline(language=lang, speaker="anushka")
    logger.info(
        "Pipeline: Deepgram STT (%s) | OpenAI LLM | Sarvam TTS (%s)",
        lang,
        sarvam_lang,
    )
    return stt, llm_inst, tts, vad


def _build_realtime_fallback():
    """OpenAI Realtime fallback (used only when pipeline services are missing)."""
    model = os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-mini-realtime-preview")
    voice = os.getenv("OPENAI_TTS_VOICE", "shimmer")
    logger.info("Fallback: OpenAI Realtime (model=%s voice=%s)", model, voice)
    return lk_openai.realtime.RealtimeModel(
        model=model,
        voice=voice,
        temperature=_get_float_env("OPENAI_REALTIME_TEMPERATURE", 0.7),
        api_key=os.getenv("OPENAI_API_KEY"),
    )



class TransferFunctions(llm.ToolContext):
    def __init__(self, ctx: agents.JobContext, phone_number: str = None):
        super().__init__(tools=[])
        self.ctx = ctx
        self.phone_number = phone_number
        self.last_user_utterance: str = ""
        self._confirm_pending: bool = False
        self._confirm_requested_at: float = 0.0
        self._pending_destination: Optional[str] = None
        self._last_transfer_ts: float = 0.0

    def set_last_user_utterance(self, text: str) -> None:
        if text:
            self.last_user_utterance = text.strip()

    def _normalize_text(self, text: str) -> str:
        cleaned = "".join(ch.lower() if (ch.isalnum() or ch.isspace()) else " " for ch in (text or ""))
        return " ".join(cleaned.split())

    def _has_transfer_intent(self, text: str) -> bool:
        t = self._normalize_text(text)
        if len(t) < 5:
            return False
        keywords = (
            "transfer",
            "transfer karo",
            "connect to agent",
            "connect me",
            "live agent",
            "human agent",
            "forward call",
            "speak to agent",
            "talk to agent",
            "customer care",
            "agent se baat",
            "agent se connect",
            "call transfer",
            "ट्रांसफर",
            "एजेंट से बात",
            "एजेंट से कनेक्ट",
            "कस्टमर केयर",
            "मानव एजेंट",
        )
        return any(k in t for k in keywords)

    def _has_transfer_confirmation(self, text: str) -> bool:
        t = self._normalize_text(text)
        confirm_words = (
            "yes",
            "yes transfer",
            "yes please",
            "confirm",
            "confirm transfer",
            "please transfer",
            "go ahead",
            "go ahead transfer",
            "transfer now",
            "do it",
            "haan",
            "ha",
            "haan transfer",
            "transfer karo",
            "kar do",
            "कर दो",
            "हाँ",
            "हाँ ट्रांसफर",
            "ट्रांसफर करो",
        )
        return any(k in t for k in confirm_words)

    @llm.function_tool(description="Transfer the call to a human support agent or another phone number.")
    async def transfer_call(self, destination: Optional[str] = None):
        """
        Transfer the call.
        """
        now = time.time()
        if now - self._last_transfer_ts < 8:
            return "Transfer request ignored because a transfer was just attempted."

        user_text = (self.last_user_utterance or "").strip()
        require_confirm = os.getenv("TRANSFER_REQUIRE_CONFIRMATION", "true").lower() == "true"
        confirm_timeout = _get_float_env("TRANSFER_CONFIRM_TIMEOUT_SEC", 30.0)

        logger.info(
            "transfer_call invoked: user_text=%r, destination=%r, confirm_pending=%s",
            user_text,
            destination,
            self._confirm_pending,
        )

        # Expire stale confirmations.
        if self._confirm_pending and (now - self._confirm_requested_at > confirm_timeout):
            self._confirm_pending = False
            self._pending_destination = None

        # Step 1: detect intent only. Never transfer in this first step.
        if not self._confirm_pending:
            if not self._has_transfer_intent(user_text):
                return "Transfer ignored because caller did not explicitly request transfer."
            self._confirm_pending = True
            self._confirm_requested_at = now
            self._pending_destination = destination or os.getenv("DEFAULT_TRANSFER_NUMBER")
            return "I can transfer your call. Please confirm by saying: yes, transfer me."

        # Step 2: pending confirmation must be explicitly confirmed.
        if require_confirm and not self._has_transfer_confirmation(user_text):
            return "Please confirm transfer by saying: yes, transfer me."

        destination = destination or self._pending_destination or os.getenv("DEFAULT_TRANSFER_NUMBER")
        if not destination:
            self._confirm_pending = False
            self._pending_destination = None
            return "Error: No default transfer number configured."

        self._confirm_pending = False
        self._pending_destination = None
        if "@" not in destination:
            # If no domain is provided, append the SIP domain
            if SIP_DOMAIN:
                # Ensure clean number (strip tel: or sip: prefix if present but no domain)
                clean_dest = destination.replace("tel:", "").replace("sip:", "")
                destination = f"sip:{clean_dest}@{SIP_DOMAIN}"
            else:
                # Fallback to tel URI if no domain configured
                if not destination.startswith("tel:") and not destination.startswith("sip:"):
                     destination = f"tel:{destination}"
        elif not destination.startswith("sip:"):
             destination = f"sip:{destination}"
        
        logger.info(f"Transferring call to {destination}")
        
        # Determine the participant identity
        # For outbound calls initiated by this agent, the participant identity is typically "sip_<phone_number>"
        # For inbound, we might need to find the remote participant.
        participant_identity = None
        
        # If we stored the phone number from metadata, we can construct the identity
        if self.phone_number:
            participant_identity = f"sip_{self.phone_number}"
        else:
            # Try to find a participant that is NOT the agent
            for p in self.ctx.room.remote_participants.values():
                participant_identity = p.identity
                break
        
        if not participant_identity:
            logger.error("Could not determine participant identity for transfer")
            return "Failed to transfer: could not identify the caller."

        try:
            logger.info(f"Transferring participant {participant_identity} to {destination}")
            await self.ctx.api.sip.transfer_sip_participant(
                api.TransferSIPParticipantRequest(
                    room_name=self.ctx.room.name,
                    participant_identity=participant_identity,
                    transfer_to=destination,
                    play_dialtone=False
                )
            )
            self._last_transfer_ts = time.time()
            return "Transfer initiated successfully."
        except Exception as e:
            logger.error(f"Transfer failed: {e}")
            return f"Error executing transfer: {e}"


def _build_agent_instructions() -> str:
    """Build agent instructions from scripts/agent_script.py (single source of truth)."""
    agent_name = os.getenv("AGENT_PERSONA_NAME", "Shubhi")
    company = os.getenv("AGENT_COMPANY_NAME", "real estate company")
    return AGENT_SCRIPT.format(agent_name=agent_name, company=company)


class OutboundAssistant(Agent):

    """
    An AI agent tailored for outbound calls.
    Attempts to be helpful and concise.
    """
    def __init__(self) -> None:
        super().__init__(instructions=_build_agent_instructions())


def prewarm(proc: agents.JobProcess) -> None:
    """Keep warm worker processes ready for incoming jobs."""
    # Pre-generate greeting/filler audio clips at process startup (Layer 1).
    # This runs once per worker process so the first call has zero TTS latency.
    if _HAS_LAYERS:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_layer1.preload())
        finally:
            loop.close()


async def _speak_scripted_line(
    session: AgentSession,
    *,
    text: str,
    allow_interruptions: bool = True,
) -> None:
    """
    Speak a scripted line directly via the TTS pipeline (bypasses LLM).

    In pipeline mode (Deepgram+Sarvam), session.say() converts text to Sarvam
    audio immediately — no LLM round-trip, sub-200 ms latency for pre-cached phrases.

    NOTE: Do NOT call session.interrupt() before this. Callers that need to
    stop an in-progress generation should call session.interrupt() +
    asyncio.sleep() themselves before calling this function.
    """
    await session.say(text, allow_interruptions=allow_interruptions)


# Shared session for fire-and-forget POSTs to ws_server — avoids leaking TCP
# connections (the "Unclosed connection" asyncio errors) which cause audio jitter.
_interim_session: aiohttp.ClientSession | None = None


def _get_interim_session() -> aiohttp.ClientSession:
    global _interim_session
    if _interim_session is None or _interim_session.closed:
        connector = aiohttp.TCPConnector(force_close=True, limit=4)
        _interim_session = aiohttp.ClientSession(
            connector=connector,
            timeout=aiohttp.ClientTimeout(total=0.5),
        )
    return _interim_session


async def _broadcast_interim(transcript: str, call_id: str) -> None:
    """Fire-and-forget POST of an interim (partial) Deepgram transcript to ws_server."""
    try:
        session = _get_interim_session()
        await session.post(
            "http://localhost:8090/event",
            json={
                "type":       "transcript_interim",
                "transcript": transcript,
                "call_id":    call_id,
                "timestamp":  time.time(),
            },
        )
    except Exception:
        pass


async def _reject_busy_inbound(ctx: agents.JobContext) -> None:
    """
    Called when MAX_CONCURRENT_CALLS is reached for an inbound call.
    Connects to the room, speaks a bilingual wait message, then hangs up.
    Uses a lightweight non-realtime TTS session to avoid Gemini warmup overhead.
    """
    busy_text = (
        "Namaste! Abhi hamare saare agents busy hain. "
        "Kripya thodi der baad call karein. Dhanyavaad! "
        "Hello! All our agents are currently busy. "
        "Please try calling again in a few minutes. Thank you!"
    )
    try:
        _b_stt, _b_llm, _b_tts, _b_vad = _build_pipeline_components()
        _b_kwargs: dict = dict(
            tools=[],
            allow_interruptions=False,
        )
        if _b_stt is not None:
            _b_kwargs.update(stt=_b_stt, llm=_b_llm, tts=_b_tts)
            if _b_vad is not None:
                _b_kwargs["vad"] = _b_vad
        else:
            _b_kwargs.update(llm=_b_stt, turn_detection="realtime_llm")
        busy_session = AgentSession(**_b_kwargs)
        await busy_session.start(
            room=ctx.room,
            agent=OutboundAssistant(),
            room_options=RoomOptions(close_on_disconnect=True),
        )
        await busy_session.say(busy_text, allow_interruptions=False)
        await asyncio.sleep(4.0)
    except Exception as e:
        logger.warning("Busy-message session failed: %s", e)
    finally:
        ctx.shutdown()


async def _reject_busy_outbound(ctx: agents.JobContext, phone_number: str) -> None:
    """
    Called when MAX_CONCURRENT_CALLS is reached for an outbound call.
    Dials the number, speaks a bilingual 'call back' message, then hangs up.
    """
    trunk_id = os.getenv("OUTBOUND_TRUNK_ID", "").strip() or None
    if not trunk_id:
        logger.warning("OUTBOUND_TRUNK_ID not set; cannot play busy message for %s", phone_number)
        ctx.shutdown()
        return

    busy_text = (
        "Namaste! Abhi hamare saare agents busy hain. "
        "Hum aapko jald hi wapas call karenge. Dhanyavaad! "
        "Hello! All our agents are currently busy. "
        "We will call you back shortly. Thank you!"
    )
    try:
        await ctx.connect()
        await asyncio.wait_for(
            asyncio.ensure_future(
                ctx.api.sip.create_sip_participant(
                    api.CreateSIPParticipantRequest(
                        room_name=ctx.room.name,
                        sip_trunk_id=trunk_id,
                        sip_call_to=phone_number,
                        participant_identity=f"sip_{phone_number}",
                        wait_until_answered=True,
                    )
                )
            ),
            timeout=45,
        )
        _ob_stt, _ob_llm, _ob_tts, _ob_vad = _build_pipeline_components()
        _ob_kwargs: dict = dict(tools=[], allow_interruptions=False)
        if _ob_stt is not None:
            _ob_kwargs.update(stt=_ob_stt, llm=_ob_llm, tts=_ob_tts)
            if _ob_vad is not None:
                _ob_kwargs["vad"] = _ob_vad
        else:
            _ob_kwargs.update(llm=_ob_stt, turn_detection="realtime_llm")
        busy_session = AgentSession(**_ob_kwargs)
        await busy_session.start(
            room=ctx.room,
            agent=OutboundAssistant(),
            room_options=RoomOptions(close_on_disconnect=True),
        )
        await busy_session.say(busy_text, allow_interruptions=False)
        await asyncio.sleep(5.0)
    except Exception as e:
        logger.warning("Outbound busy-message failed: %s", e)
    finally:
        ctx.shutdown()


async def entrypoint(ctx: agents.JobContext):
    """
    Main entrypoint for the agent.

    Enforces MAX_CONCURRENT_CALLS (default 3). A 4th concurrent call:
    - Inbound: hears a bilingual "all agents busy, please call back" message.
    - Outbound: dials the number, plays the busy message, hangs up.

    For outbound calls:
    1. Checks for 'phone_number' in the job metadata.
    2. Connects to the room.
    3. Initiates the SIP call to the phone number.
    4. Waits for answer before speaking.
    """
    logger.info(f"Connecting to room: {ctx.room.name}")
    # Anchor warmup from the very start of entrypoint — session.start() itself
    # takes 2-4s, so using its return time as the anchor understates elapsed time.
    _entrypoint_start_at = time.time()

    if not _validate_runtime_provider_keys():
        ctx.shutdown()
        return

    # parse the phone number from the metadata sent by the dispatch script
    phone_number = None
    try:
        if ctx.job.metadata:
            data = json.loads(ctx.job.metadata)
            phone_number = data.get("phone_number")
    except Exception:
        logger.warning("No valid JSON metadata found. This might be an inbound call.")

    # ------------------------------------------------------------------
    # Concurrent call limit check
    # ------------------------------------------------------------------
    if not _try_acquire_call_slot():
        active, _ = _slots_read_write(0)  # read current count for logging
        logger.warning(
            "MAX_CONCURRENT_CALLS=%d reached (%d active). "
            "%s call rejected.",
            MAX_CONCURRENT_CALLS,
            active,
            "Inbound" if not phone_number else "Outbound",
        )
        if phone_number:
            # Outbound: dial the number and play a busy message before hanging up.
            await _reject_busy_outbound(ctx, phone_number)
            return
        # Inbound: caller is already on the line — play the busy message.
        await _reject_busy_inbound(ctx)
        return

    logger.info(
        "Call slot acquired (%d/%d active).",
        _slots_read_write(0)[0],
        MAX_CONCURRENT_CALLS,
    )

    # Release slot whenever the LiveKit room disconnects — covers all exit paths:
    # normal hangup, SIP reject, exception, ctx.shutdown(), etc.
    ctx.room.on("disconnected", lambda *_: _release_call_slot())

    # Initialize function context
    fnc_ctx = TransferFunctions(ctx, phone_number)
    last_user_speech_at = time.time()
    # Use a list so sync event handlers can mutate it without nonlocal
    _last_agent_response_at: list[float] = [time.time()]
    # Set to call-answer timestamp once wait_until_answered returns.
    # Greeting task polls this so it can apply the post-answer carrier-window delay.
    _call_answered_at: list[float] = [0.0]
    # Set to the time we first detect a carrier announcement or STT noise token.
    # The greeting loop uses this to dynamically shorten the carrier wait when the
    # announcement arrives early, reducing unnecessary silence for the caller.
    _carrier_detected_at: list[float] = [0.0]
    reprompt_task: asyncio.Task | None = None

    # ── Build pipeline: Deepgram STT + OpenAI LLM + Sarvam TTS + Silero VAD ──
    _stt, _llm, _tts, _vad = _build_pipeline_components()

    _pipeline_mode = _stt is not None  # True = Deepgram+Sarvam; False = Realtime fallback

    if _pipeline_mode:
        logger.info("Starting pipeline session: Deepgram STT | OpenAI LLM | Sarvam TTS")
        _session_kwargs: dict = dict(
            stt=_stt,
            llm=_llm,
            tts=_tts,
            tools=fnc_ctx.flatten(),
            allow_interruptions=True,
            min_endpointing_delay=_get_float_env("SESSION_MIN_ENDPOINTING_DELAY", 0.10),
            max_endpointing_delay=_get_float_env("SESSION_MAX_ENDPOINTING_DELAY", 0.30),
            false_interruption_timeout=_get_float_env("SESSION_FALSE_INTERRUPTION_TIMEOUT", 1.20),
            user_away_timeout=_get_float_env("SESSION_USER_AWAY_TIMEOUT", 15.0),
        )
        if _vad is not None:
            _session_kwargs["vad"] = _vad
        session = AgentSession(**_session_kwargs)
    else:
        logger.info("Starting realtime fallback session: OpenAI Realtime")
        session = AgentSession(
            llm=_stt,  # _stt holds the realtime model in fallback path
            tools=fnc_ctx.flatten(),
            turn_detection="realtime_llm",
            allow_interruptions=True,
            min_endpointing_delay=_get_float_env("SESSION_MIN_ENDPOINTING_DELAY", 0.10),
            max_endpointing_delay=_get_float_env("SESSION_MAX_ENDPOINTING_DELAY", 0.30),
            false_interruption_timeout=_get_float_env("SESSION_FALSE_INTERRUPTION_TIMEOUT", 1.20),
            user_away_timeout=_get_float_env("SESSION_USER_AWAY_TIMEOUT", 15.0),
        )

    # Pre-resolve greeting and trunk ID concurrently while Gemini WebSocket is connecting.
    # This hides lookup latency inside session.start() so dialing begins the moment
    # the Gemini connection is ready.
    agent_name = os.getenv("AGENT_PERSONA_NAME", "Shubhi")
    company = os.getenv("AGENT_COMPANY_NAME", "Estate Company")
    first_message = _repair_mojibake(os.getenv("OUTBOUND_FIRST_MESSAGE")) or _default_first_message(
        agent_name, company, _get_default_language()
    )
    inbound_greeting = _repair_mojibake(os.getenv("INBOUND_FIRST_MESSAGE")) or first_message

    async def _start_session_and_resolve_trunk():
        start_task = asyncio.create_task(
            session.start(
                room=ctx.room,
                agent=OutboundAssistant(),
                room_options=RoomOptions(
                    audio_input=AudioInputOptions(
                        noise_cancellation=(
                            noise_cancellation.BVCTelephony()
                            if os.getenv("ENABLE_NOISE_CANCELLATION", "true").lower() == "true"
                            else None
                        ),
                        frame_size_ms=_get_int_env("ROOM_AUDIO_FRAME_SIZE_MS", 20),
                    ),
                    close_on_disconnect=True,
                ),
            )
        )
        if phone_number:
            trunk_task = asyncio.create_task(_resolve_outbound_trunk_id(ctx, OUTBOUND_TRUNK_ID))
            await start_task
            return await trunk_task
        await start_task
        return None

    resolved_trunk_id = None
    for _attempt in range(2):
        try:
            resolved_trunk_id = await _start_session_and_resolve_trunk()
            break
        except Exception as e:
            logger.error("session.start() failed (attempt %d): %s", _attempt + 1, e)
            if _attempt == 0:
                await asyncio.sleep(2.0)
            else:
                ctx.shutdown()
                return
    _session_ready_at = time.time()

    # Wait for the WebSocket to fully settle, then cancel any auto-generated
    # response the model may have triggered on session.start() — we want the
    # greeting to be delivered explicitly via generate_reply() below.
    await asyncio.sleep(0.5)
    try:
        session.interrupt()
    except Exception:
        pass

    @session.on("user_input_transcribed")
    def _on_user_input_transcribed(ev) -> None:
        nonlocal last_user_speech_at, reprompt_task
        transcript = (getattr(ev, "transcript", "") or "").strip()
        if not transcript:
            return
        is_final = getattr(ev, "is_final", False)
        logger.info(
            "user_input_transcribed final=%s language=%s text=\"%s\"",
            is_final,
            getattr(ev, "language", None),
            _safe_log_text(transcript),
        )

        # ── Broadcast interim transcript for debug dashboard ─────────────────
        if not is_final:
            asyncio.ensure_future(_broadcast_interim(transcript, ctx.room.name))

        # Filter telephony noise — neither carrier announcements nor STT noise
        # tokens (e.g. "<noise>", "<crosstalk>") are real user speech.
        if _is_stt_noise_token(transcript):
            _carrier_detected_at[0] = time.time()  # always update to latest noise event
            logger.info("STT noise token '%s' — ignoring for speech timers.", transcript)
            # Do NOT interrupt here — calling session.interrupt() on noise events
            # disrupts the server-side VAD state and causes generation timeouts.
            return
        if _is_carrier_announcement(transcript):
            _carrier_detected_at[0] = time.time()  # always update to latest carrier event
            logger.info("Carrier announcement detected — ignoring for speech timers.")
            # Do NOT interrupt here — calling session.interrupt() on carrier events
            # disrupts the server-side VAD state and causes generation timeouts.
            return

        # Only count the utterance as real user speech once the STT has produced
        # a final (committed) transcript.  Non-final partials like "Thi", "This",
        # "This call" would falsely trigger user_spoke_before_greeting before the
        # carrier filter has enough text to recognise the full announcement phrase.
        if not is_final:
            return

        # Foreign-script tokens (Telugu, Arabic, Cyrillic, Malayalam, etc.) may
        # be carrier-line artefacts OR genuine user speech in another language.
        # Gemini receives them in context either way and will respond per RULE 1.
        # We do NOT update silence timers for them so the 7-second reprompt still
        # fires when only carrier noise is present.
        if _is_foreign_script(transcript):
            logger.info(
                "STT foreign-script (final): \"%s\" — Gemini handles, timers unchanged.",
                _safe_log_text(transcript),
            )
            return

        logger.info("STT accepted (final): \"%s\" → passing to LLM", _safe_log_text(transcript))
        last_user_speech_at = time.time()
        if reprompt_task and not reprompt_task.done():
            reprompt_task.cancel()
            reprompt_task = None
        fnc_ctx.set_last_user_utterance(transcript)

        # ── Layer 3 latency tracking: STT end → LLM start ─────────────────
        call_id = ctx.room.name
        if _HAS_LATENCY:
            ev = _latency_tracker.start_turn(call_id)
            ev.stt_end = time.time()
            ev.llm_start = time.time()

        # ── Transcription broadcast for live dashboard ─────────────────────
        if _HAS_TRANSCRIPTION:
            entry = _validate_transcript(transcript, role="user", call_id=call_id)
            asyncio.ensure_future(broadcast_transcript(entry))

        # ── Layer 2: start filler monitor (cancelled when agent speaks) ────
        if _HAS_LAYERS:
            asyncio.ensure_future(_layer2.monitor_and_inject(session, time.time()))

    @session.on("conversation_item_added")
    def _on_conversation_item_added(ev) -> None:
        item = getattr(ev, "item", None)
        if item is None:
            return
        role = getattr(item, "role", "unknown")
        raw_content = getattr(item, "content", [])
        parts: list[str] = []
        if isinstance(raw_content, list):
            for part in raw_content:
                if isinstance(part, str):
                    parts.append(part)
                else:
                    transcript = getattr(part, "transcript", None)
                    if transcript:
                        parts.append(transcript)
        elif isinstance(raw_content, str):
            parts.append(raw_content)
        text = " ".join(parts).strip()
        if text:
            logger.info("conversation_item_added role=%s text=\"%s\"", role, _safe_log_text(text))
            if role == "assistant":
                now = time.time()
                _last_agent_response_at[0] = now

                # ── Latency: TTS first audio ──────────────────────────────
                call_id = ctx.room.name
                if _HAS_LATENCY:
                    ev = _latency_tracker.current(call_id)
                    if ev:
                        if ev.llm_first_token is None:
                            ev.llm_first_token = now
                        ev.tts_first_audio = now
                        ev.llm_end = now
                        ev.tts_end = now
                        _latency_tracker.finish_turn(call_id)

                # ── Broadcast agent transcript ────────────────────────────
                if _HAS_TRANSCRIPTION:
                    entry = _validate_transcript(text, role="agent", call_id=call_id)
                    asyncio.ensure_future(broadcast_transcript(entry))

    async def _reprompt_if_no_speech() -> None:
        """Send up to 2 reprompts if the caller stays silent after the greeting.

        Reprompt 1: fires NO_SPEECH_REPROMPT_SEC (default 7s) after greeting.
        Reprompt 2: fires 10s after reprompt 1 if still no real speech — uses
                    a simpler "Can you hear me?" prompt before giving up.
        """
        delay = _get_float_env("NO_SPEECH_REPROMPT_SEC", 7.0)
        lang = _get_default_language()
        reprompt_text = _default_reprompt(lang)
        reprompt2_text = (
            "Kya aap mujhe sun pa rahe hain? Kripya kuch boliye."
            if lang == "hi"
            else "Can you hear me? Please say something."
        )
        try:
            # --- Reprompt 1 ---
            while True:
                await asyncio.sleep(1.0)
                if time.time() - last_user_speech_at < delay:
                    continue
                if time.time() - last_user_speech_at < 1.5:
                    return  # user just spoke — cancel
                await _speak_scripted_line(session, text=reprompt_text)
                logger.info("No user speech detected; reprompt 1 sent.")
                break

            # --- Reprompt 2 (10s after reprompt 1) ---
            reprompt1_at = time.time()
            while True:
                await asyncio.sleep(1.0)
                if last_user_speech_at > reprompt1_at:
                    return  # user responded after reprompt 1 — done
                if time.time() - reprompt1_at < 10.0:
                    continue
                await _speak_scripted_line(session, text=reprompt2_text)
                logger.info("No user speech detected; reprompt 2 sent.")
                break

        except asyncio.CancelledError:
            logger.debug("No-speech reprompt cancelled because user spoke.")
        except Exception as reprompt_error:
            logger.debug(f"No-speech reprompt skipped: {reprompt_error}")

    if phone_number:
        # first_message and trunk_id are already resolved (done concurrently with session.start)
        trunk_id = resolved_trunk_id
        logger.info(f"Initiating outbound SIP call to {phone_number}...")

        if not _is_trunk_id(trunk_id):
            logger.error(
                "No valid outbound trunk ID found. Set OUTBOUND_TRUNK_ID=ST_xxx in env."
            )
            ctx.shutdown()
            return

        # Hook the greeting to the participant_connected room event so it fires
        # the INSTANT the SIP caller joins — before wait_until_answered even
        # returns from the API, saving the API-response round-trip delay.
        _greeting_triggered = False
        _greeting_task: asyncio.Task | None = None
        # Set when the SIP call fails so the greeting task aborts before generate_reply.
        _call_failed = asyncio.Event()

        async def _watchdog_agent_response() -> None:
            """
            Safety net: if the user spoke but Gemini hasn't responded within
            AGENT_RESPONSE_WATCHDOG_SEC (default 6s), force a generate_reply.

            This recovers from the case where the user interrupts the agent's
            greeting and Gemini's turn-detection silently fails to trigger the
            next generation (a known Gemini Live edge case).
            """
            watchdog_sec = _get_float_env("AGENT_RESPONSE_WATCHDOG_SEC", 4.0)
            try:
                while True:
                    await asyncio.sleep(1.0)
                    if _call_failed.is_set():
                        break
                    now = time.time()
                    last_agent = _last_agent_response_at[0]
                    user_spoke_ago = now - last_user_speech_at
                    # Trigger only when: user spoke recently, agent hasn't responded,
                    # and enough time has passed to rule out normal generation latency.
                    if (
                        last_user_speech_at > last_agent
                        and user_spoke_ago >= watchdog_sec
                        and user_spoke_ago < 30.0  # don't trigger if user left
                    ):
                        logger.warning(
                            "Watchdog: user spoke %.1fs ago, agent silent. "
                            "Forcing generate_reply to recover.",
                            user_spoke_ago,
                        )
                        _last_agent_response_at[0] = now  # prevent re-trigger while recovering
                        try:
                            await session.generate_reply(
                                instructions="Respond naturally to what the user just said.",
                                allow_interruptions=True,
                            )
                        except Exception as wd_err:
                            logger.debug("Watchdog generate_reply failed: %s", wd_err)
            except asyncio.CancelledError:
                pass

        async def _send_greeting_and_start_reprompt() -> None:
            nonlocal last_user_speech_at, reprompt_task
            # ----------------------------------------------------------------
            # Greeting timing strategy
            # ----------------------------------------------------------------
            # Problem: Indian carriers play a "This call is now being recorded"
            # announcement ~5-15s AFTER the callee picks up.  If our greeting
            # fires at the same time, the carrier audio interrupts the greeting
            # mid-sentence and corrupts Gemini Live's turn-detection state.
            #
            # Fix: wait for (a) call answered confirmation AND (b) a post-answer
            # carrier window (CARRIER_ANNOUNCEMENT_WAIT_SEC, default 7s) before
            # playing the greeting. Gemini Live must be fully connected before
            # generate_reply() is called, so we wait for the carrier window
            # to give the session time to initialise.
            # ----------------------------------------------------------------

            # (a) Wait for the SIP call to be confirmed answered.
            poll_deadline = time.time() + 60.0
            while _call_answered_at[0] == 0.0:
                if _call_failed.is_set():
                    return
                if time.time() > poll_deadline:
                    logger.warning("Timed out waiting for answer confirmation; proceeding.")
                    break
                await asyncio.sleep(0.1)

            if _call_failed.is_set():
                return

            # (b) Poll until it's safe to fire the greeting.
            #
            # Two hard requirements:
            #   1. Gemini must be warmed up (generate_reply times out before this).
            #   2a. Carrier announcement window elapsed (so it can't interrupt greeting), OR
            #   2b. User already spoke — skip carrier wait; Gemini is already handling
            #       the user's audio naturally via VAD.
            #
            # CRITICAL: if the user spoke while we were waiting, do NOT call interrupt()
            # before generate_reply.  interrupt() would cancel Gemini's in-progress VAD
            # response to the user, putting Gemini into a confused/silent state.
            # GEMINI_SESSION_WARMUP_SEC: time from entrypoint start until generate_reply
            # is safe.  With auto-activity disabled, Gemini does NOT auto-generate at
            # session.start(), so we only need time for the WebSocket connection to
            # fully establish — 3 s is sufficient.
            warmup_sec = _get_float_env("GEMINI_SESSION_WARMUP_SEC", 3.0)
            # CARRIER_ANNOUNCEMENT_WAIT_SEC: baseline wait after call-answer before
            # firing the greeting.  The dynamic max() logic extends this whenever
            # carrier audio is detected, so 3 s is a safe baseline for the no-carrier
            # case without adding unnecessary latency.
            carrier_wait = _get_float_env("CARRIER_ANNOUNCEMENT_WAIT_SEC", 3.0)
            # After the LAST carrier / noise event, wait this many seconds before
            # greeting.  Gemini processes carrier-as-user-turn in <100ms, so 0.8s
            # is enough safety margin without adding noticeable latency.
            carrier_tail = _get_float_env("CARRIER_TAIL_SEC", 0.8)
            # Hard ceiling on the carrier wait so continuous Indian carrier
            # noise can't push carrier_done_at forward indefinitely (20-30 s bug).
            carrier_max_wait = _get_float_env("CARRIER_MAX_WAIT_SEC", 8.0)

            # In pipeline mode (Deepgram + OpenAI), there's no Gemini WebSocket to
            # warm up — the session is ready immediately.  Use 0 warmup so the
            # greeting can fire as soon as the carrier window elapses.
            # Also halve the carrier wait baseline (3s → 1.5s) since pipeline mode
            # starts faster and the greeting TTS is pre-warmed during the wait.
            if _pipeline_mode:
                warmup_sec = 0.0
                if not os.getenv("CARRIER_ANNOUNCEMENT_WAIT_SEC"):
                    carrier_wait = 1.5

            gemini_ready_at = _entrypoint_start_at + warmup_sec
            answered_at = _call_answered_at[0] or time.time()
            carrier_done_at = answered_at + carrier_wait  # static fallback
            carrier_absolute_deadline = answered_at + carrier_max_wait

            # Pre-warm greeting TTS during the carrier wait so the audio is
            # already cached when the greeting fires (saves ~1-2 s of live TTS).
            async def _prewarm_greeting_tts() -> None:
                try:
                    import re
                    from services.sarvam_tts import _fetch_audio as _sarvam_fetch
                    # Split into sentences to match blingfire sentence tokenizer splits
                    sentences = [
                        s.strip()
                        for s in re.split(r"(?<=[.!?])\s+", first_message)
                        if s.strip()
                    ]
                    if not sentences:
                        sentences = [first_message]
                    for sent in sentences:
                        await _sarvam_fetch(
                            sent,
                            api_key=_tts._api_key,
                            speaker=_tts._speaker,
                            model=_tts._model,
                            language=_tts._language,
                        )
                    logger.debug("Greeting TTS pre-warmed (%d sentence(s))", len(sentences))
                except Exception as _pw_err:
                    logger.debug("Greeting TTS prewarm skipped: %s", _pw_err)

            asyncio.ensure_future(_prewarm_greeting_tts())

            user_spoke_before_greeting = False
            while True:
                if _call_failed.is_set():
                    return
                now = time.time()
                if now < gemini_ready_at:        # always wait for Gemini first
                    await asyncio.sleep(0.1)
                    continue

                # Hard cap: never wait longer than carrier_absolute_deadline,
                # regardless of ongoing noise.
                if now >= carrier_absolute_deadline:
                    logger.info(
                        "Carrier max wait (%.1fs) elapsed — firing greeting despite ongoing noise.",
                        carrier_max_wait,
                    )
                    break

                # Dynamic carrier_done_at: extend the deadline every time new
                # carrier/noise audio is detected, so the greeting never fires
                # while the carrier announcement is still streaming.
                # Use max() so each new detection pushes the deadline FORWARD.
                # The static carrier_done_at (answered_at + carrier_wait) acts as
                # the baseline when no carrier is detected at all.
                if _carrier_detected_at[0] > 0:
                    dynamic_done = _carrier_detected_at[0] + carrier_tail
                    carrier_done_at = max(carrier_done_at, dynamic_done)

                user_spoke_before_greeting = last_user_speech_at > answered_at
                if user_spoke_before_greeting:   # user is live — exit loop
                    logger.debug("User spoke during carrier wait — firing greeting immediately.")
                    break
                if now >= carrier_done_at:       # carrier window elapsed
                    break
                await asyncio.sleep(0.1)

            if _call_failed.is_set():
                return

            if user_spoke_before_greeting:
                # User spoke before the greeting window elapsed.
                # Gemini may have started a natural VAD response — interrupt it
                # so the scripted greeting doesn't race with an in-progress
                # generation (which previously caused the agent to skip the
                # intro and only say the availability question).
                logger.info(
                    "User spoke before greeting — interrupting Gemini VAD and firing scripted greeting."
                )
                try:
                    session.interrupt()
                except Exception:
                    pass
                # Pipeline mode (OpenAI) needs minimal settle time; Gemini needs ~300ms.
                await asyncio.sleep(0.1 if _pipeline_mode else 0.3)

            # Fire greeting unconditionally (always — regardless of user_spoke_before_greeting).
            # One retry on transient failure.
            for _attempt in range(2):
                if _call_failed.is_set():
                    logger.info("Greeting aborted mid-retry: SIP call failed.")
                    return
                try:
                    await _speak_scripted_line(
                        session,
                        text=first_message,
                    )
                    logger.info("Initial greeting sent.")
                    break
                except asyncio.CancelledError:
                    raise
                except Exception as greet_error:
                    logger.warning(
                        "Greeting attempt %d failed: %s", _attempt + 1, greet_error
                    )
                    if _attempt == 0:
                        await asyncio.sleep(1.5)
            else:
                logger.error(
                    "Greeting failed after 2 attempts — caller will hear silence. "
                    "Check Gemini WebSocket connectivity."
                )

            # Reset silence timer so reprompt is measured from greeting end.
            # Also reset agent-response tracker so the watchdog doesn't fire
            # while Gemini is generating the greeting audio.
            last_user_speech_at = time.time()
            _last_agent_response_at[0] = time.time()
            reprompt_task = asyncio.create_task(_reprompt_if_no_speech())
            asyncio.ensure_future(_watchdog_agent_response())

        def _on_sip_participant_connected(participant) -> None:
            nonlocal _greeting_triggered, _greeting_task
            if _greeting_triggered:
                return
            if not participant.identity.startswith("sip_"):
                return
            _greeting_triggered = True
            logger.info("SIP participant connected — starting greeting immediately.")
            _greeting_task = asyncio.ensure_future(_send_greeting_and_start_reprompt())

        ctx.room.on("participant_connected", _on_sip_participant_connected)

        try:
            await ctx.api.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=ctx.room.name,
                    sip_trunk_id=trunk_id,
                    sip_call_to=phone_number,
                    participant_identity=f"sip_{phone_number}",
                    wait_until_answered=True,
                )
            )
            logger.info("Call confirmed answered.")
            _call_answered_at[0] = time.time()  # unblocks carrier-window wait in greeting task
            # Safety: if participant_connected did not fire (edge case), trigger greeting now.
            if not _greeting_triggered:
                _greeting_triggered = True
                logger.warning("participant_connected did not fire; triggering greeting as fallback.")
                asyncio.ensure_future(_send_greeting_and_start_reprompt())

        except Exception as e:
            logger.error(f"Failed to place outbound call: {e}")
            # Signal greeting task to abort BEFORE calling generate_reply.
            _call_failed.set()
            # Interrupt any Gemini generation that may already be in-flight so the
            # SDK does not log a spurious ERROR for the generate_reply timeout.
            try:
                session.interrupt()
            except Exception:
                pass
            if _greeting_task and not _greeting_task.done():
                _greeting_task.cancel()
            if reprompt_task and not reprompt_task.done():
                reprompt_task.cancel()
            ctx.shutdown()
    else:
        # Inbound / web call
        logger.info("No phone number in metadata. Treating as inbound/web call.")
        await _speak_scripted_line(session, text=inbound_greeting)


if __name__ == "__main__":
    # Reset stale slot counter from any previous process run.
    # Without this, a crashed/restarted worker keeps the old count and rejects all calls.
    try:
        _SLOTS_FILE.write_bytes(b"0")
    except Exception:
        pass

    # The agent name "outbound-caller" is used by the dispatch script to find this worker
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name="outbound-caller",
            num_idle_processes=max(0, _get_int_env("AGENT_NUM_IDLE_PROCESSES", 1)),
        )
    )
