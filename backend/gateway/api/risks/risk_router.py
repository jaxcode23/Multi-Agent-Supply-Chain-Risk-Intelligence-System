from fastapi import APIRouter, HTTPException, Body
from typing import Any
from core.models import RiskEvent, MitigationResponse
from gateway.orchestration.mitigation_graph import run_orchestrator

router = APIRouter(prefix="/risks", tags=["Risks"])


@router.post("/analyze", response_model=MitigationResponse)
async def analyze_risk(event: RiskEvent = Body(...)):
    """
    Trigger the LangGraph mitigation pipeline for a risk event.
    Queries ChromaDB for historical context, Neo4j for alternative suppliers,
    then synthesises a mitigation plan via GPT.
    """
    if event.risk_score < 0 or event.risk_score > 100:
        raise HTTPException(status_code=422, detail="risk_score must be between 0 and 100.")

    result = run_orchestrator(event.model_dump())

    return MitigationResponse(
        supplier_name=event.supplier_name,
        risk_score=event.risk_score,
        vector_context=result.get("vector_context", ""),
        graph_context=result.get("graph_context", []),
        final_plan=result.get("final_plan", ""),
    )
