"""
Rate limiting middleware using Redis.
Provides DDoS protection and API abuse prevention.
"""
import logging
import time
from typing import Callable, Optional

from fastapi import HTTPException, Request, status
import redis.asyncio as redis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from shared.redis_config import get_redis_url

_REDIS_RETRY_INTERVAL = 30  # seconds between reconnection attempts when Redis is down

logger = logging.getLogger("rate-limiter")


class RateLimiter:
    """Redis-based rate limiter using a sliding window counter."""

    def __init__(
        self,
        redis_url: Optional[str] = None,
        default_limit: int = 100,
        default_window: int = 60,
    ):
        self.redis_url = redis_url
        self.default_limit = default_limit
        self.default_window = default_window
        self._client: Optional[redis.Redis] = None
        self._last_connect_attempt: float = 0.0
        self._disabled_logged = False

        self.endpoint_limits = {
            "/api/auth/login": (10, 60),
            "/api/auth/signup": (5, 60),
            "/api/auth/forgot-password": (3, 60),
            "/api/calls": (30, 60),
            "default": (100, 60),
        }

    async def connect(self) -> None:
        """Connect to Redis, with cooldown to avoid log spam when it is unavailable."""
        if self._client is not None:
            return
        if not self.redis_url:
            if not self._disabled_logged:
                logger.info("RateLimiter Redis not configured; rate limiting disabled")
                self._disabled_logged = True
            return

        now = time.monotonic()
        if now - self._last_connect_attempt < _REDIS_RETRY_INTERVAL:
            return
        self._last_connect_attempt = now

        try:
            self._client = redis.from_url(self.redis_url, decode_responses=True)
            await self._client.ping()
            logger.info("RateLimiter connected to Redis")
        except Exception as exc:
            logger.warning(
                "RateLimiter Redis unavailable (%s) - rate limiting disabled, will retry in %ds",
                exc,
                _REDIS_RETRY_INTERVAL,
            )
            self._client = None

    async def is_allowed(self, key: str, limit: int, window: int) -> tuple[bool, int, int]:
        """Check whether a request is allowed under the configured limit."""
        if self._client is None:
            await self.connect()

        if self._client is None:
            return True, limit, 0

        try:
            now = int(time.time())
            window_key = f"ratelimit:{key}:{now // window}"

            count = await self._client.incr(window_key)
            if count == 1:
                await self._client.expire(window_key, window + 1)

            remaining = max(0, limit - count)
            reset_time = (now // window + 1) * window
            return count <= limit, remaining, reset_time
        except Exception as exc:
            self._client = None
            logger.debug("Rate limit check failed, failing open: %s", exc)
            return True, limit, 0

    def get_limit_for_path(self, path: str) -> tuple[int, int]:
        """Get rate limit configuration for a request path."""
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

        allowed, remaining, reset_time = await self.limiter.is_allowed(key, limit, window)

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


rate_limiter = RateLimiter(redis_url=get_redis_url())
