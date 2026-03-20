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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gateway-runner")


def _resolve_bind_host() -> str:
    return os.getenv("API_HOST", "0.0.0.0")


def _resolve_bind_port() -> int:
    """Prefer Railway's $PORT; fall back to 8000 for local development."""
    port = os.getenv("PORT")
    return int(port) if port else 8000


if __name__ == "__main__":
    host = _resolve_bind_host()
    port = _resolve_bind_port()
    logger.info("Starting gateway on %s:%s", host, port)

    uvicorn.run(
        "services.gateway.main:app",
        host=host,
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )