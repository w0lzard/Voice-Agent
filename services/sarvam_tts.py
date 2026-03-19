"""
Sarvam AI TTS Service
---------------------
LiveKit TTS plugin wrapping the Sarvam text-to-speech REST API.

Voice: Meera (natural female, Hindi/Hinglish)
Format: 22050 Hz, 16-bit signed PCM, mono
TTFB target: <400 ms

Features:
  - Process-wide audio cache for common phrases (fillers, greetings)
  - 20 ms frame chunking for smooth LiveKit playback
  - Linear resampling if Sarvam returns a non-standard rate
  - Graceful error handling with empty audio fallback
"""

import asyncio
import base64
import io
import logging
import os
import struct
import time
import wave
from typing import Optional

import aiohttp
from livekit.agents import tts, utils

logger = logging.getLogger("sarvam-tts")

# ── Sarvam API ────────────────────────────────────────────────────────────────
_API_URL     = "https://api.sarvam.ai/text-to-speech"
_SAMPLE_RATE = 22050   # request this rate; also declare it to LiveKit
_CHANNELS    = 1
_FRAME_MS    = 20      # 20 ms frames — LiveKit standard
_SAMPS_PER_FRAME = _SAMPLE_RATE * _FRAME_MS // 1000   # 441 samples
_MAX_CHARS   = 500     # Sarvam per-request character limit

# ── Process-wide audio cache ──────────────────────────────────────────────────
_AUDIO_CACHE: dict[str, bytes] = {}
_CACHE_MAX = 400       # max entries; each is ~100 KB (5 s of audio)


# ── Audio helpers ─────────────────────────────────────────────────────────────

def _wav_to_pcm(wav_bytes: bytes) -> tuple[bytes, int]:
    """Return (raw_pcm_s16le, sample_rate) from WAV bytes."""
    with wave.open(io.BytesIO(wav_bytes)) as wf:
        sr  = wf.getframerate()
        pcm = wf.readframes(wf.getnframes())
    return pcm, sr


def _resample_mono16(pcm: bytes, src: int, dst: int) -> bytes:
    """Linear interpolation resample of 16-bit mono PCM (src → dst Hz)."""
    if src == dst:
        return pcm
    n_src = len(pcm) // 2
    n_dst = max(1, round(n_src * dst / src))
    samps = struct.unpack(f"<{n_src}h", pcm)
    out   = []
    for i in range(n_dst):
        pos = i * src / dst
        lo  = int(pos)
        hi  = min(lo + 1, n_src - 1)
        t   = pos - lo
        out.append(int(samps[lo] + t * (samps[hi] - samps[lo])))
    return struct.pack(f"<{n_dst}h", *out)


# ── Core API fetch ────────────────────────────────────────────────────────────

async def _fetch_audio(
    text: str,
    *,
    api_key: str,
    speaker: str,
    model: str,
    language: str,
) -> bytes:
    """
    Call Sarvam TTS REST API.
    Returns raw 16-bit signed PCM at _SAMPLE_RATE Hz, mono.
    Results are process-cached keyed by (speaker, language, text).
    """
    cache_key = f"{speaker}|{language}|{text}"
    if cache_key in _AUDIO_CACHE:
        logger.debug("Sarvam cache hit (%d chars)", len(text))
        return _AUDIO_CACHE[cache_key]

    t0 = time.perf_counter()

    async with aiohttp.ClientSession() as sess:
        resp = await sess.post(
            _API_URL,
            headers={
                "api-subscription-key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "inputs":               [text[:_MAX_CHARS]],
                "target_language_code": language,
                "speaker":              speaker,
                "model":                model,
                "pitch":                0,
                "pace":                 1.0,
                "loudness":             1.5,
                "speech_sample_rate":   _SAMPLE_RATE,
                "enable_preprocessing": True,
            },
            timeout=aiohttp.ClientTimeout(total=12),
        )
        if resp.status != 200:
            body = await resp.text()
            raise RuntimeError(f"Sarvam TTS HTTP {resp.status}: {body[:300]}")
        data = await resp.json()

    ttfb_ms = (time.perf_counter() - t0) * 1000
    logger.info("Sarvam TTS %.0fms | speaker=%s | %d chars", ttfb_ms, speaker, len(text))

    audio_b64 = data["audios"][0]
    wav_bytes  = base64.b64decode(audio_b64)
    pcm, sr    = _wav_to_pcm(wav_bytes)

    if sr != _SAMPLE_RATE:
        pcm = _resample_mono16(pcm, sr, _SAMPLE_RATE)

    if len(_AUDIO_CACHE) < _CACHE_MAX:
        _AUDIO_CACHE[cache_key] = pcm

    return pcm


