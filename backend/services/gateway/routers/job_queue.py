"""Queue health and management endpoints."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/queue", tags=["Queue"])


@router.get("/health")
async def queue_health():
    """Queue health check — always healthy (asyncio background tasks, no broker)."""
    return {"status": "healthy", "queue": "asyncio"}


@router.get("/stats")
async def queue_stats():
    """Get background task statistics."""
    try:
        from services.orchestration.tasks_queue.celery_app import _task_store
        total = len(_task_store)
        by_status: dict = {}
        for info in _task_store.values():
            s = info.get("status", "UNKNOWN")
            by_status[s] = by_status.get(s, 0) + 1
        return {"status": "ok", "total_tasks": total, "by_status": by_status}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "error": str(e)})
