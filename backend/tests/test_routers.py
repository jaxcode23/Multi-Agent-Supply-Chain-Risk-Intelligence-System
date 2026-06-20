from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _mock_env(monkeypatch):
    monkeypatch.setenv("MONGO_URI", "mongodb://localhost:27017")
    monkeypatch.setenv("DB_NAME", "test_db")
    monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
    monkeypatch.setenv("NEO4J_USER", "neo4j")
    monkeypatch.setenv("NEO4J_PASSWORD", "password")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")


@pytest.fixture(autouse=True)
def _mock_external_deps():
    with patch("pymongo.MongoClient") as mc:
        mc.return_value.__getitem__.return_value.__getitem__.return_value = MagicMock()
        with patch("chromadb.HttpClient") as cc:
            cc.return_value.get_or_create_collection.return_value = MagicMock()
            with patch("neo4j.GraphDatabase.driver") as nd:
                nd.return_value.session.return_value.__enter__.return_value = MagicMock()
                with patch("gateway.orchestration.mitigation_graph.chromadb.HttpClient") as mgc:
                    mgc.return_value.get_or_create_collection.return_value = MagicMock()
                    with patch("neo4j.GraphDatabase.driver") as mgd:
                        mgd.return_value.session.return_value.__enter__.return_value = MagicMock()
                        with patch("gateway.orchestration.mitigation_graph.ChatOpenAI") as llm:
                            llm.side_effect = Exception("mock LLM")
                            yield


@pytest.fixture
def client():
    from main import app
    with TestClient(app) as c:
        yield c


class TestHealthEndpoint:
    def test_root_returns_message(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Supply Chain Risk AI Backend is running"

    def test_health_check(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200


class TestRiskRouter:
    def test_analyze_risk_valid(self, client):
        resp = client.post("/risks/analyze", json={
            "supplier_name": "Tata",
            "headline": "fire at plant",
            "risk_score": 85,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["supplier_name"] == "Tata"
        assert data["risk_score"] == 85
        assert "final_plan" in data

    def test_analyze_risk_invalid_score_negative(self, client):
        resp = client.post("/risks/analyze", json={
            "supplier_name": "Tata",
            "headline": "test",
            "risk_score": -1,
        })
        assert resp.status_code == 422

    def test_analyze_risk_invalid_score_over_100(self, client):
        resp = client.post("/risks/analyze", json={
            "supplier_name": "Tata",
            "headline": "test",
            "risk_score": 101,
        })
        assert resp.status_code == 422

    def test_analyze_risk_missing_required_field(self, client):
        resp = client.post("/risks/analyze", json={
            "headline": "test",
            "risk_score": 50,
        })
        assert resp.status_code == 422


class TestSupplierRouter:
    def test_get_supplier_not_found(self, client):
        resp = client.get("/suppliers/Unknown")
        assert resp.status_code == 404

    def test_get_supplier(self, client):
        with patch("gateway.api.suppliers.supplier_router.get_supplier_by_name") as mock_get:
            mock_get.return_value = {
                "id": "S001", "name": "Tata", "region": "Asia",
                "status": "ACTIVE", "reliability_score": 0.95,
            }
            resp = client.get("/suppliers/Tata")
            assert resp.status_code == 200
            data = resp.json()
            assert data["name"] == "Tata"
            assert data["reliability_score"] == 0.95

    def test_get_alternatives(self, client):
        with patch("gateway.api.suppliers.supplier_router.get_supplier_by_name") as mock_get, \
             patch("gateway.api.suppliers.supplier_router.find_alternative_suppliers") as mock_find:
            mock_get.return_value = {"id": "S001", "name": "Tata"}
            mock_find.return_value = [
                {"id": "S002", "name": "Reliance", "region": "Asia", "reliability_score": 0.9}
            ]
            resp = client.get("/suppliers/Tata/alternatives?limit=3")
            assert resp.status_code == 200
            data = resp.json()
            assert data["supplier_name"] == "Tata"
            assert len(data["alternatives"]) == 1

    def test_get_alternatives_supplier_not_found(self, client):
        with patch("gateway.api.suppliers.supplier_router.get_supplier_by_name") as mock_get:
            mock_get.return_value = None
            resp = client.get("/suppliers/Unknown/alternatives")
            assert resp.status_code == 404


class TestDashboardRouter:
    def test_summary_returns_counts(self, client):
        mock_db = MagicMock()
        mock_db_child = MagicMock()
        mock_db_child["raw_intel"].count_documents.return_value = 5
        mock_db_child["raw_intel"].aggregate.return_value = [{"avg": 42.5}]
        mock_db.__getitem__.return_value = mock_db_child

        with patch("gateway.api.dashboard.dashboard_router.get_mongo_client", return_value=mock_db):
            resp = client.get("/dashboard/summary")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total_documents"] == 5
            assert data["risk_score_avg"] == 42.5

    def test_recent_returns_list(self, client):
        mock_db = MagicMock()
        mock_db_child = MagicMock()
        mock_db_child["raw_intel"].find.return_value.sort.return_value.limit.return_value = [
            {"title": "fire", "analysis": {"risk_score": 90, "priority": "high"}, "url": "http://x.com"}
        ]
        mock_db.__getitem__.return_value = mock_db_child

        with patch("gateway.api.dashboard.dashboard_router.get_mongo_client", return_value=mock_db):
            resp = client.get("/dashboard/recent?limit=5")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) == 1
            assert data[0]["title"] == "fire"


class TestAgentRouter:
    def test_trigger_high_risk_returns_queued(self, client):
        resp = client.post("/agents/trigger", json={
            "supplier_name": "Tata",
            "headline": "fire at plant",
            "risk_score": 75,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "queued"
        assert data["supplier_name"] == "Tata"

    def test_trigger_low_risk_rejected(self, client):
        resp = client.post("/agents/trigger", json={
            "supplier_name": "Tata",
            "headline": "minor issue",
            "risk_score": 30,
        })
        assert resp.status_code == 422
