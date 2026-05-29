-- Add bio field to users for profile page.
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS bio text;

-- Service tokens table (used by settings page "Issue token" feature).
CREATE TABLE auth.service_tokens (
    id           uuid PRIMARY KEY,
    tenant_id    uuid        NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
    created_by   uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
    name         text        NOT NULL,
    token_sha256 bytea       NOT NULL UNIQUE,
    -- Prefix shown in the UI so users can identify the token without the secret.
    prefix       text        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    revoked_at   timestamptz
);
CREATE INDEX idx_service_tokens_tenant ON auth.service_tokens (tenant_id) WHERE revoked_at IS NULL;
