from fastapi import APIRouter, Query
from core.models import DashboardSummary, RecentRiskItem
from core.db.mongo_client import get_mongo_client
from gateway.app_config import get_settings

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
_settings = get_settings()


@router.get("/summary", response_model=DashboardSummary)
async def get_summary():
    """Return aggregate counts from the MongoDB intelligence collection."""
    client = get_mongo_client()
    db = client[_settings.mongo_db_name]
    col = db["raw_intel"]

    total = col.count_documents({})
    escalated = col.count_documents({"analysis.escalate_to_analysis": True})
    processed = col.count_documents({"llm_processed": True})
    high_priority = col.count_documents({"analysis.priority": "high"})

    pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$analysis.risk_score"}}}]
    avg_result = list(col.aggregate(pipeline))
    risk_avg = round(avg_result[0]["avg"], 2) if avg_result else 0.0

    return DashboardSummary(
        total_documents=total,
        escalated_count=escalated,
        processed_count=processed,
        high_priority_count=high_priority,
        risk_score_avg=risk_avg,
    )


@router.get("/recent", response_model=list[RecentRiskItem])
async def get_recent(limit: int = Query(default=20, le=100)):
    """Return the most recent high-priority risk events from MongoDB."""
    client = get_mongo_client()
    db = client[_settings.mongo_db_name]
    col = db["raw_intel"]

    docs = list(
        col.find(
            {"analysis.priority": "high"},
            {"title": 1, "analysis.risk_score": 1, "analysis.priority": 1, "url": 1, "published_at": 1},
        )
        .sort("ingested_at", -1)
        .limit(limit)
    )

    return [
        RecentRiskItem(
            title=d.get("title", ""),
            risk_score=d.get("analysis", {}).get("risk_score", 0),
            priority=d.get("analysis", {}).get("priority", "low"),
            source_url=d.get("url"),
            published_at=str(d["published_at"]) if d.get("published_at") else None,
        )
        for d in docs
    ]
