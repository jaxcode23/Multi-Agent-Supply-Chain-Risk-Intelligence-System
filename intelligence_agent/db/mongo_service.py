import logging
from typing import Iterator
from intelligence_agent.infrastructure.mongo.mongo_client import get_mongo_client
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DB_NAME = os.getenv("MONGO_DB_NAME", "intelligence_db")
COLLECTION_NAME = "raw_intel"


def get_escalated_documents() -> Iterator[dict]:
    """
    Fetches all documents from MongoDB where `analysis.escalate_to_analysis`
    is True and `llm_processed` is not yet set.

    Yields only the plain-Python fields needed by the LLM — the raw MongoDB
    dict (including the ObjectId-equivalent `_id` hash string) is intentionally
    narrowed to avoid serialization issues with LLM wrappers.
    """
    client = get_mongo_client()
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    query = {
        "analysis.escalate_to_analysis": True,
        "llm_processed": {"$ne": True}
    }

    cursor = collection.find(query)

    for raw_doc in cursor:
        # Yield only the serializable fields the LLM layer actually needs.
        # This prevents ObjectId serialization errors in LLM wrappers.
        yield {
            "mongo_id": str(raw_doc["_id"]),   # ObjectId -> plain str
            "url": raw_doc.get("url", ""),
            "title": raw_doc.get("title", ""),
            "raw_text": raw_doc.get("raw_text", ""),  # ← key is raw_text, not content
            "risk_score": raw_doc.get("analysis", {}).get("risk_score", 0),
            "priority": raw_doc.get("analysis", {}).get("priority", "low"),
        }


def mark_as_processed(mongo_id: str, analysis_result: dict) -> None:
    """
    After the LLM Analysis Agent runs, writes the structured result back
    to the MongoDB document and marks it so it won't be re-processed.

    Args:
        mongo_id: The string `_id` of the document (URL MD5 hash).
        analysis_result: The validated JSON dict returned by the Analysis Agent.
    """
    client = get_mongo_client()
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    collection.update_one(
        {"_id": mongo_id},
        {
            "$set": {
                "llm_analysis": analysis_result,
                "llm_processed": True,
                "analysis.escalate_to_analysis": False,
            }
        }
    )
    logger.info(f"✅ Marked document {mongo_id[:8]}... as LLM-processed.")
