# Shadow Network — Production Runbook

## Architecture Overview

Shadow Network is a polyglot microservices system for supply chain risk intelligence. It ingests, analyzes, and visualizes multi-source threat data using a team of specialized agents.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Backend    │────▶│     MongoDB      │
│  (Next.js)   │     │ (FastAPI)    │     │  (Document Store)│
│  :3000       │     │  :8000       │     │  :27017 (int)    │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                            │
                     ┌──────▼───────┐     ┌──────────────────┐
                     │              │────▶│     Neo4j        │
                     │   Backend    │     │  (Knowledge Graph)│
                     │              │     │  :7687 (int)     │
                     └──────┬───────┘     └──────────────────┘
                            │
                     ┌──────▼───────┐     ┌──────────────────┐
                     │  Intelligence│────▶│    ChromaDB      │
                     │    Agent     │     │  (Vector Store)  │
                     │  :9100 (int) │     │  :8000 (int)     │
                     └──────────────┘     └──────────────────┘

┌──────────────┐     ┌──────────────┐
│  Go Scraper  │────▶│ Scala Ingest │────▶ ChromaDB
│  :8080 (int) │     │  :9090 (int) │
└──────────────┘     │  :9091 (int) │
                     └──────────────┘
```

### Services

| Service | Language | Port | Internal? | Purpose |
|---------|----------|------|-----------|---------|
| frontend | TypeScript / Next.js | 3000 | **External** | User interface |
| backend | Python / FastAPI | 8000 | Internal | REST API, orchestration |
| intelligence-agent | Python | 9100 | Internal | LLM-powered risk analysis |
| scrapers | Go | 8080 | Internal | Web scraping gateway |
| ingestion | Scala / ZIO | 9090, 9091 | Internal | gRPC ingestion + health |
| mongodb | MongoDB 7.0 | 27017 | Internal | Document storage |
| neo4j | Neo4j 5.19 | 7687 | Internal | Knowledge graph |
| chromadb | ChromaDB 0.6.3 | 8000 | Internal | Vector embeddings |

### Data Flow

1. **Go Scraper** crawls external sources, streams payloads via gRPC to **Scala Ingestion**
2. **Scala Ingestion** chunks, embeds, and stores vectors in **ChromaDB**
3. **Intelligence Agent** periodically pulls new data, runs LLM analysis, writes results to **MongoDB**
4. **Backend** serves aggregated risk data from **MongoDB**, **Neo4j**, and **ChromaDB**
5. **Frontend** consumes the Backend API and displays dashboards

---

## Prerequisites

- Docker Engine 24+ with Compose V2
- Git
- 4 GB RAM minimum (8 GB recommended)
- `.env` file configured (see below)

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_ROOT_USERNAME` | MongoDB admin username | `admin` |
| `MONGO_ROOT_PASSWORD` | MongoDB admin password | `s3cure-pass` |
| `NEO4J_PASSWORD` | Neo4j auth password | `s3cure-pass` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (empty) | Google Gemini API key for LLM analysis |
| `NEWS_API_KEY` | (empty) | NewsAPI key for ingestion |
| `CHROMA_API_KEY` | (empty) | ChromaDB Cloud API key (leave empty for local) |
| `CHROMA_HOST` | `chromadb` | ChromaDB hostname |
| `FRONTEND_PORT` | `3000` | External frontend port |
| `WORKER_CONCURRENCY` | `5` | Scraper worker threads |
| `CHUNK_SIZE` | `1000` | Text chunking size |
| `CHUNK_OVERLAP` | `200` | Chunk overlap |

Full list: see `.env.example`.

---

## Deployment

### First-Time Deployment

```bash
# 1. Clone the repository
git clone <repo-url> && cd Shadow-Network

# 2. Configure environment
cp .env.example .env
# Edit .env with production secrets

# 3. Deploy
./scripts/deploy.sh
```

### Subsequent Deployments

```bash
# Pull latest code and rebuild
./scripts/deploy.sh --pull

# Or skip rebuild if only config changed
./scripts/deploy.sh --no-build
```

### Manual Deployment

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Verify health
./scripts/health-check.sh
```

---

## Starting Services

```bash
# Start all services
./scripts/start-prod.sh

# Start with image rebuild
./scripts/start-prod.sh --build

