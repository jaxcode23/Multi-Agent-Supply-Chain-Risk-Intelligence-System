import pytest
from pydantic import ValidationError
from core.models import (
    RiskEvent,
    MitigationResponse,
    SupplierResponse,
    AlternativesResponse,
    DashboardSummary,
    RecentRiskItem,
    AgentTriggerRequest,
    AgentTriggerResponse,
)


class TestRiskEvent:
    def test_valid_event(self):
        event = RiskEvent(supplier_name="Tata", headline="fire at plant", risk_score=90)
        assert event.supplier_name == "Tata"
        assert event.risk_score == 90
        assert event.supplier_id is None
        assert event.source_url is None

    def test_minimal_event(self):
        event = RiskEvent(supplier_name="Reliance", headline="strike", risk_score=50)
        assert event.model_dump() == {
            "supplier_name": "Reliance",
            "supplier_id": None,
            "headline": "strike",
            "risk_score": 50,
            "source_url": None,
        }

    def test_with_all_fields(self):
        event = RiskEvent(
            supplier_name="Adani",
            supplier_id="S001",
            headline="flood",
            risk_score=80,
            source_url="https://example.com",
        )
        assert event.supplier_id == "S001"
        assert event.source_url == "https://example.com"


class TestMitigationResponse:
    def test_valid_response(self):
        resp = MitigationResponse(
            supplier_name="Tata",
            risk_score=90,
            vector_context="historical disruptions",
            graph_context=["Alt1 (Asia)", "Alt2 (EU)"],
            final_plan="mitigation steps",
        )
        assert resp.supplier_name == "Tata"
        assert len(resp.graph_context) == 2


class TestSupplierResponse:
    def test_minimal(self):
        s = SupplierResponse(id="S001", name="Tata")
        assert s.region is None

    def test_full(self):
        s = SupplierResponse(id="S001", name="Tata", region="Asia", status="ACTIVE", reliability_score=0.95)
        assert s.reliability_score == 0.95


class TestAlternativesResponse:
    def test_empty_alternatives(self):
        resp = AlternativesResponse(supplier_name="Tata", alternatives=[])
        assert resp.alternatives == []

    def test_with_alternatives(self):
        resp = AlternativesResponse(
            supplier_name="Tata",
            alternatives=[{"id": "S002", "name": "Reliance", "region": "Asia"}],
        )
        assert len(resp.alternatives) == 1


class TestDashboardSummary:
    def test_valid_summary(self):
        s = DashboardSummary(
            total_documents=100,
            escalated_count=10,
            processed_count=80,
            high_priority_count=5,
            risk_score_avg=45.5,
        )
        assert s.total_documents == 100
        assert s.risk_score_avg == 45.5

    def test_zero_values(self):
        s = DashboardSummary(
            total_documents=0,
            escalated_count=0,
            processed_count=0,
            high_priority_count=0,
            risk_score_avg=0.0,
        )
        assert s.risk_score_avg == 0.0


class TestRecentRiskItem:
    def test_valid_item(self):
        item = RecentRiskItem(
            title="fire at plant", risk_score=90, priority="high",
            source_url="https://example.com", published_at="2024-01-01",
        )
        assert item.priority == "high"

    def test_optional_fields_none(self):
        item = RecentRiskItem(
            title="test", risk_score=50, priority="low",
            source_url=None, published_at=None,
        )
        assert item.source_url is None


class TestAgentTriggerRequest:
    def test_valid_request(self):
        req = AgentTriggerRequest(supplier_name="Tata", headline="risk event", risk_score=70)
        assert req.risk_score == 70


class TestAgentTriggerResponse:
    def test_valid_response(self):
        resp = AgentTriggerResponse(
            status="queued", supplier_name="Tata", message="processing"
        )
        assert resp.status == "queued"
