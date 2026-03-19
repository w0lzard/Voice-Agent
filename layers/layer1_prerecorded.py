"""
Layer 1: Pre-recorded Voice Layer
----------------------------------
Pre-generates greeting + filler audio via OpenAI TTS at agent startup.
Caches raw PCM bytes in memory so first-word playback is instant (0 latency
after the realtime session is ready — no TTS round-trip at call time).

Audio format: PCM 16-bit, 24 kHz, mono (matches OpenAI Realtime output).
"""

import asyncio
import logging
import os
import time
from typing import Optional

import aiohttp

logger = logging.getLogger("layer1-prerecorded")

# Default clips to pre-generate at startup.
# Keys are short identifiers; values are the text that will be spoken.
DEFAULT_CLIPS: dict[str, str] = {
    "greeting_hi": "Namaste, mera naam Shubhi hai aur main Anantasutra se bol rahi hoon.",
    "greeting_en": "Hello! This is Shubhi from Anantasutra. How can I help you today?",
    "filler_checking": "Ek second, main check kar rahi hoon.",
    "filler_moment": "Ji, ek moment.",
    "filler_sure": "Bilkul, samajh gayi.",
    "filler_okay": "Achha ji.",
    "busy_hi": (
        "Namaste! Abhi hamare saare agents busy hain. "
        "Kripya thodi der baad call karein. Dhanyavaad!"
    ),
    "busy_en": (
        "Hello! All our agents are currently busy. "
        "Please try calling again shortly. Thank you!"
    ),
}


class PrerecordedLayer:
    """
    Manages pre-generated TTS audio clips for zero-latency playback.

    Usage:
        layer1 = PrerecordedLayer()
        await layer1.preload()          # call once at startup
        audio = layer1.get("greeting_hi")   # returns raw PCM bytes or None
    """

    def __init__(
        self,
        clips: Optional[dict[str, str]] = None,
        voice: str = "alloy",
        model: str = "tts-1",
        sample_rate: int = 24000,
    ):
        self._clips = clips or DEFAULT_CLIPS
        self._voice = voice
        self._model = model
        self._sample_rate = sample_rate
        self._cache: dict[str, bytes] = {}
        self._ready = False
        self._api_key = os.getenv("OPENAI_API_KEY", "")

    async def preload(self) -> None:
        """
        Pre-generate all clips in parallel at startup.
        Non-blocking: failures are logged but do not raise.
        """
        if not self._api_key:
            logger.warning("Layer1: OPENAI_API_KEY not set — preload skipped.")
            return

        logger.info("Layer1: Pre-generating %d audio clips...", len(self._clips))
        start = time.time()
        tasks = {key: self._generate(text) for key, text in self._clips.items()}
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)

        for key, result in zip(tasks.keys(), results):
            if isinstance(result, (Exception, BaseException)):
                logger.warning("Layer1: Failed to preload '%s': %s", key, result)
            elif result:
                self._cache[key] = result
                logger.debug("Layer1: Cached '%s' (%d bytes)", key, len(result))

        elapsed = (time.time() - start) * 1000
        logger.info(
            "Layer1: Preloaded %d/%d clips in %.0f ms",
            len(self._cache),
            len(self._clips),
            elapsed,
        )
        self._ready = True

    async def _generate(self, text: str) -> bytes:
        """Call OpenAI TTS REST API and return raw PCM bytes."""
        async with aiohttp.ClientSession() as session:
            resp = await session.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self._model,
                    "input": text,
                    "voice": self._voice,
                    "response_format": "pcm",  # raw 16-bit PCM, 24 kHz, mono
                    "speed": 1.0,
                },
                timeout=aiohttp.ClientTimeout(total=15),
            )
            if resp.status == 200:
                return await resp.read()
            body = await resp.text()
            raise RuntimeError(f"TTS HTTP {resp.status}: {body[:200]}")

    def get(self, key: str) -> Optional[bytes]:
        """Return cached PCM bytes for a clip key, or None if not ready."""
        return self._cache.get(key)

    def add_clip(self, key: str, text: str) -> None:
        """Register a new clip key for future preload() calls."""
        self._clips[key] = text

    @property
    def is_ready(self) -> bool:
        return self._ready

    @property
    def loaded_clips(self) -> list[str]:
        return list(self._cache.keys())


# Module-level singleton — shared across all calls in one process.
prerecorded = PrerecordedLayer(
    voice=os.getenv("OPENAI_TTS_VOICE", "alloy"),
    model=os.getenv("OPENAI_TTS_MODEL", "tts-1"),
)
