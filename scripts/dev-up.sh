#!/usr/bin/env bash
# Sequoia dev bootstrap. Idempotent — safe to re-run.
#
#   ./scripts/dev-up.sh             # full setup + start infra (no services)
#   ./scripts/dev-up.sh services    # also build + start all backend services
#
# What it does:
#   1. Checks prerequisites (docker, openssl, cargo, sqlx-cli)
#   2. Brings up Postgres + Redis via docker compose
#   3. Generates ES256 keypairs (user + device) into backend/secrets/ if absent
#   4. Generates an HMAC key for WebSocket tickets if absent
#   5. Writes per-service TOML configs into backend/config/ if absent
#   6. Runs sqlx migrations across all 8 schemas
#   7. Optionally builds + starts services in the background
#
# Everything in backend/secrets/ and backend/config/ is .gitignored.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$REPO_ROOT/backend"
SECRETS="$BACKEND/secrets"
CONFIG="$BACKEND/config"
LOGS="$BACKEND/.dev-logs"

COMPOSE_FILE="$BACKEND/deploy/docker/docker-compose.yml"
DB_URL="postgres://sequoia:sequoia@localhost:5432/sequoia"

ok()    { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn()  { printf "\033[1;33m!\033[0m %s\n" "$*"; }
err()   { printf "\033[1;31m✗\033[0m %s\n" "$*" >&2; }
step()  { printf "\n\033[1;34m▶\033[0m %s\n" "$*"; }

# ── 1. Prereqs ─────────────────────────────────────────────────────────────
step "Checking prerequisites"
missing=()
for cmd in docker openssl cargo; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    missing+=("$cmd")
  fi
done
if [ ${#missing[@]} -gt 0 ]; then
  err "Missing required tools: ${missing[*]}"
  echo "Install them (Nix users: nix-shell -p docker openssl cargo sqlx-cli) and re-run."
  exit 1
fi

if ! cargo sqlx --version >/dev/null 2>&1; then
  warn "sqlx-cli not installed — installing now"
  cargo install sqlx-cli --version "=0.8.6" --locked --no-default-features --features rustls,postgres
fi
ok "All prerequisites present"

# ── 2. Infra ───────────────────────────────────────────────────────────────
step "Starting Postgres + Redis (docker compose)"
docker compose -f "$COMPOSE_FILE" up -d postgres redis
ok "Infra started — waiting for postgres readiness"
for i in {1..30}; do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U sequoia >/dev/null 2>&1; then
    ok "Postgres is ready"
    break
  fi
  sleep 1
done

# ── 3. JWT keys ────────────────────────────────────────────────────────────
step "Generating JWT signing keys"
mkdir -p "$SECRETS"
chmod 700 "$SECRETS"

gen_es256_pair() {
  local name=$1
  if [ ! -f "$SECRETS/$name.key" ]; then
    openssl ecparam -genkey -name prime256v1 -noout -out "$SECRETS/$name.key"
    openssl ec -in "$SECRETS/$name.key" -pubout -out "$SECRETS/$name.pub" 2>/dev/null
    chmod 600 "$SECRETS/$name.key" "$SECRETS/$name.pub"
    ok "Generated $name keypair"
  else
    ok "$name keypair already exists"
  fi
}
gen_es256_pair jwt_es256
gen_es256_pair device_jwt

# ── 4. HMAC key for WebSocket tickets ──────────────────────────────────────
step "Generating WebSocket ticket HMAC key"
if [ ! -f "$SECRETS/ws_ticket_hmac.b64" ]; then
  # 32 random bytes → base64url no padding
  openssl rand 32 | base64 | tr '/+' '_-' | tr -d '=\n' > "$SECRETS/ws_ticket_hmac.b64"
  chmod 600 "$SECRETS/ws_ticket_hmac.b64"
  ok "Generated WS ticket HMAC key"
else
  ok "WS ticket HMAC key already exists"
fi
HMAC_KEY=$(cat "$SECRETS/ws_ticket_hmac.b64")

# ── 5. Service configs ─────────────────────────────────────────────────────
step "Writing service config files"
mkdir -p "$CONFIG"

write_if_missing() {
  local path=$1
  local body=$2
  if [ ! -f "$path" ]; then
    printf "%s" "$body" > "$path"
    ok "Wrote $(basename "$path")"
  else
    ok "$(basename "$path") already exists (skipped)"
  fi
}

PG_POOL_TOML=$(cat <<EOF
[database]
url = "$DB_URL"
max_connections = 32
min_connections = 4
acquire_timeout_ms = 5000
EOF
)

write_if_missing "$CONFIG/auth-service.toml" "$(cat <<EOF
bind = "0.0.0.0:9081"
log_filter = "info,sqlx=warn"

$PG_POOL_TOML

[jwt]
issuer = "https://auth.sequoia.local"
audience = "sequoia-platform"
access_ttl_s = 900
refresh_ttl_s = 2592000

[[jwt.signing_keys]]
kid = "user-2026-05"
private_key_pem = "file://$SECRETS/jwt_es256.key"
public_key_pem  = "file://$SECRETS/jwt_es256.pub"
active = true
EOF
)"

write_if_missing "$CONFIG/api-gateway.toml" "$(cat <<EOF
bind = "0.0.0.0:8080"
request_timeout_s = 30
log_filter = "info,h2=warn,hyper=warn"
cors_origins = ["http://localhost:3000"]
ws_ticket_hmac_key_b64 = "$HMAC_KEY"
ws_ticket_ttl_s = 60

[auth]
issuer = "https://auth.sequoia.local"
audience = "sequoia-platform"
jwks_url = "http://localhost:9081/.well-known/jwks.json"
# v0.1: skip JWKS, verify with the auth-service's public key directly
local_public_key_pem = "file://$SECRETS/jwt_es256.pub"

[upstreams]
auth         = "http://localhost:9081"
device       = "http://localhost:9082"
ai           = "http://localhost:9084"
workflow     = "http://localhost:9085"
plugin       = ""
command      = ""
notification = "http://localhost:9088"
telemetry    = ""

[rate_limit]
per_ip_rps     = 100
per_tenant_rps = 1000
burst          = 200
EOF
)"

write_if_missing "$CONFIG/device-service.toml" "$(cat <<EOF
grpc_bind = "0.0.0.0:9082"
log_filter = "info,sqlx=warn"
redis_url = "redis://localhost:6379/0"
enrollment_ttl_s = 600
channel_capacity = 256

$PG_POOL_TOML

[device_jwt]
issuer = "https://device.sequoia.local"
audience = "sequoia-device-channel"
kid = "device-2026-05"
private_key_pem = "file://$SECRETS/device_jwt.key"
public_key_pem  = "file://$SECRETS/device_jwt.pub"
ttl_s = 86400
EOF
)"

