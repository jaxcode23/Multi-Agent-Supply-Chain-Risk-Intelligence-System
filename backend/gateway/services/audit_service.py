import logging
import datetime
from pymongo import MongoClient
from gateway.app_config import get_settings

logger = logging.getLogger(__name__)
_settings = get_settings()


def _get_audit_collection():
    client = MongoClient(_settings.mongo_uri)
    db = client[_settings.mongo_db_name]
    return db["audit_log"]


def log_orchestrator_run(
    supplier_name: str,
    risk_score: int,
    plan_length: int,
    alternatives_found: int,
    success: bool,
) -> None:
    """Write an audit record to MongoDB after each orchestrator invocation."""
    record = {
        "event": "orchestrator_run",
        "supplier_name": supplier_name,
        "risk_score": risk_score,
        "plan_length": plan_length,
        "alternatives_found": alternatives_found,
        "success": success,
        "timestamp": datetime.datetime.utcnow(),
    }
    try:
        _get_audit_collection().insert_one(record)
        logger.debug(f"Audit record written for '{supplier_name}'.")
    except Exception as e:
        logger.warning(f"Failed to write audit record: {e}")
