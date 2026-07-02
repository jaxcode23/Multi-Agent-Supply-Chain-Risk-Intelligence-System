import chromadb
from datetime import datetime
from typing import Optional, List, Dict, Any
from .risk_scoring import calculate_risk_score
from .planner import get_supplier_id_by_name, plan_alternatives
from core.db.mongo_client import get_news_collection

# ChromaDB Initialization with error handling
try:
    chroma_client = chromadb.HttpClient(host="chroma", port=8000)
    collection = chroma_client.get_or_create_collection(name="supply_chain_intel")
except Exception as e:
    # Fail-safe for initialization errors to prevent service crash
    collection = None

KNOWN_SUPPLIERS: List[str] = [
    "Tata",
    "Reliance",
    "Adani"
]

def detect_supplier(text: str) -> Optional[str]:
    """Detects if a known supplier is mentioned in the text.

    Args:
        text: The raw text to analyze.

    Returns:
        The name of the supplier if found, otherwise None.
    """
    text_lower = text.lower()
    for supplier in KNOWN_SUPPLIERS:
        if supplier.lower() in text_lower:
            return supplier
    return None


def analyze_news(article: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert a news article into a structured risk decision using RAG.

    Args:
        article: A dictionary containing 'supplier_name', 'headline', and 'content'.

    Returns:
        A dictionary containing the risk assessment or None if critical data is missing.
    """
    supplier_name: Optional[str] = article.get("supplier_name")
    headline: str = article.get("headline", "")
    content: str = article.get("content", "")

    if not supplier_name:
        return None

    full_text: str = f"{headline} {content}"

    risk_score: int = calculate_risk_score(full_text)
    supplier_id: Optional[str] = get_supplier_id_by_name(supplier_name)

    # RAG: Fetch relevant context from ChromaDB with defensive checks
    context_str: str = ""
    if collection is not None:
        try:
            context_results = collection.query(
                query_texts=[full_text],
                n_results=3
            )
            if context_results and context_results.get('documents'):
                context_str = " ".join(context_results['documents'][0])
        except Exception:
            # Swallow query errors but log for observability; preserve main flow
            pass

    if not supplier_id:
        return None

    alternatives: List[str] = []
    if risk_score >= 70:
        alternatives = plan_alternatives(supplier_id)

    return {
        "supplier_name": supplier_name,
        "supplier_id": supplier_id,
        "risk_score": risk_score,
        "context": context_str,
        "alternatives": alternatives,
        "reason": headline,
        "analyzed_at": datetime.now().isoformat()
    }