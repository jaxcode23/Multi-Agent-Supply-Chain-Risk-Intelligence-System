from __future__ import annotations

from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    supplier_name: str
    headline: str
    content: str = ""


class AnalysisResult(BaseModel):
    supplier_name: str
    supplier_id: int | None = None
    risk_score: int
    context: str = ""
    alternatives: list[str] = []
    reason: str = ""
    analyzed_at: str = ""
