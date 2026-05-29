-- Auth schema: users, sessions, refresh tokens, OIDC linkage, roles, permissions.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS auth;

-- Tenants live here so the auth service can resolve them without cross-schema joins.
CREATE TABLE auth.tenants (
    id           uuid PRIMARY KEY,
    name         text        NOT NULL,
    slug         text        NOT NULL UNIQUE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    settings     jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE auth.users (
    id              uuid PRIMARY KEY,
    tenant_id       uuid        NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
    email           citext      NOT NULL,
    -- Argon2id hash; NULL when the user authenticates exclusively via OIDC.
    password_hash   text,
    display_name    text,
    status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','locked')),
    mfa_enabled     boolean     NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    last_login_at   timestamptz,
    UNIQUE (tenant_id, email)
);
CREATE INDEX idx_users_tenant_status ON auth.users (tenant_id, status);

CREATE TABLE auth.roles (
    id          uuid PRIMARY KEY,
    tenant_id   uuid        NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
    name        text        NOT NULL,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE auth.permissions (
    id          text PRIMARY KEY,                  -- e.g. "devices.read"
    description text NOT NULL
);

CREATE TABLE auth.role_permissions (
    role_id        uuid REFERENCES auth.roles(id)        ON DELETE CASCADE,
    permission_id  text REFERENCES auth.permissions(id)  ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE auth.user_roles (
    user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id    uuid REFERENCES auth.roles(id) ON DELETE CASCADE,
    granted_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE auth.sessions (
    id           uuid PRIMARY KEY,
    user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id    uuid        NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
    user_agent   text,
    client_ip    inet,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    revoked_at   timestamptz
);
CREATE INDEX idx_sessions_user_active ON auth.sessions (user_id) WHERE revoked_at IS NULL;

-- Refresh tokens are stored as SHA-256 hashes; the plaintext is opaque and
-- never persisted. Rotation: each use issues a new row, links to parent,
-- old row marked revoked. Reuse of the old token detects theft.
CREATE TABLE auth.refresh_tokens (
    id              uuid PRIMARY KEY,
    session_id      uuid        NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
    parent_id       uuid REFERENCES auth.refresh_tokens(id),
    token_sha256    bytea       NOT NULL UNIQUE,
    expires_at      timestamptz NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    revoked_at      timestamptz,
    revoked_reason  text
);
CREATE INDEX idx_refresh_session_active ON auth.refresh_tokens (session_id) WHERE revoked_at IS NULL;

CREATE TABLE auth.oidc_links (
    id           uuid PRIMARY KEY,
    user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider     text        NOT NULL,
    subject      text        NOT NULL,
    email        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, subject)
);

CREATE TABLE auth.signing_keys (
    kid           text PRIMARY KEY,
    algorithm     text        NOT NULL DEFAULT 'ES256',
    public_key    bytea       NOT NULL,
    private_key_kms_ref text  NOT NULL,
    activated_at  timestamptz NOT NULL DEFAULT now(),
    rotated_out_at timestamptz
);

-- Universal outbox shared by all services that write events transactionally.
CREATE TABLE IF NOT EXISTS public.outbox (
    id            uuid PRIMARY KEY,
    topic         text        NOT NULL,
    envelope      jsonb       NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    published_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_outbox_unpublished
    ON public.outbox (created_at)
    WHERE published_at IS NULL;
