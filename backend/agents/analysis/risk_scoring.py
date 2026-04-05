# analysis_agent/risk_scoring.py

RISK_KEYWORDS = {
    "fire": 90,
    "strike": 85,
    "flood": 80,
    "riot": 75,
    "shutdown": 70,
    "explosion": 95
}

def calculate_risk_score(text: str) -> int:
    """
    Calculate a risk score (0–100) based on keyword presence.
    """
    text = text.lower()
    for keyword, score in RISK_KEYWORDS.items():
        if keyword in text:
            return score
    return 20  # default low risk
