import os
import json
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
import google.generativeai as genai
from dotenv import load_dotenv

from intelligence_agent.intelligence_logic.risk_scoring import calculate_intel_risk
from intelligence_agent.intelligence_logic.planner import should_escalate, assign_priority

load_dotenv()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLM Client Setup
# ---------------------------------------------------------------------------
_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if _GEMINI_API_KEY:
    genai.configure(api_key=_GEMINI_API_KEY)

_MODEL = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",
        temperature=0.1,          # Low temp for analytical consistency
        max_output_tokens=1024,
    ),
)

# ---------------------------------------------------------------------------
# System Prompt — Data Analysis Agent
# ---------------------------------------------------------------------------
_ANALYSIS_SYSTEM_PROMPT = """
# ROLE
You are an expert Data Analysis Agent functioning as a core node in an automated,
multi-agent supply chain risk intelligence pipeline. Your primary responsibility is
to analyze raw, unstructured web data and transform it into structured, high-signal insights.

# TASK
You will be provided with a news article (title + raw text). You must:
1. Clean and filter the data, ignoring boilerplate text, navigation menus, and irrelevant noise.
2. Extract the core entities, main topics, and actionable insights.
3. Synthesize the findings into a concise, structured format.
4. Flag any data that appears corrupted, incomplete, or highly ambiguous.

# CONSTRAINTS & RULES
- DO NOT hallucinate or infer facts outside of the provided text. If information is
  missing, leave the corresponding field null.
- Maintain a completely objective and analytical tone.
- Your output must be exclusively a valid JSON object matching the OUTPUT SCHEMA below.
  Do not include any introductory or concluding conversational text.

# OUTPUT SCHEMA
{
  "document_summary": "A 2-3 sentence overview of the core content.",
  "key_entities": ["List", "of", "important", "names", "technologies", "or", "organizations"],
  "primary_insights": [
    "Insight 1: ...",
    "Insight 2: ..."
  ],
  "sentiment_or_tone": "Neutral/Positive/Negative/Analytical",
  "data_quality_flag": false,
  "recommended_next_action": "e.g., Store to Vector DB, Discard, Route to Human"
}
"""

# ---------------------------------------------------------------------------
# System Prompt — Context Preparation Agent (RAG Chunk Builder)
# ---------------------------------------------------------------------------
_CONTEXT_PREP_SYSTEM_PROMPT = """
# ROLE
You are a Context Preparation Agent in a RAG (Retrieval-Augmented Generation) pipeline.
Your job is to take structured JSON analysis data and convert it into rich, highly semantic,
self-contained text chunks optimized for vector database embeddings.

# TASK
You will receive a JSON payload containing `document_summary`, `key_entities`, and
`primary_insights`. You must:
1. Transform the insights into standalone paragraphs.
2. Ensure every single paragraph explicitly mentions the relevant `key_entities` and
   context from the `document_summary`.
3. Remove any JSON formatting or metadata flags from the final text.

# CONSTRAINTS & RULES
- NEVER use pronouns like "it", "they", or "this" without explicitly stating the noun
  they refer to. Vector searches lose context if pronouns are used.
- Do not add any new facts or infer outside information.
- Output your response strictly as a JSON array of strings. Do not include markdown
  formatting or conversational filler.

# OUTPUT SCHEMA
[
  "Detailed chunk 1 integrating entities, summary, and insight A.",
  "Detailed chunk 2 integrating entities, summary, and insight B."
]
"""

# ---------------------------------------------------------------------------
# Retry wrapper — exponential backoff for transient API failures
# ---------------------------------------------------------------------------
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _call_llm(system_prompt: str, user_content: str) -> str:
    """Single LLM call with retry. Returns raw text response."""
    response = _MODEL.generate_content(f"{system_prompt}\n\n---\n\n{user_content}")
    return response.text


# ---------------------------------------------------------------------------
# Stage 1: Data Analysis Agent
# ---------------------------------------------------------------------------
def run_analysis_agent(doc: dict) -> dict | None:
    """
    Runs the Data Analysis Agent on a single escalated document pulled
    from MongoDB.

    Args:
        doc: A safe, serializable dict from `db.mongo.get_escalated_documents()`.
             Expected keys: title, raw_text, url, risk_score, priority.

    Returns:
        A validated analysis dict, or None if the LLM call fails.
    """
    if not _GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not set. Skipping LLM analysis.")
        return None

    # Safely extract the text — the scraper stores content under `raw_text`,
    # NOT `content`. Using .get("raw_text") prevents the agent from forwarding
    # an empty string to the LLM.
    payload_text = doc.get("raw_text", "")
    title = doc.get("title", "")

    if not payload_text:
        logger.warning(f"Document '{title}' has empty raw_text — skipping.")
        return None

    user_content = f"TITLE: {title}\n\nARTICLE TEXT:\n{payload_text}"

    # --- DEBUG: uncomment to verify payload before the API call ---
    # logger.debug("--- DEBUG: PAYLOAD TO LLM ---")
    # logger.debug(repr(user_content)[:200])

    try:
        raw_response = _call_llm(_ANALYSIS_SYSTEM_PROMPT, user_content)
        result = json.loads(raw_response)
        logger.info(f"✅ Analysis complete for: {title[:60]}")
        return result
    except json.JSONDecodeError as e:
        logger.error(f"LLM returned non-JSON response: {e}\nRaw: {raw_response[:200]}")
        return None
    except Exception as e:
        logger.error(f"LLM call failed for '{title}': {e}")
        return None


# ---------------------------------------------------------------------------
# Stage 2: Context Preparation Agent (RAG Chunk Builder)
# ---------------------------------------------------------------------------
def run_context_prep_agent(analysis_result: dict) -> list[str] | None:
    """
    Runs the Context Preparation Agent on the output of `run_analysis_agent`.
    Converts the structured JSON analysis into semantic text chunks ready
    for upsert into ChromaDB.

    Args:
        analysis_result: The dict returned by `run_analysis_agent`.

    Returns:
        A list of self-contained semantic strings, or None on failure.
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
        raw_response = _call_llm(_CONTEXT_PREP_SYSTEM_PROMPT, user_content)
        chunks = json.loads(raw_response)

        if not isinstance(chunks, list):
            logger.error("Context prep agent returned non-list JSON.")
            return None

        logger.info(f"✅ Generated {len(chunks)} RAG chunks.")
        return chunks
    except json.JSONDecodeError as e:
        logger.error(f"Context prep agent returned non-JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"Context prep agent failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Legacy ingestion-time analysis (called by news_fetcher.py — unchanged)
# ---------------------------------------------------------------------------
def analyze_intelligence(article: dict) -> dict:
    """
    Lightweight ingestion-time risk analysis. This function does NOT call
    the LLM — it is only used for the fast, keyword-based triage pass during
    ingestion. Heavy LLM analysis happens in `run_analysis_agent` above.
    """
    title = article.get("title", "")
    description = article.get("description", "")
    text = f"{title} {description}"

    risk_score = calculate_intel_risk(text)
    priority = assign_priority(risk_score)
    escalate = should_escalate(risk_score)

    return {
        "source": "newsapi",
        "title": title,
        "risk_signal": risk_score,
        "priority": priority,
        "escalate_to_analysis": escalate,
    }
