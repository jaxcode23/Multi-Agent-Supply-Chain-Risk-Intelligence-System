from core.db.mongo_client import get_mongo_client
from core.models import DashboardSummary, RecentRiskItem


_DB_NAME = "intelligence_db"


def fetch_summary(mongo_db_name: str | None = None) -> DashboardSummary:
    client = get_mongo_client()
    db = client[mongo_db_name or _DB_NAME]
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


def fetch_recent(limit: int = 20, mongo_db_name: str | None = None) -> list[dict]:
    client = get_mongo_client()
    db = client[mongo_db_name or _DB_NAME]
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
        ).model_dump()
        for d in docs
    ]
