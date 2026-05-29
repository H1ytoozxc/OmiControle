CREATE SCHEMA IF NOT EXISTS telemetry;

-- timescaledb is optional (not available on plain postgres in dev).
-- Tables degrade gracefully to regular postgres tables without it.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'timescaledb not available — metrics_raw will be a plain table';
END;
$$;

-- Raw metric points. Hypertable if timescaledb present, plain table otherwise.
CREATE TABLE telemetry.metrics_raw (
    ts          timestamptz NOT NULL,
    tenant_id   uuid        NOT NULL,
    device_id   uuid        NOT NULL,
    metric      text        NOT NULL,
    value       double precision NOT NULL,
    labels      jsonb       NOT NULL DEFAULT '{}'::jsonb
);

DO $$
BEGIN
  PERFORM create_hypertable('telemetry.metrics_raw', 'ts',
      chunk_time_interval => INTERVAL '1 hour');
  ALTER TABLE telemetry.metrics_raw SET (
      timescaledb.compress,
      timescaledb.compress_segmentby = 'tenant_id, device_id, metric',
      timescaledb.compress_orderby = 'ts DESC'
  );
  PERFORM add_compression_policy('telemetry.metrics_raw', INTERVAL '24 hours');
  PERFORM add_retention_policy('telemetry.metrics_raw', INTERVAL '30 days');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'timescaledb hypertable skipped for metrics_raw';
END;
$$;

CREATE INDEX idx_metrics_tenant_metric_ts
    ON telemetry.metrics_raw (tenant_id, metric, ts DESC);
CREATE INDEX idx_metrics_device_ts
    ON telemetry.metrics_raw (device_id, ts DESC);

-- Generic durable event log.
CREATE TABLE telemetry.events (
    id          uuid PRIMARY KEY,
    ts          timestamptz NOT NULL,
    tenant_id   uuid        NOT NULL,
    source      text        NOT NULL,
    kind        text        NOT NULL,
    payload     jsonb       NOT NULL,
    correlation_id text
);

DO $$
BEGIN
  PERFORM create_hypertable('telemetry.events', 'ts',
      chunk_time_interval => INTERVAL '1 day');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'timescaledb hypertable skipped for events';
END;
$$;

CREATE INDEX idx_events_tenant_kind_ts ON telemetry.events (tenant_id, kind, ts DESC);
