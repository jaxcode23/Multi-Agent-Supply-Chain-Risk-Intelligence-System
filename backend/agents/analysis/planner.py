
from typing import Optional
from core.db.neo4j_client import get_supplier_by_name, find_alternative_suppliers

def get_supplier_id_by_name(name: str) -> Optional[str]:
    supplier = get_supplier_by_name(name)
    if supplier is None:
        return None

    supplier_id = supplier.get("id")
    return str(supplier_id) if supplier_id is not None else None


def plan_alternatives(supplier_id: str):
    return find_alternative_suppliers(supplier_id)
