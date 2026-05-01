from fastapi import APIRouter, HTTPException, BackgroundTasks, Body
from pydantic import BaseModel
from gateway.orchestration.mitigation_graph import run_orchestrator
import logging

router = APIRouter(prefix="/agents", tags=["Agents"])
logger = logging.getLogger(__name__)


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


def _run_in_background(event: dict):
    try:
        result = run_orchestrator(event)
        logger.info(
            f"[AgentRouter] Orchestrator complete for '{event.get('supplier_name')}' "
            f"| plan_length={len(result.get('final_plan', ''))} chars"
        )
    except Exception as e:
        logger.error(f"[AgentRouter] Orchestrator failed for '{event.get('supplier_name')}': {e}")


@router.post("/trigger", response_model=AgentTriggerResponse)
async def trigger_agent(
    request: AgentTriggerRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Asynchronously trigger the LangGraph orchestrator for a risk event.
    Returns immediately with 202-style 'queued' status; processing continues in the background.
    For a synchronous response with the full plan, use POST /risks/analyze instead.
    """
    if request.risk_score < 50:
        raise HTTPException(
            status_code=422,
            detail="Only risk events with score >= 50 are eligible for agent orchestration.",
        )

    background_tasks.add_task(_run_in_background, request.model_dump())

    return AgentTriggerResponse(
        status="queued",
        supplier_name=request.supplier_name,
        message=f"Mitigation pipeline triggered for '{request.supplier_name}'. Results will be written to the audit log.",
    )
