#!/usr/bin/env bash
# =============================================================================
# stop-prod.sh — Stop production stack
#
# Usage:
#   ./scripts/stop-prod.sh              # Stop containers (preserve data)
#   ./scripts/stop-prod.sh --volumes    # Stop containers AND remove volumes
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

log()  { echo -e "${BLUE}[stop]${NC} $*"; }
ok()   { echo -e "${GREEN}[stop]${NC} $*"; }
warn() { echo -e "${YELLOW}[stop]${NC} $*"; }
err()  { echo -e "${RED}[stop]${NC} $*" >&2; }

cd "$REPO_ROOT"

VOLUME_FLAG=""
if [[ "${1:-}" == "--volumes" ]]; then
  VOLUME_FLAG="-v"
  warn "This will ALSO remove all persistent volumes (MongoDB, Neo4j, ChromaDB data)!"
  read -p "Are you sure? (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    log "Aborted"
    exit 0
  fi
fi

log "Stopping production stack..."
docker compose -f "$COMPOSE_FILE" down $VOLUME_FLAG

ok "Production stack stopped"
if [ -n "$VOLUME_FLAG" ]; then
  warn "Persistent volumes have been removed"
fi
