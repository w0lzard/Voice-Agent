"""
Latency Tracker
---------------
Measures STT / LLM / TTS timing for every turn and logs structured metrics.
Also broadcasts events to the ws_server (if running) for the live dashboard.

Metric definitions:
  stt_ms       — time from first audio frame to final transcript
  llm_ttfb_ms  — time from final transcript to first LLM response token (TTFB)
  llm_ms       — total LLM generation time
  tts_ttfb_ms  — time from LLM start to first audio byte out
  total_ms     — end-to-end: user stops speaking → first agent audio byte
"""

import asyncio
import json
import logging
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from typing import Callable, Optional

import aiohttp

logger = logging.getLogger("latency-tracker")


@dataclass
class LatencyEvent:
    call_id: str
    turn_id: int = 0
    timestamp: float = field(default_factory=time.time)

    # Raw timestamps (None = not captured yet)
    stt_start: Optional[float] = None
    stt_end: Optional[float] = None
    llm_start: Optional[float] = None
    llm_first_token: Optional[float] = None
    llm_end: Optional[float] = None
    tts_start: Optional[float] = None
    tts_first_audio: Optional[float] = None
    tts_end: Optional[float] = None

    # Derived metrics (ms) ─────────────────────────────────────────────────

    @property
    def stt_ms(self) -> Optional[float]:
        if self.stt_start and self.stt_end:
            return (self.stt_end - self.stt_start) * 1000
        return None

    @property
    def llm_ttfb_ms(self) -> Optional[float]:
        """Time from user finishing speech to first LLM token."""
        if self.llm_start and self.llm_first_token:
            return (self.llm_first_token - self.llm_start) * 1000
        return None

    @property
    def llm_ms(self) -> Optional[float]:
        if self.llm_start and self.llm_end:
            return (self.llm_end - self.llm_start) * 1000
        return None

    @property
    def tts_ttfb_ms(self) -> Optional[float]:
        """Time from TTS request to first audio byte."""
        if self.tts_start and self.tts_first_audio:
            return (self.tts_first_audio - self.tts_start) * 1000
        return None

    @property
    def tts_ms(self) -> Optional[float]:
        if self.tts_start and self.tts_end:
            return (self.tts_end - self.tts_start) * 1000
        return None

    @property
    def total_ms(self) -> Optional[float]:
        """End-to-end: user stops speaking → first agent audio byte."""
        start = self.stt_end or self.llm_start
        end = self.tts_first_audio or self.tts_end or self.llm_end
        if start and end and end > start:
            return (end - start) * 1000
        return None

    def to_dict(self) -> dict:
        return {
            "type": "latency",
            "call_id": self.call_id,
            "turn_id": self.turn_id,
            "timestamp": self.timestamp,
            "stt_ms": round(self.stt_ms, 1) if self.stt_ms else None,
            "llm_ttfb_ms": round(self.llm_ttfb_ms, 1) if self.llm_ttfb_ms else None,
            "llm_ms": round(self.llm_ms, 1) if self.llm_ms else None,
            "tts_ttfb_ms": round(self.tts_ttfb_ms, 1) if self.tts_ttfb_ms else None,
            "tts_ms": round(self.tts_ms, 1) if self.tts_ms else None,
            "total_ms": round(self.total_ms, 1) if self.total_ms else None,
        }


class LatencyTracker:
    """
    Per-call latency tracker. Create one instance per call, or use the
    module-level `tracker` singleton for simple use cases.

    Example:
        ev = tracker.start_turn(call_id)
        ev.stt_start = time.time()
        ev.stt_end = time.time()
        ev.llm_start = time.time()
        ...
        tracker.finish_turn(call_id)
    """

    def __init__(self, max_history: int = 200, ws_server_url: Optional[str] = None):
        self._history: deque[LatencyEvent] = deque(maxlen=max_history)
        self._active: dict[str, LatencyEvent] = {}
        self._turn_counters: dict[str, int] = {}
        self._callbacks: list[Callable[[LatencyEvent], None]] = []
        self._ws_url = ws_server_url or "http://localhost:8090/event"
        self._session: Optional[aiohttp.ClientSession] = None

    # ── Public API ────────────────────────────────────────────────────────

    def start_turn(self, call_id: str) -> LatencyEvent:
        """Begin a new latency measurement turn. Returns the event to fill in."""
        n = self._turn_counters.get(call_id, 0) + 1
        self._turn_counters[call_id] = n
        ev = LatencyEvent(call_id=call_id, turn_id=n)
        self._active[call_id] = ev
        return ev

    def current(self, call_id: str) -> Optional[LatencyEvent]:
        return self._active.get(call_id)

    def finish_turn(self, call_id: str) -> None:
        """Finalize the turn, log it, notify callbacks, and broadcast."""
        ev = self._active.pop(call_id, None)
        if not ev:
            return
        self._history.append(ev)
        self._log(ev)
        self._notify(ev)
        asyncio.ensure_future(self._broadcast(ev))

    def register_callback(self, cb: Callable[[LatencyEvent], None]) -> None:
        """Register a sync callback invoked after each completed turn."""
        self._callbacks.append(cb)

    def stats(self) -> dict:
        """Return aggregate statistics across all recorded turns."""
        if not self._history:
            return {"total_turns": 0}

        totals = [e.total_ms for e in self._history if e.total_ms]
        stts = [e.stt_ms for e in self._history if e.stt_ms]
        llm_ttfbs = [e.llm_ttfb_ms for e in self._history if e.llm_ttfb_ms]
        ttss = [e.tts_ms for e in self._history if e.tts_ms]

        def avg(lst):
            return round(sum(lst) / len(lst), 1) if lst else None

        def p95(lst):
            if not lst:
                return None
            return round(sorted(lst)[int(len(lst) * 0.95)], 1)

        return {
            "total_turns": len(self._history),
            "avg_total_ms": avg(totals),
            "p95_total_ms": p95(totals),
            "avg_stt_ms": avg(stts),
            "avg_llm_ttfb_ms": avg(llm_ttfbs),
            "avg_tts_ms": avg(ttss),
        }

    # ── Internal ──────────────────────────────────────────────────────────

    def _log(self, ev: LatencyEvent) -> None:
        logger.info(
            "⏱ Latency [%s#%d] STT=%.0fms | LLM-TTFB=%.0fms | TTS-TTFB=%.0fms | TOTAL=%.0fms",
            ev.call_id[:8],
            ev.turn_id,
            ev.stt_ms or 0,
            ev.llm_ttfb_ms or 0,
            ev.tts_ttfb_ms or 0,
            ev.total_ms or 0,
        )

    def _notify(self, ev: LatencyEvent) -> None:
        for cb in self._callbacks:
            try:
                cb(ev)
            except Exception as e:
                logger.debug("Latency callback error: %s", e)

    def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            connector = aiohttp.TCPConnector(force_close=True, limit=4)
            self._session = aiohttp.ClientSession(
                connector=connector,
                timeout=aiohttp.ClientTimeout(total=1.0),
            )
        return self._session

    async def _broadcast(self, ev: LatencyEvent) -> None:
        """Fire-and-forget POST to ws_server. Silently ignored if server not running."""
        try:
            session = self._get_session()
            await session.post(self._ws_url, json=ev.to_dict())
        except Exception:
            pass  # ws_server is optional — agent still works without it


# ── Module-level singleton ────────────────────────────────────────────────────
tracker = LatencyTracker()
