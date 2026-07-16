import asyncio
from fastapi import APIRouter, HTTPException, Request, Body
from core.models import RiskEvent, MitigationResponse
from gateway.orchestration.mitigation_graph import run_orchestrator
from gateway.rate_limit import limiter

router = APIRouter(prefix="/risks", tags=["Risks"])


@router.post("/analyze", response_model=MitigationResponse)
@limiter.limit("30/minute")
async def analyze_risk(request: Request, event: RiskEvent = Body(...)):
    if event.risk_score < 0 or event.risk_score > 100:
        raise HTTPException(status_code=422, detail="risk_score must be between 0 and 100.")

    result = await asyncio.to_thread(run_orchestrator, event.model_dump())

    return MitigationResponse(
        supplier_name=event.supplier_name,
        risk_score=event.risk_score,
        vector_context=result.get("vector_context", ""),
        graph_context=result.get("graph_context", []),
        final_plan=result.get("final_plan", ""),
    )
