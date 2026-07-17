# Go Scraping Gateway

**Language:** Go 1.26 | **Role:** Ingestion Layer

Scrapes public web feeds and supplier news pages, then streams payloads to the Scala Processing Hub via a long-lived client-streaming gRPC connection.

---

## Directory Structure

```
scrapers/
├── cmd/api/main.go                     # Entrypoint — signal handling, pool init, gRPC wiring
├── internal/
│   ├── api/http_server.go              # HTTP server with /health and /ready endpoints
│   ├── api/http_server_test.go         # 4 tests (health, ready, timeouts, routes)
│   ├── models/task.go                  # ScrapeTask and ScrapeResult data types
│   ├── service/
│   │   ├── scrape_engine.go            # Colly-based HTTP scraping engine
│   │   ├── scrape_engine_test.go       # 2 tests (domain extraction, construction)
│   │   ├── scraper_service.go          # SectionWorker + ScraperService orchestrator
│   │   ├── scraper_service_test.go     # 6 tests (worker execute, result channel, StartHopping)
│   │   ├── grpc_client.go             # gRPC client — Connect, StartStream, retry logic
│   │   └── grpc_client_test.go        # 6 tests (construction, IsReady, connect timeout, env vars)
│   └── utils/
│       ├── rate_limiter.go             # Per-domain rate limiter + User-Agent rotator
│       ├── rate_limiter_test.go        # 7 tests (wait, cancellation, isolation, jitter, UA)
│       └── env.go                      # Env var helpers + validation (EnvInt, EnvDurationSec, etc.)
├── pkg/
│   ├── pb/                             # Generated protobuf + gRPC stubs
│   └── workerpool/
│       ├── pool.go                     # Generic goroutine pool (Submit, Stop, WaitGroup, panic recovery)
│       └── pool_test.go                # 3 tests (multi-task, cancellation, error handling)
├── Dockerfile                          # Multi-stage build (golang:1.26 → distroless)
├── go.mod
└── go.sum
```

---

## How It Works

1. `main.go` seeds scrape targets and calls `scraperSvc.StartHopping()` for each.
2. `ScraperService` submits `SectionWorker` tasks to the `workerpool.Pool`.
3. Each `SectionWorker` calls `CollyEngine.Scrape()` — rate-limited and jitter-delayed.
4. Successful `ScrapeResult` objects flow through the fan-out goroutine in `main.go`.
5. The fan-out converts `ScrapeResult → *pb.ScrapePayload` and sends to the `payloads` channel.
6. `GRPCClient.StartStream()` reads that channel and streams payloads to Scala over gRPC.
7. On shutdown (SIGINT/SIGTERM), the pool drains, the channel closes, and `CloseAndRecv()` flushes the stream.

---

## gRPC Client Details (`grpc_client.go`)

- Uses `grpc.NewClient` (replaces deprecated `grpc.DialContext`) with keepalive pings every 30s.
- Connection is eagerly established at startup via `conn.Connect()` + `WaitForStateChange` polling loop.
- `StartStream` retries each failed `Send()` up to 3 times with exponential backoff (500ms → 1s → 2s).
- On `io.EOF` from the server, the stream is immediately closed — no retry.
- Final `CloseAndRecv()` logs the Scala hub's `ScrapeResponse` (processed count, success flag).

---

## Environment Helpers (`internal/utils/env.go`)

Shared utilities for reading and validating environment variables:

| Function | Description |
|---|---|
| `EnvInt(key, fallback)` | Parse int env var with fallback |
| `EnvFloat64(key, fallback)` | Parse float64 env var with fallback |
| `EnvDurationSec(key, fallback)` | Parse int seconds as `time.Duration` |
| `ValidateRequired(keys...)` | Error if any named env vars are empty |
| `ValidatePositiveInt(key)` | Error if set but not a positive integer |
| `ValidatePositiveFloat(key)` | Error if set but not a positive float |

---

## Configuration

| Env Var | Default | Description |
|---|---|---|
| `SCALA_HUB_ADDR` | `localhost:9090` | gRPC address of the Scala Processing Hub |
| `HTTP_ADDR` | `:8080` | Health server listen address |
| `WORKER_CONCURRENCY` | `4` | Number of concurrent scraping workers |
| `PAYLOAD_BUFFER_SIZE` | `100` | Channel buffer size for payloads |
| `SHUTDOWN_GRACE_SECONDS` | `10` | Grace period for shutdown |
| `SCRAPE_SEEDS` | (empty) | Semicolon-delimited `url,selector` tuples |
| `DIAL_TIMEOUT_SECONDS` | `10` | gRPC dial timeout |
| `SEND_TIMEOUT_SECONDS` | `5` | gRPC send timeout per payload |
| `MAX_SEND_RETRIES` | `3` | Max retries for failed gRPC sends |

---

## Health

- `GET /health` — Always returns 200 (process alive)
- `GET /ready` — Returns 200 if gRPC connection is Ready, 503 otherwise

---

## Building & Running

```bash
# Local
go run ./cmd/api

# Docker
docker build -t supply-chain-scrapers .

# Docker Compose (from repo root)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up scrapers
```

---

## Code Status

| File | Status |
|---|---|
| `cmd/api/main.go` | ✅ Production |
| `internal/api/http_server.go` | ✅ Production |
| `internal/service/grpc_client.go` | ✅ Production |
| `internal/service/scrape_engine.go` | ✅ Production |
| `internal/service/scraper_service.go` | ✅ Production |
| `internal/utils/rate_limiter.go` | ✅ Production |
| `internal/utils/env.go` | ✅ Production |
| `pkg/workerpool/pool.go` | ✅ Production |

---

## Proto Code Generation

The generated `pkg/pb/` package is checked in. To regenerate:

```bash
# From repo root
protoc \
  --go_out=scrapers/pkg/pb --go_opt=paths=source_relative \
  --go-grpc_out=scrapers/pkg/pb --go-grpc_opt=paths=source_relative \
  -I proto proto/scrapper.proto
```
