# Shadow Network — Engineering Analysis

**Audit date:** 2026-07-16
**Auditor:** Code-inspection-based audit (all services)
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
                                    Gemini (mitigation plan)
```

**Critical observation:** The Intelligence Agent and the Go→Scala ingestion pipeline are **two completely independent ingestion paths** that feed different stores (MongoDB vs ChromaDB). They have no integration point. The Backend API queries both stores independently.

---

## 3. Detailed Service Audits

### 3.1 Go Scraping Gateway (`/scrapers`)

**Responsibility:** Scrape web pages via Colly, stream results to the Scala Hub over gRPC.

**Files (8 source, 5 test):**
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
- `internal/utils/env.go` — Shared env-var helpers (`EnvInt`, `EnvDurationSec`, `ValidateRequired`, etc.)
- `pkg/workerpool/pool.go` — Generic goroutine pool (Submit, Stop, WaitGroup, panic recovery)
- `pkg/workerpool/pool_test.go` — 3 tests (multi-task, cancellation, error handling)
- `pkg/pb/scrapper.pb.go` — Generated protobuf types
- `pkg/pb/scrapper_grpc.pb.go` — Generated gRPC client/server stubs

**Configuration:** 8 env vars (`SCALA_HUB_ADDR`, `HTTP_ADDR`, `WORKER_CONCURRENCY`, `PAYLOAD_BUFFER_SIZE`, `SHUTDOWN_GRACE_SECONDS`, `SCRAPE_SEEDS`, `DIAL_TIMEOUT_SECONDS`, `SEND_TIMEOUT_SECONDS`, `MAX_SEND_RETRIES`). Seed targets parsed from `SCRAPE_SEEDS` env var (semicolon-delimited `url,selector` tuples).

**Health:** HTTP `/health` (process-alive) and `/ready` (gRPC connection state). No dependency checks beyond gRPC connectivity. No metrics endpoint.

**Logging:** Structured JSON via `slog` (stdlib), except 1 `fmt.Printf` call in `scraper_service.go`.

**Shutdown:** SIGINT/SIGTERM via `signal.NotifyContext` -> pool drain -> HTTP shutdown -> gRPC `CloseAndRecv` with configurable grace timeout.

**Dependencies (go.mod):** `colly/v2`, `grpc`, `protobuf`, `golang.org/x/time`. Direct deps correctly listed in `require` block.

**Remaining Issues:**
- Context is NOT propagated to Colly's HTTP calls (timeout is cosmetic)
- Worker pool panic recovery discards error to `_` (line 71 in pool.go) — should use `slog.Error`
- Worker pool task errors discarded to `_` (line 77 in pool.go) — should use `slog.Error`
- `fmt.Printf` in `scraper_service.go:109` instead of `slog`
- Unused fields on `ScrapeTask` (`Type`, `Depth`, `Ctx`) and unused `sendTimeout` in grpc_client
- Naive domain extraction (`strings.Split` instead of `net/url.Parse`)
- Results silently dropped after 1s timeout in `sendResult`
- `sync.Map` overkill for per-domain rate limiter map
- Jitter applied BEFORE rate limit wait (adds latency even when unthrottled)
- No TLS on gRPC connection (`insecure.NewCredentials()`)
- `rand.Rand` in `rate_limiter.go` is not concurrency-safe (used from multiple goroutines)
- Proto spelling inconsistency: `scrapper` (double p) vs `ScrapePayload` (single p)

**Testing:** 28 unit tests across 5 test files. Core `Scrape()` method and gRPC stream success path untested (require running servers). No integration or E2E tests.

---

### 3.2 Scala Processing Hub (`/ingestion`)

**Responsibility:** Receive gRPC stream from Go, normalize text, sliding-window chunk (1000 chars/200 overlap), batch-upsert to ChromaDB.

**Files (10 source, 5 test):**
- `build.sbt` — SBT build with ScalaPB, ZIO gRPC, ZIO HTTP, ZIO Test
- `Dockerfile` — Multi-stage GraalVM->JRE build; structurally broken (see issues)
- `project/plugins.sbt` — SBT plugins: sbt-protoc, ScalaPB compilerplugin, zio-grpc-codegen
- `project/build.properties` — sbt 1.12.5
- `src/main/scala/Main.scala` — ZIOAppDefault with ZLayer wiring (Netty gRPC server)
- `src/main/scala/config/AppConfig.scala` — 9 env-var config fields with defaults
- `src/main/scala/db/ChromaDBClient.scala` — Trait + Live (HTTP) + Stub (log-only) implementations
- `src/main/scala/service/IngestionService.scala` — gRPC service impl: filter -> normalize -> chunk -> batch upsert
- `src/main/scala/streams/RiskIntelPipeline.scala` — `chunkText` (used) + `processStream` (DEAD CODE)
- `src/main/resources/logback.xml` — JSON structured logging via LogstashEncoder
- `src/main/protobuf/scrapper.proto` — Proto definition (duplicate of root `proto/scrapper.proto`)
- `src/test/scala/AppConfigSpec.scala` — 3 tests (1 is tautological `assertTrue(true)`)
- `src/test/scala/ChromaDBClientStubSpec.scala` — 3 tests (upsert, batch, empty)
- `src/test/scala/DomainModelSpec.scala` — Tests dead code models
- `src/test/scala/IntelDocumentSpec.scala` — Tests dead code models
- `src/test/scala/RiskIntelPipelineSpec.scala` — 8 tests covering chunking algorithm

**Configuration:** 9 env vars (`GRPC_PORT`, `CHROMA_HOST`, `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`, `CHROMA_COLLECTION`, `CHUNK_SIZE`, `CHUNK_OVERLAP`, `BATCH_SIZE`).

**Health:** No health endpoint (gRPC health protocol not implemented). Service is live when gRPC server binds.

**Logging:** ZIO logging bridged to SLF4J -> Logback -> JSON via LogstashEncoder.

**Shutdown:** ZIO's built-in interruption model handles gRPC server shutdown.

**Dependencies (build.sbt):** ZIO 2.0.19, ZIO HTTP 3.0.0-RC4, ZIO JSON 0.6.2, ZIO Logging 2.1.14, ScalaPB 0.11.13, zio-grpc 0.6.1, gRPC Netty 1.58.0, Logback, Logstash Encoder.

**Fixed Issues:**
- `project/` directory exists with correct SBT plugin config (ScalaPB + ZIO gRPC codegen)
- Dead code models removed: `domain/Model.scala`, `models/IntelDocument.scala`
- Dead config removed: `application.conf` (Akka/Kafka settings)
- Akka dependencies removed from `build.sbt`
- README updated to reflect current directory structure

**Remaining Issues:**
- **CRITICAL:** Dockerfile `COPY src/main/protobuf/` references nonexistent path at build context root (proto is at `../proto/`)
- **CRITICAL:** Dockerfile ENTRYPOINT `java Main` cannot launch a `ZIOAppDefault` (needs classpath to fat JAR)
- **HIGH:** `ChromaDBClientLive` uses `https://` — will fail against local HTTP ChromaDB
- **MEDIUM:** `processStream` in `RiskIntelPipeline.scala` is dead code (IngestionService duplicates logic inline)
- **MEDIUM:** `IngestionService` duplicates pipeline logic instead of calling `processStream`
- **MEDIUM:** `AppConfigSpec` first test is tautological `assertTrue(true)`
- **LOW:** URL decoding silently swallows errors (`getOrElse(URL.empty)`)

