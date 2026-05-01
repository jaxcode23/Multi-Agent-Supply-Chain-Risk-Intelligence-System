def should_escalate(risk_score: int) -> bool:
    """
    Decide whether news should be sent
    to Analysis Agent.
    """
    return risk_score >= 3


def assign_priority(risk_score: int) -> str:
    """
    Priority for storage / processing.
    """
    if risk_score >= 4:
        return "high"
    if risk_score >= 2:
        return "medium"
    return "low"
