#!/usr/bin/env bash
# =============================================================================
# cleanup.sh — Clean up Docker resources
#
# Usage:
#   ./scripts/cleanup.sh              # Remove stopped containers + dangling images
#   ./scripts/cleanup.sh --all        # Full cleanup (images, build cache, volumes)
#   ./scripts/cleanup.sh --volumes    # Also remove named volumes (DATA LOSS)
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

log()  { echo -e "${BLUE}[cleanup]${NC} $*"; }
ok()   { echo -e "${GREEN}[cleanup]${NC} $*"; }
warn() { echo -e "${YELLOW}[cleanup]${NC} $*"; }
err()  { echo -e "${RED}[cleanup]${NC} $*" >&2; }

cd "$REPO_ROOT"

FULL_CLEAN=false
REMOVE_VOLUMES=false

for arg in "$@"; do
  case "$arg" in
    --all)      FULL_CLEAN=true ;;
    --volumes)  REMOVE_VOLUMES=true ;;
    --help|-h)
      echo "Usage: $0 [--all] [--volumes]"
      echo "  --all       Full cleanup: images, build cache, and volumes"
      echo "  --volumes   Also remove named volumes (DATA LOSS)"
      exit 0
      ;;
    *) err "Unknown argument: $arg"; exit 1 ;;
  esac
done

# Stop production stack
log "Stopping production stack..."
docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true

# Stop dev stack if running
docker compose -f docker-compose.yml -f docker-compose.dev.yml down 2>/dev/null || true

# Remove dangling images
log "Removing dangling images..."
docker image prune -f

if [ "$REMOVE_VOLUMES" = true ] || [ "$FULL_CLEAN" = true ]; then
  warn "Removing named volumes (THIS DESTROYS ALL DATA)..."
  read -p "Are you sure? (y/N): " confirm
  if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    docker volume prune -f
    ok "Volumes removed"
  else
    log "Skipping volume removal"
  fi
fi

if [ "$FULL_CLEAN" = true ]; then
  log "Performing full cleanup..."
  docker builder prune -f --all
  ok "Build cache cleared"
fi

# Show disk usage
echo ""
log "Docker disk usage:"
docker system df

ok "Cleanup complete"