**Testing:** 17 tests across 5 files. Core gRPC service path untested. No tests for `Main.scala` or `IngestionService`.

---

### 3.3 Python Backend (`/backend`)

**Responsibility:** FastAPI REST + WebSocket API. Orchestrates the LangGraph mitigation pipeline (ChromaDB RAG -> Neo4j graph -> Gemini). Serves dashboard data from MongoDB.

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
- `gateway/api/health/health_router.py` — `GET /health` + `GET /ready` (DB connectivity checks)
- `gateway/api/risks/risk_router.py` — `POST /risks/analyze` -> `run_orchestrator()` via `asyncio.to_thread()`
- `gateway/api/suppliers/supplier_router.py` — `GET /suppliers/{name}`, `/alternatives`
- `gateway/api/dashboard/dashboard_router.py` — `GET /dashboard/summary`, `/recent` (sync MongoDB)
- `gateway/api/agents/agent_router.py` — `POST /agents/trigger` (via BackgroundTasks -> correct)
- `gateway/api/ws/ws_router.py` — WebSocket endpoint with MongoDB polling + agent result broadcast
- `gateway/orchestration/mitigation_graph.py` — LangGraph 3-node pipeline (live ChromaDB/Neo4j/Gemini)
- `gateway/app_config.py` — Pydantic-settings with env_file loading

