# 🟠 Scala Processing Hub

**Language:** Scala 2.13 + ZIO 2 | **Role:** Stream Processing & Vector Ingestion

Receives a high-volume gRPC stream of scraped payloads from the Go Gateway, normalises and chunks the text, then upserts the chunks into ChromaDB for RAG retrieval.

---

## Directory Structure

```
ingestion/
├── build.sbt                                       # SBT build — ZIO, ScalaPB, gRPC, zio-logging
├── src/main/
│   ├── scala/
│   │   ├── Main.scala                              # Entrypoint — ZLayer wiring + gRPC server bind
│   │   ├── config/                                 # (empty) — config loading not yet implemented
│   │   ├── db/
│   │   │   └── ChromaSink.scala                    # ChromaDBClient trait + Live/Stub impls
│   │   ├── domain/
│   │   │   └── Model.scala                         # RawScraperPayload, NormalizedRiskEvent case classes
│   │   ├── models/                                 # (empty)
│   │   ├── service/
│   │   │   ├── IngestionService.scala              # ZIO gRPC ScrapperService implementation
│   │   │   └── ScrapperServiceHandler.scala        # LEGACY — kept for reference, superseded by IngestionService
│   │   ├── streams/
│   │   │   └── RiskIntelPipeline.scala             # Text normalisation + sliding-window chunking
│   │   └── transforms/
│   │       └── DataCleaner.scala                   # Akka Streams normalisation flow (legacy)
│   └── resources/
│       ├── application.conf                        # Akka + broker config
│       └── logback.xml                             # JSON structured logging via logstash-logback-encoder
```

---

## How It Works

1. `Main.scala` binds a Netty gRPC server on `GRPC_PORT` (default 9090).
2. `IngestionService.streamScrapeData` receives a `ZStream[..., ScrapePayload]` from the Go client.
3. The stream is piped through `RiskIntelPipeline.processStream`:
   - Whitespace normalisation
   - Sliding-window chunking (1000 chars / 200 overlap)
4. Chunks are micro-batched with `.grouped(10)` to manage ChromaDB backpressure.
5. Each batch is upserted via `ChromaDBClient.batchUpsert`.
6. Per-batch failures are isolated with `.catchAll` — one bad document never aborts the stream.
7. A final `ScrapeResponse` is returned to the Go client with the processed chunk count.

---

## ChromaDB Client (`db/ChromaSink.scala`)

| Layer | Description |
|---|---|
| `ChromaDBClientLive` | POSTs to `http://$CHROMA_HOST/api/v1/collections/supply_chain_intel/upsert` |
| `ChromaDBClientStub` | Logs upsert intent, no network calls — safe without docker-compose |
| `ChromaDBClient.auto` | Selects `live` if `CHROMA_HOST` env is set, `stub` otherwise |

---

## ZLayer Dependency Graph

```
Client.default          (ZIO HTTP — for ChromaDB REST calls)
    │
    ▼
ChromaDBClient.auto     (live or stub based on CHROMA_HOST)
    │
    ▼
IngestionService.layer  (ZIO gRPC ScrapperService)
    │
    ▼
ServerLayer (Netty gRPC server on GRPC_PORT)
```

---

## Logging

ZIO's `ZIO.log*` calls are bridged to SLF4J via `zio-logging-slf4j`. Logback outputs one JSON line per event (via `logstash-logback-encoder`), matching the Go service's JSON format.

---

## Configuration

| Env Var | Default | Description |
|---|---|---|
| `GRPC_PORT` | `9090` | Port the Netty gRPC server binds to |
| `CHROMA_HOST` | `chroma:8000` | ChromaDB REST API host (docker-compose service name) |

---

## Code Status

| File | Status |
|---|---|
| `Main.scala` | ✅ Production |
| `service/IngestionService.scala` | ✅ Production |
| `db/ChromaSink.scala` — `ChromaDBClientLive` | ✅ Production |
| `db/ChromaSink.scala` — `ChromaDBClientStub` | 🔵 Intentional stub (local dev) |
| `streams/RiskIntelPipeline.scala` | ✅ Production |
| `transforms/DataCleaner.scala` | ⚠️ Akka legacy — not wired into main pipeline |
| `service/ScrapperServiceHandler.scala` | ⚠️ Superseded by `IngestionService.scala` |
| `config/` | ❌ Empty |
| `models/` | ❌ Empty |
