"""
WebSocket /monitor endpoint for real-time call monitoring.

The frontend (WebSocketContext.js) connects here to receive live events:
  call_started, call_ended, transcript, agent_speaking, customer_speaking,
  metrics, state, pong.

Any backend code can push events via `monitor.broadcast(event_dict)`.
"""
import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("gateway.monitor")

router = APIRouter()


class ConnectionManager:
    """Tracks active WebSocket connections and broadcasts events to all of them."""

    def __init__(self):
        self._clients: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.append(ws)
        logger.info("Monitor client connected. Total: %d", len(self._clients))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            try:
                self._clients.remove(ws)
            except ValueError:
                pass
        logger.info("Monitor client disconnected. Total: %d", len(self._clients))

    async def broadcast(self, data: dict[str, Any]) -> None:
        """Send a JSON event to every connected frontend client."""
        payload = json.dumps(data)
        dead: list[WebSocket] = []
        async with self._lock:
            clients = list(self._clients)
        for ws in clients:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    @property
    def client_count(self) -> int:
        return len(self._clients)


# Module-level singleton — import this from other gateway modules to push events
manager = ConnectionManager()


async def _get_call_counts() -> dict[str, int]:
    """Read current call counts from MongoDB."""
    try:
        from shared.database.connection import get_database
        db = get_database()
        total = await db.calls.count_documents({})
        active = await db.calls.count_documents(
            {"status": {"$in": ["initiated", "answered", "ringing"]}}
        )
        return {"totalCalls": total, "activeCalls": active}
    except Exception as exc:
        logger.warning("Could not read call counts: %s", exc)
        return {"totalCalls": 0, "activeCalls": 0}


@router.websocket("/monitor")
async def websocket_monitor(ws: WebSocket):
    """
    Real-time monitoring WebSocket.

    Client → server messages:
      {"type": "ping"}       → {"type": "pong"}
      {"type": "get_state"}  → {"type": "state", "payload": {totalCalls, activeCalls}}

    Server → client push events (via manager.broadcast):
      {"type": "call_started",      "payload": {...}}
      {"type": "call_ended",        "payload": {...}}
      {"type": "transcript",        "payload": {...}}
      {"type": "agent_speaking"}
      {"type": "customer_speaking"}
      {"type": "metrics",           "payload": {...}}
    """
    await manager.connect(ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")

            if msg_type == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))

            elif msg_type == "get_state":
                counts = await _get_call_counts()
                await ws.send_text(json.dumps({"type": "state", "payload": counts}))

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("Monitor WebSocket error: %s", exc)
    finally:
        await manager.disconnect(ws)
