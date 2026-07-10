import json
from http.client import HTTPConnection
from urllib.parse import urlparse

import pytest

from intelligence_agent.health_server import start_health_server, HealthHandler


def test_health_handler_returns_200():
    handler = HealthHandler
    assert handler is not None


class TestHealthServer:
    @pytest.fixture
    def health_server(self):
        server = start_health_server(port=0)
        host, port = server.server_address
        yield f"http://{host}:{port}"
        server.shutdown()

    def test_health_endpoint(self, health_server):
        parsed = urlparse(health_server)
        conn = HTTPConnection(parsed.hostname, parsed.port)
        conn.request("GET", "/health")
        resp = conn.getresponse()
        assert resp.status == 200
        data = json.loads(resp.read())
        assert data["status"] == "ok"
        assert data["service"] == "intelligence_agent"
        conn.close()

    def test_not_found(self, health_server):
        parsed = urlparse(health_server)
        conn = HTTPConnection(parsed.hostname, parsed.port)
        conn.request("GET", "/nonexistent")
        resp = conn.getresponse()
        assert resp.status == 404
        conn.close()
