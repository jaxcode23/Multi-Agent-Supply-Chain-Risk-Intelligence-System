# 🐍 FastAPI Backend — AI Reasoning Layer

**Language:** Python 3.10+ | **Role:** RAG Reasoning, Supplier Graph, REST API

Exposes a FastAPI REST + WebSocket API that orchestrates the LangGraph mitigation pipeline, queries ChromaDB for semantic context, traverses the Neo4j supplier knowledge graph, and serves data to the Next.js dashboard.

---

## Directory Structure

```
backend/
├── main.py                                 # FastAPI app — router mount
├── requirements.txt                        # All Python dependencies
├── Dockerfile                              # Container image
├── agents/
│   └── analysis/
│       ├── analyzer.py                     # RAG analysis: ChromaDB query + Neo4j + risk score
│       ├── planner.py                      # Supplier ID lookup + alternative planning
│       └── risk_scoring.py                 # Keyword-based risk scorer (0–100 scale)
├── core/
│   ├── db/
│   │   ├── mongo_client.py                 # MongoDB client
│   │   └── neo4j_client.py                 # Neo4j driver + Cypher queries
│   └── models/                             # Pydantic request/response schemas
└── gateway/
    ├── api/
    │   ├── api_router.py                   # Main router — mounts all sub-routers
    │   ├── health/                         # Health check endpoint
    │   ├── risks/                          # Risk event endpoints (wired to orchestrator)
    │   ├── suppliers/                      # Supplier lookup endpoints
    │   ├── dashboard/                      # Dashboard aggregate endpoints
    │   └── agents/                         # Agent trigger endpoints (async)
    ├── orchestration/
    │   └── mitigation_graph.py             # LangGraph StateGraph — 3-node mitigation pipeline
    ├── domains/
    │   ├── analysis/
    │   │   └── models/                     # Analysis-specific Pydantic schemas
    │   ├── intelligence/
    │   │   ├── classifiers.py              # Risk classification by category
    │   │   ├── processors/                 # Intelligence data processing
    │   │   └── scrapers/                   # Intelligence source scraping
    │   └── planning/
    │       ├── graph/                      # Supply chain graph traversal
    │       └── optimization/               # Supplier selection optimization
    ├── services/
    │   ├── audit_service.py                # Audit log service
    │   └── app_dependencies.py             # ChromaDB & Neo4j DI
    └── app_config.py                       # Settings via pydantic-settings
```

---

## LangGraph Pipeline (`gateway/orchestration/mitigation_graph.py`)

Three-node linear graph invoked when a high-risk event is detected:

```
retrieve_rag_context   →   query_supplier_graph   →   generate_mitigation   →   END
        │                           │                           │
   ChromaDB query             Neo4j Cypher               LLM synthesis
    (live call)               (live call)                 (OpenAI GPT)
```

`run_orchestrator(risk_event)` is the single public entry point. Returns the full `AgentState`.

**All three nodes make live service calls** — ChromaDB for semantic context, Neo4j Aura for supplier graph traversal, and OpenAI GPT for mitigation plan generation.

---

## RAG Analyzer (`agents/analysis/analyzer.py`)

- Queries ChromaDB `supply_chain_intel` collection for top-3 historical disruption matches.
- Falls back silently (empty context string) if ChromaDB is unavailable.
- Calls Neo4j `find_alternative_suppliers()` when `risk_score >= 70`.
- Returns a structured risk assessment with alternatives and analyzed_at timestamp.

---

## Neo4j Graph Queries (`core/db/neo4j_client.py`)

| Function | Cypher |
|---|---|
| `get_supplier_by_name(name)` | `MATCH (s:Supplier {name:$name}) RETURN s` |
| `find_alternative_suppliers(id)` | Find all `Supplier` nodes sharing a `SUPPLIES` product with `id` |

---

## Running

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

---

## Code Status

| File | Status |
|---|---|
| `main.py` | ✅ Production |
| `core/db/neo4j_client.py` | ✅ Production — requires Neo4j running |
| `core/db/mongo_client.py` | ✅ Production — requires MongoDB running |
| `core/models/` | ✅ Production — all Pydantic schemas defined |
| `agents/analysis/analyzer.py` | ✅ Production — ChromaDB query silently falls back if unavailable |
| `agents/analysis/risk_scoring.py` | ✅ Production |
| `agents/analysis/planner.py` | ✅ Production |
| `gateway/api/risks/risk_router.py` | ✅ Production — wired to orchestrator |
| `gateway/api/suppliers/supplier_router.py` | ✅ Production |
| `gateway/api/dashboard/dashboard_router.py` | ✅ Production |
| `gateway/api/agents/agent_router.py` | ✅ Production — background task dispatch |
| `gateway/orchestration/mitigation_graph.py` | ✅ Production — live ChromaDB, Neo4j, and OpenAI calls |
| `gateway/domains/intelligence/classifiers.py` | ✅ Production |
| `gateway/domains/intelligence/processors/` | ✅ Production |
| `gateway/domains/intelligence/scrapers/` | ✅ Production |
| `gateway/domains/analysis/models/` | ✅ Production |
| `gateway/domains/planning/graph/` | ✅ Production |
| `gateway/domains/planning/optimization/` | ✅ Production |
| `gateway/services/audit_service.py` | ✅ Production |
| `gateway/app_dependencies.py` | ✅ Production |
