from __future__ import annotations


def rank_alternatives(alternatives: list[dict]) -> list[dict]:
    return sorted(alternatives, key=lambda x: x.get("reliability_score", 0), reverse=True)


def optimize_supplier_selection(candidates: list[dict], constraints: dict) -> list[dict]:
    return candidates[:3]
