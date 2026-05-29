# Sequoia Platform — Architecture (v0.1, 2026)

> Production-grade backend platform for centralized management of devices,
> AI agents, automation, and remote access. Designed for 2026-era distributed
> systems: zero-trust, event-driven, async-first, horizontally scalable,
> self-hostable, observability-first.

---

## 0. TL;DR

Sequoia is a polyrepo-ready Rust monorepo composed of 10 independently
deployable services. Each service is a small Axum/Tonic binary that depends on
a shared set of crates (`libs/*`). External traffic enters through the
**API Gateway** (north-south) and **Realtime Gateway** (long-lived WebSocket).
Internal traffic between services is gRPC over mTLS (east-west). Device agents
keep a single long-lived **bidirectional gRPC stream** to the Device Service
(falls back to WebSocket when gRPC is blocked). State is split across:

- **PostgreSQL** — source of truth (per-service logical schema, single physical
  cluster initially, partition-by-tenant when sharded).
- **Redis** — cache, rate limit, presence, Redis Streams as the in-cluster
  event bus.
- **Object storage (S3-compatible)** — large blobs (file transfer, plugin
  WASM bundles, telemetry rollups).
- **OTLP collector → Prometheus / Tempo / Loki** — telemetry sinks.

The platform is **zero-trust by default**: every internal hop authenticates,
every external request is rate-limited and authorized, and every device holds
its own asymmetric identity (Ed25519) signed by a per-tenant CA.

---

## 1. Service map

```
                       ┌─────────────────────────────────────────┐
                       │           Public Internet               │
                       └──────────────┬──────────────────────────┘
                                      │ HTTPS / WSS / gRPC-Web
                ┌─────────────────────┼─────────────────────────┐
                ▼                     ▼                         ▼
       ┌────────────────┐    ┌────────────────┐       ┌──────────────────┐
       │  API Gateway   │    │ Realtime GW    │       │  Device Stream   │
       │  (Axum, REST)  │    │ (Axum + WS)    │       │  Endpoint (Tonic)│
       └───────┬────────┘    └───────┬────────┘       └─────────┬────────┘
               │                     │                          │
               │ mTLS gRPC east-west │                          │ bi-di stream
               ▼                     ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Service Mesh (linkerd / istio / cilium)         │
├──────────────┬──────────────┬──────────────┬──────────────┬───────────┤
│ Auth Service │ Device Svc   │ AI Orchestr. │ Workflow Eng │ Plugin Hst│
├──────────────┼──────────────┼──────────────┼──────────────┼───────────┤
│ Telemetry    │ Notification │ Command Exec │  (others)    │           │
└──────────────┴──────────────┴──────────────┴──────────────┴───────────┘
               │                     │                          │
               ▼                     ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│   PostgreSQL (primary + read replicas)   │   Redis (cluster mode)     │
│   S3-compatible object storage           │   OTLP collector → backends│
└────────────────────────────────────────────────────────────────────────┘
```

### Service inventory

| # | Service              | Crate                       | Purpose                                            | Inbound                | Outbound                              |
|---|----------------------|-----------------------------|----------------------------------------------------|------------------------|---------------------------------------|
| 1 | API Gateway          | `crates/api-gateway`        | North-south HTTP edge, auth verify, fan-out gRPC  | HTTPS                  | gRPC to all internal services         |
| 2 | Auth Service         | `crates/auth-service`       | JWT issuance, OAuth2/OIDC, RBAC, sessions         | gRPC + HTTPS (OIDC)    | Postgres, Redis                       |
| 3 | Device Service       | `crates/device-service`     | Enrollment, identity, bi-di stream multiplexer    | gRPC + agent stream    | Postgres, Redis, Realtime, EventBus   |
| 4 | AI Orchestrator      | `crates/ai-orchestrator`    | LLM abstraction, agent runtime, tool calls        | gRPC                   | LLM providers, Workflow Engine        |
| 5 | Realtime Gateway     | `crates/realtime-gateway`   | WS fan-out, presence, live event delivery         | WSS                    | Redis pub/sub, Auth verify            |
| 6 | Telemetry Service    | `crates/telemetry-service`  | Metric/log/event ingestion, rollup, retention     | gRPC + OTLP            | Postgres (TimescaleDB), Object store  |
| 7 | Notification Service | `crates/notification-service`| Multi-channel delivery (push, email, webhook)    | gRPC                   | FCM/APNs, SMTP, webhooks              |
| 8 | Workflow Engine      | `crates/workflow-engine`    | Durable, retryable, AI-driven workflows            | gRPC + queue           | Postgres, Redis Streams, sub-services |
| 9 | Plugin Host          | `crates/plugin-host`        | WASM plugin execution, sandboxed, fuel-limited     | gRPC                   | Object store (bundles), EventBus      |
|10 | Command Executor     | `crates/command-executor`   | Authorized remote command relay to device agents   | gRPC                   | Device Service stream                 |

### Cross-cutting libraries (`libs/`)

| Crate                 | Responsibility                                                       |
|-----------------------|----------------------------------------------------------------------|
| `sequoia-common`      | Domain types, errors, IDs, pagination, result aliases.               |
| `sequoia-config`      | 12-factor config: env + file + secrets (Vault/SOPS) merge.           |
| `sequoia-telemetry`   | Tracing, OTLP exporter, metrics, structured logging.                 |
| `sequoia-auth`        | JWT verify/issue (ES256), JWKS cache, RBAC predicates, mTLS helpers. |
| `sequoia-crypto`      | XChaCha20-Poly1305, Ed25519, X25519, HKDF, KMS abstraction.          |
| `sequoia-eventbus`    | Redis Streams producer/consumer + at-least-once semantics.           |
| `sequoia-db`          | Postgres pool, migrations, transactional repository helpers.         |
| `sequoia-proto`       | All `tonic-build`-generated gRPC types.                              |

---

## 2. Architectural principles

1. **Hexagonal core, async edges.** Each service has a `domain` module
   (no I/O), `app` use-case orchestrators, `ports` traits, and `adapters` for
   inbound (Axum/Tonic) and outbound (Postgres, Redis, downstream gRPC). The
   only I/O happens in adapters; the domain is unit-testable in microseconds.

2. **Event-sourced where it pays.** Audit log, device telemetry, and workflow
   state transitions are append-only events; rollups derive read models. Other
   data (users, roles, plugins) uses CQRS-lite: writes go through commands
   that produce events and update the same row; reads hit a Redis cache.

3. **Async-first.** Every public function on hot paths returns `impl Future`;
   blocking work (crypto, WASM execution, file IO) runs on `spawn_blocking` or
   a dedicated `tokio::task::block_in_place` pool with bounded concurrency.

4. **Fault-tolerant by construction.** Every outbound call is wrapped in
   `tower::retry` with jittered exponential backoff, a `tower::timeout`, and a
   `tower::load_shed`. Circuit breakers (Hedge + LoadShed) prevent thundering
   herds.

5. **Horizontal everything.** Stateless services scale by replica count.
   Stateful state lives in Postgres + Redis cluster. Sticky session is
   replaced by Redis-backed presence + consistent-hash routing for device
   streams (the device id picks the shard).

6. **Zero-trust networking.** All east-west traffic uses mTLS via SPIFFE/SPIRE
   identities. JWTs are short-lived (15 min access), refresh tokens are
   rotating, device identities are Ed25519 keys with per-tenant CA chains.

7. **Modular, plugin-ready.** New device capabilities, AI tools, workflow
   steps, and notification channels are all just WASM plugins or in-process
   trait impls registered through a typed registry.

8. **Observable by default.** Every gRPC method emits a span with
   `service.name`, `tenant.id`, `device.id`, `correlation.id`. Logs are
   structured JSON. Metrics use OpenMetrics; SLO-grade latency histograms on
   every entry point.

---

## 3. Domain model & database schema

### 3.1 Logical schema (single Postgres cluster, per-service search_path)

Each service owns its own schema; cross-schema references go via the
**Outbox pattern** so we never read another service's tables directly.

```
auth.*           — users, roles, permissions, sessions, refresh_tokens, oidc_links
device.*         — tenants, devices, device_keys, enrollment_codes, device_groups
ai.*             — agents, runs, messages, tools, memories
realtime.*       — (mostly in Redis; only durable subscriptions persisted)
telemetry.*      — events, metrics_raw (hypertables via TimescaleDB), rollups_*
notification.*   — channels, templates, deliveries
workflow.*       — definitions, instances, steps, leases (durable task queue)
plugin.*         — bundles, installations, permissions, signatures
audit.*          — events (append-only, partitioned monthly)
public.outbox    — universal transactional outbox (per service if scaled out)
```

### 3.2 Identifiers

