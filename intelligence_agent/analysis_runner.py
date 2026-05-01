"""
analysis_runner.py
------------------
Orchestrates the full two-stage LLM pipeline for all escalated documents:

  MongoDB (escalated docs)
       │
       ▼
  Stage 1: Data Analysis Agent      → structured JSON analysis
       │
       ▼
  Stage 2: Context Prep Agent       → RAG-ready semantic chunks
       │
       ▼
  MongoDB (write-back llm_analysis + mark llm_processed=True)

Run manually:
    python -m intelligence_agent.analysis_runner

Or schedule via cron/runner — this script is safe to run repeatedly because
`get_escalated_documents()` filters on `llm_processed != True`.
"""

import logging
from intelligence_agent.db.mongo import get_escalated_documents, mark_as_processed
from intelligence_agent.intelligence_logic.analyzer import (
    run_analysis_agent,
    run_context_prep_agent,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("AnalysisRunner")


def run_analysis_pipeline() -> None:
    """
    Fetches all unprocessed escalated documents from MongoDB and runs
    them through the two-stage LLM pipeline.
    """
    logger.info("🚀 Analysis pipeline started.")
    processed = 0
    failed = 0

    for doc in get_escalated_documents():
        mongo_id = doc["mongo_id"]
        title = doc.get("title", "unknown")

        logger.info(f"🔍 Processing: {title[:70]}")

        # Stage 1 — Data Analysis Agent
        analysis = run_analysis_agent(doc)
        if analysis is None:
            logger.warning(f"⚠️  Stage 1 failed for doc {mongo_id[:8]}... — skipping.")
            failed += 1
            continue

        # Stage 2 — Context Preparation Agent
        rag_chunks = run_context_prep_agent(analysis)

        # Compose the final write-back payload
        final_payload = {
            **analysis,
            "rag_chunks": rag_chunks or [],   # Empty list on Stage 2 failure
        }

        # Write results back to MongoDB and mark as processed
        mark_as_processed(mongo_id, final_payload)
        processed += 1

    logger.info(
        f"✅ Pipeline complete. Processed: {processed} | Failed: {failed}"
    )


if __name__ == "__main__":
    run_analysis_pipeline()
