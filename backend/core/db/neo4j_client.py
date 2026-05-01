import os
import logging
from functools import lru_cache
from typing import Optional, Any
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()
logger = logging.getLogger(__name__)

_NEO4J_URI      = os.environ["NEO4J_URI"]       # required — no fallback
_NEO4J_USER     = os.environ["NEO4J_USER"]      # required
_NEO4J_PASSWORD = os.environ["NEO4J_PASSWORD"]  # required


@lru_cache
def _get_driver():
    return GraphDatabase.driver(
        _NEO4J_URI,
        auth=(_NEO4J_USER, _NEO4J_PASSWORD),
        max_connection_lifetime=1000,
    )


def get_supplier_by_name(name: str) -> Optional[dict[str, Any]]:
    """Fetch a Supplier node from Neo4j Aura by exact name match."""
    with _get_driver().session() as session:
        record = session.run(
            "MATCH (s:Supplier {name: $name}) RETURN s",
            name=name,
        ).single()
        return dict(record["s"]) if record else None


def find_alternative_suppliers(supplier_id: str, limit: int = 5) -> list[dict[str, Any]]:
    """Return active alternative suppliers sharing product categories with the given supplier."""
    with _get_driver().session() as session:
        result = session.run(
            """
            MATCH (s:Supplier {id: $id})-[:SUPPLIES]->(p:Product)<-[:SUPPLIES]-(alt:Supplier)
            WHERE alt.id <> $id AND alt.status = 'ACTIVE'
            RETURN DISTINCT alt.id AS id, alt.name AS name, alt.region AS region,
                   alt.reliability_score AS reliability_score
            ORDER BY alt.reliability_score DESC
            LIMIT $limit
            """,
            id=supplier_id,
            limit=limit,
        )
        return [dict(r) for r in result]
