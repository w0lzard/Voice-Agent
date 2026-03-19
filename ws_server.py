"""
Voice Agent — WebSocket Metrics Server
=======================================
Serves the real-time testing dashboard:
  - WebSocket /ws        → broadcasts latency + transcript events
  - POST /event          → accepts events from the agent process
  - GET  /stats          → aggregate latency statistics
  - POST /start-session  → creates LiveKit room + token + dispatches agent
  - GET  /token          → get a LiveKit token for an existing room
  - GET  /health         → health check

Run:
    python ws_server.py

Or alongside the agent:
    python ws_server.py &
    python agent.py start
"""

import json
import logging
import os
import time
import uuid
from pathlib import Path
from typing import Set

from dotenv import load_dotenv

# ── Load env ──────────────────────────────────────────────────────────────────
for _p in [Path("backend/.env.local"), Path(".env.local"), Path(".env")]:
    if _p.exists():
        load_dotenv(_p, override=True)

import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("ws-server")

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="Voice Agent Metrics Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── State ─────────────────────────────────────────────────────────────────────
_ws_clients: Set[WebSocket] = set()
_event_log: list[dict] = []
_MAX_EVENTS = 500


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _broadcast(event: dict) -> None:
    """Push event to all live WebSocket clients and persist in log."""
    global _ws_clients
    _event_log.append(event)
    if len(_event_log) > _MAX_EVENTS:
        _event_log.pop(0)

    dead: Set[WebSocket] = set()
    for ws in list(_ws_clients):
        try:
            await ws.send_text(json.dumps(event))
        except Exception:
            dead.add(ws)
    _ws_clients -= dead


def _make_token(room_name: str, identity: str, can_publish: bool = True) -> str:
    """Create a LiveKit JWT access token."""
    from livekit.api import AccessToken, VideoGrants

    token = AccessToken(
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )
    token.identity = identity
    token.name = identity
    token.ttl = 3600  # 1 hour
    token.add_grants(
        VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=can_publish,
            can_subscribe=True,
            can_publish_data=True,
        )
    )
    return token.to_jwt()


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    _ws_clients.add(ws)
    logger.info("Dashboard connected. Clients: %d", len(_ws_clients))

    # Send recent history so new clients see past events immediately
    for ev in _event_log[-100:]:
        try:
            await ws.send_text(json.dumps(ev))
        except Exception:
            break

    try:
        while True:
            await ws.receive_text()  # keep alive; incoming messages ignored
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        _ws_clients.discard(ws)
        logger.info("Dashboard disconnected. Clients: %d", len(_ws_clients))


# ── REST endpoints ────────────────────────────────────────────────────────────

@app.post("/event")
async def ingest_event(event: dict):
    """Agents POST latency + transcript events here."""
    event.setdefault("server_ts", time.time())
    await _broadcast(event)
    return {"ok": True}


@app.get("/stats")
async def get_stats():
    """Aggregate latency statistics."""
    latency = [e for e in _event_log if e.get("type") == "latency"]
    transcripts = [e for e in _event_log if e.get("type") == "transcript"]

    totals = [e["total_ms"] for e in latency if e.get("total_ms")]
    stts = [e["stt_ms"] for e in latency if e.get("stt_ms")]
    llms = [e["llm_ttfb_ms"] for e in latency if e.get("llm_ttfb_ms")]

    def avg(lst):
        return round(sum(lst) / len(lst), 1) if lst else None

    def p95(lst):
        return round(sorted(lst)[int(len(lst) * 0.95)], 1) if lst else None

    return {
        "total_turns": len(latency),
        "total_transcripts": len(transcripts),
        "avg_total_ms": avg(totals),
        "p95_total_ms": p95(totals),
        "avg_stt_ms": avg(stts),
        "avg_llm_ttfb_ms": avg(llms),
        "target_ms": 1500,
        "below_target_pct": (
            round(sum(1 for t in totals if t < 1500) / len(totals) * 100, 1)
            if totals
            else None
        ),
        "recent_latency": latency[-10:],
    }


@app.post("/start-session")
async def start_session(body: dict = {}):
    """
    Create a LiveKit room, get a browser token, and dispatch the voice agent.
    Returns the token so the frontend can connect directly.
    """
    from livekit import api as lk_api

    room_name = body.get("room_name") or f"test-{uuid.uuid4().hex[:8]}"
    identity = body.get("identity") or f"user-{uuid.uuid4().hex[:6]}"

    # Create room
    lkapi = lk_api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )

    try:
        await lkapi.room.create_room(
            lk_api.CreateRoomRequest(name=room_name, empty_timeout=300)
        )
        logger.info("Created room: %s", room_name)

        # Dispatch agent to room (browser session — no phone number)
        await lkapi.agent.create_agent_dispatch(
            lk_api.CreateAgentDispatchRequest(
                agent_name="outbound-caller",
                room=room_name,
                metadata=json.dumps({"source": "browser_test"}),
            )
        )
        logger.info("Dispatched agent to room: %s", room_name)
    except Exception as e:
        logger.warning("Room/dispatch setup issue (may still work): %s", e)
    finally:
        await lkapi.aclose()

    # Generate browser token
    token = _make_token(room_name, identity, can_publish=True)

    await _broadcast({
        "type": "session_started",
        "room": room_name,
        "identity": identity,
        "timestamp": time.time(),
    })

    return {
        "room": room_name,
        "token": token,
        "url": os.getenv("LIVEKIT_URL"),
        "identity": identity,
    }


@app.get("/token")
async def get_token(room: str, identity: str = "browser-user"):
    """Get a token for an existing room."""
    try:
        token = _make_token(room, identity)
        return {"token": token, "room": room, "url": os.getenv("LIVEKIT_URL")}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/events")
async def get_events(limit: int = 50):
    """Recent events log."""
    return {"events": _event_log[-limit:], "total": len(_event_log)}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ws_clients": len(_ws_clients),
        "events_logged": len(_event_log),
        "livekit_url": os.getenv("LIVEKIT_URL"),
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("WS_SERVER_PORT", "8090"))
    logger.info("Starting Voice Agent Metrics Server on port %d", port)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
