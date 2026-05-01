import chromadb
from neo4j import GraphDatabase
from fastapi import Depends
from functools import lru_cache
from gateway.app_config import Settings, get_settings


@lru_cache
def get_chroma_client(settings: Settings = Depends(get_settings)) -> chromadb.HttpClient:
    return chromadb.HttpClient(
        host=settings.chroma_host,
        ssl=True,
        headers={"X-Chroma-Token": settings.chroma_api_key},
    )


@lru_cache
def get_neo4j_driver(settings: Settings = Depends(get_settings)):
    return GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )
