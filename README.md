# Sequoia Platform

> Production-grade backend platform (2026) for centralized management of
> devices, AI agents, automation, and remote access. Rust + Axum + Tonic
> + Postgres/TimescaleDB + Redis, deployed self-hosted or to Kubernetes.

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full design — services,
data flows, security model, scaling strategy, future-proof patterns. This
README is the developer-side quick reference.

## Repo layout

```
sequoia/
├── ARCHITECTURE.md             ← read this first
├── Cargo.toml                  ← workspace (24 members)
├── libs/                       ← shared crates
├── crates/                     ← 10 microservices
├── agents/                     ← cross-platform device agents
├── plugin-sdk/                 ← WIT contract + helpers for plugin authors
├── proto/                      ← gRPC .proto sources
├── migrations/                 ← per-service SQL migrations
└── deploy/                     ← docker-compose, k8s, helm
```

## Quick start

```bash
# Prereqs: Rust 1.83+, Docker, protoc
make docker-up        # postgres + redis + otel-collector + jaeger + grafana
make migrate          # apply all SQL migrations
make run-dev          # cargo run -p sequoia-api-gateway (others similarly)
```

Open:

- API gateway   →  http://localhost:8080
- Grafana       →  http://localhost:3000
- Jaeger        →  http://localhost:16686
- Prometheus    →  http://localhost:9090
- MinIO console →  http://localhost:9001

## Service inventory

| Crate                              | Default port | Description                                |
|------------------------------------|--------------|--------------------------------------------|
| `sequoia-api-gateway`              | 8080         | North-south HTTP edge (REST/SSE/WS proxy)  |
| `sequoia-auth-service`             | 8081         | JWT/OIDC, sessions, RBAC                   |
| `sequoia-device-service`           | 9082 (gRPC)  | Enrollment + bi-di device channel          |
| `sequoia-realtime-gateway`         | 8083         | WebSocket fan-out                          |
| `sequoia-ai-orchestrator`          | 8084         | LLM provider abstraction + agent runtime   |
| `sequoia-workflow-engine`          | 8085         | Durable retryable DAGs                     |
| `sequoia-plugin-host`              | 8086         | WASI Preview 2 plugin runtime              |
| `sequoia-command-executor`         | 8087         | Signed command dispatch to devices         |
| `sequoia-notification-service`     | 8088         | Push / email / webhook / sms               |
| `sequoia-telemetry-service`        | 8089         | Metric/event ingestion + queries           |

## License

Apache-2.0.
