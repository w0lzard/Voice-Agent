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


if __name__ == "__main__":
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", 8000))

    print(f"USING PORT: {port}")
    print(f"ENV $PORT = {os.environ.get('PORT', '<not set>')}")
    logger.info("Starting gateway on %s:%s", host, port)

    uvicorn.run(
        "services.gateway.main:app",
        host=host,
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
