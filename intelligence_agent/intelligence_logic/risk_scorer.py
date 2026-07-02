INTEL_RISK_KEYWORDS = {
    "fire": 60,
    "strike": 60,
    "shutdown": 40,
    "flood": 40,
    "explosion": 80,
    "riot": 60
}

def calculate_intel_risk(text: str) -> int:
    """
    Lightweight risk signal for ingestion layer.
    Score range: 0–100
    """
    if not text:
        return 0

    text = text.lower()
    score = 0

    for keyword, weight in INTEL_RISK_KEYWORDS.items():
        if keyword in text:
            score = max(score, weight)

    return score
