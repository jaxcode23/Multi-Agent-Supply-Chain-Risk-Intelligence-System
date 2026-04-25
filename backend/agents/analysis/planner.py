
from typing import Optional
from core.db.neo4j import get_supplier_by_name, find_alternative_suppliers

def get_supplier_id_by_name(name: str) -> Optional[int]:
    supplier = get_supplier_by_name(name)
    if supplier is None:
        return None

    supplier_id = supplier.get("id")
    return supplier_id if isinstance(supplier_id, int) else None


def plan_alternatives(supplier_id: int):
    return find_alternative_suppliers(supplier_id)
