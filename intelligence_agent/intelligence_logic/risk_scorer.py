INTEL_RISK_KEYWORDS = {
    "fire": 5,
    "explosion": 5,
    "strike": 4,
    "riot": 4,
    "shutdown": 3,
    "flood": 3,
    "conflict": 4,
}

def calculate_intel_risk(text: str) -> int:
    """
    Lightweight risk signal for ingestion layer.
    Score range: 0–5
    """
    if not text:
        return 0

    text = text.lower()
    score = 0

    for keyword, weight in INTEL_RISK_KEYWORDS.items():
        if keyword in text:
            score = max(score, weight)

    return score
