import asyncio
import logging
import os
import json
import time
from pathlib import Path
from dotenv import load_dotenv
from openai.types.beta.realtime.session import InputAudioTranscription, TurnDetection

from livekit import agents, api
from livekit.agents import AgentSession, Agent
from livekit.agents.voice.room_io import RoomOptions, AudioInputOptions
from livekit.plugins import (
    openai,
    deepgram,
    google,
    noise_cancellation,
    silero,
)
from livekit.agents import llm
from typing import Optional

try:
    from google.genai import types as google_genai_types
    _HAS_GOOGLE_GENAI_TYPES = True
except ImportError:
    _HAS_GOOGLE_GENAI_TYPES = False

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


def _use_realtime_audio() -> bool:
    return _get_bool_env("OPENAI_REALTIME_AUDIO", True)


def _get_realtime_provider() -> str:
    return os.getenv("REALTIME_PROVIDER", "openai").strip().lower() or "openai"


def _get_realtime_language_code() -> str:
    language = _get_default_language()
    return {
        "hi": "hi-IN",
        "en": "en-US",
    }.get(language, language)


def _validate_runtime_provider_keys(realtime_audio: bool) -> bool:
    provider = _get_realtime_provider()
    if realtime_audio and provider == "google":
        google_key = os.getenv("GOOGLE_API_KEY", "").strip()
        if not google_key:
            logger.error("GOOGLE_API_KEY is missing in environment. Cannot start Gemini Live conversation.")
            return False
        return True

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not openai_key:
        logger.error("OPENAI_API_KEY is missing in environment. Cannot start outbound conversation.")
        return False
    if openai_key.startswith("sk-or-v1"):
        logger.error(
            "Detected OpenRouter key in OPENAI_API_KEY. "
            "Please set a real OpenAI key (sk-... / sk-proj-...) in .env."
        )
        return False
    return True


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
        return "Namaste, kya abhi baat karna theek rahega?"
    return "Hello, is this a good time to talk?"


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
                try:
                    updated = await ctx.api.sip.update_outbound_trunk_fields(
                        trunk.sip_trunk_id,
                        name=trunk_name,
                        address=sip_domain,
                        numbers=[caller_id],
                        auth_username=auth_id,
                        auth_password=auth_token,
                    )
                    logger.info(f"Synced existing outbound trunk from env: {trunk.sip_trunk_id}")
                    return updated.sip_trunk_id
                except Exception as e:
                    logger.warning(f"Could not sync existing outbound trunk {trunk.sip_trunk_id}: {e}")
                    logger.info(f"Using existing outbound trunk without sync: {trunk.sip_trunk_id}")
                    return trunk.sip_trunk_id
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


async def _resolve_outbound_trunk_id(ctx: agents.JobContext, configured: str | None) -> str | None:
    """
    Resolve an outbound trunk ID. Supports:
    1) Direct trunk id (ST_xxx)
    2) Trunk name
    3) Auto-match by caller number
    4) Fallback to first available outbound trunk
    """
    if _is_trunk_id(configured):
        return configured

    requested = (configured or "").strip()
    caller_number = os.getenv("VOBIZ_CALLER_ID") or os.getenv("VOBIZ_OUTBOUND_NUMBER")

    try:
        trunks = await ctx.api.sip.list_outbound_trunk(api.ListSIPOutboundTrunkRequest())
    except Exception as e:
        logger.error(f"Failed to list outbound trunks: {e}")
        return configured

    if not trunks.items:
        return await _ensure_outbound_trunk(ctx)

    # 1) Match by trunk id/name when non-ST value is provided
    if requested:
        for trunk in trunks.items:
            if trunk.sip_trunk_id == requested or trunk.name == requested:
                logger.info(f"Resolved outbound trunk '{requested}' -> {trunk.sip_trunk_id}")
                return await _ensure_outbound_trunk(ctx)

    # 2) Match by caller number
    if caller_number:
        for trunk in trunks.items:
            if getattr(trunk, "numbers", None) and caller_number in trunk.numbers:
                logger.info(f"Resolved outbound trunk by caller number {caller_number} -> {trunk.sip_trunk_id}")
                return await _ensure_outbound_trunk(ctx)

    # 3) Try to create/fetch trunk using VoBiz credentials
    created_or_found = await _ensure_outbound_trunk(ctx)
    if _is_trunk_id(created_or_found):
        return created_or_found

    # 4) Fallback to first configured trunk
    fallback = trunks.items[0].sip_trunk_id
    logger.warning(f"Using fallback outbound trunk: {fallback}")
    return fallback


