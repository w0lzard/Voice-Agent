"""
API Gateway - Main entry point for the Voice AI Platform.
Routes requests to microservices, handles auth, and CORS.
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

import sys
from pathlib import Path
# Add parent dir for shared imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("gateway")


def _cors_allow_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "*").strip()
    if raw_origins == "*":
        return ["*"]
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Application lifespan manager."""
        from shared.settings import config
        from shared.database import connect_to_database, close_database_connection

        logger.info("Starting API Gateway...")
        app.state.startup_errors = []
        app.state.config_valid = True
        app.state.mongodb_ready = False

        # Validate the minimum config needed for the gateway process to boot.
        try:
            config.validate(
                required_names=(
                    "LIVEKIT_URL",
                    "LIVEKIT_API_KEY",
                    "LIVEKIT_API_SECRET",
                )
            )
        except ValueError as e:
            app.state.config_valid = False
            app.state.startup_errors.append(str(e))
            logger.warning("Gateway starting in degraded mode: %s", e)

        # MongoDB is required for most routes, but not for liveness. Start the
        # process even when Mongo is down so Railway can still hit /health.
        if config.MONGODB_URI:
            try:
                await connect_to_database(config.MONGODB_URI, config.MONGODB_DB_NAME)
                app.state.mongodb_ready = True
                logger.info("MongoDB connected")
            except Exception as e:
                app.state.startup_errors.append(f"MongoDB unavailable: {e}")
                logger.warning("Gateway starting without MongoDB connectivity: %s", e)
        else:
            app.state.startup_errors.append("Missing required environment variable: MONGODB_URI")
            logger.warning("Gateway starting without MongoDB connectivity: MONGODB_URI is not set")

        yield

        # Shutdown
        logger.info("Shutting down API Gateway...")
        await close_database_connection()

    # Create app
    app = FastAPI(
        title="Vobiz Voice AI Platform - Gateway",
        description="API Gateway for Voice AI Platform microservices",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.startup_errors = []
    app.state.config_valid = True
    app.state.mongodb_ready = False
    
    # Add CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_allow_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add Rate Limiting
    from shared.middleware.rate_limiter import RateLimitMiddleware, rate_limiter
    app.add_middleware(RateLimitMiddleware, rate_limiter=rate_limiter)
    
    # Register routers
    from gateway.routers import calls, health, assistants, phone_numbers, sip_configs, campaigns, tools, job_queue, auth, monitor
    from shared.auth.dependencies import get_current_user

    # Public routes (no auth required)
    app.include_router(health.router, tags=["Health"])
    app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
    # WebSocket monitor — must be public (WS upgrades can't send Bearer headers easily)
    app.include_router(monitor.router, tags=["Monitor"])
    
    # Protected routes (require auth when AUTH_ENABLED=true)
    app.include_router(assistants.router, prefix="/api/v1", tags=["Assistants"], dependencies=[Depends(get_current_user)])
    app.include_router(phone_numbers.router, prefix="/api/v1", tags=["Phone Numbers"], dependencies=[Depends(get_current_user)])
    app.include_router(sip_configs.router, prefix="/api/v1", tags=["SIP Configs"], dependencies=[Depends(get_current_user)])
    app.include_router(campaigns.router, prefix="/api/v1", tags=["Campaigns"], dependencies=[Depends(get_current_user)])
    app.include_router(tools.router, prefix="/api/v1", tags=["Tools"], dependencies=[Depends(get_current_user)])
    app.include_router(calls.router, prefix="/api/v1", tags=["Calls"], dependencies=[Depends(get_current_user)])
    app.include_router(job_queue.router, prefix="/api/v1", tags=["Queue"], dependencies=[Depends(get_current_user)])
    
    return app


# Create app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    print(f"USING PORT: {port}")
    uvicorn.run(
        "gateway.main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("UVICORN_RELOAD", "false").lower() == "true",
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
