import os
import pytest
from unittest.mock import patch


class TestSettingsValidation:
    def setup_method(self):
        from gateway.app_config import get_settings
        get_settings.cache_clear()

    def test_valid_settings_passes(self):
        env = {
            "MONGO_URI": "mongodb://localhost:27017",
            "NEO4J_URI": "bolt://localhost:7687",
            "NEO4J_PASSWORD": "secret",
            "CHROMA_HOST": "chroma",
        }
        with patch.dict(os.environ, env, clear=False):
            from gateway.app_config import Settings
            settings = Settings()
            assert settings.mongo_uri == "mongodb://localhost:27017"

    def test_empty_mongo_uri_fails(self):
        env = {
            "MONGO_URI": "",
            "NEO4J_URI": "bolt://localhost:7687",
            "NEO4J_PASSWORD": "secret",
            "CHROMA_HOST": "chroma",
        }
        with patch.dict(os.environ, env, clear=False):
            from gateway.app_config import Settings
            with pytest.raises(Exception):
                Settings()

    def test_invalid_neo4j_uri_fails(self):
        env = {
            "MONGO_URI": "mongodb://localhost:27017",
            "NEO4J_URI": "http://localhost:7687",
            "NEO4J_PASSWORD": "secret",
            "CHROMA_HOST": "chroma",
        }
        with patch.dict(os.environ, env, clear=False):
            from gateway.app_config import Settings
            with pytest.raises(Exception):
                Settings()

    def test_empty_neo4j_password_fails(self):
        env = {
            "MONGO_URI": "mongodb://localhost:27017",
            "NEO4J_URI": "bolt://localhost:7687",
            "NEO4J_PASSWORD": "",
            "CHROMA_HOST": "chroma",
        }
        with patch.dict(os.environ, env, clear=False):
            from gateway.app_config import Settings
            with pytest.raises(Exception):
                Settings()

    def test_empty_chroma_host_fails(self):
        env = {
            "MONGO_URI": "mongodb://localhost:27017",
            "NEO4J_URI": "bolt://localhost:7687",
            "NEO4J_PASSWORD": "secret",
            "CHROMA_HOST": "",
        }
        with patch.dict(os.environ, env, clear=False):
            from gateway.app_config import Settings
            with pytest.raises(Exception):
                Settings()

    def test_negative_rate_limit_fails(self):
        env = {
            "MONGO_URI": "mongodb://localhost:27017",
            "NEO4J_URI": "bolt://localhost:7687",
            "NEO4J_PASSWORD": "secret",
            "CHROMA_HOST": "chroma",
            "RATE_LIMIT_PER_MINUTE": "-5",
        }
        with patch.dict(os.environ, env, clear=False):
            from gateway.app_config import Settings
            with pytest.raises(Exception):
                Settings()

    def test_valid_neo4j_schemes(self):
        for scheme in ["bolt://", "neo4j://", "bolt+s://", "neo4j+s://"]:
            env = {
                "MONGO_URI": "mongodb://localhost:27017",
                "NEO4J_URI": f"{scheme}localhost:7687",
                "NEO4J_PASSWORD": "secret",
                "CHROMA_HOST": "chroma",
            }
            with patch.dict(os.environ, env, clear=False):
                from gateway.app_config import Settings
                settings = Settings()
                assert settings.neo4j_uri.startswith(scheme)
