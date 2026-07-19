#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Full production deployment
#
# Pulls latest code, builds images, starts services, and verifies health.
#
# Usage:
#   ./scripts/deploy.sh              # Full deploy
#   ./scripts/deploy.sh --no-build   # Skip image builds
#   ./scripts/deploy.sh --pull       # Pull latest code before deploy
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; }

# Parse flags
NO_BUILD=false
DO_PULL=false
for arg in "$@"; do
  case "$arg" in
    --no-build) NO_BUILD=true ;;
    --pull)     DO_PULL=true ;;
    --help|-h)
      echo "Usage: $0 [--pull] [--no-build]"
      echo "  --pull       Pull latest code from remote before deploying"
      echo "  --no-build   Skip Docker image builds"
      exit 0
      ;;
    *) err "Unknown argument: $arg"; exit 1 ;;
  esac
done

cd "$REPO_ROOT"

# ── Pre-flight checks ────────────────────────────────────────────────────────
log "Running pre-flight checks..."

if ! command -v docker &>/dev/null; then
  err "Docker is not installed or not in PATH"
  exit 1
fi

if ! docker info &>/dev/null; then
  err "Docker daemon is not running"
  exit 1
fi

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    warn ".env file not found. Copying from .env.example"
    cp .env.example .env
    warn "Please edit .env with production secrets before continuing"
    exit 1
  else
    err "No .env file and no .env.example found"
    exit 1
  fi
fi

# Validate required env vars
required_vars=("MONGO_ROOT_PASSWORD" "NEO4J_PASSWORD")
for var in "${required_vars[@]}"; do
  if ! grep -q "^${var}=.\\+" .env 2>/dev/null; then
    err "Required variable $var is not set in .env"
    exit 1
  fi
done

ok "Pre-flight checks passed"

# ── Pull latest code (optional) ──────────────────────────────────────────────
if [ "$DO_PULL" = true ]; then
  log "Pulling latest code..."
  git pull --ff-only
  ok "Code updated"
fi

# ── Build images ─────────────────────────────────────────────────────────────
if [ "$NO_BUILD" = false ]; then
  log "Building Docker images..."
  docker compose -f "$COMPOSE_FILE" build --parallel
  ok "All images built successfully"
else
  warn "Skipping image builds (--no-build)"
fi

# ── Start services ───────────────────────────────────────────────────────────
log "Starting production services..."
docker compose -f "$COMPOSE_FILE" up -d
ok "Services started"

# ── Wait for health ──────────────────────────────────────────────────────────
log "Waiting for services to become healthy (timeout: 120s)..."
"$SCRIPT_DIR/health-check.sh" --timeout 120

ok "Deployment complete!"
echo ""
log "Frontend: http://localhost:${FRONTEND_PORT:-3000}"
log "Logs:     docker compose -f $COMPOSE_FILE logs -f"
log "Status:   docker compose -f $COMPOSE_FILE ps"