- **All public IDs are ULIDs** (lexicographic time-sortable, 128-bit). Stored
  as `uuid` in Postgres to leverage indexes; rendered as Crockford base32 in
  APIs. Provides natural primary-key ordering for cursor pagination.
- Internal cross-service correlation uses ULIDs in headers
  (`x-correlation-id`, `x-causation-id`).

### 3.3 Partitioning & retention

- `telemetry.metrics_raw` — TimescaleDB hypertable, 1h chunks, compressed
  after 24h, dropped after `TELEMETRY_RETENTION_DAYS`.
- `audit.events` — declarative monthly range partition; partitions older than
  13 months are detached & archived to object storage.
- `workflow.instances_terminal` — separate table for completed/failed
  workflows; nightly job moves `instances` rows there to keep hot table small.

### 3.4 Indexing strategy

- Every FK has its own index.
- Cursor pagination uses `(tenant_id, created_at DESC, id DESC)` composite
  indexes — never `OFFSET`.
- Searchable columns use `GIN` on `tsvector` for full-text, `GIN` on `jsonb`
  for tag/metadata search.
- Hot lookups use covering indexes (`INCLUDE (...)`) to enable index-only
  scans.

### 3.5 Caching strategy

- **Read-through with TTL + version invalidation.** For tenant/role/device
  records we cache in Redis with a version counter: writers increment a per-key
  version; readers check version mismatch to evict.
- **Negative caching** for "not found" (60s) prevents cache stampedes.
- **Local in-process cache** (`moka::future::Cache`) for hot, immutable lookup
  data (e.g., JWKS, tenant config) with Redis pubsub-driven invalidation.

### 3.6 Backup & DR

- Continuous WAL archival to object storage (`pgbackrest`).
- PITR target: ≤ 5 minutes.
- Cross-region async replica with managed failover; quorum-aware DNS
  switchover via service mesh.
- Encrypted at rest (LUKS / cloud KMS), in transit (TLS 1.3 only).

---

## 4. API design

### 4.1 Public REST API

Mounted at `https://api.<tenant>.sequoia.dev/v1/...` through the API Gateway.

- **Versioned in URL** (`/v1`), additive changes within a major.
- **All requests** carry: `Authorization: Bearer <JWT>`, `x-correlation-id`,
  `x-idempotency-key` (for unsafe methods).
- **Errors** use RFC 7807 `application/problem+json` with `code`, `title`,
  `detail`, `trace_id`.
- **Pagination** is cursor-based: `?cursor=...&limit=50` → response with
  `next_cursor`. No total counts (cheap, scales).
- **Filtering** via typed query params (no opaque DSL); structured filters via
  JSON body on `POST /resource:search` for complex queries.
- **Rate limiting** per-IP, per-tenant, per-user, per-route — three-layer
  governor with Redis-backed leaky bucket.
- **Idempotency** stored in Redis (24h TTL) for `POST`/`PATCH`/`DELETE`.

### 4.2 Internal gRPC

Defined in `proto/sequoia/v1/*.proto`. Conventions:

- Every service has a `Health`, `Reflection`, and primary service.
- All `Request` messages carry `RequestContext { tenant_id, actor, correlation_id }`.
- Streaming RPCs are used for: agent control plane (`AgentStream`),
  realtime fan-out (`SubscribeEvents`), device bidi (`DeviceChannel`).
- Codegen via `tonic-build` in `libs/proto/build.rs`.

### 4.3 Device wire protocol

A single bidirectional gRPC stream per device. Inside the stream we multiplex
typed messages:

```
ClientMessage = Heartbeat | Telemetry | CommandResult | FileChunk | LogBatch | PluginEvent
ServerMessage = Command   | RequestFile | InstallPlugin | UpdateConfig | Ping
```

Each message has a `seq` (monotonic per-direction), `ack` (last-seen seq
in opposite direction), and `corr_id`. Lost connection is recovered by
reusing the last ack — the server retransmits any unacked frames. This gives
us at-least-once delivery without per-message DB writes.

---

## 5. Realtime & event system

### 5.1 In-cluster event bus

**Redis Streams** as primary, with **consumer groups** per service replica.

- Stream `events.devices.{tenant}` — device lifecycle events.
- Stream `events.workflows.{tenant}` — workflow state transitions.
- Stream `events.audit` — audit log fan-in.
- Stream `presence.realtime` — connection/disconnection.

Producer uses the **transactional outbox**: write to `public.outbox` in the
same Postgres tx as the business change, a background relay pushes to Redis
and marks rows shipped. This guarantees no event is lost on crash.

