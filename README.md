# Sequoia Platform

> Production-grade platform (2026) for centralized management of devices, AI agents,
> automation, and remote access. Rust + Axum + Tonic + Postgres/TimescaleDB + Redis
> on the backend; Next.js 15 + Tauri 2 on the frontend.

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full design.

## Repo layout

```
sequoia/
├── ARCHITECTURE.md             ← system design, security model, scaling
├── Makefile                    ← root orchestrator (delegates to backend/ & frontend/)
├── backend/                    ← Rust workspace (10 microservices + shared libs)
│   ├── Cargo.toml              ← workspace (24 members)
│   ├── Makefile                ← backend-specific cargo targets
│   ├── rust-toolchain.toml
│   ├── deny.toml
│   ├── .env.example
│   ├── libs/                   ← shared crates (common, auth, crypto, eventbus, db, …)
│   ├── crates/                 ← 10 microservices
│   ├── agents/                 ← cross-platform device agents (desktop, android)
│   ├── plugin-sdk/             ← WIT contract + helpers for plugin authors
│   ├── proto/                  ← gRPC .proto sources
│   ├── migrations/             ← per-service SQL migrations
│   └── deploy/                 ← docker-compose, k8s manifests, helm chart
└── frontend/                   ← Next.js 15 + Tauri 2 desktop shell
    ├── package.json
    ├── Makefile                ← frontend-specific npm targets
    ├── src/                    ← App Router pages, components, design system
    ├── src-tauri/              ← Rust Tauri shell (tray, keyring, deep links)
    └── FRONTEND.md             ← frontend architecture reference
```

## Quick start

```bash
# Prereqs: Rust 1.83+, Node 22+, Docker, protoc

make docker-up          # postgres + redis + otel-collector + jaeger + grafana

# Backend
cd backend
cp .env.example .env    # fill in secrets
make migrate            # apply all SQL migrations
make run-dev            # cargo run -p sequoia-api-gateway  (port 8080)

# Frontend
cd frontend
npm install
npm run dev             # Next.js dev server  (port 3000 — use port 3001 alongside Grafana)
```

Open:

| Service        | URL                        |
|----------------|----------------------------|
| API gateway    | http://localhost:8080       |
| Frontend       | http://localhost:3001       |
| Grafana        | http://localhost:3000       |
| Jaeger         | http://localhost:16686      |
| Prometheus     | http://localhost:9090       |
| MinIO console  | http://localhost:9001       |

## Service inventory

| Crate                          | Port        | Description                                |
|--------------------------------|-------------|--------------------------------------------|
| `sequoia-api-gateway`          | 8080        | North-south HTTP edge (REST/SSE/WS proxy)  |
| `sequoia-auth-service`         | 8081        | JWT/OIDC, sessions, RBAC                   |
| `sequoia-device-service`       | 9082 (gRPC) | Enrollment + bi-di device channel          |
| `sequoia-realtime-gateway`     | 8083        | WebSocket fan-out                          |
| `sequoia-ai-orchestrator`      | 8084        | LLM provider abstraction + agent runtime   |
| `sequoia-workflow-engine`      | 8085        | Durable retryable DAGs                     |
| `sequoia-plugin-host`          | 8086        | WASI Preview 2 plugin runtime              |
| `sequoia-command-executor`     | 8087        | Signed command dispatch to devices         |
| `sequoia-notification-service` | 8088        | Push / email / webhook / sms               |
| `sequoia-telemetry-service`    | 8089        | Metric/event ingestion + queries           |

## Top-level make targets

```
make docker-up          # start dev infra
make docker-down        # stop dev infra
make dev                # infra + backend gateway + frontend dev server

make backend-fmt        # cargo fmt
make backend-lint       # cargo clippy
make backend-test       # cargo nextest
make backend-build      # release build
make backend-migrate    # sqlx migrate all schemas
make backend-audit      # cargo audit + deny

make frontend-dev       # next dev
make frontend-build     # next build
make frontend-lint      # eslint
make frontend-type-check
```

## License

Apache-2.0.
