# Shadow Network — Engineering Analysis

**Audit date:** 2026-07-09
**Auditor:** Incoming lead engineer (code-inspection-based)
**Status:** Living document — replace on every significant architectural change.

---

## 1. System Overview

Shadow Network is a polyglot supply-chain risk intelligence platform. It polls news sources, scrapes web data, processes text through a vector ingestion pipeline, runs LLM-based analysis, and exposes results via a REST/WebSocket API and Next.js dashboard.

Five runtimes, six service boundaries:

| Service | Language | Role |
|---|---|---|
| Go Scraping Gateway | Go 1.26 | Web scraping, rate limiting, gRPC streaming |
| Scala Processing Hub | Scala 2.13 / ZIO 2 | Text chunking, ChromaDB ingestion |
| Python Backend (API) | Python 3.11 | FastAPI REST + WS, LangGraph mitigation pipeline |
| Python Intelligence Agent | Python 3.11 | NewsAPI polling, two-stage Gemini LLM pipeline |
| Rust Runner | Rust 2021 | Process supervisor (spawns all services) |
| TypeScript Frontend | TS / Next.js 16 | User dashboard |

Infrastructure: ChromaDB (vector store), Neo4j (knowledge graph), MongoDB (document store).

---

## 2. Service Boundaries & Data Flow

```
NewsAPI ──► Intelligence Agent ──► MongoDB ──► Backend API ──► Frontend
  (poll)        (triage + Gemini)    (store)     (FastAPI)      (Next.js)

Web Feeds ──► Go Scraper ──gRPC──► Scala Hub ──HTTP──► ChromaDB
  (scrape)      (stream)          (chunk)        (upsert)
                                          │
                                          ▼
                                    Backend API (RAG query)
                                    Neo4j Aura (supplier graph)
                                    OpenAI GPT (mitigation plan)
```

**Critical observation:** The Intelligence Agent and the Go→Scala ingestion pipeline are **two completely independent ingestion paths** that feed different stores (MongoDB vs ChromaDB). They have no integration point. The Backend API queries both stores independently.

---

## 3. Detailed Service Audits

### 3.1 Go Scraping Gateway (`/scrapers`)

**Responsibility:** Scrape web pages via Colly, stream results to the Scala Hub over gRPC.

**Files (9 source, 5 test):**
- `cmd/api/main.go` — Entrypoint: env-var config, signal handling, worker pool, gRPC wiring, fan-out goroutine, health HTTP server
- `internal/api/http_server.go` — `/health` (always 200), `/ready` (gRPC-dependent 200/503)
- `internal/api/http_server_test.go` — 4 tests (health, ready, timeouts, routes)
- `internal/models/task.go` — `ScrapeTask`, `ScrapeResult` types
- `internal/service/scrape_engine.go` — Colly-based engine with rate limiter + UA rotation
- `internal/service/scrape_engine_test.go` — 2 tests (domain extraction, construction)
- `internal/service/scraper_service.go` — SectionWorker pattern, ScraperService orchestrator
- `internal/service/scraper_service_test.go` — 6 tests (worker execute, result channel, StartHopping)
- `internal/service/grpc_client.go` — gRPC client with retry, keepalive, `CloseAndRecv`
- `internal/service/grpc_client_test.go` — 6 tests (construction, IsReady, connect timeout, env vars)
- `internal/utils/rate_limiter.go` — Per-domain `rate.Limiter` with jitter, UserAgent rotator
- `internal/utils/rate_limiter_test.go` — 7 tests (wait, cancellation, isolation, jitter, UA)
- `internal/controller/controller.go` — **DEAD CODE** (never imported by anything)
- `pkg/workerpool/pool.go` — Generic goroutine pool (Submit, Stop, WaitGroup)
- `pkg/workerpool/pool_test.go` — 3 tests (multi-task, cancellation, error handling)
- `pkg/pb/scrapper.pb.go` — Generated protobuf types
- `pkg/pb/scrapper_grpc.pb.go` — Generated gRPC client/server stubs

