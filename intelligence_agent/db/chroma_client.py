import os
import logging
import chromadb
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_CHROMA_HOST = os.getenv("CHROMA_HOST", "chroma")
_CHROMA_API_KEY = os.getenv("CHROMA_API_KEY", "")
_CHROMA_SSL = os.getenv("CHROMA_SSL", "true").lower() == "true"
_CHROMA_TENANT = os.getenv("CHROMA_TENANT", "")
_CHROMA_DATABASE = os.getenv("CHROMA_DATABASE", "supply-chain-db")
_CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "supply_chain_intel")


def _get_collection():
    client = chromadb.HttpClient(
        host=_CHROMA_HOST,
        ssl=_CHROMA_SSL,
        headers={"X-Chroma-Token": _CHROMA_API_KEY} if _CHROMA_API_KEY else {},
    )
    return client.get_or_create_collection(_CHROMA_COLLECTION)


def upsert_rag_chunks(doc_id: str, chunks: list[str], metadata: dict | None = None) -> None:
    if not chunks:
        logger.warning("No RAG chunks to upsert.")
        return

    try:
        collection = _get_collection()
        ids = [f"{doc_id}-{i}" for i in range(len(chunks))]
        metadatas = [metadata or {} for _ in chunks]
        collection.upsert(ids=ids, documents=chunks, metadatas=metadatas)
        logger.info(f"Upserted {len(chunks)} RAG chunks for doc {doc_id[:8]}...")
    except Exception as e:
        logger.error(f"Failed to upsert RAG chunks to ChromaDB: {e}")