**Dead / stub code (defined, never called):**
- `gateway/app_dependencies.py` — ChromaDB + Neo4j DI (replaced by inline creation in graph)
- `gateway/domains/analysis/models/__init__.py` — `AnalysisRequest`, `AnalysisResult` (never imported)
- `gateway/domains/intelligence/classifiers.py` — `classify_risk()` (never called)
- `gateway/domains/intelligence/scrapers/__init__.py` — `dispatch_scrape()` (stub, never called)
- `gateway/domains/intelligence/processors/__init__.py` — `process_intelligence_data()` (stub, never called)
- `gateway/domains/planning/graph/__init__.py` — `build_supply_chain_graph()` (stub, returns `[]`)
- `gateway/domains/planning/optimization/__init__.py` — `optimize_supplier_selection()` (stub, ignores constraints)

**Configuration:** 13 env vars via `pydantic-settings`. `.env.example` is empty (0 bytes).

**Health:** `GET /health` returns `{"status":"ok","service":"backend"}`. `GET /ready` checks MongoDB, Neo4j, ChromaDB connectivity.

**Logging:** Stdlib `logging` throughout. No structured logging setup.

**Shutdown:** No startup/shutdown event handlers — DB connections are not gracefully closed.

**Fixed Issues:**
- `risk_router.py` now uses `asyncio.to_thread()` for `run_orchestrator()` — no longer blocks event loop
- MongoDB dashboard queries deduplicated (ws_router calls dashboard_router helpers)
- `audit_service.py` removed (was dead code)
- Health router now includes readiness check with DB connectivity
- WebSocket endpoint properly uses `asyncio.to_thread` for sync MongoDB calls

**Remaining Issues:**
- **HIGH:** ~50% of gateway domain code is dead (7+ files never called)
- **HIGH:** `.env.example` is empty — no config documentation
- **MEDIUM:** CORS `allow_origins=["*"]` with `allow_credentials=True` is invalid per spec
- **MEDIUM:** Two separate Neo4j Cypher strategies (`id`-based in `neo4j_client.py`, `name`-based in `mitigation_graph.py`)
- **MEDIUM:** Blocking sync MongoDB/Neo4j calls in non-WebSocket endpoints
- **MEDIUM:** No service lifecycle hooks for DB connection management
- **MEDIUM:** Module-level side effects (`load_dotenv`, ChromaDB client creation on import)
- **LOW:** `.gitignore` typo `__pycahce__/`
- **LOW:** Broad `except Exception` swallowing in graph nodes

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
- `intelligence_logic/escalation_planner.py` — Priority assignment + escalation (uses 0–100 thresholds)
- `cron/job.py` — 15-min schedule loop with signal handling
- `health_server.py` — HTTP /health and /ready endpoints (threaded server)
- `logging_config.py` — Structured JSON logging setup
- `infrastructure/mongo/mongo_client.py` — MongoClient singleton with TLS
- `test/test_health_server.py` — Pytest tests for health server (3 tests)
- `test/mongo.py` — Manual connectivity test (not pytest)
- `test/seed_data.py` — Test data seeder with PATH hack

