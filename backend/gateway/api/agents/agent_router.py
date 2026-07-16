from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Body
from core.models import AgentTriggerRequest, AgentTriggerResponse
from gateway.orchestration.mitigation_graph import run_orchestrator
from gateway.api.ws.ws_router import publish_agent_result
from gateway.rate_limit import limiter
import logging

router = APIRouter(prefix="/agents", tags=["Agents"])
logger = logging.getLogger(__name__)


def _run_in_background(event: dict):
    supplier_name = event.get("supplier_name", "unknown")
    try:
        result = run_orchestrator(event)
        publish_agent_result(supplier_name, "completed", "Mitigation pipeline finished.")
        logger.info(
            f"[AgentRouter] Orchestrator complete for '{supplier_name}' "
            f"| plan_length={len(result.get('final_plan', ''))} chars"
        )
    except Exception as e:
        publish_agent_result(supplier_name, "failed", str(e))
        logger.error(f"[AgentRouter] Orchestrator failed for '{supplier_name}': {e}")


@router.post("/trigger", response_model=AgentTriggerResponse)
@limiter.limit("30/minute")
async def trigger_agent(
    request: Request,
    agent_request: AgentTriggerRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    if agent_request.risk_score < 50:
        raise HTTPException(
            status_code=422,
            detail="Only risk events with score >= 50 are eligible for agent orchestration.",
        )

    background_tasks.add_task(_run_in_background, agent_request.model_dump())

    return AgentTriggerResponse(
        status="queued",
        supplier_name=agent_request.supplier_name,
        message=f"Mitigation pipeline triggered for '{agent_request.supplier_name}'. Results will be written to the audit log.",
    )
