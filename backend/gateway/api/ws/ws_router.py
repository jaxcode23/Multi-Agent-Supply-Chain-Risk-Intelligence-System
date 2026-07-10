import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.db.dashboard_queries import fetch_summary, fetch_recent
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
                summary_dict = await asyncio.to_thread(lambda: fetch_summary(_settings.mongo_db_name).model_dump())
                await websocket.send_json({"type": "summary_update", "summary": summary_dict})
            except Exception as e:
                logger.warning(f"WS poll summary error: {e}")

    try:
        summary_dict = await asyncio.to_thread(lambda: fetch_summary(_settings.mongo_db_name).model_dump())
        recent = await asyncio.to_thread(fetch_recent, 20, _settings.mongo_db_name)
        await websocket.send_json({"type": "init", "summary": summary_dict, "recent": recent})

        await asyncio.gather(reader(), agent_listener(), poll_loop())
    except Exception as e:
        logger.error(f"WS endpoint error: {e}")
    finally:
        stop_event.set()
        if queue in _agent_queues:
            _agent_queues.remove(queue)
        logger.info("WS client cleaned up")