write_if_missing "$CONFIG/realtime-gateway.toml" "$(cat <<EOF
bind = "0.0.0.0:8083"
ws_path = "/ws"
log_filter = "info"
redis_url = "redis://localhost:6379/0"
jwks_url = ""
issuer = "https://auth.sequoia.local"
audience = "sequoia-platform"
ws_ticket_hmac_key_b64 = "$HMAC_KEY"
max_connections = 200000
heartbeat_interval_s = 20
per_conn_send_capacity = 512
EOF
)"

# ── 6. Migrations ──────────────────────────────────────────────────────────
step "Running database migrations"
export DATABASE_URL="$DB_URL"
cd "$BACKEND"
COMPOSE_FILE_ABS="$REPO_ROOT/backend/deploy/docker/docker-compose.yml"
pg_exec() {
  docker compose -f "$COMPOSE_FILE_ABS" exec -T postgres \
    psql -U sequoia -d sequoia -c "$1" >/dev/null 2>&1
}

for schema in auth device ai workflow telemetry notification plugin audit; do
  if [ -d "migrations/$schema" ]; then
    # Create schema first so _sqlx_migrations can land there
    pg_exec "CREATE SCHEMA IF NOT EXISTS $schema;" || true
    SCHEMA_URL="${DB_URL}?options=-c+search_path%3D${schema}"
    cargo sqlx migrate run \
      --source "migrations/$schema" \
      --database-url "$SCHEMA_URL"
    ok "Migrated $schema"
  fi
done

# ── 7. Optionally start services ──────────────────────────────────────────
if [ "${1:-}" = "services" ]; then
  step "Building services (release mode) — this can take 5+ minutes on first run"
  cargo build --release -p sequoia-auth-service \
                        -p sequoia-device-service \
                        -p sequoia-realtime-gateway \
                        -p sequoia-api-gateway

  mkdir -p "$LOGS"
  start_svc() {
    local svc=$1 ; local cfg=$2
    if pgrep -f "target/release/$svc" >/dev/null 2>&1; then
      warn "$svc already running"
      return
    fi
    # Config lib looks for config/config.toml relative to SEQUOIA_CONFIG_DIR.
    # Create a per-service dir with config.toml pointing at the service TOML.
    local svc_cfg_dir="$CONFIG/$svc"
    mkdir -p "$svc_cfg_dir"
    cp "$CONFIG/$cfg.toml" "$svc_cfg_dir/config.toml"
    env SEQUOIA_CONFIG_DIR="$svc_cfg_dir" \
        ./target/release/"$svc" \
        >"$LOGS/$svc.log" 2>&1 &
    echo $! >"$LOGS/$svc.pid"
    ok "Started $svc (pid $!, logs: $LOGS/$svc.log)"
  }

  # Order matters: auth → device → realtime → api-gateway
  start_svc auth-service       auth-service
  sleep 2
  start_svc device-service     device-service
  start_svc realtime-gateway   realtime-gateway
  sleep 1
  start_svc api-gateway        api-gateway
fi

step "Done"
cat <<EOF

  Postgres:   postgres://sequoia:sequoia@localhost:5432/sequoia
  Redis:      redis://localhost:6379/0
  Secrets:    $SECRETS/
  Configs:    $CONFIG/

  Next:
    ./scripts/dev-up.sh services   # build + start all services
    make backend-test              # run tests
    cd frontend && npm run dev     # start the UI

  Stop:
    ./scripts/dev-down.sh

EOF