**Configuration:** 4 env vars (`MONGO_URI`, `MONGO_DB_NAME`, `NEWS_API_KEY`, `GEMINI_API_KEY`). `requirements.txt` has 8 packages, none version-pinned except `pydantic>=2.0`.

**Health:** `health_server.py` provides `/health` and `/ready` with dependency checks (MongoDB, API keys). Not yet wired into `cron/job.py`.

**Logging:** Structured JSON via `logging_config.py`. `basicConfig` replaced with structured formatter.

**Shutdown:** `cron/job.py` handles SIGINT/SIGTERM for graceful scheduler shutdown.

**Fixed Issues:**
- Score scale mismatch fixed — both `risk_scorer.py` and `escalation_planner.py` now use 0–100
- MongoDB database name normalized — all files use `MONGO_DB_NAME` env var
- `health_server.py` added with /health and /ready endpoints
- `logging_config.py` added for structured JSON logging
- Graceful shutdown added to `cron/job.py` (SIGINT/SIGTERM handling)
- `analyze_intelligence()` dead code removed from `llm_analyzer.py`
- Pytest test added for health server (`test/test_health_server.py`)

**Remaining Issues:**
- **MEDIUM:** `health_server.py` is defined but not started by `cron/job.py` — needs wiring
- **MEDIUM:** `.gitignore` typo — `__pycache__py/` instead of `__pycache__/`
- **MEDIUM:** `cron/` directory lacks `__init__.py` — can't be imported as a package
- **LOW:** `load_dotenv()` called inconsistently (with/without explicit path)
- **LOW:** `ssl=False` hardcoded in `chroma_client.py`
- **LOW:** `parents[3]` fragility in `mongo_client.py` path resolution
- **LOW:** `datetime.utcnow()` deprecated in Python 3.12+

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

**Testing:** 9 unit tests (Vitest) + 3 E2E tests (Playwright). Covers landing page rendering only.

---

### 3.7 Agent Directory (`/Agent`)

Empty scaffold — single `__init__.py` at `Agent/backend/gateway/api/ws/__init__.py`. No implementation.

---

## 4. Cross-Cutting Concerns

### 4.1 Dead Code Inventory

| Service | Dead Items | Lines |
|---|---|---|
| Go | (cleaned up — controller.go removed) | ~0 |
| Scala | `processStream` in `RiskIntelPipeline.scala`, `DomainModelSpec.scala`, `IntelDocumentSpec.scala` | ~80 |
| Python Backend | 7 files across `domains/`, `app_dependencies.py` | ~300 |
| Python IA | (cleaned up — `analyze_intelligence()` removed) | ~0 |

### 4.2 Duplicated Logic

- `envInt`/`envDuration` — consolidated into `internal/utils/env.go` (but `grpc_client.go` uses `utils.EnvDurationSec`/`utils.EnvInt` directly, no duplication)
- Neo4j client creation — 2 places (`neo4j_client.py`, `mitigation_graph.py`)
- ChromaDB client creation — 2 places (`analyzer.py`, `mitigation_graph.py`)
- MongoDB dashboard queries — deduplicated (ws_router calls dashboard_router helpers)
- Analysis models — 2 places (`core/models/`, `gateway/domains/analysis/models/`)
- Cypher queries for alternatives — `id`-based vs `name`-based (different results)
- Proto definition — 2 copies (`proto/scrapper.proto`, `ingestion/src/main/protobuf/scrapper.proto`)

### 4.3 Documentation Accuracy

