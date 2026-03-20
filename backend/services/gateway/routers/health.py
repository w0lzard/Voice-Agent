"""Health check endpoints."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/")
async def root():
    """Root endpoint."""
    return {"status": "API Gateway Running"}


@router.get("/health")
async def health_check(request: Request):
    """Basic liveness endpoint used by Railway."""
    startup_errors = list(getattr(request.app.state, "startup_errors", []))
    return {
        "status": "healthy",
        "service": "vobiz-voice-platform",
        "version": "1.0.0",
        "mode": "degraded" if startup_errors else "normal",
        "checks": {
            "config": "ok" if getattr(request.app.state, "config_valid", True) else "degraded",
            "mongodb": "ok" if getattr(request.app.state, "mongodb_ready", False) else "degraded",
        },
        "warnings": startup_errors,
    }


@router.get("/ready")
async def ready_check(request: Request):
    """
    Readiness check - verifies all dependencies are available.
    Returns 200 if all dependencies are healthy, 503 if any are down.
    """
    checks = {}

    startup_errors = list(getattr(request.app.state, "startup_errors", []))
    checks["config"] = "ok" if getattr(request.app.state, "config_valid", True) else "failed"
    checks["mongodb"] = "ok" if getattr(request.app.state, "mongodb_ready", False) else "failed"

    all_ok = all(v == "ok" for v in checks.values()) and not startup_errors
    status = "ready" if all_ok else "degraded"

    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={
            "status": status,
            "service": "vobiz-voice-platform",
            "checks": checks,
            "warnings": startup_errors,
        }
    )
