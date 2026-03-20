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

logger = logging.getLogger("gateway-runner")


if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8080"))
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
