CREATE SCHEMA IF NOT EXISTS plugin;

CREATE TABLE plugin.bundles (
    id           uuid PRIMARY KEY,
    name         text        NOT NULL,
    version      text        NOT NULL,
    sha256       bytea       NOT NULL UNIQUE,
    signature    bytea       NOT NULL,
    signer_kid   text        NOT NULL,
    manifest     jsonb       NOT NULL,
    object_url   text        NOT NULL,           -- s3://… or file://…
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (name, version)
);

CREATE TABLE plugin.installations (
    id           uuid PRIMARY KEY,
    tenant_id    uuid        NOT NULL,
    bundle_id    uuid        NOT NULL REFERENCES plugin.bundles(id),
    status       text        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','active','failed','disabled')),
    permissions  jsonb       NOT NULL DEFAULT '[]'::jsonb,    -- granted capabilities
    config       jsonb       NOT NULL DEFAULT '{}'::jsonb,
    installed_at timestamptz NOT NULL DEFAULT now(),
    uninstalled_at timestamptz
);
CREATE INDEX idx_installations_tenant_active
    ON plugin.installations (tenant_id) WHERE status = 'active';