| Document | Accuracy | Key Failures |
|---|---|---|
| `README.md` | Partially Verified | Architecture diagram implies data flows that don't exist; "zero data loss" incorrect; Rust doesn't orchestrate data flow |
| `project_analysis.md` (previous) | **Partially Incorrect** | Claimed Scala source files missing (they exist); `project/` dir missing (exists); score scale mismatch (fixed); event loop blocking (fixed) |
| `scrapers/README.md` | Partially Verified | Missing env.go, test files; status table incomplete |
| `ingestion/README.md` | Partially Verified | References deleted files (domain/Model.scala, models/IntelDocument.scala); wrong method name in How It Works; lists dead files as production |
| `backend/README.md` | **Incorrect** | Claims "OpenAI GPT" (actual: Gemini); port 8001 (actual: 8000); missing health router, ws_router |
| `intelligence_agent/README.md` | **Partially Incorrect** | Score scale wrong (says 0–5, actual 0–100); missing health_server.py, logging_config.py |
| `frontend/README.md` | Verified | Accurate and honest about missing integration |
| `runner/README.md` | Verified | Accurate |

### 4.4 Build / CI / Deployment

- CI pipeline is **disabled** (`ci.yml.disabled` — rename needed to activate)
- No Dockerfiles for Go scraper or Frontend
- Scala Dockerfile is **structurally broken** (wrong COPY paths, missing JAR in classpath)
- Backend Dockerfile missing non-root user, HEALTHCHECK, env vars
- `pyproject.toml` at root has typo "hackthon" (should be "hackathon")
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
| "Scala uses ZIO & Akka" | **Incorrect** — Akka deps removed, only ZIO used |
| "LangGraph pipeline fully wired" | **Verified** |
| Phase 1-4 completeness claims | **Partially Verified** — Phase 3 ~25% (not ~40%), Phase 4 ~10% (not ~15%) |

### project_analysis.md (previous version) Statements

| Statement | Verdict |
|---|---|
| "Scala files missing (list of 8)" | **Incorrect** — all 8 exist on disk |
| "project/ directory missing" | **Incorrect** — exists with plugins.sbt and build.properties |
| "Proto code generation not run (Go pkg/pb/ missing)" | **Incorrect** — Go pb/ files exist and are generated |
| "core/models/ empty" | **Incorrect** — all Pydantic schemas defined in `__init__.py` |
| "Score scale mismatch (0–5 vs 0–100)" | **Fixed** — both now use 0–100 |
| "Event loop blocking in risk_router.py" | **Fixed** — uses `asyncio.to_thread()` |
| "MongoDB database name hardcoded" | **Fixed** — all files use `MONGO_DB_NAME` env var |
| "controller.go is dead code" | **Fixed** — removed |
| "domain/Model.scala is dead code" | **Fixed** — removed |
| "models/IntelDocument.scala is dead code" | **Fixed** — removed |
| "application.conf is dead config" | **Fixed** — removed |
| "Akka dependencies are dead weight" | **Fixed** — removed |
| "Health endpoints missing" | **Fixed** — added to Go, Backend, Intelligence Agent |
| "Logging is stdlib only" | **Fixed** — structured logging added to Go (slog), IA (logging_config) |
| "No graceful shutdown" | **Fixed** — added to Go (signal handling), IA (signal handling in cron/job.py) |
| "audit_service.py never called" | **Fixed** — removed |

---

## 6. Engineering Task Ranking

Ranked by Impact x Risk x Engineering ROI (highest first).

### P0 — Must fix before production

| # | Task | Service | Impact | Risk | ROI |
|---|---|---|---|---|---|
| 1 | ~~**Fix Scala build**~~ | ~~Ingestion~~ | ~~High~~ | ~~High~~ | ~~**Highest**~~ | **FIXED** |
| 2 | ~~**Fix score scale mismatch**~~ | ~~Intelligence Agent~~ | ~~High~~ | ~~High~~ | ~~**Highest**~~ | **FIXED** |
| 3 | ~~**Unblock event loop**~~ | ~~Backend~~ | ~~High~~ | ~~High~~ | ~~**Highest**~~ | **FIXED** |
| 4 | ~~**Normalize MongoDB database name**~~ | ~~Intelligence Agent~~ | ~~High~~ | ~~Medium~~ | ~~**High**~~ | **FIXED** |
| 5 | **Fix Scala Dockerfile** — wrong COPY paths, missing JAR in classpath | Ingestion | High — container won't start | Medium — fixable with correct build | **High** |
| 6 | **Activate CI** — rename `ci.yml.disabled` -> `ci.yml`, fix Scala build so CI passes | Infrastructure | High — no automated validation | Medium | **High** |