**Configuration:** 8 env vars (`SCALA_HUB_ADDR`, `HTTP_ADDR`, `WORKER_CONCURRENCY`, `PAYLOAD_BUFFER_SIZE`, `SHUTDOWN_GRACE_SECONDS`, `SCRAPE_SEEDS`, `DIAL_TIMEOUT_SECONDS`, `SEND_TIMEOUT_SECONDS`, `MAX_SEND_RETRIES`). Seed targets parsed from `SCRAPE_SEEDS` env var (semicolon-delimited `url,selector` tuples).

**Health:** HTTP `/health` (process-alive) and `/ready` (gRPC connection state). No dependency checks beyond gRPC connectivity. No metrics endpoint.

**Logging:** Structured JSON via `slog` (stdlib), except 2 `fmt.Printf` calls in `scraper_service.go`.

**Shutdown:** SIGINT/SIGTERM via `signal.NotifyContext` -> pool drain -> HTTP shutdown -> gRPC `CloseAndRecv` with configurable grace timeout.

**Dependencies (go.mod):** `colly/v2`, `grpc`, `protobuf`, `golang.org/x/time`. **All deps incorrectly marked `// indirect`.**

**Issues:**
- Context is NOT propagated to Colly's HTTP calls (timeout is cosmetic)
- Worker pool silently discards task errors (`_ = fmt.Errorf(...)`)
- No panic recovery in pool workers (one panic kills a goroutine permanently)
- `controller.go` is entirely dead code
- Unused fields on ScrapeTask (`Type`, `Depth`, `Ctx`) and unused `sendTimeout` in grpc_client
- `envInt`/`envDuration` duplicated across `main.go` and `grpc_client.go`
- Naive domain extraction (`strings.Split` instead of `net/url.Parse`)
- Results silently dropped after 1s timeout in `sendResult`
- `sync.Map` overkill for per-domain rate limiter map
- Jitter applied BEFORE rate limit wait (adds latency even when unthrottled)
- All `go.mod` deps marked `// indirect` (wrong)
- No TLS on gRPC connection (`insecure.NewCredentials()`)
- Proto spelling inconsistency: `scrapper` (double p) vs `ScrapePayload` (single p)

**Testing:** 28 unit tests across 5 test files. Core `Scrape()` method and gRPC stream success path untested (require running servers). No integration or E2E tests.

---

### 3.2 Scala Processing Hub (`/ingestion`)

**Responsibility:** Receive gRPC stream from Go, normalize text, sliding-window chunk (1000 chars/200 overlap), batch-upsert to ChromaDB.

