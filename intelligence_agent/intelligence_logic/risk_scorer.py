INTEL_RISK_KEYWORDS = {
    "fire": 3,
    "strike": 3,
    "shutdown": 2,
    "flood": 2,
    "explosion": 4,
    "riot": 3
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
