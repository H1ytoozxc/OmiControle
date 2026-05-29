CREATE SCHEMA IF NOT EXISTS ai;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ai.agents (
    id            uuid PRIMARY KEY,
    tenant_id     uuid        NOT NULL,
    name          text        NOT NULL,
    model         text        NOT NULL,
    system_prompt text        NOT NULL,
    tool_ids      text[]      NOT NULL DEFAULT '{}',
    created_at    timestamptz NOT NULL DEFAULT now(),
    archived_at   timestamptz,
    UNIQUE (tenant_id, name)
);

CREATE TABLE ai.runs (
    id             uuid PRIMARY KEY,
    tenant_id      uuid        NOT NULL,
    agent_id       uuid        NOT NULL REFERENCES ai.agents(id) ON DELETE CASCADE,
    status         text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','running','succeeded','failed','cancelled')),
    started_by     uuid        NOT NULL,
    started_at     timestamptz NOT NULL DEFAULT now(),
    ended_at       timestamptz,
    input_tokens   bigint      NOT NULL DEFAULT 0,
    output_tokens  bigint      NOT NULL DEFAULT 0,
    cost_usd_micro bigint      NOT NULL DEFAULT 0,
    error          text
);
CREATE INDEX idx_runs_tenant_started ON ai.runs (tenant_id, started_at DESC);
CREATE INDEX idx_runs_agent_started  ON ai.runs (agent_id, started_at DESC);

CREATE TABLE ai.messages (
    id            uuid PRIMARY KEY,
    run_id        uuid        NOT NULL REFERENCES ai.runs(id) ON DELETE CASCADE,
    role          text        NOT NULL CHECK (role IN ('system','user','assistant','tool')),
    content       text,
    tool_calls    jsonb,
    tool_call_id  text,
    seq           int         NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (run_id, seq)
);

CREATE TABLE ai.tools (
    id           text PRIMARY KEY,
    tenant_id    uuid,                          -- NULL for built-in
    name         text        NOT NULL,
    description  text        NOT NULL,
    json_schema  jsonb       NOT NULL,
    impl_kind    text        NOT NULL CHECK (impl_kind IN ('native','wasm','workflow','http')),
    impl_ref     text        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Semantic memory: chunks + embeddings (pgvector, 1536-dim for default model).
CREATE TABLE ai.memories (
    id           uuid PRIMARY KEY,
    tenant_id    uuid        NOT NULL,
    agent_id     uuid REFERENCES ai.agents(id) ON DELETE CASCADE,
    kind         text        NOT NULL,          -- "fact" | "episode" | "skill"
    content      text        NOT NULL,
    embedding    vector(1536) NOT NULL,
    metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_memories_embedding
    ON ai.memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memories_tenant_kind ON ai.memories (tenant_id, kind);
