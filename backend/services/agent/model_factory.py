"""
Model factory for dynamically creating STT, LLM, TTS, and Realtime instances.
Primary provider: OpenAI (gpt-4o-mini-realtime-preview).
Fallback TTS: Cartesia, ElevenLabs.
"""
import logging
import os
from typing import Any

logger = logging.getLogger("model-factory")

# Try importing optional plugins
try:
    from livekit.plugins import openai as lk_openai
    _HAS_OPENAI = True
except ImportError:
    lk_openai = None
    _HAS_OPENAI = False

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
    """Create STT instance using OpenAI Whisper."""
    if not _HAS_OPENAI:
        raise ImportError("livekit-plugins-openai is required but not installed.")
    model = voice_config.get("stt_model", os.getenv("OPENAI_STT_MODEL", "whisper-1"))
    language = voice_config.get("stt_language", "hi")
    logger.info("Creating STT: provider=openai model=%s language=%s", model, language)
    return lk_openai.STT(model=model, language=language)


def get_llm(voice_config: dict) -> Any:
    """Create LLM instance using OpenAI GPT-4o-mini."""
    if not _HAS_OPENAI:
        raise ImportError("livekit-plugins-openai is required but not installed.")
    model = voice_config.get("llm_model", os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    logger.info("Creating LLM: provider=openai model=%s", model)
    return lk_openai.LLM(model=model)


def get_tts(voice_config: dict) -> Any:
    """Create TTS instance. Default: OpenAI TTS with shimmer (feminine) voice."""
    provider = voice_config.get("tts_provider", "openai")
    logger.info("Creating TTS: provider=%s", provider)

    if provider == "cartesia" and _HAS_CARTESIA:
        model = voice_config.get("tts_model", "sonic-2")
        voice_id = voice_config.get("voice_id", "")
        return cartesia.TTS(model=model, voice=voice_id)

    if provider == "elevenlabs" and _HAS_ELEVENLABS:
        model = voice_config.get("tts_model", "eleven_turbo_v2_5")
        voice_id = voice_config.get("voice_id", "")
        return elevenlabs.TTS(model_id=model, voice=voice_id)

    if not _HAS_OPENAI:
        raise ImportError("livekit-plugins-openai is required but not installed.")
    # shimmer = warm feminine voice; options: shimmer, coral, nova, alloy, echo, ash, sage, verse
    voice_name = voice_config.get("voice_id", os.getenv("OPENAI_TTS_VOICE", "shimmer"))
    model = voice_config.get("tts_model", os.getenv("OPENAI_TTS_MODEL", "tts-1"))
    return lk_openai.TTS(model=model, voice=voice_name)


def get_realtime_model(voice_config: dict) -> Any:
    """Create OpenAI Realtime model (STT + LLM + TTS in one WebSocket)."""
    if not _HAS_OPENAI:
        raise ImportError("livekit-plugins-openai is required but not installed.")
    model = voice_config.get("realtime_model", os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-mini-realtime-preview"))
    voice_id = voice_config.get("voice_id", os.getenv("OPENAI_TTS_VOICE", "shimmer"))
    temperature = voice_config.get("temperature", float(os.getenv("OPENAI_REALTIME_TEMPERATURE", "0.7")))
    logger.info("Creating Realtime: provider=openai model=%s voice=%s", model, voice_id)
    return lk_openai.realtime.RealtimeModel(
        model=model,
        voice=voice_id,
        temperature=temperature,
    )


def get_available_providers() -> dict:
    """Return available providers for client applications."""
    return {
        "stt": ["openai"] if _HAS_OPENAI else [],
        "llm": ["openai"] if _HAS_OPENAI else [],
        "tts": (["openai"] if _HAS_OPENAI else []) + (["cartesia"] if _HAS_CARTESIA else []) + (["elevenlabs"] if _HAS_ELEVENLABS else []),
        "realtime": ["openai"] if _HAS_OPENAI else [],
    }
