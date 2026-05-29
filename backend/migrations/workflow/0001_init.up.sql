CREATE SCHEMA IF NOT EXISTS workflow;

CREATE TABLE workflow.definitions (
    id         uuid PRIMARY KEY,
    tenant_id  uuid        NOT NULL,
    name       text        NOT NULL,
    version    int         NOT NULL,
    spec       jsonb       NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name, version)
);

CREATE TABLE workflow.instances (
    id              uuid PRIMARY KEY,
    tenant_id       uuid        NOT NULL,
    definition_id   uuid        NOT NULL REFERENCES workflow.definitions(id),
    status          text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','succeeded','failed','cancelled')),
    cursor          text        NOT NULL DEFAULT '',
    variables       jsonb       NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key text,
    started_by      text        NOT NULL,
    started_at      timestamptz NOT NULL DEFAULT now(),
    ended_at        timestamptz,
    error           text,
    UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX idx_instances_tenant_status_started
    ON workflow.instances (tenant_id, status, started_at DESC);

CREATE TABLE workflow.steps (
    id            uuid PRIMARY KEY,
    instance_id   uuid        NOT NULL REFERENCES workflow.instances(id) ON DELETE CASCADE,
    step_id       text        NOT NULL,         -- application-defined id from spec
    attempt       int         NOT NULL DEFAULT 0,
    status        text        NOT NULL CHECK (status IN ('pending','running','succeeded','failed','skipped')),
    input         jsonb,
    output        jsonb,
    error         text,
    started_at    timestamptz,
    ended_at      timestamptz,
    next_run_at   timestamptz,
    UNIQUE (instance_id, step_id, attempt)
);

CREATE TABLE workflow.leases (
    instance_id  uuid PRIMARY KEY REFERENCES workflow.instances(id) ON DELETE CASCADE,
    worker_id    text        NOT NULL,
    leased_at    timestamptz NOT NULL DEFAULT now(),
    expires_at   timestamptz NOT NULL
);
CREATE INDEX idx_leases_expiring ON workflow.leases (expires_at);

-- Cron-driven triggers, woken by NOTIFY from a small scheduler tick worker.
CREATE TABLE workflow.schedules (
    id            uuid PRIMARY KEY,
    tenant_id     uuid        NOT NULL,
    definition_id uuid        NOT NULL REFERENCES workflow.definitions(id),
    cron          text        NOT NULL,
    variables     jsonb       NOT NULL DEFAULT '{}'::jsonb,
    next_fire_at  timestamptz NOT NULL,
    enabled       boolean     NOT NULL DEFAULT true
);
CREATE INDEX idx_schedules_next_fire ON workflow.schedules (next_fire_at) WHERE enabled;
