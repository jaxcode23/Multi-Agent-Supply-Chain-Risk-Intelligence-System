import chromadb
from datetime import datetime
from .risk_scoring import calculate_risk_score
from .planner import get_supplier_id_by_name, plan_alternatives
from core.db.mongo import news_collection

# ChromaDB Initialization
chroma_client = chromadb.HttpClient(host="chroma", port=8000)
collection = chroma_client.get_or_create_collection(name="supply_chain_intel")

KNOWN_SUPPLIERS = [
    "Tata",
    "Reliance",
    "Adani"
]

def detect_supplier(text: str):
    text_lower = text.lower()
    for supplier in KNOWN_SUPPLIERS:
        if supplier.lower() in text_lower:
            return supplier
    return None


def analyze_news(article: dict):
    """
    Convert a news article into a risk decision.
    """

    supplier_name = article.get("supplier_name")
    headline = article.get("headline", "")
    content = article.get("content", "")

    if not supplier_name:
        return None

    full_text = f"{headline} {content}"

    risk_score = calculate_risk_score(full_text)
    supplier_id = get_supplier_id_by_name(supplier_name)

    # RAG: Fetch relevant context from ChromaDB
    context_results = collection.query(
        query_texts=[full_text],
        n_results=3
    )
    context_str = " ".join(context_results['documents'][0]) if context_results['documents'] else ""

    if not supplier_id:
        return None

    alternatives = []
    if risk_score >= 70:
        alternatives = plan_alternatives(supplier_id)

    return {
        "supplier_name": supplier_name,
        "supplier_id": supplier_id,
        "risk_score": risk_score,
        "context": context_str,
        "alternatives": alternatives,
        "reason": headline
    }