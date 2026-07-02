from unittest.mock import patch, MagicMock
import pytest


@pytest.fixture(autouse=True)
def _mock_neo4j_env(monkeypatch):
    monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
    monkeypatch.setenv("NEO4J_USER", "neo4j")
    monkeypatch.setenv("NEO4J_PASSWORD", "password")


@pytest.fixture
def mock_neo4j():
    with patch("agents.analysis.planner.get_supplier_by_name") as mock_get, \
         patch("agents.analysis.planner.find_alternative_suppliers") as mock_find:
        yield mock_get, mock_find


class TestGetSupplierIdByName:
    def test_returns_id_when_supplier_found(self, mock_neo4j):
        mock_get, _ = mock_neo4j
        mock_get.return_value = {"id": 42, "name": "Tata", "region": "Asia"}
        from agents.analysis.planner import get_supplier_id_by_name
        assert get_supplier_id_by_name("Tata") == "42"
        mock_get.assert_called_once_with("Tata")

    def test_returns_none_when_supplier_not_found(self, mock_neo4j):
        mock_get, _ = mock_neo4j
        mock_get.return_value = None
        from agents.analysis.planner import get_supplier_id_by_name
        assert get_supplier_id_by_name("Unknown") is None

    def test_returns_string_id_when_not_int(self, mock_neo4j):
        mock_get, _ = mock_neo4j
        mock_get.return_value = {"id": "not-an-int"}
        from agents.analysis.planner import get_supplier_id_by_name
        assert get_supplier_id_by_name("Tata") == "not-an-int"

    def test_returns_none_when_id_missing(self, mock_neo4j):
        mock_get, _ = mock_neo4j
        mock_get.return_value = {"name": "Tata"}
        from agents.analysis.planner import get_supplier_id_by_name
        assert get_supplier_id_by_name("Tata") is None


class TestPlanAlternatives:
    def test_delegates_to_find_alternative_suppliers(self, mock_neo4j):
        _, mock_find = mock_neo4j
        mock_find.return_value = [{"id": "S002", "name": "Reliance"}]
        from agents.analysis.planner import plan_alternatives
        result = plan_alternatives("42")
        assert result == [{"id": "S002", "name": "Reliance"}]
        mock_find.assert_called_once_with("42")