For very high fan-out we add **NATS JetStream** later (the abstraction in
`sequoia-eventbus` is provider-agnostic), but Redis Streams handle ~1M
events/sec on a 6-node cluster — sufficient for most installs.

### 5.2 WebSocket gateway (`realtime-gateway`)

- Authenticates with a short-lived (`60s`) **ticket** issued by Auth Service
  — never the long-lived JWT (prevents replay via captured WS URLs).
- After upgrade, the connection subscribes to a fan-out hub keyed by
  `(tenant_id, user_id)` and any explicit `subscribe` commands.
- Heartbeat: server pings every `20s`, client must `pong` within `5s`,
  otherwise the connection is recycled.
- Backpressure: per-connection bounded `tokio::mpsc` (capacity 512); slow
  consumers are dropped with `policy_violation` instead of OOM-ing the node.
- Horizontal scale: any node can serve any user; events arrive from Redis
  Streams `XREADGROUP` and are routed via local in-memory subscription index.

### 5.3 Live device telemetry

Telemetry from device → Device Service → outbox → telemetry-service for
durable storage AND → realtime-gateway for live dashboards. The split
guarantees that even if the dashboard fan-out is overwhelmed, durable
storage is never delayed.

---

## 6. Device agents

### 6.1 Goals

One **lightweight, single-binary** Rust agent per platform that:

- Runs as a service / daemon / launchd item.
- Uses a **fixed, low memory footprint** (target < 30 MB RSS idle).
- Keeps a single long-lived **bi-di gRPC stream** to the Device Service.
- Provides **encrypted-at-rest local state** (keys, queue) using
  XChaCha20-Poly1305 with a system-keyring-derived KEK.
- Holds an **Ed25519 device identity** signed by the tenant CA at enrollment.
- Supports remote **command execution**, **file transfer (resumable chunks)**,
  **log streaming**, and **plugin execution** (WASM).
- Has a **separate update channel**: a tiny `updater` sidecar process verifies
  signatures of new agent versions, downloads, and swaps the binary atomically.
- **Auto-reconnects** with jittered exponential backoff; uses NAT keepalive
  every 15s.

### 6.2 Cross-platform packaging

| Platform | Service mechanism                   | Build target               |
|----------|-------------------------------------|----------------------------|
| Windows  | Windows Service (sc.exe) + WiX MSI  | `x86_64-pc-windows-msvc`   |
| Linux    | systemd unit + .deb / .rpm / AppImage | `x86_64-unknown-linux-musl` |
| macOS    | launchd plist + signed .pkg         | `aarch64-apple-darwin` + `x86_64-apple-darwin` (universal) |
| Android  | Foreground service (Kotlin shell) + JNI to Rust .so | `aarch64-linux-android`   |

The desktop binary (`agents/desktop`) is the same Rust code; platform-specific
hooks live behind `#[cfg(target_os = "...")]` modules. Android uses the same
core Rust as a `cdylib` invoked from a small Kotlin foreground service.

### 6.3 Enrollment & identity

1. Operator generates a one-time enrollment code (TTL 10 min) in the UI.
2. Agent reads the code, performs **Noise XX handshake** with Device Service,
   producing a session key + a CSR (Ed25519 public key + claims).
3. Device Service issues a **device certificate** signed by the per-tenant CA,
   plus a long-lived **device JWT** (rotated daily, valid 7 days).
4. Agent stores: cert, JWT, refresh secret, all encrypted with a key
   derived from the OS keyring (DPAPI / Keychain / kwallet / Android
   Keystore). No plaintext keys on disk.

### 6.4 Local hardening

- Drop privileges after startup (Linux capabilities, Windows token
  restriction, macOS sandbox profile).
- All plugin execution in WASM sandbox via wasmtime; no native plugin loading.
- All filesystem operations restricted to `$AGENT_STATE_DIR`.
- Outbound network restricted to the configured backend endpoint; refuses
  CONNECT to anything else.

---

## 7. AI orchestration layer

### 7.1 Why a separate service

LLM calls have:
- Multi-second latency (need long-running tasks, retries, partial-progress streaming).
- Large variable cost (need budgets, fallbacks, caching).
- Provider lock-in risk (need an abstraction layer).

These warrant their own service rather than embedding in any caller.

### 7.2 Components

