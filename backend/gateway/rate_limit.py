"""Shared SlowAPI rate limiter instance.

Usage in routers:
    from gateway.rate_limit import limiter

    @router.get("/endpoint")
    @limiter.limit("30/minute")
    async def endpoint(request: Request):
        ...
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
