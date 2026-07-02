import logging
from intelligence_agent.db.mongo_service import get_escalated_documents, mark_as_processed
from intelligence_agent.db.chroma_client import upsert_rag_chunks
from intelligence_agent.intelligence_logic.llm_analyzer import (
    run_analysis_agent,
    run_context_prep_agent,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("AnalysisRunner")


def run_analysis_pipeline() -> None:
    """Run the two-stage LLM pipeline over all unprocessed escalated documents."""
    logger.info("🚀 Analysis pipeline started.")
    processed = 0
    failed = 0

    for doc in get_escalated_documents():
        mongo_id = doc["mongo_id"]
        url = doc.get("url", "")
        title = doc.get("title", "unknown")
        logger.info(f"🔍 Processing: {title[:70]}")

        analysis = run_analysis_agent(doc)
        if analysis is None:
            logger.warning(f"⚠️  Stage 1 failed for {mongo_id[:8]}... — skipping.")
            failed += 1
            continue

        rag_chunks = run_context_prep_agent(analysis)

        if rag_chunks:
            upsert_rag_chunks(mongo_id, rag_chunks, {"source": url, "title": title})

        mark_as_processed(mongo_id, {**analysis, "rag_chunks": rag_chunks or []})
        processed += 1

    logger.info(f"✅ Pipeline complete. Processed: {processed} | Failed: {failed}")


if __name__ == "__main__":
    run_analysis_pipeline()
