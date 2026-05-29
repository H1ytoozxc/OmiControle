# Sequoia Platform

> v0.1 — device management platform for friends and small teams.
> Rust + Axum + Tonic + Postgres + Redis backend; Next.js 15 frontend.

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full system design.

## Repo layout

```
sequoia/
├── ARCHITECTURE.md             ← full system design, security model
├── Makefile                    ← root orchestrator
├── scripts/
│   ├── dev-up.sh               ← one-command local bootstrap (keys + infra + migrations)
│   └── dev-down.sh             ← stop services and tear down infra
├── backend/                    ← Rust workspace
│   ├── Cargo.toml
│   ├── .env.example            ← copy to .env for env-var based config
│   ├── libs/                   ← shared crates (auth, telemetry, common, …)
│   ├── crates/                 ← 10 microservices
│   ├── agents/                 ← cross-platform device agents
│   ├── proto/                  ← gRPC .proto sources
│   ├── migrations/             ← per-service SQL migrations (auth, device, ai, …)
│   └── deploy/docker/          ← docker-compose (postgres, redis)
└── frontend/                   ← Next.js 15 App Router
    ├── src/lib/i18n.tsx        ← EN/RU language provider
    ├── src/lib/auth/session.ts ← Zustand token store
    └── FRONTEND.md             ← frontend architecture reference
```

## Quick start

### Prerequisites

- **Rust** 1.83+ (`rustup`)
- **Node.js** 22+
- **Docker** + Docker Compose
- **openssl** (comes with macOS / most Linux distros)

### 1. Bootstrap infra + secrets + migrations

```bash
./scripts/dev-up.sh
```

This script (idempotent — safe to re-run) does:

1. Checks prereqs (docker, openssl, cargo, sqlx-cli — installs sqlx-cli if missing)
2. Starts Postgres 16 + Redis 7 via docker compose
3. Generates ES256 keypairs (`backend/secrets/jwt_es256.*`, `device_jwt.*`)
4. Generates an HMAC key for WebSocket tickets (`backend/secrets/ws_ticket_hmac.b64`)
5. Writes per-service TOML configs into `backend/config/` (never committed)
6. Runs all SQL migrations across 8 schemas

Everything in `backend/secrets/` and `backend/config/` is `.gitignore`d.

### 2. Build and start backend services

```bash
./scripts/dev-up.sh services
```

Builds in release mode and starts all four services in the background.
Logs land in `backend/.dev-logs/<service>.log`.

Or start them manually:

```bash
cd backend
SEQUOIA_CONFIG_DIR=config cargo run -p sequoia-auth-service
SEQUOIA_CONFIG_DIR=config cargo run -p sequoia-device-service
SEQUOIA_CONFIG_DIR=config cargo run -p sequoia-realtime-gateway
SEQUOIA_CONFIG_DIR=config cargo run -p sequoia-api-gateway
```

### 3. Create the first user (manual, until `/v1/auth/register` is implemented)

```bash
# Connect to postgres
docker compose -f backend/deploy/docker/docker-compose.yml exec postgres \
  psql -U sequoia -d sequoia

-- Create a tenant
INSERT INTO auth.tenants (id, slug, display_name)
VALUES (gen_random_uuid(), 'my-org', 'My Org');

-- Create a user (password: argon2id hash of "changeme")
INSERT INTO auth.users (id, tenant_id, email, display_name, password_hash)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.tenants WHERE slug = 'my-org'),
  'admin@example.com',
  'Admin',
  '$argon2id$v=19$m=65536,t=3,p=1$...'   -- generate with: cargo run --example hash_password
);
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
```

Login at `http://localhost:3000/login` with the credentials above and your tenant slug.

### Stop everything

```bash
./scripts/dev-down.sh          # stop services, keep postgres/redis running
./scripts/dev-down.sh full     # also stop docker-compose
```

---

## Service ports

