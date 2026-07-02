from __future__ import annotations


def build_supply_chain_graph(supplier_id: str) -> dict:
    return {
        "supplier_id": supplier_id,
        "nodes": [],
        "edges": [],
    }


def find_path(source_id: str, target_id: str, max_depth: int = 3) -> list[str]:
    return []
