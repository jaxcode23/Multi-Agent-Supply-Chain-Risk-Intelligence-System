import json
import logging
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread

logger = logging.getLogger(__name__)

_VERSION = "1.0.0"


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json(200, {
                "status": "ok",
                "service": "intelligence_agent",
                "version": _VERSION,
            })
        elif self.path == "/ready":
            self._handle_ready()
        else:
            self.send_response(404)
            self.end_headers()

    def _handle_ready(self) -> None:
        deps: dict[str, str] = {}

        # MongoDB
        try:
            from intelligence_agent.infrastructure.mongo.mongo_client import get_mongo_client
            client = get_mongo_client()
            client.admin.command("ping")
            deps["mongo"] = "ok"
        except Exception as e:
            logger.warning("Readiness check: MongoDB unavailable: %s", e)
            deps["mongo"] = "unavailable"

        # News API config
        news_key = os.getenv("NEWS_API_KEY", "")
        deps["news_api"] = "ok" if news_key else "unavailable: NEWS_API_KEY not set"

        # Gemini config
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        deps["gemini"] = "ok" if gemini_key else "unavailable: GEMINI_API_KEY not set"

        all_ok = all(v == "ok" for v in deps.values())
        status_code = 200 if all_ok else 503
        self._send_json(status_code, {
            "status": "ok" if all_ok else "not_ready",
            "service": "intelligence_agent",
            "version": _VERSION,
            "dependencies": deps,
        })

    def _send_json(self, code: int, body: dict) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def log_message(self, format, *args):
        logger.debug("HTTP %s", format % args)


def start_health_server(port: int = 9100) -> HTTPServer:
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    logger.info("Health server started on port %d", port)
    return server
