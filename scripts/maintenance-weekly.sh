#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

run() {
  echo "+ $*"
  "$@"
}

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

log "Disk usage before cleanup"
run df -h
run docker system df

log "Cleaning docker build cache"
run docker builder prune -af

log "Cleaning unused docker images"
run docker image prune -af

if command -v journalctl >/dev/null 2>&1; then
  log "Vacuuming old journal logs"
  run journalctl --vacuum-time=7d || true
fi

log "Disk usage after cleanup"
run df -h
run docker system df

log "Weekly maintenance finished"
