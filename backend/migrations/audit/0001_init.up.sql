CREATE SCHEMA IF NOT EXISTS audit;

-- Append-only; partitioned monthly. Older partitions are detached & archived.
CREATE TABLE audit.events (
    id           uuid        NOT NULL,
    ts           timestamptz NOT NULL,
    tenant_id    uuid        NOT NULL,
    actor_kind   text        NOT NULL,
    actor_id     text        NOT NULL,
    action       text        NOT NULL,
    resource     text        NOT NULL,
    before       jsonb,
    after        jsonb,
    source_ip    inet,
    trace_id     text,
    PRIMARY KEY (ts, id)
) PARTITION BY RANGE (ts);

-- Seed the current + next two months. Production has a monthly maintenance job
-- that adds new partitions and detaches/archives old ones.
DO $$
DECLARE base date := date_trunc('month', now())::date;
DECLARE i int;
BEGIN
  FOR i IN 0..2 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS audit.events_%s PARTITION OF audit.events
       FOR VALUES FROM (%L) TO (%L);',
      to_char(base + (i || ' month')::interval, 'YYYY_MM'),
      (base + (i || ' month')::interval),
      (base + ((i+1) || ' month')::interval)
    );
  END LOOP;
END$$;

CREATE INDEX IF NOT EXISTS idx_audit_tenant_action_ts
    ON audit.events (tenant_id, action, ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_ts
    ON audit.events (actor_kind, actor_id, ts DESC);
