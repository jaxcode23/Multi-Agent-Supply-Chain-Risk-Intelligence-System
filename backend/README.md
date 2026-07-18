# FastAPI Backend — AI Reasoning Layer

**Language:** Python 3.11 | **Role:** RAG Reasoning, Supplier Graph, REST API

Exposes a FastAPI REST + WebSocket API that orchestrates the LangGraph mitigation pipeline, queries ChromaDB for semantic context, traverses the Neo4j supplier knowledge graph, and serves data to the Next.js dashboard.

---

## Directory Structure

```
backend/
├── main.py                                 # FastAPI app — CORS, router mount
├── requirements.txt                        # All Python dependencies
├── Dockerfile                              # Container image (non-root, healthcheck)
├── agents/
│   └── analysis/
│       ├── analyzer.py                     # RAG analysis: ChromaDB query + Neo4j + risk score
│       ├── planner.py                      # Supplier ID lookup + alternative planning
│       └── risk_scoring.py                 # Keyword-based risk scorer (0–100 scale)
├── core/
│   ├── db/
│   │   ├── mongo_client.py                 # MongoDB client singleton
│   │   └── neo4j_client.py                 # Neo4j driver + Cypher queries
│   └── models/                             # Pydantic request/response schemas
└── gateway/
    ├── api/
    │   ├── api_router.py                   # Main router — mounts all sub-routers
    │   ├── health/
    │   │   └── health_router.py            # GET /health + GET /ready (DB connectivity checks)
    │   ├── risks/
    │   │   └── risk_router.py              # POST /risks/analyze (async via asyncio.to_thread)
    │   ├── suppliers/
    │   │   └── supplier_router.py          # GET /suppliers/{name}, /alternatives
    │   ├── dashboard/
    │   │   └── dashboard_router.py         # GET /dashboard/summary, /recent
    │   ├── agents/
    │   │   └── agent_router.py             # POST /agents/trigger (BackgroundTasks)
    │   └── ws/
    │       └── ws_router.py                # WebSocket endpoint with MongoDB polling
    ├── orchestration/
    │   └── mitigation_graph.py             # LangGraph StateGraph — 3-node mitigation pipeline
    └── app_config.py                       # Settings via pydantic-settings
```

---

## LangGraph Pipeline (`gateway/orchestration/mitigation_graph.py`)

Three-node linear graph invoked when a high-risk event is detected:

```
retrieve_rag_context   →   query_supplier_graph   →   generate_mitigation   →   END
        │                           │                           │
   ChromaDB query             Neo4j Cypher               LLM synthesis
    (live call)               (live call)                 (Gemini)
```

`run_orchestrator(risk_event)` is the single public entry point. Returns the full `AgentState`.

**All three nodes make live service calls** — ChromaDB for semantic context, Neo4j Aura for supplier graph traversal, and Gemini for mitigation plan generation.

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

## Health (`gateway/api/health/health_router.py`)

| Endpoint | Description |
|---|---|
| `GET /health` | Returns `{"status": "ok", "service": "backend", "version": "1.0.0"}` |
| `GET /ready` | Checks MongoDB, Neo4j, ChromaDB connectivity. Returns 200 if all OK, 503 otherwise |

---

## Running

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Docker
docker build -f backend/Dockerfile -t supply-chain-backend .

# Docker Compose (from repo root)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up backend
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
| `gateway/api/risks/risk_router.py` | ✅ Production — wired to orchestrator via asyncio.to_thread |
| `gateway/api/suppliers/supplier_router.py` | ✅ Production |
| `gateway/api/dashboard/dashboard_router.py` | ✅ Production |
| `gateway/api/agents/agent_router.py` | ✅ Production — background task dispatch |
| `gateway/api/health/health_router.py` | ✅ Production — /health and /ready endpoints |
| `gateway/api/ws/ws_router.py` | ✅ Production — WebSocket with MongoDB polling |
| `gateway/orchestration/mitigation_graph.py` | ✅ Production — live ChromaDB, Neo4j, and Gemini calls |
