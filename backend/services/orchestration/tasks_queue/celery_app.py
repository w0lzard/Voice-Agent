"""
Async task runner — Celery/Redis removed.
Runs background tasks using asyncio.create_task() and tracks their status
in an in-memory dict. Results are lost on process restart, which is acceptable
for short-lived campaign executions.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger("task-runner")

# In-memory task store: {task_id: {status, result, created_at}}
_task_store: Dict[str, Dict[str, Any]] = {}


def _new_task_id() -> str:
    return str(uuid.uuid4())


def get_task_result(task_id: str) -> Optional[Dict[str, Any]]:
    """Return stored task info, or None if unknown."""
    return _task_store.get(task_id)


async def _run_and_store(task_id: str, coro) -> None:
    """Run *coro* and store the outcome in _task_store."""
    _task_store[task_id] = {
        "status": "STARTED",
        "result": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = await coro
        _task_store[task_id]["status"] = "SUCCESS"
        _task_store[task_id]["result"] = result
        logger.info("Task %s finished: %s", task_id, result)
    except Exception as exc:
        _task_store[task_id]["status"] = "FAILURE"
        _task_store[task_id]["result"] = {"error": str(exc)}
        logger.error("Task %s failed: %s", task_id, exc)


def submit_task(coro) -> str:
    """
    Schedule *coro* as an asyncio background task.
    Returns the task_id so the caller can poll for status.
    """
    task_id = _new_task_id()
    asyncio.create_task(_run_and_store(task_id, coro))
    return task_id
