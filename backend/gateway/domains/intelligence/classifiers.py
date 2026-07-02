RISK_CLASSIFIERS = {
    "financial": ["bankruptcy", "insolvency", "liquidation", "default", "downgrade"],
    "operational": ["strike", "walkout", "lockout", "shutdown", "outage"],
    "environmental": ["flood", "fire", "earthquake", "hurricane", "wildfire"],
    "geopolitical": ["sanction", "tariff", "embargo", "trade war", "export ban"],
    "cybersecurity": ["breach", "ransomware", "hack", "data leak", "compromise"],
}


def classify_risk(text: str) -> list[str]:
    text_lower = text.lower()
    return [cat for cat, keywords in RISK_CLASSIFIERS.items()
            if any(kw in text_lower for kw in keywords)]
