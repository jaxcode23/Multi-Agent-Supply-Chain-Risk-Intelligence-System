import os
import json
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else None

_MODEL_NAME = "gemini-1.5-flash"
_GENERATION_CONFIG = types.GenerateContentConfig(
    response_mime_type="application/json",
    temperature=0.1,
    max_output_tokens=1024,
)

_ANALYSIS_SYSTEM_PROMPT = """
# ROLE
You are an expert Data Analysis Agent in an automated supply chain risk intelligence pipeline.

# TASK
Analyze the provided news article and:
1. Clean and filter the data, ignoring boilerplate and irrelevant noise.
2. Extract core entities, topics, and actionable insights.
3. Flag data that appears corrupted, incomplete, or highly ambiguous.

# RULES
- DO NOT hallucinate facts outside the provided text. Leave missing fields null.
- Output must be valid JSON matching the schema below. No conversational text.

# OUTPUT SCHEMA
{
  "document_summary": "2-3 sentence overview.",
  "key_entities": ["entity1", "entity2"],
  "primary_insights": ["Insight 1: ...", "Insight 2: ..."],
  "sentiment_or_tone": "Neutral/Positive/Negative/Analytical",
  "data_quality_flag": false,
  "recommended_next_action": "Store to Vector DB / Discard / Route to Human"
}
"""

_CONTEXT_PREP_SYSTEM_PROMPT = """
# ROLE
You are a Context Preparation Agent in a RAG pipeline. Convert structured JSON analysis
into self-contained semantic text chunks optimised for vector database embeddings.

# RULES
- Never use pronouns without stating the noun — vector searches lose context with pronouns.
- Do not add facts outside the provided input.
- Output a JSON array of strings only. No markdown, no filler text.

# OUTPUT SCHEMA
["Chunk 1 text...", "Chunk 2 text..."]
"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), reraise=True)
def _call_llm(system_prompt: str, user_content: str) -> str:
    response = _client.models.generate_content(
        model=_MODEL_NAME,
        contents=f"{system_prompt}\n\n---\n\n{user_content}",
        config=_GENERATION_CONFIG,
    )
    return response.text


def run_analysis_agent(doc: dict) -> dict | None:
    """
    Stage 1: Run the Data Analysis Agent on a single escalated MongoDB document.
    Reads from `raw_text` field (not `content`) to avoid the empty-payload bug.
    Returns a validated analysis dict or None on failure.
    """
    if not _GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not set. Skipping LLM analysis.")
        return None

    payload_text = doc.get("raw_text", "")
    title = doc.get("title", "")

    if not payload_text:
        logger.warning(f"Document '{title}' has empty raw_text — skipping.")
        return None

    try:
        raw = _call_llm(_ANALYSIS_SYSTEM_PROMPT, f"TITLE: {title}\n\nARTICLE TEXT:\n{payload_text}")
        result = json.loads(raw)
        logger.info(f"Analysis complete: {title[:60]}")
        return result
    except json.JSONDecodeError as e:
        logger.error(f"LLM returned non-JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"LLM call failed for '{title}': {e}")
        return None


def run_context_prep_agent(analysis_result: dict) -> list[str] | None:
    """
    Stage 2: Convert structured analysis JSON into RAG-ready semantic chunks
    for upsert into ChromaDB.
    """
    if not _GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not set. Skipping context preparation.")
        return None

    user_content = json.dumps({
        "document_summary": analysis_result.get("document_summary"),
        "key_entities": analysis_result.get("key_entities", []),
        "primary_insights": analysis_result.get("primary_insights", []),
    }, indent=2)

    try:
        raw = _call_llm(_CONTEXT_PREP_SYSTEM_PROMPT, user_content)
        chunks = json.loads(raw)
        if not isinstance(chunks, list):
            logger.error("Context prep agent returned non-list JSON.")
            return None
        logger.info(f"Generated {len(chunks)} RAG chunks.")
        return chunks
    except json.JSONDecodeError as e:
        logger.error(f"Context prep agent returned non-JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"Context prep agent failed: {e}")
        return None



