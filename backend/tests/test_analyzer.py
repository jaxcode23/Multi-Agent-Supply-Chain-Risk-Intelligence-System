from unittest.mock import patch, MagicMock
import pytest


@pytest.fixture(autouse=True)
def _mock_env(monkeypatch):
    monkeypatch.setenv("MONGO_URI", "mongodb://localhost:27017")
    monkeypatch.setenv("DB_NAME", "test_db")


@pytest.fixture(autouse=True)
def _mock_mongo():
    with patch("pymongo.MongoClient") as mock:
        mock_instance = MagicMock()
        mock.return_value = mock_instance
        mock_instance.__getitem__.return_value.__getitem__.return_value = MagicMock()
        yield mock


@pytest.fixture(autouse=True)
def _mock_chromadb():
    with patch("chromadb.HttpClient") as mock:
        mock_collection = MagicMock()
        mock_collection.query.return_value = {"documents": [["context chunk"]]}
        mock_instance = MagicMock()
        mock_instance.get_or_create_collection.return_value = mock_collection
        mock.return_value = mock_instance
        yield mock


@pytest.fixture
def mock_planner():
    with patch("agents.analysis.analyzer.get_supplier_id_by_name") as mock_get, \
         patch("agents.analysis.analyzer.plan_alternatives") as mock_plan:
        mock_get.return_value = 42
        mock_plan.return_value = ["Alt Supplier"]
        yield mock_get, mock_plan


class TestDetectSupplier:
    def test_detects_known_supplier(self):
        from agents.analysis.analyzer import detect_supplier
        assert detect_supplier("Tata Motors reported earnings") == "Tata"
        assert detect_supplier("Reliance Industries expands") == "Reliance"
        assert detect_supplier("Adani Group acquires") == "Adani"

    def test_case_insensitive(self):
        from agents.analysis.analyzer import detect_supplier
        assert detect_supplier("tata motors") == "Tata"
        assert detect_supplier("RELIANCE") == "Reliance"

    def test_returns_none_for_unknown(self):
        from agents.analysis.analyzer import detect_supplier
        assert detect_supplier("Some other company") is None

    def test_returns_none_for_empty(self):
        from agents.analysis.analyzer import detect_supplier
        assert detect_supplier("") is None


class TestAnalyzeNews:
    def test_returns_analysis_for_high_risk(self, mock_planner):
        from agents.analysis.analyzer import analyze_news
        result = analyze_news({
            "supplier_name": "Tata",
            "headline": "fire at warehouse",
            "content": "Major fire at Tata warehouse",
        })
        assert result is not None
        assert result["supplier_name"] == "Tata"
        assert result["risk_score"] == 90
        assert "Alt Supplier" in result["alternatives"]
        assert "analyzed_at" in result

    def test_returns_analysis_for_low_risk_no_alternatives(self, mock_planner):
        mock_get, mock_plan = mock_planner
        from agents.analysis.analyzer import analyze_news
        result = analyze_news({
            "supplier_name": "Tata",
            "headline": "normal operations",
            "content": "All normal",
        })
        assert result is not None
        assert result["risk_score"] == 20
        assert result["alternatives"] == []
        mock_plan.assert_not_called()

    def test_returns_none_without_supplier_name(self, mock_planner):
        from agents.analysis.analyzer import analyze_news
        result = analyze_news({
            "headline": "fire",
            "content": "fire at plant",
        })
        assert result is None

    def test_returns_none_when_supplier_id_missing(self, mock_planner):
        mock_get, _ = mock_planner
        mock_get.return_value = None
        from agents.analysis.analyzer import analyze_news
        result = analyze_news({
            "supplier_name": "Unknown",
            "headline": "fire",
            "content": "fire",
        })
        assert result is None

    def test_includes_context_from_chromadb(self, mock_planner):
        from agents.analysis.analyzer import analyze_news
        result = analyze_news({
            "supplier_name": "Tata",
            "headline": "fire",
            "content": "fire",
        })
        assert result is not None
        assert result["context"] != ""

    def test_returns_reason_from_headline(self, mock_planner):
        from agents.analysis.analyzer import analyze_news
        result = analyze_news({
            "supplier_name": "Tata",
            "headline": "fire at warehouse",
            "content": "details",
        })
        assert result["reason"] == "fire at warehouse"

    def test_handles_missing_headline_and_content(self, mock_planner):
        from agents.analysis.analyzer import analyze_news
        result = analyze_news({
            "supplier_name": "Tata",
        })
        assert result is not None
        assert result["reason"] == ""
