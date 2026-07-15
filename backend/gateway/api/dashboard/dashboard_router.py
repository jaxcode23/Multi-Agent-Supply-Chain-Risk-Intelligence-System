from fastapi import APIRouter, Query, Request
from core.models import DashboardSummary, RecentRiskItem
from core.db.dashboard_queries import fetch_summary, fetch_recent
from gateway.app_config import get_settings
from gateway.rate_limit import limiter

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
_settings = get_settings()


@router.get("/summary", response_model=DashboardSummary)
@limiter.limit("30/minute")
async def get_summary(request: Request):
    return fetch_summary(_settings.mongo_db_name)


@router.get("/recent", response_model=list[RecentRiskItem])
@limiter.limit("30/minute")
async def get_recent(request: Request, limit: int = Query(default=20, le=100)):
    return [
        RecentRiskItem(**item) for item in fetch_recent(limit, _settings.mongo_db_name)
    ]