# Or manually
docker compose -f docker-compose.prod.yml up -d
```

---

## Stopping Services

```bash
# Stop containers (preserve data)
./scripts/stop-prod.sh

# Stop and remove all volumes (DATA LOSS)
./scripts/stop-prod.sh --volumes
```

---

## Health Checks

### Automated

```bash
# Check all services
./scripts/health-check.sh

# Custom timeout
./scripts/health-check.sh --timeout 120

# Quiet mode (errors only)
./scripts/health-check.sh --quiet
```

### Manual Endpoints

| Service | URL | Expected |
|---------|-----|----------|
| Frontend | `http://localhost:3000` | 200 |
| Backend | `http://localhost:8000/health` | 200 |
| Intelligence Agent | `http://localhost:9100/health` | 200 |
| Ingestion | `http://localhost:9091/health` | 200 |
| Scraper | `http://localhost:8080/health` | 200 |

Note: Backend, Intelligence Agent, Ingestion, and Scraper ports are internal only. Access them from within the Docker network, or use `docker exec` to curl.

### Docker Compose Health Status

```bash
docker compose -f docker-compose.prod.yml ps
```

---

## Logs

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Single service
docker compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100 backend

# Since a timestamp
docker compose -f docker-compose.prod.yml logs --since 2024-01-01T00:00:00 backend
```

### Log Locations

Logs are written to stdout/stderr and captured by Docker. To export:

```bash
docker compose -f docker-compose.prod.yml logs backend > backend.log 2>&1
```

---

## Monitoring

### Container Resource Usage

```bash
# Live stats
docker stats

# Snapshot
docker stats --no-stream
```

### Service Status

```bash
docker compose -f docker-compose.prod.yml ps -a
```

### Disk Usage

```bash
docker system df
docker system df -v  # detailed
```

---

## Backups

### MongoDB

```bash
# Create backup
docker exec supply_chain_mongo mongodump \
  -u admin -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  --out /data/backup/$(date +%Y%m%d)

# Copy to host
docker cp supply_chain_mongo:/data/backup ./backups/mongo/
```

### Neo4j

```bash
# Create backup
docker exec supply_chain_neo4j neo4j-admin database dump neo4j \
  --to-path=/data/backup/

# Copy to host
docker cp supply_chain_neo4j:/data/backup ./backups/neo4j/
```

### ChromaDB

ChromaDB data is stored in the `chroma_data` Docker volume. Backup the volume:

```bash
# Stop ChromaDB temporarily
docker compose -f docker-compose.prod.yml stop chromadb

# Backup volume
docker run --rm -v supply-chain-net_chroma_data:/data -v "$(pwd)/backups":/backup \
  alpine tar czf /backup/chroma_$(date +%Y%m%d).tar.gz -C /data .

# Restart
docker compose -f docker-compose.prod.yml start chromadb
```

### Automated Backup Script

```bash
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
source .env

# MongoDB
docker exec supply_chain_mongo mongodump \
  -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin --out /dump
docker cp supply_chain_mongo:/dump "$BACKUP_DIR/mongo"

# Archive
tar czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"
echo "Backup saved: ${BACKUP_DIR}.tar.gz"
```

---

## Restore Procedure

### MongoDB Restore

```bash
# Copy dump to container
docker cp ./backups/mongo/ supply_chain_mongo:/restore/

# Restore
docker exec supply_chain_mongo mongorestore \
  -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin /restore
```

### Neo4j Restore

```bash
# Stop Neo4j
docker compose -f docker-compose.prod.yml stop neo4j

# Copy backup
docker cp ./backups/neo4j/ supply_chain_neo4j:/data/backup/

# Load
docker compose -f docker-compose.prod.yml start neo4j
docker exec supply_chain_neo4j cypher-shell \
  -u neo4j -p "$NEO4J_PASSWORD" \
  "CALL dbms.loadFull('/data/backup/')"
```

### Full Restore

```bash
# 1. Stop all services
./scripts/stop-prod.sh

# 2. Restore volume backups (see above)

# 3. Restart
./scripts/start-prod.sh
```

---

## Rolling Updates

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart with zero-downtime for infrastructure
docker compose -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.prod.yml up -d backend frontend

# 3. Verify
./scripts/health-check.sh
```

