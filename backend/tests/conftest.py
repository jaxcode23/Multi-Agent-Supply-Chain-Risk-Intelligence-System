import os
import pytest


os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017")
os.environ.setdefault("MONGO_DB_NAME", "test_db")
os.environ.setdefault("NEO4J_URI", "bolt://localhost:7687")
os.environ.setdefault("NEO4J_USER", "neo4j")
os.environ.setdefault("NEO4J_PASSWORD", "password")
os.environ.setdefault("CHROMA_API_KEY", "test-key")
os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("NEO4J_URI", "bolt://localhost:7687")


@pytest.fixture(autouse=True)
def reset_lru_caches():
    from core.db.neo4j_client import _get_driver
    _get_driver.cache_clear()
    from gateway.app_config import get_settings
    get_settings.cache_clear()
    yield
