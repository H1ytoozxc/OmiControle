CREATE SCHEMA IF NOT EXISTS telemetry;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Raw metric points. Hypertable, 1h chunks, compressed after 24h.
CREATE TABLE telemetry.metrics_raw (
    ts          timestamptz NOT NULL,
    tenant_id   uuid        NOT NULL,
    device_id   uuid        NOT NULL,
    metric      text        NOT NULL,
    value       double precision NOT NULL,
    labels      jsonb       NOT NULL DEFAULT '{}'::jsonb
);
SELECT create_hypertable('telemetry.metrics_raw', 'ts', chunk_time_interval => INTERVAL '1 hour');
ALTER TABLE telemetry.metrics_raw SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'tenant_id, device_id, metric',
    timescaledb.compress_orderby = 'ts DESC'
);
SELECT add_compression_policy('telemetry.metrics_raw', INTERVAL '24 hours');
SELECT add_retention_policy('telemetry.metrics_raw', INTERVAL '30 days');

CREATE INDEX idx_metrics_tenant_metric_ts
    ON telemetry.metrics_raw (tenant_id, metric, ts DESC);
CREATE INDEX idx_metrics_device_ts
    ON telemetry.metrics_raw (device_id, ts DESC);

-- 1-minute continuous aggregate.
CREATE MATERIALIZED VIEW telemetry.metrics_1m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', ts) AS bucket,
    tenant_id, device_id, metric,
    avg(value) AS avg,
    max(value) AS max,
    min(value) AS min,
    count(*)   AS n
FROM telemetry.metrics_raw
GROUP BY 1, 2, 3, 4;
SELECT add_continuous_aggregate_policy(
    'telemetry.metrics_1m',
    start_offset => INTERVAL '2 hours',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

-- Generic durable event log (used for non-metric structured events).
CREATE TABLE telemetry.events (
    id          uuid PRIMARY KEY,
    ts          timestamptz NOT NULL,
    tenant_id   uuid        NOT NULL,
    source      text        NOT NULL,
    kind        text        NOT NULL,
    payload     jsonb       NOT NULL,
    correlation_id text
);
SELECT create_hypertable('telemetry.events', 'ts', chunk_time_interval => INTERVAL '1 day');
CREATE INDEX idx_events_tenant_kind_ts ON telemetry.events (tenant_id, kind, ts DESC);
