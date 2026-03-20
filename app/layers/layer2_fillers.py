"""
Layer 2: Smart Filler Layer
-----------------------------
Monitors AI processing time and injects natural short phrases when the
Realtime model has not yet started speaking (i.e. LLM is still thinking).

Prevents awkward dead-air silence without sounding robotic:
 - Fillers are randomized from a pool
 - A minimum interval prevents repetition
 - Deactivated instantly when the agent starts speaking

Architecture:
    _processing_start set when user finishes speaking
    monitor_and_inject() waits FILLER_DELAY_SEC, then injects ONE filler
    Cancelled automatically if agent speaks before the delay
"""

import asyncio
import logging
import random
import time
from typing import Optional

logger = logging.getLogger("layer2-fillers")

# ─── Filler pools ────────────────────────────────────────────────────────────

_HINDI_FILLERS = [
    "Achha...",
    "Bilkul...",
    "Ek sec...",
    "Main check kar rahi hoon...",
]

_ENGLISH_FILLERS = [
    "Let me check on that...",
    "One moment please...",
    "Sure, give me a second...",
    "Got it, just a moment...",
    "Alright, let me see...",
    "Okay, one moment...",
]

_HINGLISH_FILLERS = [
    "Achha...",
    "Bilkul...",
    "Ek sec...",
]


class FillerLayer:
    """
    Smart filler injection to cover LLM processing delays.

    Usage:
        filler = FillerLayer(delay_threshold=0.9)

        # Start monitoring when user finishes speaking
        task = asyncio.create_task(filler.monitor_and_inject(session))

        # Cancel when agent starts speaking (called from agent_speaking event)
        task.cancel()
    """

    def __init__(
        self,
        delay_threshold: float = 0.9,
        min_interval: float = 4.0,
        language: str = "hinglish",
    ):
        """
        Args:
            delay_threshold: Seconds of silence before injecting a filler.
            min_interval:    Minimum seconds between consecutive fillers.
            language:        "hi" | "en" | "hinglish"
        """
        self._threshold = delay_threshold
        self._min_interval = min_interval
        self._language = language
        self._last_injected_at: float = 0.0
        self._pool: list[str] = self._build_pool(language)
        self._used: list[str] = []  # track recently used to avoid repetition

    def _build_pool(self, language: str) -> list[str]:
        if language == "hi":
            return list(_HINDI_FILLERS)
        if language == "en":
            return list(_ENGLISH_FILLERS)
        # hinglish: mix all three
        return list(_HINDI_FILLERS + _HINGLISH_FILLERS + _ENGLISH_FILLERS)

    def _pick_filler(self) -> str:
        """Pick a random filler, avoiding the last 3 used."""
        available = [f for f in self._pool if f not in self._used[-3:]]
        if not available:
            available = self._pool
        choice = random.choice(available)
        self._used.append(choice)
        return choice

    def _should_inject(self) -> bool:
        now = time.time()
        return (now - self._last_injected_at) >= self._min_interval

    async def monitor_and_inject(
        self,
        session,  # AgentSession
        processing_start: Optional[float] = None,
        on_injected=None,
        can_inject=None,
        say_fn=None,
        allow_interruptions: bool = True,
    ) -> None:
        """
        Wait `delay_threshold` seconds, then inject ONE filler if the agent
        hasn't spoken yet.

        This coroutine should be wrapped in asyncio.create_task() so it can
        be cancelled the moment the agent starts speaking.

        Args:
            session:          The active AgentSession.
            processing_start: Timestamp when processing began (defaults to now).
        """
        _start = processing_start or time.time()
        try:
            await asyncio.sleep(self._threshold)

            if not self._should_inject():
                logger.debug("Layer2: Filler skipped (too soon after last one).")
                return

            if can_inject is not None and not can_inject():
                logger.debug("Layer2: Filler skipped (state no longer allows injection).")
                return

            filler = self._pick_filler()
            self._last_injected_at = time.time()
            elapsed = (time.time() - _start) * 1000

            logger.info(
                "Layer2: Injecting filler after %.0f ms silence: '%s'",
                elapsed,
                filler,
            )
            if on_injected is not None:
                try:
                    on_injected(filler)
                except Exception as callback_err:
                    logger.debug("Layer2: on_injected callback failed: %s", callback_err)
            if say_fn is not None:
                await say_fn(filler)
            else:
                await session.say(
                    filler,
                    allow_interruptions=allow_interruptions,
                    add_to_chat_ctx=False,
                )

        except asyncio.CancelledError:
            # Normal — agent started speaking before the delay expired.
            logger.debug("Layer2: Filler cancelled (agent responded in time).")
        except Exception as e:
            logger.warning("Layer2: Filler injection failed: %s", e)

    def update_language(self, language: str) -> None:
        """Dynamically switch filler language mid-call."""
        self._language = language
        self._pool = self._build_pool(language)


# Module-level singleton — default to Hindi fillers so the agent never
# injects English fillers during a Hindi-language call.  Callers that
# actually want English fillers can set FILLER_LANGUAGE=en in the env.
filler_layer = FillerLayer(
    delay_threshold=float(__import__("os").getenv("FILLER_DELAY_SEC", "1.2")),
    language=__import__("os").getenv("FILLER_LANGUAGE", "hi"),
)