| Service                  | Port        | Protocol   | Notes                              |
|--------------------------|-------------|------------|------------------------------------|
| `sequoia-api-gateway`    | **8080**    | HTTP/REST  | Main entry point for the frontend  |
| `sequoia-auth-service`   | **9081**    | gRPC       | Called internally by api-gateway   |
| `sequoia-device-service` | **9082**    | gRPC       | Device enrollment + bidi stream    |
| `sequoia-realtime-gateway` | **8083**  | WS         | `ws://localhost:8083/ws`           |
| Frontend (Next.js)       | **3000**    | HTTP       |                                    |
| Postgres                 | **5432**    | TCP        | `postgres://sequoia:sequoia@...`   |
| Redis                    | **6379**    | TCP        |                                    |

---

## Authentication flow (v0.1)

```
Browser → POST /v1/auth/login → api-gateway → auth-service (gRPC)
                                             ← access_token (ES256 JWT, 15 min)
                                             ← refresh_token (opaque, 30 days)

Refresh: POST /v1/auth/refresh  (rotating refresh tokens — reuse = family revoke)
Logout:  POST /v1/auth/logout   (revokes refresh token family)

WS:      GET  /v1/ws/ticket     → short-lived HMAC-SHA256 ticket (60 s)
         ws://localhost:8083/ws?ticket=<ticket>
```

User JWTs: ES256, issuer `https://auth.sequoia.local`, audience `sequoia-platform`

Device JWTs: separate ES256 keypair, audience `sequoia-device-channel` — the
api-gateway's LocalVerifier only trusts user JWTs; device tokens are verified
inside `device-service` itself.

> **v0.1 note:** JWKS publishing at `/.well-known/jwks.json` is not yet
> implemented. The api-gateway verifies tokens directly with the auth-service's
> public key (configured as `local_public_key_pem` in `backend/config/api-gateway.toml`).

---

## API endpoint status

| Route                          | Status      | Backend                    |
|--------------------------------|-------------|----------------------------|
| `POST /v1/auth/login`          | ✅ wired    | auth-service gRPC          |
| `POST /v1/auth/refresh`        | ✅ wired    | auth-service gRPC          |
| `POST /v1/auth/logout`         | ✅ wired    | auth-service gRPC          |
| `GET  /v1/ws/ticket`           | ✅ wired    | HMAC-SHA256 (in-gateway)   |
| `POST /v1/devices/enroll`      | ✅ wired    | device-service gRPC        |
| `GET  /v1/devices`             | ✅ wired    | device-service gRPC        |
| `GET  /v1/stats/overview`      | ✅ wired    | device-service gRPC        |
| `GET  /metrics`                | ✅ wired    | Prometheus text format      |
| `POST /v1/ai/*`                | ⚠️ proxied  | ai-orchestrator (unimpl)   |
| `POST /v1/workflows/*`         | ⚠️ proxied  | workflow-engine (unimpl)   |
| `GET  /v1/notifications/*`     | ⚠️ proxied  | notification-service (unimpl) |
| `POST /v1/auth/register`       | ❌ not yet  | —                          |
| `PATCH /v1/users/me`           | ❌ not yet  | —                          |

---

## Make targets

```bash
# Backend
make backend-fmt        # cargo fmt
make backend-lint       # cargo clippy
make backend-test       # cargo nextest
make backend-build      # release build
make backend-migrate    # sqlx migrate all schemas

# Frontend
make frontend-dev       # next dev
make frontend-build     # next build
make frontend-lint      # eslint
make frontend-type-check
```

---

## What is not production-ready in v0.1

- **No TLS** between services — all gRPC is plaintext (add TLS termination at
  a reverse proxy like nginx/caddy for production use).
- **No user registration endpoint** — first user must be inserted manually into
  Postgres.
- **Profile/settings forms** have no backend persistence (changes are UI-only).
- **AI / workflow / notification services** are proxied but server-side handlers
  return `unimplemented`.
- **JWKS publishing** bypassed in favor of `local_public_key_pem` (fine for
  single-node, needs update for multi-node).
- **RBAC enforcement** not wired to API handlers yet.
- **Audit log** schema exists, writes not connected.
- **Device agent installer** (`get.sequoia.io`) not published — the onboarding
  curl command is a preview placeholder.

---

## License

Apache-2.0.