```
ai-orchestrator
├── provider/         — Anthropic, OpenAI, Ollama, vLLM, Bedrock adapters
├── router/           — model routing (capability, cost, latency, fallback)
├── agent/            — agent runtime (planner → tools → reflection loop)
├── memory/           — short-term (session), semantic (pgvector), episodic
├── tools/            — typed tool registry (built-in + plugin-provided)
├── coordinator/      — multi-agent message bus (A2A)
├── budget/           — token & cost meters per tenant/run/agent
└── stream/           — server-streaming progress events to callers
```

### 7.3 Key design choices

- **Provider-agnostic message format.** All providers convert to/from
  `sequoia_ai::Message` enum (System / User / Assistant / Tool). Streaming
  returns `tokio::stream::Stream<Item = Delta>` from any provider.
- **Tools are typed.** Each tool declares a JSON Schema; the orchestrator
  validates LLM tool calls before dispatch. Tool execution can be local
  (Rust function), via WASM plugin, or as a workflow.
- **Memory.** Postgres + `pgvector` for semantic memory; Redis-backed
  short-term (last N messages); episodic stored as workflow runs.
- **Budgets.** Every run carries a `TokenBudget` that, when exhausted, halts
  the agent and emits a `BudgetExceeded` event.
- **Caching.** Anthropic prompt cache, OpenAI prompt cache, and our own
  semantic cache (embedding-similarity over recent system+user prompts).

### 7.4 Local vs cloud AI

A `LlmProvider` trait abstracts both. Local providers (Ollama, vLLM, llama.cpp
HTTP) are first-class — the router can prefer local for low-stakes calls
based on policy (`prefer_local: true` per tenant).

### 7.5 Multi-agent coordination

A2A bus is an internal Redis-Streams topic, with messages typed as
`AgentMessage { from_agent, to_agent, role, content, run_id }`. The
coordinator schedules execution and detects deadlocks via wait-for-graph
analysis on agent dependencies.

---

## 8. Workflow engine

A durable, retryable, idempotent task engine inspired by Temporal/Inngest but
lighter and Postgres-native.

### 8.1 Model

```
WorkflowDefinition  — versioned DAG of steps (Rust trait impls or WASM)
WorkflowInstance    — running state: variables, cursor, attempts
Step                — { id, kind, input, output, attempts, status }
Lease               — { instance_id, worker_id, expires_at }   (worker ownership)
```

### 8.2 Durability protocol

Workers pull leases via `SELECT FOR UPDATE SKIP LOCKED`, run a step, then
commit `(state, cursor, output, lease=null)` in a single Postgres tx. Crash
mid-step → lease expires → next worker picks up from the last committed
cursor. Steps must be **idempotent** (an `idempotency_key` is auto-generated
from `(instance_id, step_id, attempt)` and threaded into side-effecting APIs).

### 8.3 Triggers

- Cron (Postgres-backed scheduler with `pg_notify` waker).
- Event (subscribe to Redis Streams).
- Webhook (Gateway → workflow API).
- AI-driven (an AI agent calls `enqueue_workflow` as a tool).

### 8.4 Distributed execution

Workers register themselves in `workflow.workers` with capabilities
(`["wasm", "exec", "ai"]`). The scheduler routes by capability + load. No
single scheduler is required — every worker can claim any unleased step.

---

## 9. Plugin system

### 9.1 Why WASM

Hot-loadable, signature-verifiable, cross-platform, deterministic execution.
A bad plugin cannot panic the host, cannot exfiltrate FS/network without
declared permissions, and execution is **fuel-limited** (deterministic
instruction budget).

### 9.2 Component model

We use **WASI Preview 2 + Component Model** via wasmtime. Plugin authors
write a WIT interface; `wit-bindgen` generates SDKs in Rust/Go/TS/Python.

WIT for a device-side plugin (excerpt):

```wit
package sequoia:device@0.1.0;
interface tools {
  record context { tenant: string, device: string, run: string }
  variant exec-result {
    ok(string),
    err(string),
  }
  export run: func(ctx: context, payload: list<u8>) -> exec-result;
}
```

### 9.3 Permissions

Plugins declare requested capabilities in a manifest
(`net.outbound`, `fs.read`, `fs.write`, `device.exec`, `tenant.read`, …).
The Plugin Host enforces them via WASI capability handles — denied
capabilities are simply not granted to the instance.

### 9.4 Signatures

Plugin bundles (.wasm + manifest) are detached-signed (Ed25519). The Plugin
Host refuses to instantiate unsigned bundles. Signing keys are tenant-scoped;
the bundle registry is stored in object storage with content-addressed paths
(`sha256/<digest>.wasm`).

