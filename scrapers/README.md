# 🔵 Go Scraping Gateway

**Language:** Go 1.26 | **Role:** Ingestion Layer

Scrapes public web feeds and supplier news pages, then streams payloads to the Scala Processing Hub via a long-lived client-streaming gRPC connection.

---

## Directory Structure

```
scrapers/
├── cmd/api/main.go                     # Entrypoint — signal handling, pool init, gRPC wiring
├── internal/
│   ├── api/http_server.go              # HTTP server with /health and /ready endpoints
│   ├── models/task.go                  # ScrapeTask and ScrapeResult data types
│   ├── service/
│   │   ├── scrape_engine.go            # Colly-based HTTP scraping engine
│   │   ├── scraper_service.go          # SectionWorker + ScraperService orchestrator
│   │   └── grpc_client.go             # gRPC client — Connect, StartStream, retry logic
│   └── utils/
│       └── rate_limiter.go             # Per-domain rate limiter + User-Agent rotator
├── pkg/
│   ├── pb/                             # Generated protobuf + gRPC stubs
│   └── workerpool/
│       ├── pool.go                     # Generic goroutine pool (Submit, Stop, WaitGroup)
│       └── pool_test.go                # Unit tests for pool concurrency
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

## Configuration

| Env Var | Default | Description |
|---|---|---|
| `SCALA_HUB_ADDR` | `localhost:9090` | gRPC address of the Scala Processing Hub |

---

## Code Status

| File | Status |
|---|---|
| `cmd/api/main.go` | ✅ Production — seeds configurable via `SCRAPE_SEEDS` env var |
| `internal/api/http_server.go` | ✅ Production — `/health` and `/ready` endpoints |
| `internal/service/grpc_client.go` | ✅ Production |
| `internal/service/scrape_engine.go` | ✅ Production |
| `internal/service/scraper_service.go` | ✅ Production |
| `internal/utils/rate_limiter.go` | ✅ Production |
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
