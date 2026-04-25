from neo4j import GraphDatabase
from dotenv import load_dotenv
from typing import Optional, Dict, List, Any
import os

load_dotenv()

# ---------- Neo4j ----------
NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "neo4j1234")

neo4j_driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD),
    max_connection_lifetime=1000
)

# ---------- Neo4j Queries ----------

def get_supplier_by_name(name: str) -> Optional[Dict[str, Any]]:
    """
    Fetch supplier node as dict.
    """
    with neo4j_driver.session() as session:
        record = session.run(
            "MATCH (s:Supplier {name:$name}) RETURN s",
            name=name
        ).single()

        if record is None:
            return None

        return dict(record["s"])


def find_alternative_suppliers(supplier_id: int) -> List[str]:
    """
    Find alternative suppliers sharing products.
    """
    with neo4j_driver.session() as session:
        result = session.run(
            """
            MATCH (s1:Supplier {id:$id})-[:SUPPLIES]->(p)<-[:SUPPLIES]-(s2:Supplier)
            WHERE s1 <> s2
            RETURN DISTINCT s2.name AS name
            """,
            id=supplier_id
        )

        return [record["name"] for record in result]
