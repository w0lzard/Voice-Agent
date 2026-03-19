"""
Deepgram STT Service
--------------------
Factory for the livekit-plugins-deepgram STT plugin, pre-configured for
Hindi/Hinglish real estate calls with streaming interim results.

Key settings:
  model            = nova-2-general  (best multilingual accuracy)
  language         = hi              (Hindi; override with DEEPGRAM_LANGUAGE)
  interim_results  = True            (enables partial transcripts)
  smart_format     = True            (adds punctuation, numbers)
  endpointing      = 300             (ms silence before utterance end)
  utterance_end_ms = 1000            (fallback end-of-utterance signal)

Set DEEPGRAM_LANGUAGE=multi for mixed Hindi/English calls.
"""

import logging
import os

logger = logging.getLogger("deepgram-stt")

_DEFAULT_MODEL    = "nova-2-general"
_DEFAULT_LANGUAGE = "hi"


def build_deepgram_stt(
    language: str | None = None,
    model:    str | None = None,
):
    """
    Build and return a configured deepgram.STT instance.

    Raises ImportError if livekit-plugins-deepgram is not installed.
    """
    try:
        from livekit.plugins import deepgram
    except ImportError as exc:
        raise ImportError(
            "livekit-plugins-deepgram is required. "
            "Run: pip install livekit-plugins-deepgram"
        ) from exc

    api_key = os.getenv("DEEPGRAM_API_KEY", "")
    if not api_key:
        logger.warning("DEEPGRAM_API_KEY not set — Deepgram STT will fail at runtime.")

    lang = language or os.getenv("DEEPGRAM_LANGUAGE", _DEFAULT_LANGUAGE)
    mdl  = model    or os.getenv("DEEPGRAM_MODEL",    _DEFAULT_MODEL)

    logger.info("Deepgram STT: model=%s language=%s", mdl, lang)

    endpointing = int(os.getenv("DEEPGRAM_ENDPOINTING_MS", "200"))

    return deepgram.STT(
        api_key=api_key,
        model=mdl,
        language=lang,
        interim_results=True,
        smart_format=True,
        punctuate=True,
        # Deepgram endpointing: ms of silence before end-of-utterance
        endpointing_ms=endpointing,
    )
