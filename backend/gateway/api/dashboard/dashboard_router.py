from fastapi import APIRouter, Query
from core.models import DashboardSummary, RecentRiskItem
from core.db.dashboard_queries import fetch_summary, fetch_recent
from gateway.app_config import get_settings

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
_settings = get_settings()


@router.get("/summary", response_model=DashboardSummary)
async def get_summary():
    return fetch_summary(_settings.mongo_db_name)


@router.get("/recent", response_model=list[RecentRiskItem])
async def get_recent(limit: int = Query(default=20, le=100)):
    return [
        RecentRiskItem(**item) for item in fetch_recent(limit, _settings.mongo_db_name)
    ]