Note: This project does not currently support zero-downtime rolling updates for all services. For full updates, use `./scripts/deploy.sh --pull`.

---

## Rollback Procedure

```bash
# 1. Checkout the previous version
git checkout <previous-tag-or-commit>

# 2. Rebuild and restart
./scripts/deploy.sh

# 3. Verify
./scripts/health-check.sh
```

### Rollback with Volume Preservation

```bash
# Stop without removing volumes
docker compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout <previous-tag>

# Rebuild and start (volumes are reattached)
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## Common Failures

### MongoDB won't start

**Symptom:** `supply_chain_mongo` exits immediately

**Cause:** Corrupted data directory after unclean shutdown

**Fix:**
```bash
docker compose -f docker-compose.prod.yml stop mongodb
docker volume rm supply-chain-net_mongo_data
docker compose -f docker-compose.prod.yml start mongodb
```

### Neo4j out of memory

**Symptom:** `supply_chain_neo4j` killed by OOM

**Fix:** Increase memory limit in `docker-compose.prod.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 4G
```

### Backend cannot connect to MongoDB

**Symptom:** Backend logs show `ServerSelectionTimeoutError`

**Fix:** Ensure MongoDB is healthy:
```bash
docker compose -f docker-compose.prod.yml ps mongodb
docker compose -f docker-compose.prod.yml logs mongodb
```

### Ingestion gRPC connection refused

**Symptom:** Scraper logs show gRPC connection errors

**Fix:** Ensure ingestion is healthy and the gRPC port is correct:
```bash
docker compose -f docker-compose.prod.yml logs ingestion
```

### Frontend shows 502 Bad Gateway

**Symptom:** Frontend loads but API calls fail

**Fix:** Ensure backend is healthy:
```bash
docker compose -f docker-compose.prod.yml logs backend
./scripts/health-check.sh
```

---

## Troubleshooting

### Service not starting

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps -a

# Check logs
docker compose -f docker-compose.prod.yml logs <service>

# Check resource limits
docker stats --no-stream
```

### Network connectivity between services

```bash
# Exec into a container
docker exec -it supply_chain_backend sh

# Test connectivity
curl -sf http://mongodb:27017 || echo "MongoDB unreachable"
curl -sf http://neo4j:7474 || echo "Neo4j unreachable"
curl -sf http://chromadb:8000/api/v1/heartbeat || echo "ChromaDB unreachable"
```

### Docker build failures

```bash
# Build with verbose output
docker compose -f docker-compose.prod.yml build --no-cache 2>&1 | tee build.log

# Check .dockerignore
cat .dockerignore
```

### Permission issues

All services run as non-root user `app`. If you see permission errors:

```bash
# Check file ownership
docker exec supply_chain_backend ls -la /app

# Fix host permissions (if using bind mounts)
sudo chown -R 1000:1000 ./backend
```

---

## Production Checklist

Before deploying to production:

- [ ] `.env` configured with strong, unique passwords
- [ ] `MONGO_ROOT_PASSWORD` and `NEO4J_PASSWORD` are strong and unique
- [ ] `GEMINI_API_KEY` is set (for LLM features)
- [ ] `NEWS_API_KEY` is set (for news ingestion)
- [ ] `.env` is NOT committed to version control
- [ ] All Docker images build successfully: `./scripts/deploy.sh`
- [ ] All services report healthy: `./scripts/health-check.sh`
- [ ] Frontend accessible at expected URL
- [ ] SSL/TLS configured (if exposing beyond localhost)
- [ ] Firewall rules configured (only port 3000 exposed)
- [ ] Backup schedule configured
- [ ] Monitoring/alerting configured
- [ ] Log aggregation configured
- [ ] Resource limits set appropriately for your host
- [ ] Docker and host OS are up to date

---

## Quick Reference

| Action | Command |
|--------|---------|
| Deploy | `./scripts/deploy.sh` |
| Start | `./scripts/start-prod.sh` |
| Stop | `./scripts/stop-prod.sh` |
| Health check | `./scripts/health-check.sh` |
| Cleanup | `./scripts/cleanup.sh` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f` |
| Status | `docker compose -f docker-compose.prod.yml ps` |
| Rebuild | `./scripts/start-prod.sh --build` |
| Full cleanup | `./scripts/cleanup.sh --all` |
