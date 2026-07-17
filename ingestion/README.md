# Scala Processing Hub

**Language:** Scala 2.13 + ZIO 2 | **Role:** Stream Processing & Vector Ingestion

Receives a high-volume gRPC stream of scraped payloads from the Go Gateway, normalises and chunks the text, then upserts the chunks into ChromaDB for RAG retrieval.

---

## Directory Structure

```
ingestion/
├── build.sbt                                       # SBT build — ZIO, ScalaPB, gRPC, zio-logging
├── Dockerfile                                      # Multi-stage GraalVM→JRE build
├── project/
│   ├── plugins.sbt                                 # sbt-protoc, ScalaPB, ZIO gRPC, sbt-assembly
│   └── build.properties                            # sbt 1.12.5
├── src/main/
│   ├── protobuf/scrapper.proto                     # Proto definition for sbt-protoc generation
│   ├── scala/
│   │   ├── Main.scala                              # Entrypoint — ZLayer wiring + gRPC server bind
│   │   ├── config/AppConfig.scala                  # Env-var-based config loading
│   │   ├── db/ChromaDBClient.scala                 # ChromaDBClient trait + Live/Stub impls
│   │   ├── service/IngestionService.scala          # ZIO gRPC ScrapperService implementation
│   │   └── streams/RiskIntelPipeline.scala         # Text normalisation + sliding-window chunking
│   └── resources/
│       └── logback.xml                             # JSON structured logging via logstash-logback-encoder
```

---

## How It Works

1. `Main.scala` binds a Netty gRPC server on `GRPC_PORT` (default 9090).
2. `IngestionService.streamScrapeData` receives a `ZStream[..., ScrapePayload]` from the Go client.
3. The stream is piped through the ingestion pipeline:
   - Whitespace normalisation
   - Sliding-window chunking (1000 chars / 200 overlap)
4. Chunks are micro-batched with `.grouped(BATCH_SIZE)` to manage ChromaDB backpressure.
5. Each batch is upserted via `ChromaDBClient.batchUpsert`.
6. Per-batch failures are isolated with `.catchAll` — one bad document never aborts the stream.
7. A final `ScrapeResponse` is returned to the Go client with the processed chunk count.

---

## ChromaDB Client (`db/ChromaDBClient.scala`)

| Layer | Description |
|---|---|
| `ChromaDBClientLive` | POSTs to `http://$CHROMA_HOST/api/v1/collections/$CHROMA_COLLECTION/upsert` |
| `ChromaDBClientStub` | Logs upsert intent, no network calls — safe without docker-compose |
| `ChromaDBClient.auto` | Selects `live` if `CHROMA_API_KEY` env is set, `stub` otherwise |

---

## ZLayer Dependency Graph

```
Client.default          (ZIO HTTP — for ChromaDB REST calls)
    │
    ▼
ChromaDBClient.auto     (live or stub based on CHROMA_API_KEY)
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
| `CHROMA_HOST` | `chroma` | ChromaDB REST API host |
| `CHROMA_API_KEY` | (empty) | ChromaDB API key; presence selects `live` client |
| `CHROMA_TENANT` | (empty) | ChromaDB tenant |
| `CHROMA_DATABASE` | `supply-chain-db` | ChromaDB database name |
| `CHROMA_COLLECTION` | `supply_chain_intel` | ChromaDB collection name |
| `CHUNK_SIZE` | `1000` | Sliding-window chunk character size |
| `CHUNK_OVERLAP` | `200` | Sliding-window overlap character count |
| `BATCH_SIZE` | `10` | Chunks per upsert batch |

---

## Building & Running

```bash
# Local (requires sbt + JDK 17)
sbt run

# Docker
docker build -f ingestion/Dockerfile -t supply-chain-ingestion .

# Docker Compose (from repo root)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up ingestion
```

---

## Code Status

| File | Status |
|---|---|
| `Main.scala` | ✅ Production |
| `service/IngestionService.scala` | ✅ Production |
| `db/ChromaDBClient.scala` — `ChromaDBClientLive` | ✅ Production |
| `db/ChromaDBClient.scala` — `ChromaDBClientStub` | 🔵 Intentional stub (local dev) |
| `config/AppConfig.scala` | ✅ Production |
| `streams/RiskIntelPipeline.scala` — `chunkText` | ✅ Production |
| `streams/RiskIntelPipeline.scala` — `processStream` | ⚠️ Dead code (IngestionService duplicates logic inline) |
