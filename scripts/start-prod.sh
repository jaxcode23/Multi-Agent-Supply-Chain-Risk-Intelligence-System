#!/usr/bin/env bash
# =============================================================================
# start-prod.sh — Start production stack
#
# Usage:
#   ./scripts/start-prod.sh           # Start all services
#   ./scripts/start-prod.sh --build   # Rebuild images before starting
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

log()  { echo -e "${BLUE}[start]${NC} $*"; }
ok()   { echo -e "${GREEN}[start]${NC} $*"; }
warn() { echo -e "${YELLOW}[start]${NC} $*"; }
err()  { echo -e "${RED}[start]${NC} $*" >&2; }

cd "$REPO_ROOT"

if [ ! -f ".env" ]; then
  err ".env file not found. Run: cp .env.example .env && edit .env"
  exit 1
fi

BUILD_FLAG=""
if [[ "${1:-}" == "--build" ]]; then
  BUILD_FLAG="--build"
  log "Rebuilding images before starting..."
fi

log "Starting production stack..."
docker compose -f "$COMPOSE_FILE" up -d $BUILD_FLAG

ok "Production stack started"
echo ""
log "Frontend: http://localhost:${FRONTEND_PORT:-3000}"
log "Status:   docker compose -f $COMPOSE_FILE ps"
log "Logs:     docker compose -f $COMPOSE_FILE logs -f"
