from fastapi import APIRouter, HTTPException, Query
from typing import Any
from core.models import SupplierResponse, AlternativesResponse
from core.db.neo4j_client import get_supplier_by_name, find_alternative_suppliers

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("/{name}", response_model=SupplierResponse)
async def get_supplier(name: str):
    """Fetch a supplier node from the Neo4j knowledge graph by name."""
    supplier = get_supplier_by_name(name)
    if not supplier:
        raise HTTPException(status_code=404, detail=f"Supplier '{name}' not found.")
    return SupplierResponse(**supplier)


@router.get("/{name}/alternatives", response_model=AlternativesResponse)
async def get_alternatives(name: str, limit: int = Query(default=5, le=20)):
    """Return alternative suppliers sharing the same product categories."""
    supplier = get_supplier_by_name(name)
    if not supplier:
        raise HTTPException(status_code=404, detail=f"Supplier '{name}' not found.")

    alternatives = find_alternative_suppliers(supplier["id"], limit=limit)
    return AlternativesResponse(supplier_name=name, alternatives=alternatives)
