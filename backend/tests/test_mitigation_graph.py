
import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture(autouse=True)
def _mock_env(monkeypatch):
    monkeypatch.setenv("CHROMA_API_KEY", "test-key")
    monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
    monkeypatch.setenv("NEO4J_USER", "neo4j")
    monkeypatch.setenv("NEO4J_PASSWORD", "password")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")


@pytest.fixture
def sample_event():
    return {
        "supplier_name": "Tata",
        "headline": "fire at plant",
        "risk_score": 85,
    }


@pytest.fixture
def base_state(sample_event):
    return {
        "risk_event": sample_event,
        "vector_context": "",
        "graph_context": [],
        "final_plan": "",
    }


class TestRetrieveRagContext:
    def test_returns_context_on_success(self, base_state):
        mock_collection = MagicMock()
        mock_collection.query.return_value = {"documents": [["ctx1", "ctx2", "ctx3"]]}
        mock_client = MagicMock()
        mock_client.get_or_create_collection.return_value = mock_collection
        with patch("gateway.orchestration.mitigation_graph.chromadb.HttpClient", return_value=mock_client):
            from gateway.orchestration.mitigation_graph import retrieve_rag_context
            result = retrieve_rag_context(base_state)
            assert "ctx1" in result["vector_context"]

    def test_returns_fallback_on_failure(self, base_state):
        mock_client = MagicMock()
        mock_client.get_or_create_collection.side_effect = Exception("connection failed")
        with patch("gateway.orchestration.mitigation_graph.chromadb.HttpClient", return_value=mock_client):
            from gateway.orchestration.mitigation_graph import retrieve_rag_context
            result = retrieve_rag_context(base_state)
            assert "Historical context unavailable" in result["vector_context"]

    def test_empty_context_for_no_results(self, base_state):
        mock_collection = MagicMock()
        mock_collection.query.return_value = {"documents": [[]]}
        mock_client = MagicMock()
        mock_client.get_or_create_collection.return_value = mock_collection
        with patch("gateway.orchestration.mitigation_graph.chromadb.HttpClient", return_value=mock_client):
            from gateway.orchestration.mitigation_graph import retrieve_rag_context
            result = retrieve_rag_context(base_state)
            assert "No historical context found" in result["vector_context"]


class TestQuerySupplierGraph:
    def test_returns_alternatives_on_success(self, base_state):
        with patch("core.db.neo4j_client.find_alternative_suppliers_by_name", return_value=[
            "Reliance (Asia)", "Adani (EU)",
        ]):
            from gateway.orchestration.mitigation_graph import query_supplier_graph
            result = query_supplier_graph(base_state)
            assert len(result["graph_context"]) == 2
            assert "Reliance (Asia)" in result["graph_context"]

    def test_returns_empty_on_failure(self, base_state):
        with patch("core.db.neo4j_client.find_alternative_suppliers_by_name", side_effect=Exception("connection failed")):
            from gateway.orchestration.mitigation_graph import query_supplier_graph
            result = query_supplier_graph(base_state)
            assert result["graph_context"] == []

    def test_formats_alternative_without_region(self, base_state):
        with patch("core.db.neo4j_client.find_alternative_suppliers_by_name", return_value=["Reliance"]):
            from gateway.orchestration.mitigation_graph import query_supplier_graph
            result = query_supplier_graph(base_state)
            assert result["graph_context"] == ["Reliance"]


class TestGenerateMitigation:
    def test_returns_fallback_on_llm_failure(self, base_state):
        with patch("gateway.orchestration.mitigation_graph.ChatGoogleGenerativeAI") as mock_llm:
            mock_llm.side_effect = Exception("API key missing")
            from gateway.orchestration.mitigation_graph import generate_mitigation
            result = generate_mitigation(base_state)
            assert "LLM unavailable" in result["final_plan"]
            assert "Tata" in result["final_plan"]

    def test_handles_no_alternatives(self, base_state):
        with patch("gateway.orchestration.mitigation_graph.ChatGoogleGenerativeAI") as mock_llm:
            mock_llm.side_effect = Exception("API error")
            from gateway.orchestration.mitigation_graph import generate_mitigation
            result = generate_mitigation(base_state)
            assert result["final_plan"]


class TestAuditService:
    def test_log_orchestrator_run_success(self):
        from gateway.services.audit_service import log_orchestrator_run
        result = log_orchestrator_run(
            supplier_name="Tata",
            risk_score=85,
            vector_context_length=100,
            graph_context_count=3,
            plan_length=500,
            error=None,
        )
        assert result["event"] == "orchestrator_run"
        assert result["supplier_name"] == "Tata"
        assert result["risk_score"] == 85
        assert result["error"] is None
        assert "timestamp" in result

    def test_log_orchestrator_run_with_error(self):
        from gateway.services.audit_service import log_orchestrator_run
        result = log_orchestrator_run(
            supplier_name="Adani",
            risk_score=50,
            vector_context_length=0,
            graph_context_count=0,
            plan_length=0,
            error="LLM API timeout",
        )
        assert result["error"] == "LLM API timeout"

    def test_orchestrator_invokes_audit(self, sample_event):
        from gateway.services.audit_service import log_orchestrator_run
        with patch("gateway.orchestration.mitigation_graph.log_orchestrator_run") as mock_audit, \
             patch("gateway.orchestration.mitigation_graph.chromadb.HttpClient") as mock_chroma, \
             patch("core.db.neo4j_client.find_alternative_suppliers_by_name") as mock_neo4j, \
             patch("gateway.orchestration.mitigation_graph.ChatGoogleGenerativeAI") as mock_llm:
            mock_collection = MagicMock()
            mock_collection.query.return_value = {"documents": [["ctx"]]}
            mock_chroma.return_value.get_or_create_collection.return_value = mock_collection
            mock_neo4j.return_value = ["Alt1 (Asia)"]
            mock_llm.side_effect = Exception("LLM unavailable")

            from gateway.orchestration.mitigation_graph import run_orchestrator
            run_orchestrator(sample_event)
            mock_audit.assert_called_once()
            kwargs = mock_audit.call_args.kwargs
            assert kwargs["supplier_name"] == "Tata"
            assert kwargs["risk_score"] == 85
            assert kwargs["error"] is None


class TestRunOrchestrator:
    def test_complete_pipeline_returns_all_fields(self, sample_event):
        with patch("gateway.orchestration.mitigation_graph.chromadb.HttpClient") as mock_chroma, \
             patch("core.db.neo4j_client.find_alternative_suppliers_by_name") as mock_neo4j, \
             patch("gateway.orchestration.mitigation_graph.ChatGoogleGenerativeAI") as mock_llm:

            mock_collection = MagicMock()
            mock_collection.query.return_value = {"documents": [["ctx"]]}
            mock_chroma.return_value.get_or_create_collection.return_value = mock_collection

            mock_neo4j.return_value = ["Alt1 (Asia)"]

            mock_llm.side_effect = Exception("LLM unavailable")

            from gateway.orchestration.mitigation_graph import run_orchestrator
            result = run_orchestrator(sample_event)
            assert result["risk_event"] == sample_event
            assert "vector_context" in result
            assert "graph_context" in result
            assert "final_plan" in result
            assert "LLM unavailable" in result["final_plan"]
