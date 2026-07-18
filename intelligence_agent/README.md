# Python Intelligence Agent

**Language:** Python 3.11 | **Role:** Ingestion Triage + LLM Analysis Pipeline

Polls NewsAPI for supply chain risk events, scores them with keyword-based triage, stores high-signal articles in MongoDB, and runs a two-stage Gemini LLM pipeline over escalated documents to produce structured analysis and RAG-ready chunks.

---

## Directory Structure

```
intelligence_agent/
├── pipeline_runner.py                          # Orchestrator: Mongo → LLM → Mongo write-back
├── health_server.py                            # HTTP /health and /ready endpoints (threaded)
├── logging_config.py                           # Structured JSON logging setup
├── requirements.txt                            # All Python dependencies
├── Dockerfile                                  # Container image (non-root, healthcheck)
├── cron/
│   └── job.py                                  # schedule-based 15-min cron loop + health server
├── db/
│   ├── model/intel_document.py                 # Pydantic v2 IntelDocument + IntelAnalysis schemas
│   ├── mongo_service.py                        # MongoDB read (get_escalated_documents) + write-back
│   ├── mongo_setup.py                          # One-time index creation (composite, TTL, unique URL)
│   └── chroma_client.py                        # ChromaDB HTTP client for RAG chunk upsert
├── infrastructure/
│   └── mongo/mongo_client.py                   # MongoClient singleton (TLS, env-driven URI)
├── ingestion/
│   └── news_fetcher.py                         # NewsAPI polling with keyword triage + dedup
├── intelligence_logic/
│   ├── llm_analyzer.py                         # Two-stage Gemini pipeline (Analysis + Context Prep)
│   ├── escalation_planner.py                   # assign_priority() + should_escalate()
│   └── risk_scorer.py                          # Keyword-based risk scorer (0–100 scale)
└── test/
    ├── test_health_server.py                   # Pytest tests for health server
    ├── mongo.py                                # Manual connectivity test
    └── seed_data.py                            # Test data seeder
```

---

## Data Flow

```
NewsAPI (every 15 min via cron/job.py)
    │
    ▼
news_fetcher.run_ingestion_cycle()
    ├── keyword risk score  →  score == 0: discard
    ├── Pydantic validation →  invalid: log + skip
    ├── URL-hash dedup      →  DuplicateKeyError: silent skip
    └── MongoDB insert      →  raw_intel collection
            │
            │  (escalate_to_analysis == True)
            ▼
pipeline_runner.run_analysis_pipeline()
    ├── Stage 1: run_analysis_agent()       → Gemini → structured JSON
    └── Stage 2: run_context_prep_agent()  → Gemini → RAG text chunks
            │
            ▼
    MongoDB write-back (llm_analysis + rag_chunks + llm_processed=True)
```

---

## Health Server (`health_server.py`)

Threaded HTTP server providing liveness and readiness checks:

| Endpoint | Description |
|---|---|
| `GET /health` | Returns `{"status": "ok", "service": "intelligence_agent", "version": "1.0.0"}` |
| `GET /ready` | Checks MongoDB, NEWS_API_KEY, GEMINI_API_KEY. Returns 200 if all OK, 503 otherwise |

Started automatically by `cron/job.py` on the main thread.

---

## MongoDB Schema (`db/model/intel_document.py`)

| Field | Type | Notes |
|---|---|---|
| `_id` | `str` (MD5) | URL hash — guarantees deduplication at DB level |
| `url` | `str` | Source article URL |
| `title` | `str` | Article headline |
| `raw_text` | `str` | `"{title} {description}"` — this is the LLM input field |
| `published_at` | `datetime` | Parsed from NewsAPI ISO string |
| `ingested_at` | `datetime` | Set at insertion time |
| `analysis.risk_score` | `int` | 0–100 keyword score |
| `analysis.priority` | `str` | `low / medium / high` |
| `analysis.escalate_to_analysis` | `bool` | `True` when `risk_score >= 30` |
| `llm_analysis` | `dict` | Written by Stage 1 after LLM run |
| `rag_chunks` | `list[str]` | Written by Stage 2 after LLM run |
| `llm_processed` | `bool` | Set `True` to prevent re-processing |

---

## MongoDB Indexes (`db/mongo_setup.py`)

| Index | Type | Purpose |
|---|---|---|
| `(analysis.priority, ingested_at)` | Composite | Fast "high priority last 24h" queries |
| `url` | Unique | Dedup fallback (URL instead of hash) |
| `ingested_at` | TTL (30 days) | Auto-delete old documents |

---

## LLM Pipeline (`intelligence_logic/llm_analyzer.py`)

- **Model:** `gemini-1.5-flash` with `response_mime_type="application/json"` and `temperature=0.1`
- **Retry:** `tenacity` — 3 attempts, exponential backoff (2s → 10s)
- **Stage 1 input field:** `raw_text` (NOT `content`) — reads from MongoDB correctly
- **Stage 2 output:** `list[str]` of self-contained semantic paragraphs for ChromaDB

---

## Configuration

| Env Var | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `MONGO_DB_NAME` | ✅ | Default: `intelligence_db` |
| `NEWS_API_KEY` | ✅ | NewsAPI.org API key |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |

---

## Running

```bash
# One-time DB setup
python -m intelligence_agent.db.mongo_setup

# Start the 15-min ingestion cron loop (includes health server on port 9100)
python -m intelligence_agent.cron.job

# Run the LLM analysis pipeline manually (idempotent)
python -m intelligence_agent.pipeline_runner

# Run tests
pytest intelligence_agent/test/test_health_server.py -v

# Docker
docker build -f intelligence_agent/Dockerfile -t supply-chain-intelligence .

# Docker Compose (from repo root)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up intelligence-agent
```

---

## Code Status

| File | Status |
|---|---|
| `infrastructure/mongo/mongo_client.py` | ✅ Production |
| `db/model/intel_document.py` | ✅ Production |
| `db/mongo_setup.py` | ✅ Production |
| `db/mongo_service.py` | ✅ Production |
| `db/chroma_client.py` | ✅ Production |
| `ingestion/news_fetcher.py` | ✅ Production |
| `intelligence_logic/risk_scorer.py` | ✅ Production |
| `intelligence_logic/escalation_planner.py` | ✅ Production |
| `intelligence_logic/llm_analyzer.py` | ✅ Production — **requires real `GEMINI_API_KEY`** |
| `cron/job.py` | ✅ Production — starts health server + scheduler |
| `pipeline_runner.py` | ✅ Production |
| `health_server.py` | ✅ Production — /health and /ready endpoints |
| `logging_config.py` | ✅ Production — structured JSON logging |