def _build_tts():
    """Configure the Text-to-Speech provider based on env vars."""
    provider = os.getenv("TTS_PROVIDER", "openai").lower()
    
    if provider == "cartesia":
        try:
            from livekit.plugins import cartesia
            logger.info("Using Cartesia TTS")
            model = os.getenv("CARTESIA_TTS_MODEL", "sonic-2")
            voice = os.getenv("CARTESIA_TTS_VOICE", "f786b574-daa5-4673-aa0c-cbe3e8534c02")
            return cartesia.TTS(model=model, voice=voice)
        except ImportError:
            logger.warning("Cartesia plugin not installed. Falling back to OpenAI TTS.")
    
    # Default to OpenAI
    logger.info("Using OpenAI TTS")
    model = os.getenv("OPENAI_TTS_MODEL", "tts-1")
    voice = os.getenv("OPENAI_TTS_VOICE", "shimmer")
    speed = _get_float_env("OPENAI_TTS_SPEED", 1.0)
    response_format = os.getenv("OPENAI_TTS_RESPONSE_FORMAT", "pcm").strip() or "pcm"
    instructions = (
        os.getenv("OPENAI_TTS_INSTRUCTIONS", "").strip()
        or "Speak in a soft, smooth, natural feminine voice. Avoid sharp emphasis and keep the delivery clear for phone audio."
    )
    logger.info(
        "OpenAI TTS config: model=%s voice=%s speed=%.2f format=%s",
        model,
        voice,
        speed,
        response_format,
    )
    return openai.TTS(
        model=model,
        voice=voice,
        speed=speed,
        instructions=instructions,
        response_format=response_format,
    )


def _build_stt():
    """Configure Speech-to-Text provider with safe fallback."""
    provider = os.getenv("STT_PROVIDER", "deepgram").lower()
    default_language = _get_default_language()

    if provider == "deepgram":
        if os.getenv("DEEPGRAM_API_KEY"):
            model = os.getenv("DEEPGRAM_STT_MODEL", "nova-3")
            language = os.getenv("DEEPGRAM_STT_LANGUAGE", "").strip() or ("hi" if default_language == "hi" else "multi")
            logger.info("Using Deepgram STT")
            return deepgram.STT(model=model, language=language)

        logger.warning("DEEPGRAM_API_KEY is missing. Falling back to OpenAI STT.")

    # Default/fallback: OpenAI STT
    model = os.getenv("OPENAI_STT_MODEL", "gpt-4o-mini-transcribe")
    language = os.getenv("OPENAI_STT_LANGUAGE", "").strip() or default_language
    use_realtime = _get_bool_env("OPENAI_STT_USE_REALTIME", True)
    turn_detection = {
        "type": "server_vad",
        "threshold": _get_float_env("OPENAI_STT_TURN_THRESHOLD", 0.45),
        "prefix_padding_ms": _get_int_env("OPENAI_STT_PREFIX_PADDING_MS", 250),
        "silence_duration_ms": _get_int_env("OPENAI_STT_SILENCE_DURATION_MS", 220),
    }
    logger.info(
        "Using OpenAI STT (language=%s, realtime=%s)",
        language or "auto",
        use_realtime,
    )
    stt_kwargs = {
        "model": model,
        "use_realtime": use_realtime,
    }
    if use_realtime:
        stt_kwargs["turn_detection"] = turn_detection
    if language:
        return openai.STT(language=language, **stt_kwargs)
    return openai.STT(**stt_kwargs)


