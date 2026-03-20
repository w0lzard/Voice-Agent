#!/usr/bin/env python
"""Run the API Gateway server."""
import logging
import os
import sys
from pathlib import Path

import uvicorn

# Add /app to path for container context
sys.path.insert(0, "/app")

# For local dev, add parent dirs
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.settings import config

logger = logging.getLogger("gateway-runner")


def _resolve_bind_host() -> str:
    return os.getenv("API_HOST", config.API_HOST or "0.0.0.0")


def _resolve_bind_port() -> int:
    # Ensure PORT is set for Railway healthcheck
    port = int(os.getenv("PORT") or os.getenv("API_PORT") or config.API_PORT or 8080)
    os.environ["PORT"] = str(port)  # Set for Railway healthcheck
    return port


if __name__ == "__main__":
    host = _resolve_bind_host()
    port = _resolve_bind_port()
    reload_enabled = os.getenv("UVICORN_RELOAD", "false").lower() == "true"
    logger.info("Starting gateway on %s:%s", host, port)
    uvicorn.run(
        "services.gateway.main:app",
        host=host,
        port=port,
        reload=reload_enabled,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