### 9.5 Lifecycle

Hot reload by versioned URL: the host maintains a generation counter per
plugin id. New instances pick the latest version; in-flight calls finish on
the old version, then it's dropped.

---

## 10. Security model

### 10.1 Authentication

- **Users**: OAuth2/OIDC (Google, GitHub, custom IDP) via `openidconnect` crate;
  fall back to password (Argon2id, m=64MiB t=3 p=1) + WebAuthn.
- **Devices**: Ed25519 cert + bearer device-JWT (rotated daily).
- **Services**: SPIFFE/SPIRE-issued mTLS certs (`spiffe://sequoia/ns/<svc>/sa/<svc>`).
- **Plugins**: signed bundles, runtime identity = `(tenant_id, plugin_id, version)`.

### 10.2 JWT layout

- Algorithm: **ES256** (P-256), never HS256 (no symmetric key sprawl).
- Key rotation: weekly automatic via `auth-service`; public keys published as
  JWKS at `/.well-known/jwks.json`; consumers cache via `moka` for 10 min and
  refresh on `kid` miss.
- Claims: `iss`, `aud` (service-specific), `sub`, `tid` (tenant), `act`
  (actor on behalf-of), `scope`, `iat`, `nbf`, `exp`, `jti`.
- Refresh tokens: opaque, stored hashed in Postgres, **rotating** — every use
  issues a new token + invalidates predecessor. Detected reuse = full session
  family revocation.

### 10.3 Authorization

- **RBAC** baseline: `(role) → permissions`, `(user, tenant) → role`.
- **ABAC** overlay: attribute predicates on resources (`device.group == X`,
  `time.now ∈ window`) compiled to Rust closures via a small DSL.
- Policy evaluation centralized in `sequoia-auth::Policy`; every gRPC handler
  calls `policy.check(actor, action, resource)` before any business logic.

### 10.4 Zero-trust internal

- All internal HTTP/gRPC requires mTLS.
- Every service has a per-request **trust hop log** (the JWT chain of
  `act` claims), so cross-service audit reveals the originating user.

### 10.5 Encryption

- **In transit**: TLS 1.3 only, `rustls` everywhere (no OpenSSL).
- **At rest**: cloud KMS or local Vault for KEKs; XChaCha20-Poly1305 for
  envelope encryption of secret blobs in Postgres (e.g., OAuth tokens).
- **Device storage**: XChaCha20-Poly1305 with KEK derived from OS keyring.

### 10.6 Secrets

- Production: HashiCorp Vault (`vaultrs` client) with dynamic DB credentials.
- Dev: SOPS-encrypted yaml committed to repo.
- Never: plaintext env files in production deployments.

### 10.7 Rate limiting & DDoS

- Per-IP token bucket at the gateway (governor + Redis-backed sync).
- Per-tenant + per-user quotas (`X-Quota-Remaining` headers).
- TLS fingerprint heuristics flag known scanner JA4 hashes.
- WAF layer (Cloudflare/Caddy plug-in) for L7 patterns.
- Auto-shed: gateway sheds load before backends saturate (`tower::load_shed`).

### 10.8 Audit log

Append-only `audit.events` partitioned monthly. Every privileged action emits
a row: `(time, actor, tenant, action, resource, before, after, source_ip,
trace_id)`. Records are batch-shipped to object storage hourly for tamper
evidence (Merkle root signed and notarized).

---

## 11. Observability stack

### 11.1 Tracing

OpenTelemetry SDK → OTLP/gRPC → collector → backend (Tempo / Jaeger / Honeycomb).

- W3C `traceparent` propagation everywhere.
- Spans for every gRPC method, DB query, Redis call, external HTTP request.
- Sampling: head-based 10% for routine, 100% for errors + critical paths
  (auth, payment-equivalent).

### 11.2 Metrics

OpenMetrics format scraped by Prometheus, or pushed via OTLP.

- Standard RED (rate, error, duration) per gRPC method.
- USE for system resources.
- Custom KPIs: `sequoia_active_devices`, `sequoia_workflow_inflight`,
  `sequoia_ai_tokens_consumed_total{provider, tenant}`,
  `sequoia_ws_connections{node}`.

### 11.3 Logs

Structured JSON via `tracing-subscriber`. Always include
`trace_id`, `tenant_id`, `service`. Shipped to Loki/Elastic.