# ── LiveKit TTS plugin ────────────────────────────────────────────────────────

class _SarvamStream(tts.ChunkedStream):
    """Async stream that fetches Sarvam audio and emits 20 ms AudioFrame chunks."""

    def __init__(
        self,
        *,
        tts_instance: "SarvamTTS",
        input_text: str,
        conn_options,
        api_key: str,
        speaker: str,
        model: str,
        language: str,
    ) -> None:
        super().__init__(tts=tts_instance, input_text=input_text, conn_options=conn_options)
        self._api_key  = api_key
        self._speaker  = speaker
        self._model    = model
        self._language = language

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        req_id = utils.shortuuid("sarvam")
        stride = _SAMPS_PER_FRAME * 2   # bytes per frame (16-bit)

        output_emitter.initialize(
            request_id=req_id,
            sample_rate=_SAMPLE_RATE,
            num_channels=_CHANNELS,
            mime_type="audio/pcm",
        )

        try:
            pcm = await _fetch_audio(
                self._input_text,
                api_key=self._api_key,
                speaker=self._speaker,
                model=self._model,
                language=self._language,
            )
        except asyncio.CancelledError:
            return
        except Exception as exc:
            logger.error("Sarvam TTS fetch failed: %s", exc)
            return

        # Emit audio in _FRAME_MS-sized chunks
        for offset in range(0, len(pcm), stride):
            chunk = pcm[offset : offset + stride]
            if not chunk:
                break
            # Pad final short frame
            if len(chunk) < stride:
                chunk = chunk + b"\x00" * (stride - len(chunk))
            output_emitter.push(chunk)


class SarvamTTS(tts.TTS):
    """
    LiveKit TTS plugin for Sarvam AI.

    Speakers (set via SARVAM_SPEAKER env or speaker= param):
        anushka   — natural female Hindi/Hinglish  (default)
        manisha   — warm female
        abhilash  — male

    Languages (set via SARVAM_LANGUAGE env or language= param):
        hi-IN  — Hindi            (default)
        en-IN  — English (Indian accent)
        kn-IN, ta-IN, te-IN, ...  — other Indian languages

    Usage:
        tts = SarvamTTS()
        # livekit-agents framework calls synthesize() automatically
    """

    def __init__(
        self,
        *,
        api_key:  Optional[str] = None,
        speaker:  str = "anushka",
        model:    str = "bulbul:v2",
        language: str = "hi-IN",
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=_SAMPLE_RATE,
            num_channels=_CHANNELS,
        )
        self._api_key  = api_key  or os.getenv("SARVAM_API_KEY", "")
        self._speaker  = speaker  or os.getenv("SARVAM_SPEAKER", "anushka")
        self._model    = model
        self._language = language or os.getenv("SARVAM_LANGUAGE", "hi-IN")

        if not self._api_key:
            logger.warning(
                "SARVAM_API_KEY not set — Sarvam TTS will fail at runtime."
            )

    def synthesize(
        self,
        text: str,
        *,
        conn_options=None,
    ) -> _SarvamStream:
        return _SarvamStream(
            tts_instance=self,
            input_text=text,
            conn_options=conn_options,
            api_key=self._api_key,
            speaker=self._speaker,
            model=self._model,
            language=self._language,
        )

    def update_options(
        self,
        *,
        speaker:  Optional[str] = None,
        language: Optional[str] = None,
    ) -> None:
        """Dynamically switch voice / language mid-call."""
        if speaker:
            self._speaker  = speaker
        if language:
            self._language = language


async def warm_cache(clips: dict[str, str], *, api_key: str, speaker: str = "anushka", language: str = "hi-IN") -> None:
    """
    Pre-fetch audio for common phrases at startup.
    Call once during prewarm() to eliminate cold-start TTS latency.
    """
    tasks = [
        _fetch_audio(text, api_key=api_key, speaker=speaker, model="bulbul:v2", language=language)
        for text in clips.values()
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    ok = sum(1 for r in results if not isinstance(r, Exception))
    logger.info("Sarvam cache warm: %d/%d clips preloaded", ok, len(clips))
