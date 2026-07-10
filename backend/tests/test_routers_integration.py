from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _mock_env(monkeypatch):
    monkeypatch.setenv("MONGO_URI", "mongodb://localhost:27017")
    monkeypatch.setenv("MONGO_DB_NAME", "test_db")
    monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
    monkeypatch.setenv("NEO4J_USER", "neo4j")
    monkeypatch.setenv("NEO4J_PASSWORD", "password")
    monkeypatch.setenv("CHROMA_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")


@pytest.fixture
def client():
    from main import app
    with TestClient(app) as c:
        yield c


class TestRoutersIntegration:
    def test_health_endpoint(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "backend"

    def test_analyze_risk_requires_auth(self, client):
        resp = client.post("/risks/analyze", json={})
        assert resp.status_code == 422

    def test_analyze_risk_validates_risk_score(self, client):
        resp = client.post("/risks/analyze", json={
            "supplier_name": "Tata",
            "headline": "test",
            "risk_score": 999,
        })
        assert resp.status_code == 422

    def test_analyze_risk_full_pipeline(self, client):
        with patch("gateway.orchestration.mitigation_graph.run_orchestrator") as mock_run, \
             patch("gateway.services.audit_service.log_orchestrator_run") as mock_audit:
            mock_run.return_value = {
                "risk_event": {"supplier_name": "Tata", "headline": "test", "risk_score": 85},
                "vector_context": "historical context",
                "graph_context": ["Alt1 (Asia)"],
                "final_plan": "Mitigation plan",
            }
            resp = client.post("/risks/analyze", json={
                "supplier_name": "Tata",
                "headline": "fire at plant",
                "risk_score": 85,
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["supplier_name"] == "Tata"
            assert data["final_plan"] == "Mitigation plan"

    def test_supplier_endpoint(self, client):
        with patch("gateway.api.suppliers.supplier_router.find_alternative_suppliers_by_name") as mock_find:
            mock_find.return_value = ["Alt1 (Asia)", "Alt2 (EU)"]
            resp = client.get("/suppliers/Tata/alternatives")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) == 2

    def test_dashboard_summary(self, client):
        with patch("core.db.dashboard_queries._fetch_summary") as mock_summary:
            mock_summary.return_value = {
                "total_risks": 42,
                "high_risk": 5,
                "medium_risk": 12,
                "low_risk": 25,
            }
            resp = client.get("/dashboard/summary")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total_risks"] == 42
