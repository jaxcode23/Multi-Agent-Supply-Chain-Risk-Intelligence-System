from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "backend"

    def test_health_has_version(self):
        resp = client.get("/health")
        data = resp.json()
        assert "version" in data
        assert isinstance(data["version"], str)


class TestReadinessEndpoint:
    def _ready_test(self, expect_status, mongo_ok=True, neo4j_ok=True, chroma_ok=True):
        mock_mongo = MagicMock()
        if mongo_ok:
            mock_mongo.admin.command.return_value = {"ok": 1}
        else:
            mock_mongo.admin.command.side_effect = Exception("Connection refused")

        mock_driver = MagicMock()
        if neo4j_ok:
            mock_session = MagicMock()
            mock_driver.session.return_value.__enter__ = MagicMock(return_value=mock_session)
            mock_driver.session.return_value.__exit__ = MagicMock(return_value=False)
        else:
            mock_driver.session.side_effect = Exception("Connection refused")

        mock_chroma_client = MagicMock()
        if chroma_ok:
            mock_chroma_client.heartbeat.return_value = 1
        else:
            mock_chroma_client.heartbeat.side_effect = Exception("Connection refused")

        mock_settings = MagicMock()
        mock_settings.chroma_host = "chroma"
        mock_settings.chroma_ssl = True
        mock_settings.chroma_api_key = "key"

        with patch("core.db.mongo_client.get_mongo_client", return_value=mock_mongo), \
             patch("core.db.neo4j_client._get_driver", return_value=mock_driver), \
             patch("gateway.app_config.get_settings", return_value=mock_settings), \
             patch("chromadb.HttpClient", return_value=mock_chroma_client):
            return client.get("/ready")

    def test_ready_all_deps_up(self):
        resp = self._ready_test(200)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["dependencies"]["mongo"] == "ok"
        assert data["dependencies"]["neo4j"] == "ok"
        assert data["dependencies"]["chroma"] == "ok"

    def test_ready_mongo_down(self):
        resp = self._ready_test(503, mongo_ok=False)
        assert resp.status_code == 503
        data = resp.json()
        assert data["status"] == "not_ready"
        assert data["dependencies"]["mongo"] == "unavailable"

    def test_ready_neo4j_down(self):
        resp = self._ready_test(503, neo4j_ok=False)
        assert resp.status_code == 503
        data = resp.json()
        assert data["dependencies"]["neo4j"] == "unavailable"

    def test_ready_chroma_down(self):
        resp = self._ready_test(503, chroma_ok=False)
        assert resp.status_code == 503
        data = resp.json()
        assert data["dependencies"]["chroma"] == "unavailable"

    def test_ready_has_version(self):
        resp = self._ready_test(200)
        data = resp.json()
        assert "version" in data
