from fastapi import APIRouter
from .health.health_router import router as health_router
from .risks.risk_router import router as risk_router
from .suppliers.supplier_router import router as supplier_router
from .dashboard.dashboard_router import router as dashboard_router
from .agents.agent_router import router as agent_router

main_api_router = APIRouter()
main_api_router.include_router(health_router)
main_api_router.include_router(risk_router)
main_api_router.include_router(supplier_router)
main_api_router.include_router(dashboard_router)
main_api_router.include_router(agent_router)
