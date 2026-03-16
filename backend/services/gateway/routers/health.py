"""Health check endpoints."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from redis.asyncio import Redis

from shared.redis_config import get_redis_url

router = APIRouter()


@router.get("/")
async def root():
    """Root endpoint."""
    return {"status": "API Gateway Running"}


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": "vobiz-voice-platform",
        "version": "1.0.0",
    }


@router.get("/ready")
async def ready_check():
    """
    Readiness check - verifies all dependencies are available.
    Returns 200 if all dependencies are healthy, 503 if any are down.
    """
    checks = {}
    
    # Check MongoDB
    try:
        from shared.database.connection import get_database
        db = get_database()
        await db.command("ping")
        checks["mongodb"] = "ok"
    except Exception as e:
        checks["mongodb"] = f"failed: {str(e)}"
    
    # Check Redis (if configured)
    redis_url = get_redis_url()
    if redis_url:
        r = None
        try:
            r = Redis.from_url(redis_url, decode_responses=True)
            await r.ping()
            checks["redis"] = "ok"
        except Exception as e:
            checks["redis"] = f"failed: {str(e)}"
        finally:
            if r is not None:
                await r.aclose()
    
    # Determine overall status
    all_ok = all(v == "ok" for v in checks.values())
    status = "ready" if all_ok else "degraded"
    
    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={
            "status": status,
            "service": "vobiz-voice-platform",
            "checks": checks,
        }
    )
