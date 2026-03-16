"""
Rate limiting middleware — in-memory sliding window (Redis removed).
Falls back gracefully: if the process restarts, counters reset.
"""
import logging
import time
from collections import defaultdict
from typing import Callable

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("rate-limiter")

# {window_key: count}
_counters: dict[str, int] = defaultdict(int)
# {window_key: expiry_epoch}
_expiry: dict[str, float] = {}


class RateLimiter:
    """In-memory rate limiter using a fixed window counter."""

    def __init__(
        self,
        default_limit: int = 100,
        default_window: int = 60,
    ):
        self.default_limit = default_limit
        self.default_window = default_window

        self.endpoint_limits = {
            "/api/auth/login": (10, 60),
            "/api/auth/signup": (5, 60),
            "/api/auth/forgot-password": (3, 60),
            "/api/calls": (30, 60),
            "default": (100, 60),
        }

    def is_allowed(self, key: str, limit: int, window: int) -> tuple[bool, int, int]:
        now = time.time()
        window_key = f"{key}:{int(now) // window}"
        reset_time = (int(now) // window + 1) * window

        # Expire stale keys
        if window_key in _expiry and now > _expiry[window_key]:
            del _counters[window_key]
            del _expiry[window_key]

        _counters[window_key] += 1
        if window_key not in _expiry:
            _expiry[window_key] = reset_time

        count = _counters[window_key]
        remaining = max(0, limit - count)
        return count <= limit, remaining, reset_time

    def get_limit_for_path(self, path: str) -> tuple[int, int]:
        if path in self.endpoint_limits:
            return self.endpoint_limits[path]
        for endpoint, limits in self.endpoint_limits.items():
            if endpoint != "default" and path.startswith(endpoint):
                return limits
        return self.endpoint_limits["default"]


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for rate limiting."""

    def __init__(self, app, rate_limiter: RateLimiter):
        super().__init__(app)
        self.limiter = rate_limiter

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in ["/health", "/", "/api/health"]:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()

        path = request.url.path
        limit, window = self.limiter.get_limit_for_path(path)
        key = f"{client_ip}:{path}"

        allowed, remaining, reset_time = self.limiter.is_allowed(key, limit, window)

        if not allowed:
            logger.warning("Rate limit exceeded for %s on %s", client_ip, path)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time),
                    "Retry-After": str(reset_time - int(time.time())),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)
        return response


rate_limiter = RateLimiter()
