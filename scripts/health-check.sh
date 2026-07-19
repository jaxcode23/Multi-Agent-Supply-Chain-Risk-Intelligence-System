#!/usr/bin/env bash
# =============================================================================
# health-check.sh — Verify all production services are healthy
#
# Usage:
#   ./scripts/health-check.sh              # Check with default 60s timeout
#   ./scripts/health-check.sh --timeout 120  # Custom timeout
#   ./scripts/health-check.sh --quiet       # Minimal output
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[health]${NC} $*"; }
ok()   { echo -e "${GREEN}[health]${NC} $*"; }
warn() { echo -e "${YELLOW}[health]${NC} $*"; }
err()  { echo -e "${RED}[health]${NC} $*" >&2; }

# Parse flags
TIMEOUT=60
QUIET=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --quiet)
      QUIET=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--timeout SECONDS] [--quiet]"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

cd "$REPO_ROOT"

# All services in the production stack
ALL_SERVICES=(
  "mongodb"
  "neo4j"
  "chromadb"
  "scrapers"
  "ingestion"
  "backend"
  "intelligence-agent"
  "frontend"
)

log "Checking service health (timeout: ${TIMEOUT}s)..."
echo ""

PASSED=0
FAILED=0
deadline=$(($(date +%s) + TIMEOUT))

for service in "${ALL_SERVICES[@]}"; do
  while true; do
    # Get health status from docker compose
    status=$(docker compose -f "$COMPOSE_FILE" ps --format json "$service" 2>/dev/null \
      | grep -o '"Health":"[^"]*"' | head -1 | cut -d'"' -f4)

    # Get running state
    state=$(docker compose -f "$COMPOSE_FILE" ps --format json "$service" 2>/dev/null \
      | grep -o '"State":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ "$status" = "healthy" ]; then
      if [ "$QUIET" = false ]; then
        ok "$service — healthy"
      fi
      PASSED=$((PASSED + 1))
      break
    elif [ "$state" = "running" ] && [ -z "$status" ]; then
      # Service is running but has no healthcheck (e.g. starts but healthcheck not yet passed)
      if [ "$(date +%s)" -lt "$deadline" ]; then
        sleep 3
        continue
      fi
      if [ "$QUIET" = false ]; then
        warn "$service — running (no healthcheck)"
      fi
      PASSED=$((PASSED + 1))
      break
    fi

    if [ "$(date +%s)" -ge "$deadline" ]; then
      err "$service — unhealthy (state=${state:-unknown}, health=${status:-unknown})"
      FAILED=$((FAILED + 1))
      break
    fi

    sleep 3
  done
done

# Also verify frontend is reachable from host (only published port)
frontend_port="${FRONTEND_PORT:-3000}"
if curl -sf -o /dev/null "http://localhost:${frontend_port}" 2>/dev/null; then
  if [ "$QUIET" = false ]; then
    ok "frontend (host) — reachable on port ${frontend_port}"
  fi
else
  # Don't double-count; just warn if compose says healthy but host can't reach
  if [ "$QUIET" = false ]; then
    warn "frontend (host) — not reachable on port ${frontend_port} (may still be starting)"
  fi
fi

# Summary
echo ""
TOTAL=$((PASSED + FAILED))
if [ "$FAILED" -eq 0 ]; then
  ok "All $TOTAL services healthy"
  exit 0
else
  err "$FAILED/$TOTAL services unhealthy"
  exit 1
fi
