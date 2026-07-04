import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.models import DashboardSummary, RecentRiskItem
from core.db.mongo_client import get_mongo_client
from gateway.app_config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])
_settings = get_settings()

_agent_queues: list[asyncio.Queue] = []


def publish_agent_result(supplier_name: str, status: str, message: str):
    payload = {"supplier_name": supplier_name, "status": status, "message": message}
    dead: list[asyncio.Queue] = []
    for q in _agent_queues:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        _agent_queues.remove(q)


def _fetch_summary() -> dict:
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
    ).model_dump()


def _fetch_recent(limit: int = 20) -> list[dict]:
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
        ).model_dump()
        for d in docs
    ]


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue(maxsize=256)
    _agent_queues.append(queue)
    stop_event = asyncio.Event()

    async def reader():
        try:
            while not stop_event.is_set():
                msg = await websocket.receive_text()
                data = json.loads(msg)
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            stop_event.set()
        except Exception:
            stop_event.set()

    async def agent_listener():
        while not stop_event.is_set():
            try:
                data = await asyncio.wait_for(queue.get(), timeout=1)
                await websocket.send_json({"type": "agent_result", **data})
            except asyncio.TimeoutError:
                continue
            except Exception:
                break

    async def poll_loop():
        while not stop_event.is_set():
            await asyncio.sleep(8)
            try:
                summary = await asyncio.to_thread(_fetch_summary)
                await websocket.send_json({"type": "summary_update", "summary": summary})
            except Exception as e:
                logger.warning(f"WS poll summary error: {e}")

    try:
        summary = await asyncio.to_thread(_fetch_summary)
        recent = await asyncio.to_thread(_fetch_recent)
        await websocket.send_json({"type": "init", "summary": summary, "recent": recent})

        await asyncio.gather(reader(), agent_listener(), poll_loop())
    except Exception as e:
        logger.error(f"WS endpoint error: {e}")
    finally:
        stop_event.set()
        if queue in _agent_queues:
            _agent_queues.remove(queue)
        logger.info("WS client cleaned up")
