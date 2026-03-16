"""Health check endpoints."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

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