### 11.4 Health checks

- `/healthz/live` — process alive (cheap).
- `/healthz/ready` — dependencies reachable (Postgres, Redis, downstream).
- `/healthz/startup` — initial migration / cache warm complete.
- gRPC standard `grpc.health.v1.Health` exposed for service mesh.

### 11.5 SLOs

| SLI                                    | SLO                |
|----------------------------------------|--------------------|
| Gateway p99 latency (read)             | < 150 ms           |
| Gateway p99 latency (write)            | < 400 ms           |
| Device stream availability             | 99.95%             |
| WS delivery latency p99 (e2e)          | < 250 ms           |
| Workflow step success rate (24h)       | > 99.5%            |
| Auth issue/verify error rate           | < 0.01%            |

Error budgets enforced via burn-rate alerts at multi-window multi-burn-rate
thresholds (Google SRE workbook).

---

## 12. Deployment

### 12.1 Local dev

`docker compose -f deploy/docker/docker-compose.yml up` brings up:

- Postgres 16 + TimescaleDB
- Redis 7 (cluster mode for parity)
- OTLP collector + Jaeger + Prometheus + Grafana
- MinIO (S3-compatible)
- (Optional) Ollama for local LLM
- (Optional) Vault dev mode

Services run with `cargo watch -x 'run -p sequoia-<svc>'` against the stack.

### 12.2 Container images

- Multi-stage Dockerfiles per service: `cargo chef` for dep caching, final
  stage is `gcr.io/distroless/cc-debian12` (or `scratch` for statically
  linked musl builds).
- Images < 50 MB.
- Healthcheck baked in via gRPC health-probe.

### 12.3 Kubernetes

- **Helm chart** (`deploy/helm/sequoia`) parameterizes replica counts,
  resources, secrets refs (External Secrets Operator), node selectors.
- **Service mesh**: Linkerd or Istio for mTLS, retries, traffic split.
- **HPA**: CPU + RPS-based, with PodDisruptionBudgets to guarantee min
  replicas during rolling updates.
- **Argo CD** for GitOps; `kustomize` overlays per environment.
- **Operator-managed** Postgres (CloudNativePG) and Redis (Redis Operator).

### 12.4 IaC

- Terraform modules for cloud infra (`deploy/iac/` to be added).
- Crossplane compositions optional for cluster-internal infra.

---

## 13. Scaling strategy

### 13.1 Stateless services

Scale by replica count. Each is bounded by:
- CPU on JWT verification, JSON serialization.
- Memory by per-connection buffers (realtime-gateway).

### 13.2 Postgres

- **Stage 1** (single cluster): vertical scaling + read replicas; partition
  hot tables.
- **Stage 2** (per-service DB): split schemas to dedicated clusters once one
  service dominates write QPS.
- **Stage 3** (sharded): per-tenant sharding via Citus, with the API Gateway
  routing by `tenant_id` to the correct shard.

### 13.3 Redis

- Stage 1: single Redis with replicas.
- Stage 2: Redis Cluster (6-node minimum) for horizontal throughput.
- Heavy event volume → switch eventbus to NATS JetStream (the trait
  abstraction makes this a configuration change).

### 13.4 Realtime

- Each `realtime-gateway` node holds ~50k connections comfortably on commodity
  hardware (200k with kernel tuning + io_uring). Scale by adding nodes;
  presence is in Redis so any node can locate any user.

### 13.5 Device fan-in

- Each `device-service` node holds ~50k concurrent bi-di streams. Consistent
  hashing on `device_id` routes a device to a deterministic shard; failover is
  re-hashing on join/leave with `JUMP_HASH` to minimize churn.

### 13.6 AI orchestrator

- LLM provider calls are I/O bound — many thousands of concurrent calls per
  node fine. Bottleneck is upstream provider quota; budget service shapes
  load.

---

## 14. Resilience patterns

- **Retries**: exponential backoff with full jitter, capped attempts (3 by
  default), bypassed for non-idempotent calls without idempotency keys.
- **Circuit breakers**: per upstream + per method, half-open probing.
- **Bulkheads**: separate Tokio runtimes / semaphores per critical
  subsystem (e.g., DB pool, LLM pool, WASM pool) to prevent noisy-neighbor
  starvation.
- **Hedged requests**: for read-only RPCs with multiple replicas.
- **Graceful shutdown**: SIGTERM → stop accepting new requests → drain
  in-flight (configurable grace) → exit. Health gates so the orchestrator
  removes the pod from load before draining.
