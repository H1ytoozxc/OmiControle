#!/usr/bin/env bash
# Stop dev services started by dev-up.sh and tear down infra.
#
#   ./scripts/dev-down.sh           # stop services, keep infra running
#   ./scripts/dev-down.sh full      # also stop docker-compose (postgres, redis)

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$REPO_ROOT/backend"
LOGS="$BACKEND/.dev-logs"
COMPOSE_FILE="$BACKEND/deploy/docker/docker-compose.yml"

ok()   { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$*"; }

for svc in api-gateway realtime-gateway device-service auth-service; do
  pidfile="$LOGS/$svc.pid"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && ok "Stopped $svc (pid $pid)"
    else
      warn "$svc pid $pid not running"
    fi
    rm -f "$pidfile"
  fi
done

# Also kill any stragglers built into target/release/
for svc in api-gateway realtime-gateway device-service auth-service; do
  pkill -f "target/release/$svc" 2>/dev/null && ok "Killed leftover $svc" || true
done

if [ "${1:-}" = "full" ]; then
  docker compose -f "$COMPOSE_FILE" down
  ok "Tore down infra"
fi
