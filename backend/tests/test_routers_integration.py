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
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")


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
        with patch("gateway.api.risks.risk_router.run_orchestrator") as mock_run:
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
        with patch("gateway.api.suppliers.supplier_router.get_supplier_by_name") as mock_get, \
             patch("gateway.api.suppliers.supplier_router.find_alternative_suppliers") as mock_find:
            mock_get.return_value = {"id": "S001", "name": "Tata", "region": "Asia"}
            mock_find.return_value = [
                {"id": "S002", "name": "Alt1", "region": "Asia"},
                {"id": "S003", "name": "Alt2", "region": "EU"},
            ]
            resp = client.get("/suppliers/Tata/alternatives")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data["alternatives"]) == 2

    def test_dashboard_summary(self, client):
        from core.models import DashboardSummary
        mock_summary = DashboardSummary(
            total_documents=42,
            escalated_count=5,
            processed_count=30,
            high_priority_count=10,
            risk_score_avg=65.0,
        )
        with patch("gateway.api.dashboard.dashboard_router.fetch_summary", return_value=mock_summary):
            resp = client.get("/dashboard/summary")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total_documents"] == 42