### P1 — High impact

| # | Task | Service | Impact | Risk | ROI |
|---|---|---|---|---|---|
| 7 | **Wire health_server.py into cron/job.py** | Intelligence Agent | Medium — health endpoint unreachable | Low | **High** |
| 8 | **Fix Go worker pool error logging** — replace `_ = fmt.Errorf(...)` with `slog.Error(...)` in pool.go | Go Scrapers | Medium — silent error loss | Low | **High** |
| 9 | **Fix Go rate_limiter.go thread safety** — add `sync.Mutex` around `rand.Rand` | Go Scrapers | Medium — race condition under concurrency | Low | **High** |
| 10 | **Improve backend Dockerfile** — non-root user, HEALTHCHECK, PYTHONUNBUFFERED | Backend | Medium — production security | Low | **High** |

### P2 — Medium impact

| # | Task | Service | Impact | Risk | ROI |
|---|---|---|---|---|---|
| 11 | **Fix fmt.Printf in scraper_service.go** — replace with slog | Go Scrapers | Low — logging consistency | Low | **Medium** |
| 12 | **Fix Scala AppConfigSpec** — replace tautological test | Ingestion | Low — test quality | Low | **Medium** |
| 13 | **Fix pyproject.toml typo** — "hackthon" -> "hackathon" | Root | Low — naming | Low | **Medium** |
| 14 | **Add Go scrapers Dockerfile** | Go Scrapers | Medium — no container build | Low | **Medium** |
| 15 | **Add frontend Dockerfile** | Frontend | Medium — no container build | Low | **Medium** |
| 16 | **Add intelligence agent Dockerfile** | Intelligence Agent | Medium — no container build | Low | **Medium** |

### P3 — Low impact / tech debt

| # | Task | Service |
|---|---|---|
| 17 | Update stale READMEs (Scala, Go, Backend, Intelligence Agent) | Docs |
| 18 | Fix context propagation for Colly HTTP calls | Go Scrapers |
| 19 | Consolidate Neo4j client creation (2 places) | Backend |
| 20 | Fix CORS (remove `allow_credentials` or use explicit origin list) | Backend |
| 21 | Add `__init__.py` to `cron/` directory | Intelligence Agent |
| 22 | Fix `.gitignore` typos (backend, intelligence_agent) | Python |
| 23 | Replace `strings.Split` domain extraction with `net/url.Parse` | Go Scrapers |
| 24 | Make ChromaDB SSL configurable via env var | Intelligence Agent |
| 25 | Fix `sendResult` data loss — add metrics or backpressure | Go Scrapers |
| 26 | Remove `processStream` dead code in RiskIntelPipeline.scala | Ingestion |
| 27 | Replace `datetime.utcnow()` with timezone-aware variant | Intelligence Agent |

---

## 7. Overall Progress Estimate (Corrected)

| Phase | Scope | Actual % | Notes |
|---|---|---|---|
| Phase 1 | Scaffolding | 100% | All services scaffolded |
| Phase 2 | Core components | ~85% | Score scale fixed, event loop fixed, MongoDB normalized, health endpoints added |
| Phase 3 | Tech debt & refactoring | ~45% | Dead code cleaned, logging improved, shutdown handling added. Remaining: backend domain stubs, duplicated clients |
| Phase 4 | Production readiness | ~30% | CI still disabled, Scala Dockerfile broken, no Docker for Go/TS/IA, backend Dockerfile needs security hardening |

**Aggregate: ~65% toward production release** (revised up from previous estimate of 50%).

---

*Analysis based on line-by-line code inspection of all source files across all services. Audit date: 2026-07-16.*
