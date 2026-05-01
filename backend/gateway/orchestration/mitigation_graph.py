"""
LangGraph mitigation pipeline — 3-node linear graph.

  retrieve_rag_context → query_supplier_graph → generate_mitigation → END

All nodes use live cloud services (ChromaDB cloud, Neo4j Aura, OpenAI).
Credentials come exclusively from environment variables via gateway.config.Settings.
"""

from __future__ import annotations

import logging
from typing import TypedDict, Any

import chromadb
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END

from gateway.app_config import get_settings

logger = logging.getLogger(__name__)
_settings = get_settings()


class AgentState(TypedDict):
    risk_event: dict[str, Any]
    vector_context: str
    graph_context: list[str]
    final_plan: str


# ── Node 1: ChromaDB cloud RAG retrieval ──────────────────────────────────────

def retrieve_rag_context(state: AgentState) -> dict[str, Any]:
    """Query ChromaDB cloud for the top-3 most relevant historical disruption chunks."""
    risk_event = state["risk_event"]
    supplier = risk_event.get("supplier_name", "")
    headline = risk_event.get("headline", "")
    query = f"{supplier} {headline}".strip()

    logger.info(f"[Node 1] ChromaDB query: '{query[:80]}'")

    try:
        client = chromadb.HttpClient(
            host=_settings.chroma_host,
            ssl=True,
            headers={"X-Chroma-Token": _settings.chroma_api_key},
        )
        collection = client.get_or_create_collection(_settings.chroma_collection)
        results = collection.query(query_texts=[query], n_results=3)
        docs = results.get("documents", [[]])[0]
        context = "\n\n".join(docs) if docs else "No historical context found."
        logger.info(f"[Node 1] Retrieved {len(docs)} context chunk(s).")
    except Exception as e:
        logger.warning(f"[Node 1] ChromaDB query failed: {e}. Proceeding with empty context.")
        context = "Historical context unavailable."

    return {"vector_context": context}


# ── Node 2: Neo4j Aura supplier graph traversal ───────────────────────────────

def query_supplier_graph(state: AgentState) -> dict[str, Any]:
    """Traverse Neo4j Aura to find alternative suppliers sharing the same product categories."""
    from neo4j import GraphDatabase

    risk_event = state["risk_event"]
    supplier = risk_event.get("supplier_name", "")
    supplier_id = risk_event.get("supplier_id")

    logger.info(f"[Node 2] Neo4j query for alternatives to '{supplier}'.")

    alternatives: list[str] = []
    try:
        driver = GraphDatabase.driver(
            _settings.neo4j_uri,
            auth=(_settings.neo4j_user, _settings.neo4j_password),
        )
        query = """
            MATCH (s:Supplier {name: $name})-[:SUPPLIES]->(p:Product)<-[:SUPPLIES]-(alt:Supplier)
            WHERE alt.name <> $name AND alt.status = 'ACTIVE'
            RETURN DISTINCT alt.name AS name, alt.region AS region
            ORDER BY alt.reliability_score DESC
            LIMIT 5
        """
        with driver.session() as session:
            result = session.run(query, name=supplier)
            alternatives = [
                f"{r['name']} ({r['region']})" if r.get("region") else r["name"]
                for r in result
            ]
        driver.close()
        logger.info(f"[Node 2] Found {len(alternatives)} alternative(s).")
    except Exception as e:
        logger.warning(f"[Node 2] Neo4j query failed: {e}. Proceeding with empty alternatives.")

    return {"graph_context": alternatives}


# ── Node 3: OpenAI GPT mitigation synthesis ───────────────────────────────────

_MITIGATION_PROMPT = ChatPromptTemplate.from_template("""
You are a senior supply chain risk analyst. Based on the information below, generate a
structured, actionable mitigation plan. Be specific and concise.

RISK EVENT:
- Supplier: {supplier}
- Headline: {headline}
- Risk Score: {risk_score}/100

HISTORICAL CONTEXT (from knowledge base):
{vector_context}

IDENTIFIED ALTERNATIVE SUPPLIERS:
{alternatives}

Output a mitigation plan with these sections:
1. IMMEDIATE ACTIONS (within 24 hours)
2. SHORT-TERM ACTIONS (within 2 weeks)
3. MONITORING PLAN
""")


def generate_mitigation(state: AgentState) -> dict[str, Any]:
    """Call OpenAI GPT to synthesise RAG context and graph alternatives into a mitigation plan."""
    risk_event = state["risk_event"]
    alternatives = state["graph_context"]
    alternatives_str = ", ".join(alternatives) if alternatives else "None identified"

    logger.info(f"[Node 3] Generating mitigation plan via {_settings.openai_model}.")

    try:
        llm = ChatOpenAI(
            model=_settings.openai_model,
            temperature=0.2,
            api_key=_settings.openai_api_key,
        )
        chain = _MITIGATION_PROMPT | llm
        response = chain.invoke({
            "supplier": risk_event.get("supplier_name", "Unknown"),
            "headline": risk_event.get("headline", "N/A"),
            "risk_score": risk_event.get("risk_score", 0),
            "vector_context": state["vector_context"],
            "alternatives": alternatives_str,
        })
        plan = response.content
        logger.info(f"[Node 3] Plan generated ({len(plan)} chars).")
    except Exception as e:
        logger.error(f"[Node 3] LLM call failed: {e}.")
        plan = (
            f"LLM unavailable. Manual review required.\n"
            f"Supplier: {risk_event.get('supplier_name')} | Score: {risk_event.get('risk_score')}\n"
            f"Alternatives: {alternatives_str}"
        )

    return {"final_plan": plan}


# ── Graph assembly ────────────────────────────────────────────────────────────

def _build_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("retrieve_rag_context", retrieve_rag_context)
    graph.add_node("query_supplier_graph", query_supplier_graph)
    graph.add_node("generate_mitigation", generate_mitigation)
    graph.set_entry_point("retrieve_rag_context")
    graph.add_edge("retrieve_rag_context", "query_supplier_graph")
    graph.add_edge("query_supplier_graph", "generate_mitigation")
    graph.add_edge("generate_mitigation", END)
    return graph.compile()


_compiled_graph = _build_graph()


def run_orchestrator(risk_event: dict[str, Any]) -> dict[str, Any]:
    """Invoke the compiled mitigation graph. Returns final AgentState."""
    logger.info(
        f"🚀 Orchestrator invoked | supplier='{risk_event.get('supplier_name')}' "
        f"| risk_score={risk_event.get('risk_score')}"
    )
    initial_state: AgentState = {
        "risk_event": risk_event,
        "vector_context": "",
        "graph_context": [],
        "final_plan": "",
    }
    final_state = _compiled_graph.invoke(initial_state)
    logger.info(f"✅ Orchestrator complete | plan_length={len(final_state.get('final_plan', ''))} chars")
    return final_state
