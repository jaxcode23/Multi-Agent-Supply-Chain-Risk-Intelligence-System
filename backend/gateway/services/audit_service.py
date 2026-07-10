import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def log_orchestrator_run(
    supplier_name: str,
    risk_score: int,
    vector_context_length: int,
    graph_context_count: int,
    plan_length: int,
    error: str | None = None,
) -> dict:
    record = {
        "event": "orchestrator_run",
        "supplier_name": supplier_name,
        "risk_score": risk_score,
        "vector_context_length": vector_context_length,
        "graph_context_count": graph_context_count,
        "plan_length": plan_length,
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if error:
        logger.error("orchestrator failed", extra=record)
    else:
        logger.info("orchestrator completed", extra=record)
    return record