**Files (10 source, 5 test):**
- `build.sbt` — SBT build with ScalaPB, ZIO gRPC, ZIO HTTP, Akka (dead), ZIO Test
- `Dockerfile` — Multi-stage GraalVM->JRE build; **structurally broken** (see issues)
- `src/main/scala/Main.scala` — ZIOAppDefault with ZLayer wiring (Netty gRPC server)
- `src/main/scala/config/AppConfig.scala` — 9 env-var config fields with defaults
- `src/main/scala/db/ChromaDBClient.scala` — Trait + Live (HTTP) + Stub (log-only) implementations
- `src/main/scala/domain/Model.scala` — `RawScraperPayload`, `NormalizedRiskEvent` — **DEAD CODE**
- `src/main/scala/models/IntelDocument.scala` — `IntelDocument`, `ChunkRecord` — **DEAD CODE**
- `src/main/scala/service/IngestionService.scala` — gRPC service impl: filter -> normalize -> chunk -> batch upsert
- `src/main/scala/streams/RiskIntelPipeline.scala` — `chunkText` (used) + `processStream` (**DEAD CODE**)
- `src/main/resources/application.conf` — Akka + Kafka settings — **DEAD CONFIG** (nothing reads it)
- `src/main/resources/logback.xml` — JSON structured logging via LogstashEncoder
- `src/main/protobuf/scrapper.proto` — Proto definition (duplicate of root `proto/scrapper.proto`)
- `src/test/scala/AppConfigSpec.scala` — 3 tests (1 is a no-op, acknowledges can't test env vars)
- `src/test/scala/ChromaDBClientStubSpec.scala` — 3 tests (upsert, batch, empty)
- `src/test/scala/DomainModelSpec.scala` — Tests dead code models
- `src/test/scala/IntelDocumentSpec.scala` — Tests dead code models
- `src/test/scala/RiskIntelPipelineSpec.scala` — 8 tests covering chunking algorithm

**Configuration:** 9 env vars (`GRPC_PORT`, `CHROMA_HOST`, `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`, `CHROMA_COLLECTION`, `CHUNK_SIZE`, `CHUNK_OVERLAP`, `BATCH_SIZE`). `application.conf` is NOT read by any code.

**Health:** No health endpoint (gRPC health protocol not implemented). Service is live when gRPC server binds.

**Logging:** ZIO logging bridged to SLF4J -> Logback -> JSON via LogstashEncoder.

**Shutdown:** ZIO's built-in interruption model handles gRPC server shutdown.

**Dependencies (build.sbt):** ZIO 2.0.19, ZIO HTTP 3.0.0-RC4, ZIO JSON 0.6.2, ZIO Logging 2.1.14, ScalaPB 0.11.13, zio-grpc 0.6.1, gRPC Netty 1.58.0, Akka (dead), Logback, Logstash Encoder.

**Issues:**
- **CRITICAL:** `project/` directory missing (`.gitignore` excludes it). `build.sbt` imports `scalapb.zio_grpc.ZioCodeGenerator` which requires SBT plugin config in `project/`. `sbt compile` will fail.
- **CRITICAL:** Dockerfile `COPY project/ project/` will fail because `project/` doesn't exist. CMD `java Main` cannot launch a `ZIOAppDefault`.
- **HIGH:** `ChromaDBClientLive` uses `https://` — will fail against local HTTP ChromaDB.
- **HIGH:** README says `CHROMA_HOST` selects live/stub, but code uses `CHROMA_API_KEY` (empty = stub).
- **MEDIUM:** 4 case classes + 1 method (=50% of domain code) are dead code.
- **MEDIUM:** Akka dependencies (6 library entries) are dead weight — no Akka imports anywhere.
- **MEDIUM:** `application.conf` with Kafka/broker settings is never loaded — orphaned from legacy architecture.
- **MEDIUM:** `IngestionService` duplicates pipeline logic inline instead of calling `processStream`.
- **LOW:** URL decoding silently swallows errors (`getOrElse(URL.empty)`).

**Testing:** 17 tests across 5 files. Core gRPC service path untested. No tests for `Main.scala` or `IngestionService`.

---

### 3.3 Python Backend (`/backend`)

**Responsibility:** FastAPI REST + WebSocket API. Orchestrates the LangGraph mitigation pipeline (ChromaDB RAG -> Neo4j graph -> OpenAI GPT). Serves dashboard data from MongoDB.

**Files (27 source, 7 test):**

**Live, production code:**
- `main.py` — FastAPI app with CORS, mounts API router
- `core/models/__init__.py` — 8 Pydantic models (`RiskEvent`, `MitigationResponse`, etc.)
- `core/db/neo4j_client.py` — Neo4j driver with `get_supplier_by_name`, `find_alternative_suppliers`
- `core/db/mongo_client.py` — MongoDB singleton client
- `agents/analysis/analyzer.py` — RAG analyzer (ChromaDB query + Neo4j + risk score)
- `agents/analysis/risk_scoring.py` — Keyword risk scorer (0–100)
- `agents/analysis/planner.py` — Supplier ID lookup + alternative planning
- `gateway/api/api_router.py` — Mounts all sub-routers
- `gateway/api/health/health_router.py` — `GET /health`
- `gateway/api/risks/risk_router.py` — `POST /risks/analyze` -> `run_orchestrator()` (SYNC, blocks event loop)
- `gateway/api/suppliers/supplier_router.py` — `GET /suppliers/{name}`, `/alternatives`
- `gateway/api/dashboard/dashboard_router.py` — `GET /dashboard/summary`, `/recent` (sync MongoDB)
- `gateway/api/agents/agent_router.py` — `POST /agents/trigger` (via BackgroundTasks -> correct)
- `gateway/api/ws/ws_router.py` — WebSocket endpoint with MongoDB polling + agent result broadcast
- `gateway/orchestration/mitigation_graph.py` — LangGraph 3-node pipeline (live ChromaDB/Neo4j/OpenAI)
- `gateway/app_config.py` — Pydantic-settings with env_file loading

**Dead / stub code (defined, never called):**
- `gateway/app_dependencies.py` — ChromaDB + Neo4j DI (replaced by inline creation in graph)
- `gateway/services/audit_service.py` — `log_orchestrator_run()` (no caller)
- `gateway/domains/analysis/models/__init__.py` — `AnalysisRequest`, `AnalysisResult` (never imported)
- `gateway/domains/intelligence/classifiers.py` — `classify_risk()` (never called)
- `gateway/domains/intelligence/scrapers/__init__.py` — `dispatch_scrape()` (stub, never called)
- `gateway/domains/intelligence/processors/__init__.py` — `process_intelligence_data()` (stub, never called)
- `gateway/domains/planning/graph/__init__.py` — `build_supply_chain_graph()` (stub, returns `[]`)
- `gateway/domains/planning/optimization/__init__.py` — `optimize_supplier_selection()` (stub, ignores constraints)
- `agents/analysis/analyzer.py` — imports `get_news_collection` but never uses it
- `gateway/app_config.py` — `chroma_tenant`, `chroma_database`, `gemini_api_key` defined but unused
- `gateway/workers/` — only `__pycache__` files, no source
- `agents/intelligence/` — only `__pycache__`, no source

**Configuration:** 13 env vars via `pydantic-settings`. `.env.example` is empty (0 bytes) — no onboarding reference.

**Health:** `GET /health` returns `{"status":"ok","service":"backend"}` — surface-level only, no DB connectivity check.

**Logging:** Stdlib `logging` throughout. No structured logging setup.

**Shutdown:** No startup/shutdown event handlers — DB connections are not gracefully closed.

**Dependencies (requirements.txt):** **~15 of 26 listed packages are unused** — including `sqlalchemy`, `alembic`, `psycopg2-binary`, `redis`, `httpx`, `aiofiles`, `python-jose`, `passlib[bcrypt]`, `python-multipart`, `celery`, `numpy`, `scikit-learn`, `pandas`, `loguru`, `tenacity`.

**Issues:**
- **HIGH:** `risk_router.py` calls `run_orchestrator()` synchronously — blocks the async event loop for 5-30+ seconds
- **HIGH:** ~50% of gateway domain code is dead (8+ files never called), creating maintenance burden
- **HIGH:** Dependency bloat — 15 of 26 packages unused
- **HIGH:** `.env.example` is empty — no config documentation
- **MEDIUM:** CORS `allow_origins=["*"]` with `allow_credentials=True` is invalid per spec
- **MEDIUM:** Two separate Neo4j Cypher strategies (`id`-based in `neo4j_client.py`, `name`-based in `mitigation_graph.py`)
- **MEDIUM:** Duplicate MongoDB dashboard queries (`ws_router.py` copies `dashboard_router.py` logic)
- **MEDIUM:** Blocking sync MongoDB/Neo4j calls in async endpoints (except WS which uses `asyncio.to_thread`)
- **MEDIUM:** No service lifecycle hooks for DB connection management
- **MEDIUM:** Module-level side effects (`load_dotenv`, ChromaDB client creation on import)
- **LOW:** `.gitignore` typo `__pycahce__/`
- **LOW:** Broad `except Exception` swallowing in graph nodes
- **LOW:** Auditing service exists but never called — orchestration runs leave no audit trail

**Testing:** 7 test files (~660 lines), all with mocked external services. Good coverage of routers, models, risk scoring, analyzer, planner, and mitigation graph. Missing: WebSocket tests, dead code has no tests.

---

### 3.4 Python Intelligence Agent (`/intelligence_agent`)

**Responsibility:** Poll NewsAPI every 15 min, triage by keyword, insert into MongoDB. Two-stage Gemini LLM pipeline over escalated documents produces structured analysis + RAG chunks.

**Files (12 source, 2 test scripts):**
- `pipeline_runner.py` — Orchestrator: Mongo read -> Stage 1 LLM -> Stage 2 LLM -> Mongo write-back
- `ingestion/news_fetcher.py` — NewsAPI polling with keyword triage, Pydantic validation, URL-hash dedup
- `db/mongo_service.py` — MongoDB read (escalated docs) + write-back (LLM results)
- `db/mongo_setup.py` — One-time index creation script
- `db/chroma_client.py` — ChromaDB HTTP client for RAG chunk upsert
- `db/model/intel_document.py` — Pydantic v2 models with computed MD5 `_id` for dedup
- `intelligence_logic/llm_analyzer.py` — Two-stage Gemini 1.5 Flash pipeline with tenacity retry
- `intelligence_logic/risk_scorer.py` — Keyword triage (returns 0–100 scores)
- `intelligence_logic/escalation_planner.py` — Priority assignment + escalation (expects 0–5 scores)
- `cron/job.py` — 15-min schedule loop
- `infrastructure/mongo/mongo_client.py` — MongoClient singleton with TLS
- `test/mongo.py` — Manual connectivity test (not pytest)
- `test/seed_data.py` — Test data seeder with PATH hack

**Configuration:** 4 env vars (`MONGO_URI`, `MONGO_DB_NAME`, `NEWS_API_KEY`, `GEMINI_API_KEY`). `requirements.txt` has 8 packages, none version-pinned except `pydantic>=2.0`.

**Health:** No health endpoint (CLI-based polling job).

**Logging:** Stdlib `logging` (basicConfig). No structured logging.

**Shutdown:** No graceful shutdown — `KeyboardInterrupt` is unhandled.

**Dependencies (requirements.txt):** `requests`, `python-dotenv`, `tenacity`, `google-genai`, `pymongo[srv]`, `pydantic>=2.0`, `schedule`, `chromadb`.

**Issues:**
- **CRITICAL:** Score scale mismatch — `risk_scorer.py` returns 0–100 but `escalation_planner.py` uses 0–5 thresholds. Every keyword match is escalated as "high" priority. "medium"/"low" branches are unreachable.
- **HIGH:** README completely stale — every filename in directory tree is wrong (8/8 mismatches). Score scale documented as 0–5 but code uses 0–100. Module run commands reference non-existent files.
- **HIGH:** Hardcoded `"intelligence_db"` in 3 files (`news_fetcher.py`, `mongo_setup.py`, `seed_data.py`), but `mongo_service.py` reads `MONGO_DB_NAME` env var. If var is customized, 3 files write to `intelligence_db` while 1 reads from custom name — silent data routing bug.
- **MEDIUM:** `None` propagation bug — `rag_chunks` can be `None` from Stage 2, persisted into MongoDB as `"rag_chunks": None` (type mismatch).
- **MEDIUM:** `.gitignore` typo — `__pycache__py/` instead of `__pycache__/` (no effect).
- **MEDIUM:** `cron/` and `test/` directories lack `__init__.py` — can't be imported as packages.
- **MEDIUM:** Dead code — `analyze_intelligence()` in `llm_analyzer.py` (never called) and its unused imports.
- **MEDIUM:** No automated test suite (test scripts are manual verification only).
- **LOW:** `load_dotenv()` called inconsistently (with/without explicit path).
- **LOW:** Commented-out debug code in `mongo_service.py`.
- **LOW:** `ssl=False` hardcoded in `chroma_client.py`.
- **LOW:** `parents[3]` fragility in `mongo_client.py` path resolution.
- **LOW:** `datetime.utcnow()` deprecated in Python 3.12+.

---

### 3.5 Rust Runner (`/runner`)

**Responsibility:** Read `runner.toml`, spawn all services as child processes.

**Files (1 source):**
- `src/main.rs` (281 lines) — TOML parsing, cross-platform command resolution, process spawning, infinite sleep loop

**Configuration:** `runner.toml` at repo root or parent directory. Defines 4 services: Go gateway, Scala gateway, Python backend, Next.js frontend.

**Health:** None (process supervisor — no health checking, no restart logic).

**Logging:** None (child process stdio inherited).

**Shutdown:** Ctrl-C kills child processes via process group.

**Dependencies (Cargo.toml):** `serde` 1.0, `toml` 0.8.

**Issues:**
- No process health monitoring or auto-restart
- No log aggregation from child processes
- No way to stop individual services
- Scala gateway config references `sbt run` which won't compile (missing `project/` dir)
- Backend config uses port 8000 but backend README documents port 8001

**Testing:** 6 unit tests embedded in `main.rs`. All pass.

---

### 3.6 TypeScript Frontend (`/frontend`)

**Responsibility:** Unified monitoring dashboard for supply chain risk intelligence.

**Pages (all implemented):**
- Landing page (1064 lines) — Animated architecture viz, pipeline cards, agent ecosystem, live tactical feed, API + WS integration with mock fallback
- Intelligence page (686 lines) — Tactical ops console, terminal emulator, risk alerts via WS, `triggerAgent` via API
- Console page (5 lines) — Re-exports Intelligence page
- Ecosystem page (491 lines) — SVG agent topology graph, world map, throughput stats
- Architecture page (453 lines) — Infrastructure diagram, polyglot stack cards, failure simulation
- DevDocs page (334 lines) — Documentation sidebar, API Interaction Lab

**Configuration:** `next.config.ts` proxies `/api/*` -> `http://localhost:8000/api/*`.

**Dependencies (package.json):** `next` 16.1.4, `react` 19.2.3, `react-dom` 19.2.3. Dev: `playwright`, `vitest`, `tailwindcss` v4, `eslint`, `typescript`.

**Issues:**
- **All data is client-side simulated** — API calls silently fail with `.catch(() => {})`, WS connects to non-existent endpoint
- `src/components/ui/` is empty — no reusable UI components
- No real WebSocket connection (mock intervals everywhere)
- `ws.ts` connects to `ws://localhost:8000/ws` which does not exist yet
- `api.ts` has full type definitions but no live backend integration

**Testing:** 9 unit tests (Vitest) + 3 E2E tests (Playwright). Covers landing page rendering only.

---

### 3.7 Agent Directory (`/Agent`)

Empty scaffold — single `__init__.py` at `Agent/backend/gateway/api/ws/__init__.py`. No implementation.

---

## 4. Cross-Cutting Concerns

### 4.1 Dead Code Inventory

| Service | Dead Items | Lines |
|---|---|---|
| Go | `controller.go` (entire file), unused task fields, unused `sendTimeout` | ~60 |
| Scala | `domain/Model.scala`, `models/IntelDocument.scala`, `processStream`, `application.conf`, Akka deps | ~150 |
| Python Backend | 9 files across `domains/`, `services/`, `app_dependencies.py`, model duplicates | ~400 |
| Python IA | `analyze_intelligence()` + unused imports | ~25 |

### 4.2 Duplicated Logic

- `envInt`/`envDuration` — defined in both `main.go` and `grpc_client.go`
- Neo4j client creation — 3 places (`neo4j_client.py`, `mitigation_graph.py`, `app_dependencies.py`)
- ChromaDB client creation — 3 places (`analyzer.py`, `mitigation_graph.py`, `app_dependencies.py`)
- MongoDB dashboard queries — 2 places (`dashboard_router.py`, `ws_router.py`)
- Analysis models — 2 places (`core/models/`, `gateway/domains/analysis/models/`)
- Cypher queries for alternatives — `id`-based vs `name`-based (different results)
- Proto definition — 2 copies (`proto/scrapper.proto`, `ingestion/src/main/protobuf/scrapper.proto`)

### 4.3 Documentation Accuracy

| Document | Accuracy | Key Failures |
|---|---|---|
| `README.md` | Partially Verified | Architecture diagram implies data flows that don't exist; "zero data loss" incorrect; Rust doesn't orchestrate data flow |
| `project_analysis.md` (previous) | **Partially Incorrect** | Claimed Scala source files missing (they exist); Go pkg/pb/ missing (exists); core/models/ empty (has schemas); CI pipeline active (disabled) |
| `scrapers/README.md` | Verified | Accurate directory tree, correct status table |
| `ingestion/README.md` | Partially Verified | Accurate tree; code status table misleading (Docker/build broken); `CHROMA_HOST` auto-select claim wrong; Akka listed but unused |
| `backend/README.md` | **Incorrect** | 9 stub files marked "Production"; overstates readiness of domain stubs; claims `core/db/mongo.py`/`neo4j.py` (actual: `_client.py`) |
| `intelligence_agent/README.md` | **Completely Stale** | Every filename wrong (8/8); score scale wrong (0–5 documented, 0–100 coded); module paths wrong |
| `frontend/README.md` | Verified | Accurate and honest about missing integration |
| `runner/README.md` | Verified | Accurate |

### 4.4 Build / CI / Deployment

- CI pipeline is **disabled** (`ci.yml.disabled` — rename needed to activate)
- No Dockerfiles for Go scraper or Frontend
- Scala Dockerfile is **structurally broken** (missing `project/` dir, wrong CMD)
- Backend Dockerfile has fragile COPY paths (assumes build context is repo root)
- `pyproject.toml` at root references `backend` and `intelligence_agent` as packages but has no install logic
- No docker-compose for application services (only databases)

### 4.5 Security Observations

- CORS wildcard + credentials (invalid per spec)
- WebSocket (backend + frontend) is unauthenticated
- gRPC uses `insecure.NewCredentials()` — no TLS
- ChromaDB API key sent over plain HTTP in intelligence agent (`ssl=False`)
- No secrets management — API keys in `.env` files

---

## 5. Documentation Findings (Per-Statement Verification)

### README.md Statements

| Statement | Verdict |
|---|---|
| "zero data loss" | **Incorrect** — results silently dropped after 1s in `sendResult` |
| "Rust Runner orchestrates all services" | **Partially Verified** — spawns only, no health check or restart |
| "Go -> Scala -> Python data flow" | **Partially Verified** — two independent ingestion paths exist |
| "Scala uses ZIO & Akka" | **Partially Verified** — Akka deps declared but never used |
| "LangGraph pipeline fully wired" | **Verified** |
| Phase 1-4 completeness claims | **Partially Verified** — Phase 3 ~25% (not ~40%), Phase 4 ~10% (not ~15%) |

### project_analysis.md (previous version) Statements

| Statement | Verdict |
|---|---|
| "Scala files missing (list of 8)" | **Incorrect** — all 8 exist on disk |
| "Proto code generation not run (Go pkg/pb/ missing)" | **Incorrect** — Go pb/ files exist and are generated |
| "core/models/ empty" | **Incorrect** — all Pydantic schemas defined in `__init__.py` |
| "Auth router directory doesn't exist" | **Verified** |
| "agents/intelligence/ empty" | **Verified** (only `__pycache__`) |
| "gateway/workers/ has only pycache" | **Verified** |
| "agents/analysis/db.py duplicates neo4j_client.py" | **Verified** |
| "CI pipeline covers all services" | **Outdated** — CI is disabled (`.yml.disabled`) |
| "Frontend data fully simulated" | **Verified** |
| "LangGraph uses live cloud services" | **Verified** |

---

## 6. Engineering Task Ranking

Ranked by Impact x Risk x Engineering ROI (highest first).

### P0 — Must fix before production

| # | Task | Service | Impact | Risk | ROI |
|---|---|---|---|---|---|
| 1 | **Fix Scala build** — create `project/` directory with SBT plugin config for ScalaPB+ZIO gRPC, or migrate to a build tool that doesn't need it | Ingestion | High — entire Scala service unbuildable | High — blocks ingestion pipeline | **Highest** |
| 2 | **Fix score scale mismatch** — normalize `risk_scorer.py` output to 0–5 or change `escalation_planner.py` thresholds to match 0–100 | Intelligence Agent | High — all priority/escalation logic is incorrect | High — silent data misclassification | **Highest** |
| 3 | **Unblock event loop** — wrap `run_orchestrator()` in `asyncio.to_thread()` in `risk_router.py` | Backend | High — production outage under load | High — FastAPI will hang under concurrency | **Highest** |
| 4 | **Normalize MongoDB database name** — use `os.getenv("MONGO_DB_NAME", "intelligence_db")` in all files that hardcode it | Intelligence Agent | High — silent data routing bug | Medium — only triggers if user customizes DB name | **High** |

### P1 — High impact

| # | Task | Service | Impact | Risk | ROI |
|---|---|---|---|---|---|
| 5 | **Remove dead code** — delete or wire up: `controller.go`, `domain/Model.scala`, `models/IntelDocument.scala`, `domains/*/` stubs, `app_dependencies.py`, `audit_service.py` | All | Medium — reduces maintenance surface | Low | **High** |
| 6 | **Trim dependency bloat** — remove 15 unused packages from `backend/requirements.txt` | Backend | Medium — faster installs, fewer CVEs | Low | **High** |
| 7 | **Update stale READMEs** — especially `intelligence_agent/` (every filename wrong) and `backend/` (overstates production readiness) | Docs | Medium — onboarding | Low | **High** |
| 8 | **Activate CI** — rename `ci.yml.disabled` -> `ci.yml`, fix Scala build so CI passes | Infrastructure | High — no automated validation | Medium | **High** |

### P2 — Medium impact

| # | Task | Service | Impact | Risk | ROI |
|---|---|---|---|---|---|
| 9 | **Fix context propagation** — ensure Colly's HTTP requests respect the context timeout in `scrape_engine.go` | Go Scrapers | Medium — prevents hung scrapers | Low | **Medium** |
| 10 | **Consolidate Neo4j client logic** — `neo4j_client.py`, `mitigation_graph.py`, `app_dependencies.py` should share one driver | Backend | Medium — consistency, connection pooling | Low | **Medium** |
| 11 | **Eliminate duplicate dashboard queries** — extract `_fetch_summary`/`_fetch_recent` into shared module | Backend | Medium — DRY | Low | **Medium** |
| 12 | **Add panic recovery to worker pool** — `defer recover()` in `pool.go` worker goroutine | Go Scrapers | Medium — pool can lose workers | Medium | **Medium** |
| 13 | **Wire up audit service** — call `log_orchestrator_run()` after mitigation graph completes | Backend | Medium — operational visibility | Low | **Medium** |
| 14 | **Make DB configs env-consistent** — fix `CHROMA_HOST` vs `CHROMA_API_KEY` auto-select discrepancy in Scala README | Ingestion | Low — alignment | Low | **Medium** |
| 15 | **Fix CORS** — either remove `allow_credentials` or use explicit origin list | Backend | Low — browser compatibility | Low | **Medium** |

### P3 — Low impact / tech debt

| # | Task | Service |
|---|---|---|
| 16 | Fix `go.mod` — mark direct deps as `// direct` | Go Scrapers |
| 17 | Consolidate `envInt`/`envDuration` into shared utility | Go Scrapers |
| 18 | Add `__init__.py` to `cron/` and `test/` directories | Intelligence Agent |
| 19 | Fix `.gitignore` typos (both backend and intelligence_agent) | Python |
| 20 | Replace `strings.Split` domain extraction with `net/url.Parse` | Go Scrapers |
| 21 | Make ChromaDB SSL configurable via env var | Intelligence Agent |
| 22 | Remove commented-out debug code in `mongo_service.py` | Intelligence Agent |
| 23 | Remove emoji from production log messages | Backend |
| 24 | Add `.env.example` with documented variables for backend | Backend |
| 25 | Fix Dockerfile `COPY` paths for backend | Backend |
| 26 | Remove dead code `analyze_intelligence()` in `llm_analyzer.py` | Intelligence Agent |
| 27 | Sync keyword lists between `news_fetcher.py` and `risk_scorer.py` | Intelligence Agent |
| 28 | Replace `datetime.utcnow()` with timezone-aware variant | Intelligence Agent |
| 29 | Fix `sendResult` data loss — add metrics, logging, or backpressure | Go Scrapers |
| 30 | Add health endpoint to Intelligence Agent | Intelligence Agent |

---

## 7. Overall Progress Estimate (Corrected)

| Phase | Scope | Actual % | Notes |
|---|---|---|---|
| Phase 1 | Scaffolding | 100% | All services scaffolded |
| Phase 2 | Core components | ~80% | Scala build broken; intelligence agent score bug; backend blocking event loop |
| Phase 3 | Tech debt & refactoring | ~25% | Dead code, duplicated logic, doc rot, dependency bloat remain |
| Phase 4 | Production readiness | ~10% | CI disabled, no Docker for Go/TS, no TLS, no auth, no metrics |

**Aggregate: ~50% toward production release** (revised down from previous estimate of 55%).

---

*Analysis based on line-by-line code inspection of all source files across all services. Audit date: 2026-07-09.*
