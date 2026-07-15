from __future__ import annotations

from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongo_uri: str
    mongo_db_name: str = "intelligence_db"

    chroma_api_key: str = ""
    chroma_tenant: str = ""
    chroma_database: str = "supply-chain-db"
    chroma_collection: str = "supply_chain_intel"
    chroma_host: str = "chroma"
    chroma_ssl: bool = True

    neo4j_uri: str
    neo4j_user: str = "neo4j"
    neo4j_password: str

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    rate_limit_per_minute: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("mongo_uri")
    @classmethod
    def _validate_mongo_uri(cls, v: str) -> str:
        if not v:
            raise ValueError("MONGO_URI must not be empty")
        return v

    @field_validator("neo4j_uri")
    @classmethod
    def _validate_neo4j_uri(cls, v: str) -> str:
        if not v:
            raise ValueError("NEO4J_URI must not be empty")
        if not v.startswith(("bolt://", "neo4j://", "bolt+s://", "neo4j+s://")):
            raise ValueError(
                f"NEO4J_URI must start with bolt:// or neo4j:// — got: {v}"
            )
        return v

    @field_validator("neo4j_password")
    @classmethod
    def _validate_neo4j_password(cls, v: str) -> str:
        if not v:
            raise ValueError("NEO4J_PASSWORD must not be empty")
        return v

    @field_validator("chroma_host")
    @classmethod
    def _validate_chroma_host(cls, v: str) -> str:
        if not v:
            raise ValueError("CHROMA_HOST must not be empty")
        return v

    @field_validator("rate_limit_per_minute")
    @classmethod
    def _validate_rate_limit(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("RATE_LIMIT_PER_MINUTE must be > 0")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