def _build_realtime_llm():
    """Configure realtime audio provider for lower-latency voice output."""
    if _get_realtime_provider() == "google":
        model = os.getenv("GOOGLE_REALTIME_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025")
        voice = os.getenv("GOOGLE_REALTIME_VOICE", "Puck")
        logger.info(
            "Using Gemini Live audio (model=%s voice=%s language=%s)",
            model,
            voice,
            _get_realtime_language_code(),
        )
        extra_kwargs: dict = {}
        if _HAS_GOOGLE_GENAI_TYPES:
            # HIGH end-of-speech sensitivity + shorter silence window cuts Gemini's
            # turn-detection latency from ~7s down to ~1-2s.
            extra_kwargs["realtime_input_config"] = google_genai_types.RealtimeInputConfig(
                automatic_activity_detection=google_genai_types.AutomaticActivityDetection(
                    disabled=False,
                    start_of_speech_sensitivity=google_genai_types.StartSensitivity.START_SENSITIVITY_HIGH,
                    end_of_speech_sensitivity=google_genai_types.EndSensitivity.END_SENSITIVITY_HIGH,
                    prefix_padding_ms=20,
                    # Fix: was reading wrong env var GEMINI_SILENCE_DURATION_MS; correct
                    # name is GOOGLE_REALTIME_SILENCE_DURATION_MS (160ms in .env).
                    silence_duration_ms=_get_int_env("GOOGLE_REALTIME_SILENCE_DURATION_MS", 160),
                ),
                # START_OF_ACTIVITY_INTERRUPTS: lets the caller cut in instantly
                # without waiting for Gemini's turn to finish.
                activity_handling=google_genai_types.ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
            )
            # Enable transcription of user audio so logs/events carry full text
            extra_kwargs["input_audio_transcription"] = google_genai_types.AudioTranscriptionConfig()
            # Affective dialog makes Gemini mirror caller's emotional tone naturally
            extra_kwargs["enable_affective_dialog"] = True

        # Limit output tokens — shorter responses have lower TTFA (time-to-first-audio).
        # GOOGLE_REALTIME_MAX_OUTPUT_TOKENS=96 in .env; 0 means unlimited (slower).
        max_tokens = _get_int_env("GOOGLE_REALTIME_MAX_OUTPUT_TOKENS", 0)
        if max_tokens > 0:
            extra_kwargs["max_output_tokens"] = max_tokens

        return google.realtime.RealtimeModel(
            model=model,
            voice=voice,
            language=_get_realtime_language_code(),
            temperature=_get_float_env("OPENAI_REALTIME_TEMPERATURE", 0.7),
            instructions=_build_agent_instructions(),
            **extra_kwargs,
        )

    model = os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime")
    voice = os.getenv("OPENAI_REALTIME_VOICE", "marin")
    speed = _get_float_env("OPENAI_REALTIME_SPEED", 1.0)
    transcription_model = os.getenv("OPENAI_REALTIME_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe")
    transcription_language = os.getenv("OPENAI_REALTIME_TRANSCRIBE_LANGUAGE", "").strip() or _get_default_language()
    noise_reduction = os.getenv("OPENAI_REALTIME_INPUT_NOISE_REDUCTION", "near_field").strip() or None
    turn_detection = TurnDetection(
        type="server_vad",
        threshold=_get_float_env("OPENAI_REALTIME_TURN_THRESHOLD", 0.40),
        prefix_padding_ms=_get_int_env("OPENAI_REALTIME_PREFIX_PADDING_MS", 220),
        silence_duration_ms=_get_int_env("OPENAI_REALTIME_SILENCE_DURATION_MS", 180),
        create_response=True,
    )
    input_audio_transcription = InputAudioTranscription(
        model=transcription_model,
        language=transcription_language,
    )
    logger.info(
        "Using OpenAI Realtime audio (model=%s voice=%s language=%s speed=%.2f)",
        model,
        voice,
        transcription_language or "auto",
        speed,
    )
    return openai.realtime.RealtimeModel(
        model=model,
        voice=voice,
        modalities=["text", "audio"],
        speed=speed,
        input_audio_transcription=input_audio_transcription,
        input_audio_noise_reduction=noise_reduction,
        turn_detection=turn_detection,
    )


