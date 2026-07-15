import logging
import signal
import threading

from intelligence_agent.logging_config import setup_logging
from intelligence_agent.db.mongo_service import get_escalated_documents, mark_as_processed
from intelligence_agent.db.chroma_client import upsert_rag_chunks
from intelligence_agent.intelligence_logic.llm_analyzer import (
    run_analysis_agent,
    run_context_prep_agent,
)

setup_logging()
logger = logging.getLogger("AnalysisRunner")

_shutdown_event = threading.Event()


def _handle_signal(signum, frame):
    logger.info("Shutdown signal received — finishing current iteration")
    _shutdown_event.set()


def run_analysis_pipeline() -> None:
    """Run the two-stage LLM pipeline over all unprocessed escalated documents."""
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    logger.info("Analysis pipeline started")
    processed = 0
    failed = 0

    for doc in get_escalated_documents():
        if _shutdown_event.is_set():
            logger.info("Shutdown requested — stopping after %d processed", processed)
            break

        mongo_id = doc["mongo_id"]
        url = doc.get("url", "")
        title = doc.get("title", "unknown")
        logger.info("Processing: %s", title[:70])

        analysis = run_analysis_agent(doc)
        if analysis is None:
            logger.warning("Stage 1 failed for %s — skipping", mongo_id[:8])
            failed += 1
            continue

        rag_chunks = run_context_prep_agent(analysis)

        if rag_chunks:
            upsert_rag_chunks(mongo_id, rag_chunks, {"source": url, "title": title})

        mark_as_processed(mongo_id, {**analysis, "rag_chunks": rag_chunks or []})
        processed += 1

    logger.info("Pipeline complete. Processed: %d | Failed: %d", processed, failed)


if __name__ == "__main__":
    run_analysis_pipeline()
