"""
Shared Redis configuration helpers.
"""
from __future__ import annotations

import os
from urllib.parse import quote

from . import settings as _settings  # noqa: F401 - importing loads project .env files


def _first_env(*keys: str) -> str | None:
    """Return the first non-empty environment variable from the provided keys."""
    for key in keys:
        value = os.getenv(key)
        if value and value.strip():
            return value.strip()
    return None


def get_redis_url(default_db: int = 0) -> str | None:
    """
    Resolve a Redis URL from the current environment.

    Supported sources:
    - Direct URLs such as REDIS_URL / REDIS_PRIVATE_URL / REDISCLOUD_URL
    - Host/port credentials from hosted providers (Railway, Render, etc.)

    Returns None when Redis is not configured.
    """
    direct_url = _first_env(
        "REDIS_PRIVATE_URL",
        "REDISCLOUD_URL",
        "REDISTOGO_URL",
        "REDIS_URL",
    )
    if direct_url:
        return direct_url

    host = _first_env("REDISHOST", "REDIS_HOST")
    if not host:
        return None

    port = _first_env("REDISPORT", "REDIS_PORT") or "6379"
    username = _first_env("REDISUSER", "REDIS_USER", "REDIS_USERNAME")
    password = _first_env("REDISPASSWORD", "REDIS_PASSWORD")
    database = _first_env("REDIS_DB", "REDIS_DATABASE") or str(default_db)
    use_tls = (_first_env("REDIS_SSL", "REDIS_USE_SSL") or "").lower() in {"1", "true", "yes"}

    scheme = "rediss" if use_tls else "redis"
    auth = ""
    if username is not None or password is not None:
        encoded_user = quote(username or "", safe="")
        encoded_password = quote(password or "", safe="")
        if username is not None:
            auth = f"{encoded_user}:{encoded_password}@"
        else:
            auth = f":{encoded_password}@"

    return f"{scheme}://{host}:{port}/{database}" if not auth else f"{scheme}://{auth}{host}:{port}/{database}"


def redis_is_configured() -> bool:
    """Return True when enough Redis environment is present to build a connection string."""
    return get_redis_url() is not None