def _build_vad():
    """Low-latency VAD tuning for telephony calls."""
    return silero.VAD.load(
        min_speech_duration=_get_float_env("VAD_MIN_SPEECH_DURATION", 0.04),
        min_silence_duration=_get_float_env("VAD_MIN_SILENCE_DURATION", 0.25),
        prefix_padding_duration=_get_float_env("VAD_PREFIX_PADDING_DURATION", 0.25),
        activation_threshold=_get_float_env("VAD_ACTIVATION_THRESHOLD", 0.35),
        sample_rate=16000,
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
    agent_name = os.getenv("AGENT_PERSONA_NAME", "Shubhi")
    company = os.getenv("AGENT_COMPANY_NAME", "real estate company")
    default_language = os.getenv("AGENT_DEFAULT_LANGUAGE", "hi").strip().lower()

    if default_language == "hi":
        language_rule = (
            "Speak Hindi by default. Switch to English or Hinglish if the caller uses it. "
            "Use natural spoken Hindi — not formal written Hindi. Short sentences only."
        )
        filler_rule = (
            'Every REPLY to the user must begin with a spoken filler. (The opening greeting is exempt.)\n'
            '  • Short answer → "Haan ji," / "Achha," / "Bilkul," / "Theek hai,"\n'
            '  • Thinking/processing → "Hmm..." or "Ek second..." THEN answer\n'
            '  • Confusion → "Sorry, ek baar phir se bata sakte hain?"\n'
            '  • Agreeing → "Ji bilkul," / "Haan, zaroor,"\n'
            'BAD reply: "Toh aap kya chahte hain?" — no filler\n'
            'GOOD reply: "Achha, toh aap kya chahte hain?" — has filler\n'
            'RESPOND IMMEDIATELY when the user pauses — do not wait to see if they continue.'
        )
    else:
        language_rule = "Speak English by default. Switch to Hindi or Hinglish if the caller uses it. Short sentences only."
        filler_rule = (
            'Every REPLY to the user must begin with a spoken filler. (The opening greeting is exempt.)\n'
            '  • Short answer → "Right," / "Got it," / "Sure," / "I see,"\n'
            '  • Thinking → "Hmm..." or "One moment..." THEN answer\n'
            '  • Confusion → "Sorry, could you say that again?"\n'
            '  • Agreeing → "Absolutely," / "Of course,"\n'
            'BAD reply: "Are you looking to buy or rent?" — no filler\n'
            'GOOD reply: "Right, are you looking to buy or rent?" — has filler\n'
            'RESPOND IMMEDIATELY when the user pauses — do not wait to see if they continue.'
        )

    return f"""You are {agent_name}, a warm and friendly human voice assistant from {company}.

LANGUAGE: {language_rule}

FILLER WORDS — MANDATORY:
{filler_rule}

CONVERSATION STYLE:
- Keep replies to 1-2 short sentences — this is a phone call
- Ask only ONE question at a time
- NEVER say you are an AI or a bot — you are {agent_name}, a real person
- Mirror caller's energy: warm when friendly, calm when serious
- If caller says something unclear, ask to repeat rather than guess

CONVERSATION FLOW:
1. After caller acknowledges greeting → ask if it's a good time to talk
2. If yes → qualify gently: intent (buy/rent/invest), property type, budget, location
3. If no → ask for a good callback time, then end politely
4. If not interested → thank them warmly and say goodbye
5. If caller is confused → rephrase simply and ask again

TRANSFER: Use transfer_call ONLY if caller clearly says "transfer me" or "connect to agent". Never on short, noisy, or ambiguous input."""


class OutboundAssistant(Agent):

    """
    An AI agent tailored for outbound calls.
    Attempts to be helpful and concise.
    """
    def __init__(self) -> None:
        super().__init__(instructions=_build_agent_instructions())


def prewarm(proc: agents.JobProcess) -> None:
    """Keep expensive audio components ready in warm worker processes."""
    if not _use_realtime_audio():
        proc.userdata["vad"] = _build_vad()


async def _speak_scripted_line(
    session: AgentSession,
    *,
    text: str,
    realtime_audio: bool,
) -> None:
    """Play a scripted line.

    Realtime (Gemini Live / OpenAI Realtime): uses generate_reply() because the
    realtime model IS the audio pipeline — there is no separate TTS.

    Pipeline (STT → LLM → TTS): uses session.say() to bypass LLM entirely.
    """
    if realtime_audio:
        reply_kwargs: dict = {
            # Use natural-language instruction rather than verbatim script.
            # "Verbatim" instructions fight the system-prompt filler rule causing
            # Gemini to add "Achha," prefix and then paraphrase the rest.
            # Instead, instruct what content to convey — Gemini speaks it naturally.
            "instructions": (
                f"This is the opening of the call — NOT a reply to the user. "
                f"Deliver this greeting naturally without any leading filler word: {text}"
            ),
            "allow_interruptions": True,
            "input_modality": "text",
        }
        if _get_realtime_provider() != "google":
            reply_kwargs["tool_choice"] = "none"
        await session.generate_reply(**reply_kwargs)
        return

    await session.say(text, allow_interruptions=True, add_to_chat_ctx=True)


async def entrypoint(ctx: agents.JobContext):
    """
    Main entrypoint for the agent.
    
    For outbound calls:
    1. Checks for 'phone_number' in the job metadata.
    2. Connects to the room.
    3. Initiates the SIP call to the phone number.
    4. Waits for answer before speaking.
    """
    logger.info(f"Connecting to room: {ctx.room.name}")

    if not _validate_runtime_provider_keys(_use_realtime_audio()):
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

    # Initialize function context
    fnc_ctx = TransferFunctions(ctx, phone_number)
    last_user_speech_at = time.time()
    reprompt_task: asyncio.Task | None = None
    realtime_audio = _use_realtime_audio()
    if not _validate_runtime_provider_keys(realtime_audio):
        ctx.shutdown()
        return

    # Initialize the Agent Session with plugins
    if realtime_audio:
        session = AgentSession(
            llm=_build_realtime_llm(),
            tools=fnc_ctx.flatten(),
            turn_detection="realtime_llm",
            allow_interruptions=True,
            min_endpointing_delay=_get_float_env("SESSION_MIN_ENDPOINTING_DELAY", 0.10),
            max_endpointing_delay=_get_float_env("SESSION_MAX_ENDPOINTING_DELAY", 0.30),
            # 0.5s default prevents echo self-interruption; env can tighten further
            false_interruption_timeout=_get_float_env("SESSION_FALSE_INTERRUPTION_TIMEOUT", 0.50),
            user_away_timeout=_get_float_env("SESSION_USER_AWAY_TIMEOUT", 15.0),
        )
    else:
        vad = ctx.proc.userdata.get("vad") or _build_vad()
        stt = _build_stt()
        tts = _build_tts()
        if hasattr(tts, "prewarm"):
            try:
                tts.prewarm()
            except Exception as e:
                logger.debug(f"TTS prewarm skipped: {e}")

        session = AgentSession(
            stt=stt,
            vad=vad,
            llm=openai.LLM(model=os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")),
            tts=tts,
            tools=fnc_ctx.flatten(),
            allow_interruptions=True,
            min_interruption_duration=_get_float_env("SESSION_MIN_INTERRUPTION_DURATION", 0.10),
            min_endpointing_delay=_get_float_env("SESSION_MIN_ENDPOINTING_DELAY", 0.14),
            max_endpointing_delay=_get_float_env("SESSION_MAX_ENDPOINTING_DELAY", 0.45),
            false_interruption_timeout=_get_float_env("SESSION_FALSE_INTERRUPTION_TIMEOUT", 0.35),
            preemptive_generation=_get_bool_env("SESSION_PREEMPTIVE_GENERATION", True),
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

    resolved_trunk_id = await _start_session_and_resolve_trunk()

    @session.on("user_input_transcribed")
    def _on_user_input_transcribed(ev) -> None:
        nonlocal last_user_speech_at, reprompt_task
        transcript = (getattr(ev, "transcript", "") or "").strip()
        if not transcript:
            return
        last_user_speech_at = time.time()
        if reprompt_task and not reprompt_task.done():
            reprompt_task.cancel()
            reprompt_task = None
        logger.info(
            "user_input_transcribed final=%s language=%s text=\"%s\"",
            getattr(ev, "is_final", False),
            getattr(ev, "language", None),
            _safe_log_text(transcript),
        )
        if getattr(ev, "is_final", False):
            fnc_ctx.set_last_user_utterance(transcript)

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

    async def _reprompt_if_no_speech() -> None:
        """If caller stays silent/no transcript arrives, send a short reprompt."""
        delay = _get_float_env("NO_SPEECH_REPROMPT_SEC", 5.0)
        reprompt_text = _default_reprompt(_get_default_language())
        try:
            while True:
                await asyncio.sleep(1.0)
                if time.time() - last_user_speech_at < delay:
                    continue
                await _speak_scripted_line(
                    session,
                    text=reprompt_text,
                    realtime_audio=realtime_audio,
                )
                logger.info("No user speech detected; reprompt sent.")
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

        async def _send_greeting_and_start_reprompt() -> None:
            nonlocal last_user_speech_at, reprompt_task
            # Gemini WebSocket may still be establishing when participant_connected fires.
            # Give the session a short head-start before the first attempt so we don't
            # burn an attempt on a guaranteed timeout.
            await asyncio.sleep(_get_float_env("GREETING_INITIAL_DELAY_SEC", 0.8))
            _max_attempts = 6
            for _attempt in range(_max_attempts):
                try:
                    await _speak_scripted_line(session, text=first_message, realtime_audio=realtime_audio)
                    logger.info("Initial greeting sent.")
                    break
                except Exception as greet_error:
                    _err = str(greet_error).lower()
                    if _attempt < _max_attempts - 1 and ("timed out" in _err or "timeout" in _err):
                        # Cap backoff at 3s: 0.5, 1.0, 1.5, 2.0, 2.5 (capped)
                        _wait = min(0.5 * (_attempt + 1), 3.0)
                        logger.warning(
                            "Greeting timed out (model not ready yet), "
                            f"retrying in {_wait:.1f}s... (attempt {_attempt + 1}/{_max_attempts})"
                        )
                        await asyncio.sleep(_wait)
                    else:
                        logger.warning(f"Greeting failed: {greet_error}")
                        break
            # Reset silence timer so reprompt is measured from greeting end, not entrypoint start.
            last_user_speech_at = time.time()
            reprompt_task = asyncio.create_task(_reprompt_if_no_speech())

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
            # Safety: if participant_connected did not fire (edge case), trigger greeting now.
            if not _greeting_triggered:
                _greeting_triggered = True
                logger.warning("participant_connected did not fire; triggering greeting as fallback.")
                asyncio.ensure_future(_send_greeting_and_start_reprompt())

        except Exception as e:
            logger.error(f"Failed to place outbound call: {e}")
            if _greeting_task and not _greeting_task.done():
                _greeting_task.cancel()
            if reprompt_task and not reprompt_task.done():
                reprompt_task.cancel()
            ctx.shutdown()
    else:
        # Inbound / web call
        logger.info("No phone number in metadata. Treating as inbound/web call.")
        await _speak_scripted_line(session, text=inbound_greeting, realtime_audio=realtime_audio)


if __name__ == "__main__":
    # The agent name "outbound-caller" is used by the dispatch script to find this worker
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name="outbound-caller", 
            num_idle_processes=max(0, _get_int_env("AGENT_NUM_IDLE_PROCESSES", 1)),
        )
    )
