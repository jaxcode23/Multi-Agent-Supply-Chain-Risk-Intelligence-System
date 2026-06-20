from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class RiskEvent(BaseModel):
    supplier_name: str
    supplier_id: str | None = None
    headline: str
    risk_score: int
    source_url: str | None = None


class MitigationResponse(BaseModel):
    supplier_name: str
    risk_score: int
    vector_context: str
    graph_context: list[str]
    final_plan: str


class SupplierResponse(BaseModel):
    id: str
    name: str
    region: str | None = None
    status: str | None = None
    reliability_score: float | None = None


class AlternativesResponse(BaseModel):
    supplier_name: str
    alternatives: list[dict[str, Any]]


class DashboardSummary(BaseModel):
    total_documents: int
    escalated_count: int
    processed_count: int
    high_priority_count: int
    risk_score_avg: float


class RecentRiskItem(BaseModel):
    title: str
    risk_score: int
    priority: str
    source_url: str | None
    published_at: str | None


class AgentTriggerRequest(BaseModel):
    supplier_name: str
    supplier_id: str | None = None
    headline: str
    risk_score: int
    source_url: str | None = None


class AgentTriggerResponse(BaseModel):
    status: str
    supplier_name: str
    message: str
