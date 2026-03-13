#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
COMPOSE_BIN="${COMPOSE_BIN:-docker compose}"
PROJECT_NAME="${PROJECT_NAME:-tetris-web}"

CLEAN_DOCKER=1
CLEAN_JOURNAL=1
RESTART_SERVICES=1
TAIL_LOGS=0
NO_CACHE_BUILD=1
RUN_PUZZLE_SYNC=1

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-prod.sh [options]

Options:
  --no-clean-docker     Skip docker builder/image cleanup
  --no-clean-journal    Skip journalctl vacuum
  --no-restart          Skip explicit restart of db/backend after compose up
  --no-no-cache         Skip docker compose build --no-cache
  --no-puzzle-sync      Skip puzzle sync after migrations
  --tail-logs           Show backend/db logs at the end
  -h, --help            Show this help

Environment overrides:
  COMPOSE_FILE          Path to docker-compose file
  COMPOSE_BIN           Compose command to run (default: docker compose)
  PROJECT_NAME          Compose project name (default: tetris-web)
EOF
}

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

run() {
  echo "+ $*"
  "$@"
}

for arg in "$@"; do
  case "$arg" in
    --no-clean-docker)
      CLEAN_DOCKER=0
      ;;
    --no-clean-journal)
      CLEAN_JOURNAL=0
      ;;
    --no-restart)
      RESTART_SERVICES=0
      ;;
    --no-no-cache)
      NO_CACHE_BUILD=0
      ;;
    --no-puzzle-sync)
      RUN_PUZZLE_SYNC=0
      ;;
    --tail-logs)
      TAIL_LOGS=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

cd "$ROOT_DIR"

log "Pre-deploy disk usage"
run df -h
run docker system df

if (( CLEAN_DOCKER )); then
  log "Cleaning docker build cache"
  run docker builder prune -af

  log "Cleaning unused docker images"
  run docker image prune -af
fi

if (( CLEAN_JOURNAL )); then
  if command -v journalctl >/dev/null 2>&1; then
    log "Vacuuming old journal logs"
    run journalctl --vacuum-time=7d || true
  fi
fi

log "Building backend image for maintenance tasks"
run ${COMPOSE_BIN} -p "$PROJECT_NAME" -f "$COMPOSE_FILE" build backend

log "Starting database for migrations"
run ${COMPOSE_BIN} -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d db

log "Waiting for database readiness before migrations"
for _ in $(seq 1 30); do
  if docker exec tetris-db pg_isready -U tetris_user -d tetris_db >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

log "Applying Prisma migrations"
run ${COMPOSE_BIN} -p "$PROJECT_NAME" -f "$COMPOSE_FILE" run --rm backend npm run prisma:migrate:deploy

if (( RUN_PUZZLE_SYNC )); then
  log "Syncing puzzles"
  run ${COMPOSE_BIN} -p "$PROJECT_NAME" -f "$COMPOSE_FILE" run --rm backend npm run puzzle:sync
fi

log "Stopping current stack before rebuild"
run ${COMPOSE_BIN} -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down

log "Deploying compose stack"
if (( NO_CACHE_BUILD )); then
  log "Building images without cache"
  run ${COMPOSE_BIN} -p "$PROJECT_NAME" -f "$COMPOSE_FILE" build --no-cache
  run ${COMPOSE_BIN} -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d
else
  run ${COMPOSE_BIN} -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d --build
fi

if (( RESTART_SERVICES )); then
  log "Restarting database"
  run docker restart tetris-db

  log "Waiting for database readiness"
  for _ in $(seq 1 30); do
    if docker exec tetris-db pg_isready -U tetris_user -d tetris_db >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  log "Restarting backend"
  run docker restart tetris-backend
fi

log "Post-deploy status"
run docker ps --filter name=tetris-frontend --filter name=tetris-backend --filter name=tetris-db --filter name=tetris-adminer
run df -h
run docker system df

if (( TAIL_LOGS )); then
  log "Recent database logs"
  run docker logs tetris-db --tail=50

  log "Recent backend logs"
  run docker logs tetris-backend --tail=50
fi

log "Deployment finished"
