CREATE SCHEMA IF NOT EXISTS notification;

CREATE TABLE notification.channels (
    id          uuid PRIMARY KEY,
    tenant_id   uuid        NOT NULL,
    kind        text        NOT NULL CHECK (kind IN ('push','email','webhook','sms')),
    name        text        NOT NULL,
    config_enc  bytea       NOT NULL,                 -- envelope-encrypted via KMS
    enabled     boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE notification.templates (
    id          text PRIMARY KEY,
    tenant_id   uuid        NOT NULL,
    name        text        NOT NULL,
    subject     text,
    body        text        NOT NULL,
    format      text        NOT NULL DEFAULT 'text/plain',
    UNIQUE (tenant_id, name)
);

CREATE TABLE notification.deliveries (
    id           uuid PRIMARY KEY,
    tenant_id    uuid        NOT NULL,
    template_id  text        NOT NULL REFERENCES notification.templates(id),
    channel_id   uuid        NOT NULL REFERENCES notification.channels(id),
    recipient    text        NOT NULL,
    status       text        NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued','sending','delivered','failed','bounced')),
    attempts     int         NOT NULL DEFAULT 0,
    next_attempt timestamptz,
    last_error   text,
    sent_at      timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliveries_pending ON notification.deliveries (next_attempt)
    WHERE status IN ('queued','sending');