- **Outbox** ensures no event is lost on crash.

---

## 15. Folder structure (initial)

```
sequoia/
├── Cargo.toml                       # workspace
├── rust-toolchain.toml
├── Makefile
├── ARCHITECTURE.md                  # this document
├── README.md
├── .env.example
├── .gitignore
│
├── libs/                            # shared crates
│   ├── common/                      # types, errors, IDs, pagination
│   ├── config/                      # 12-factor config
│   ├── telemetry/                   # tracing, metrics, OTLP
│   ├── auth/                        # JWT, RBAC, JWKS
│   ├── crypto/                      # symmetric + asymmetric prims
│   ├── eventbus/                    # Redis Streams abstraction
│   ├── db/                          # Postgres pool + repository helpers
│   └── proto/                       # gRPC generated bindings
│
├── crates/                          # services
│   ├── api-gateway/
│   ├── auth-service/
│   ├── device-service/
│   ├── ai-orchestrator/
│   ├── realtime-gateway/
│   ├── telemetry-service/
│   ├── notification-service/
│   ├── workflow-engine/
│   ├── plugin-host/
│   └── command-executor/
│
├── agents/                          # device agents
│   ├── common/                      # shared agent logic
│   ├── desktop/                     # windows + linux + macos single binary
│   └── android/                     # JNI shell (Kotlin)
│
├── plugin-sdk/                      # WIT + Rust helpers for plugin authors
│
├── proto/                           # .proto sources
│
├── migrations/                      # sqlx migrations, one folder per service
│   ├── auth/  device/  ai/  ...
│
├── deploy/
│   ├── docker/                      # docker-compose + Dockerfiles
│   ├── k8s/                         # raw manifests
│   └── helm/sequoia/                # production helm chart
│
├── docs/
│   ├── api/                         # OpenAPI specs
│   └── runbooks/                    # oncall playbooks
│
├── scripts/                         # ops scripts
└── .github/workflows/               # CI/CD
```

---

## 16. CI/CD

- **PR checks**: `cargo fmt --check`, `cargo clippy -D warnings`,
  `cargo nextest`, `cargo audit`, `cargo deny`, container build + Trivy scan.
- **Main branch**: build & push images to registry (signed via cosign),
  open Argo CD PR to update `apps/staging`.
- **Promotion**: tagging `v*` triggers production deploy after gate
  (Argo Rollouts canary 10% → 50% → 100%, automated rollback on SLO burn).

---

## 17. Future-proof 2026 design patterns applied

1. **Zero-trust by default** (SPIFFE identities, mTLS).
2. **WASI Preview 2 Component Model** for plugins — write-once, run-anywhere
   sandboxed extensions.
3. **OpenTelemetry-native** (no separate APM SDK, no Prometheus client
   sprawl — OpenMetrics via OTLP push).
4. **Cursor pagination + ULIDs** (no offset, no UUID v4 random churn on
   indexes).
5. **Event-sourced audit + outbox** for exactly-once business semantics.
6. **Multi-agent AI runtime** with typed tool registry — future-proof for
   2026's autonomous agent workloads.
7. **Pluggable LLM provider** insulating against vendor lock.
8. **Hexagonal services** that swap adapters without touching domain.
9. **gRPC + Component Model** as the lingua franca for east-west traffic.
10. **GitOps deploys** via Argo CD + Argo Rollouts canary.

---

## 18. Open decisions / next iterations

| Topic                  | Default                | Alternative                         |
|------------------------|------------------------|-------------------------------------|
| Event bus              | Redis Streams          | NATS JetStream once > 1M events/s   |
| Service mesh           | Linkerd                | Istio if Wasm filters needed        |
| Vector DB              | pgvector               | Qdrant for > 100M vectors           |
| Workflow worker tier   | In-cluster Rust pods   | DRO-style Temporal for cross-region |
| Secrets                | Vault                  | KMS-only + SOPS for low-tier        |
| Object storage         | MinIO (self-host)      | S3 in cloud                         |

---

## 19. Glossary

- **Tenant** — the top-level isolation unit (a customer / org).
- **Actor** — the authenticated principal (user / device / service).
- **Outbox** — Postgres pattern that turns local-tx events into reliable
  cross-service deliveries.
- **WIT** — Wasm Interface Type, contract language for component-model
  WASM modules.
- **SPIFFE** — workload identity standard; SPIRE is the reference
  implementation.
