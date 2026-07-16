import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)

_VERSION = "1.0.0"


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "backend",
        "version": _VERSION,
    }


@router.get("/ready")
def readiness_check():
    deps: dict[str, str] = {}

    # MongoDB
    try:
        from core.db.mongo_client import get_mongo_client
        get_mongo_client().admin.command("ping")
        deps["mongo"] = "ok"
    except Exception as e:
        logger.warning("Readiness check: MongoDB unavailable: %s", e)
        deps["mongo"] = "unavailable"

    # Neo4j
    try:
        from core.db.neo4j_client import _get_driver
        with _get_driver().session() as session:
            session.run("RETURN 1").consume()
        deps["neo4j"] = "ok"
    except Exception as e:
        logger.warning("Readiness check: Neo4j unavailable: %s", e)
        deps["neo4j"] = "unavailable"

    # ChromaDB
    try:
        from gateway.app_config import get_settings
        import chromadb
        s = get_settings()
        client = chromadb.HttpClient(
            host=s.chroma_host,
            ssl=s.chroma_ssl,
            headers={"X-Chroma-Token": s.chroma_api_key} if s.chroma_api_key else {},
        )
        client.heartbeat()
        deps["chroma"] = "ok"
    except Exception as e:
        logger.warning("Readiness check: ChromaDB unavailable: %s", e)
        deps["chroma"] = "unavailable"

    all_ok = all(v == "ok" for v in deps.values())
    status_code = 200 if all_ok else 503
    body = {
        "status": "ok" if all_ok else "not_ready",
        "service": "backend",
        "version": _VERSION,
        "dependencies": deps,
    }
    return JSONResponse(content=body, status_code=status_code)
