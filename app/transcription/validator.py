"""
Transcription Validator
-----------------------
Validates and enriches raw STT output:
  - Detects noise markers emitted by STT engines
  - Detects foreign-script artefacts (carrier line noise)
  - Cleans transcripts (strips markers, normalises whitespace)
  - Detects language (hi / en / hinglish)
  - Broadcasts transcript events to ws_server for the live dashboard

Used for both real-time display and post-call analysis.
"""

import asyncio
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Optional

import aiohttp

logger = logging.getLogger("transcription")

# ── Unicode ranges ─────────────────────────────────────────────────────────────
_DEVANAGARI = (0x0900, 0x097F)  # Hindi
_LATIN = (0x0020, 0x024F)       # English + extended Latin

# STT noise markers emitted by various engines
_NOISE_MARKER_RE = re.compile(r"^<[a-z_]+>$", re.IGNORECASE)
_PUNCTUATION_ONLY_RE = re.compile(r"^[^\w\u0900-\u097F]+$")  # no letters/digits


@dataclass
class TranscriptEntry:
    raw: str
    cleaned: str
    is_noise: bool
    is_foreign_script: bool
    language: str               # "hi" | "en" | "hinglish" | "unknown"
    role: str = "user"          # "user" | "agent"
    call_id: str = ""
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "type": "transcript",
            "role": self.role,
            "raw": self.raw,
            "cleaned": self.cleaned,
            "is_noise": self.is_noise,
            "is_foreign_script": self.is_foreign_script,
            "language": self.language,
            "call_id": self.call_id,
            "timestamp": self.timestamp,
        }


# ── Core analysis functions ────────────────────────────────────────────────────

def is_noise(text: str) -> bool:
    """Return True for clear STT artefacts that are never real speech."""
    s = text.strip()
    if not s:
        return True
    if _NOISE_MARKER_RE.match(s):   # <noise>, <crosstalk>, <inaudible>
        return True
    if _PUNCTUATION_ONLY_RE.match(s):  # "...", "!", "?" with no letters
        return True
    return False


def is_foreign_script(text: str) -> bool:
    """
    Return True when every alphabetic character is outside Latin + Devanagari.
    Used to flag Telugu, Arabic, Cyrillic, etc. carrier-line artefacts.
    """
    alpha = [c for c in text if c.isalpha()]
    if not alpha:
        return False

    def allowed(c: str) -> bool:
        cp = ord(c)
        return (
            _LATIN[0] <= cp <= _LATIN[1]
            or _DEVANAGARI[0] <= cp <= _DEVANAGARI[1]
        )

    return all(not allowed(c) for c in alpha)


def detect_language(text: str) -> str:
    """
    Heuristic language detector: hi / en / hinglish / unknown.
    Hinglish = mix of Devanagari and Latin characters.
    """
    alpha = [c for c in text if c.isalpha()]
    if not alpha:
        return "unknown"

    devanagari = sum(
        1 for c in alpha if _DEVANAGARI[0] <= ord(c) <= _DEVANAGARI[1]
    )
    latin = sum(1 for c in alpha if _LATIN[0] <= ord(c) <= _LATIN[1])

    total = devanagari + latin
    if total == 0:
        return "unknown"

    deva_ratio = devanagari / total
    if deva_ratio > 0.85:
        return "hi"
    if deva_ratio < 0.15:
        return "en"
    return "hinglish"


def clean(text: str) -> str:
    """Strip STT noise markers and normalise whitespace."""
    t = text.strip()
    t = re.sub(r"<[a-z_]+>", "", t, flags=re.IGNORECASE)  # strip <noise> etc.
    t = " ".join(t.split())                                 # collapse whitespace
    return t


# ── Main entry point ──────────────────────────────────────────────────────────

def validate(
    raw: str,
    role: str = "user",
    call_id: str = "",
) -> TranscriptEntry:
    """
    Validate and enrich a raw STT transcript.

    Returns a TranscriptEntry with:
      - cleaned text
      - noise/foreign-script flags
      - language detection
    """
    cleaned = clean(raw)
    return TranscriptEntry(
        raw=raw,
        cleaned=cleaned,
        is_noise=is_noise(raw),
        is_foreign_script=is_foreign_script(raw),
        language=detect_language(cleaned),
        role=role,
        call_id=call_id,
    )


# ── Async broadcast (non-blocking) ────────────────────────────────────────────

_WS_SERVER_URL = "http://localhost:8090/event"

# Module-level shared session — avoids creating (and leaking) a new TCP
# connection for every single transcript event.  The force_close connector
# ensures connections are torn down immediately after each POST, preventing
# the "Unclosed connection" asyncio errors that cause audio timing jitter.
_shared_session: Optional[aiohttp.ClientSession] = None


def _get_session() -> aiohttp.ClientSession:
    global _shared_session
    if _shared_session is None or _shared_session.closed:
        connector = aiohttp.TCPConnector(force_close=True, limit=4)
        _shared_session = aiohttp.ClientSession(
            connector=connector,
            timeout=aiohttp.ClientTimeout(total=1.0),
        )
    return _shared_session


async def broadcast_transcript(entry: TranscriptEntry) -> None:
    """
    POST transcript event to ws_server for live dashboard display.
    Silently ignored if the server is not running.
    """
    try:
        session = _get_session()
        await session.post(_WS_SERVER_URL, json=entry.to_dict())
    except Exception:
        pass
