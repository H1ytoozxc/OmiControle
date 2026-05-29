CREATE SCHEMA IF NOT EXISTS device;

CREATE TABLE device.devices (
    id              uuid PRIMARY KEY,
    tenant_id       uuid        NOT NULL,
    name            text        NOT NULL,
    platform        text        NOT NULL CHECK (platform IN ('windows','linux','macos','android')),
    agent_version   text        NOT NULL,
    public_key      bytea       NOT NULL,                   -- Ed25519 raw 32 bytes
    status          text        NOT NULL DEFAULT 'offline'  -- online | offline | unreachable
                    CHECK (status IN ('online','offline','unreachable')),
    labels          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    enrolled_at     timestamptz NOT NULL DEFAULT now(),
    last_seen_at    timestamptz,
    deleted_at      timestamptz
);
CREATE INDEX idx_devices_tenant_status ON device.devices (tenant_id, status);
CREATE INDEX idx_devices_last_seen     ON device.devices (last_seen_at DESC);
CREATE INDEX idx_devices_labels_gin    ON device.devices USING GIN (labels);

CREATE TABLE device.enrollment_codes (
    code            text PRIMARY KEY,
    tenant_id       uuid        NOT NULL,
    issued_by_user  uuid        NOT NULL,
    expires_at      timestamptz NOT NULL,
    consumed_at     timestamptz,
    labels          jsonb       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_enrollment_active ON device.enrollment_codes (tenant_id)
    WHERE consumed_at IS NULL;

CREATE TABLE device.device_keys (
    device_id      uuid PRIMARY KEY REFERENCES device.devices(id) ON DELETE CASCADE,
    certificate    bytea       NOT NULL,
    issued_at      timestamptz NOT NULL DEFAULT now(),
    expires_at     timestamptz NOT NULL,
    revoked_at     timestamptz
);

CREATE TABLE device.device_groups (
    id         uuid PRIMARY KEY,
    tenant_id  uuid        NOT NULL,
    name       text        NOT NULL,
    selector   jsonb       NOT NULL,            -- ABAC predicate over device labels
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);
