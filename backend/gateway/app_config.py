from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    mongo_uri: str
    mongo_db_name: str = "intelligence_db"

    chroma_api_key: str = ""
    chroma_tenant: str = ""
    chroma_database: str = "supply-chain-db"
    chroma_collection: str = "supply_chain_intel"
    chroma_host: str = "api.trychroma.com"

    neo4j_uri: str
    neo4j_user: str = "neo4j"
    neo4j_password: str

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    gemini_api_key: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
