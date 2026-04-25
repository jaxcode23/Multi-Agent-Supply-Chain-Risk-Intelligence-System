from intelligence_logic.risk_scoring import calculate_intel_risk
from intelligence_logic.planner import should_escalate, assign_priority


def analyze_intelligence(article: dict):
    """
    Analyze raw news at ingestion time.
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
        "escalate_to_analysis": escalate
    }
