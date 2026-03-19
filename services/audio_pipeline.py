"""
Audio Pipeline
--------------
Factory that assembles the full 3-layer voice pipeline:

    Mic → Deepgram STT → (interim) → LLM → sentence chunks → Sarvam TTS → LiveKit audio

Components:
  STT  — Deepgram nova-2 streaming WebSocket  (real-time, interim+final)
  LLM  — OpenAI gpt-4o-mini chat completion   (token streaming)
  TTS  — Sarvam Meera female voice            (sentence-level parallelism)
  VAD  — Silero VAD                           (turn detection)

Latency instrumentation hooks are registered here so the latency tracker
receives precise STT / LLM / TTS timestamps independent of the agent logic.
"""

import logging
import os
from typing import Optional

logger = logging.getLogger("audio-pipeline")


def build_stt(language: Optional[str] = None):
    """Return a configured Deepgram STT instance."""
    from services.deepgram_stt import build_deepgram_stt
    return build_deepgram_stt(language=language)


def build_llm():
    """Return a configured OpenAI LLM instance (non-realtime chat completion)."""
    try:
        from livekit.plugins import openai as lk_openai
    except ImportError as exc:
        raise ImportError("livekit-plugins-openai is required.") from exc

    model = os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")
    logger.info("LLM: OpenAI %s", model)

    return lk_openai.LLM(
        model=model,
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.3,
        max_tokens=60,
        top_p=0.9,
    )


# Map short BCP-47 codes (used by Deepgram) to full locale codes (required by Sarvam)
_SARVAM_LANG_MAP = {
    "hi":  "hi-IN",
    "en":  "en-IN",
    "bn":  "bn-IN",
    "gu":  "gu-IN",
    "kn":  "kn-IN",
    "ml":  "ml-IN",
    "mr":  "mr-IN",
    "od":  "od-IN",
    "pa":  "pa-IN",
    "ta":  "ta-IN",
    "te":  "te-IN",
}


def build_tts(
    speaker:  Optional[str] = None,
    language: Optional[str] = None,
):
    """Return a configured SarvamTTS instance."""
    from services.sarvam_tts import SarvamTTS

    spk = speaker  or os.getenv("SARVAM_SPEAKER",  "anushka")
    raw = language or os.getenv("SARVAM_LANGUAGE", "hi-IN")
    lng = _SARVAM_LANG_MAP.get(raw, raw)  # expand "hi" → "hi-IN" etc.

    logger.info("TTS: Sarvam %s (%s)", spk, lng)
    return SarvamTTS(
        api_key=os.getenv("SARVAM_API_KEY"),
        speaker=spk,
        language=lng,
    )


def build_vad():
    """
    Return a Silero VAD instance for turn detection in pipeline mode.
    The Silero ONNX model is downloaded automatically on first use (~1 MB).
    """
    try:
        from livekit.plugins import silero
        # VAD is ultra-over-sensitive to Indian PSTN noise, holding turn state for 6+ seconds.
        # We crank up activation_threshold so it only triggers on real, confident human speech.
        vad = silero.VAD.load(activation_threshold=0.6, min_speech_duration=0.15)
        logger.info("VAD: Silero loaded with threshold=0.6")
        return vad
    except Exception as exc:
        logger.warning("Silero VAD not available (%s) — using None", exc)
        return None


def build_pipeline(
    language: Optional[str] = None,
    speaker:  Optional[str] = None,
):
    """
    Build all pipeline components and return (stt, llm, tts, vad).

    Usage in agent.py:
        stt, llm, tts, vad = build_pipeline()
        session = AgentSession(stt=stt, llm=llm, tts=tts, vad=vad, ...)
    """
    stt = build_stt(language=language)
    llm = build_llm()
    tts = build_tts(speaker=speaker, language=language)
    vad = build_vad()
    return stt, llm, tts, vad
