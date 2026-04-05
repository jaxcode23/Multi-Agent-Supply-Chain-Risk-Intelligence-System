from neo4j import GraphDatabase

URI = "bolt://localhost:7687"
USERNAME = "neo4j"
PASSWORD = "neo4j1234"  # same as Neo4j Desktop

driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))

def get_supplier_by_id(supplier_id: int):
    with driver.session() as session:
        result = session.run(
            "MATCH (s:Supplier {id:$id}) RETURN s",
            id=supplier_id
        )
        record = result.single()
        return dict(record["s"]) if record else None


def find_alternative_suppliers(supplier_id: int):
    with driver.session() as session:
        result = session.run("""
        MATCH (s1:Supplier {id:$id})-[:SUPPLIES]->(p)<-[:SUPPLIES]-(s2:Supplier)
        WHERE s1 <> s2
        RETURN s2.name
        """, id=supplier_id)
        return [r["s2.name"] for r in result]