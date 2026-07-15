from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
