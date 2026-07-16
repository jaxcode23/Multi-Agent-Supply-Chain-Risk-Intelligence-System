import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from core.logging_config import set_request_id, setup_logging
from gateway.api.api_router import main_api_router
from gateway.rate_limit import limiter

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Backend starting up")
    yield
    logger.info("Backend shutting down — closing clients")
    try:
        from core.db.mongo_client import _client as _mongo
        if _mongo is not None:
            _mongo.close()
            logger.info("MongoDB client closed")
    except Exception:
        pass
    try:
        from core.db.neo4j_client import _get_driver
        _get_driver().close()
        logger.info("Neo4j driver closed")
    except Exception:
        pass
    logger.info("Shutdown complete")


app = FastAPI(
    title="Supply Chain Risk AI",
    description="Multi-Agent Supply Chain Risk Intelligence System",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    lambda _req, _exc: JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Try again later."},
    ),
)


class _RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        set_request_id(rid)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response


app.add_middleware(_RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(main_api_router)


@app.get("/")
def root():
    return {"message": "Supply Chain Risk AI Backend is running"}
