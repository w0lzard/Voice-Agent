"""
Model factory for dynamically creating STT, LLM, TTS, and Realtime instances.
All providers use Google/Gemini. OpenAI has been removed.
"""
import logging
import os
from typing import Any

logger = logging.getLogger("model-factory")

# Try importing optional plugins
try:
    from livekit.plugins import google
    _HAS_GOOGLE = True
except ImportError:
    google = None
    _HAS_GOOGLE = False

try:
    from livekit.plugins import elevenlabs
    _HAS_ELEVENLABS = True
except ImportError:
    elevenlabs = None
    _HAS_ELEVENLABS = False

try:
    from livekit.plugins import cartesia
    _HAS_CARTESIA = True
except ImportError:
    cartesia = None
    _HAS_CARTESIA = False


def get_stt(voice_config: dict) -> Any:
    """Create STT instance. Falls back to Google STT."""
    if not _HAS_GOOGLE:
        raise ImportError("livekit-plugins-google is required but not installed.")
    provider = voice_config.get("stt_provider", "google")
    model = voice_config.get("stt_model", "latest_long")
    language = voice_config.get("stt_language", "hi-IN")
    logger.info("Creating STT: provider=%s model=%s language=%s", provider, model, language)
    return google.STT(model=model, language=language)


def get_llm(voice_config: dict) -> Any:
    """Create LLM instance. Uses Google Gemini."""
    if not _HAS_GOOGLE:
        raise ImportError("livekit-plugins-google is required but not installed.")
    model = voice_config.get("llm_model", os.getenv("GOOGLE_LLM_MODEL", "gemini-2.5-flash"))
    logger.info("Creating LLM: provider=google model=%s", model)
    return google.LLM(model=model)


def get_tts(voice_config: dict) -> Any:
    """Create TTS instance. Uses Google Gemini TTS or Cartesia."""
    provider = voice_config.get("tts_provider", "google")
    logger.info("Creating TTS: provider=%s", provider)

    if provider == "cartesia" and _HAS_CARTESIA:
        model = voice_config.get("tts_model", "sonic-2")
        voice_id = voice_config.get("voice_id", "")
        return cartesia.TTS(model=model, voice=voice_id)

    if provider == "elevenlabs" and _HAS_ELEVENLABS:
        model = voice_config.get("tts_model", "eleven_turbo_v2_5")
        voice_id = voice_config.get("voice_id", "")
        return elevenlabs.TTS(model_id=model, voice=voice_id)

    if not _HAS_GOOGLE:
        raise ImportError("livekit-plugins-google is required but not installed.")
    voice_name = voice_config.get("voice_id", os.getenv("GOOGLE_REALTIME_VOICE", "Kore"))
    language = voice_config.get("language", "hi-IN")
    return google.TTS(
        model_name="gemini-2.5-flash-tts",
        voice_name=voice_name,
        language=language,
    )


def get_realtime_model(voice_config: dict) -> Any:
    """Create Gemini Live realtime model."""
    if not _HAS_GOOGLE:
        raise ImportError("livekit-plugins-google is required but not installed.")
    model = voice_config.get("realtime_model", os.getenv("GOOGLE_REALTIME_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"))
    voice_id = voice_config.get("voice_id", os.getenv("GOOGLE_REALTIME_VOICE", "Kore"))
    temperature = voice_config.get("temperature", float(os.getenv("GOOGLE_REALTIME_TEMPERATURE", "0.7")))
    language = voice_config.get("language", "hi-IN")
    logger.info("Creating Realtime: provider=google model=%s voice=%s", model, voice_id)
    return google.realtime.RealtimeModel(
        model=model,
        voice=voice_id,
        language=language,
        temperature=temperature,
    )


def get_available_providers() -> dict:
    """Return available providers for client applications."""
    return {
        "stt": ["google"],
        "llm": ["google"],
        "tts": ["google"] + (["cartesia"] if _HAS_CARTESIA else []) + (["elevenlabs"] if _HAS_ELEVENLABS else []),
        "realtime": ["google"],
    }
