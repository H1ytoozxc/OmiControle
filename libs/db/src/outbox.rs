//! Transactional outbox.
//!
//! Pattern:
//!   1. Application code inserts into `public.outbox` in the SAME tx as the
//!      business mutation.
//!   2. A background relay (in the service binary) `SELECT ... FOR UPDATE
//!      SKIP LOCKED LIMIT 256`, publishes to the event bus, then marks rows
//!      as shipped.
//!   3. Crash-safe: rows survive process restart; duplicate publish on retry
//!      is fine because consumers dedupe on `Envelope::id`.

use serde::{Deserialize, Serialize};
use sqlx::PgExecutor;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutboxRow {
    pub id: Uuid,
    pub topic: String,
    pub envelope: serde_json::Value,
    pub created_at: OffsetDateTime,
    pub published_at: Option<OffsetDateTime>,
}

/// Enqueue an envelope inside an existing transaction.
///
/// `executor` should be a `&mut Transaction<'_, Postgres>` — the caller's
/// business mutations and this insert commit together or not at all.
pub async fn enqueue<'e, E>(executor: E, topic: &str, envelope: &serde_json::Value) -> Result<Uuid, sqlx::Error>
where
    E: PgExecutor<'e>,
{
    let id = Uuid::from_u128(ulid::Ulid::new().0);
    sqlx::query(
        r#"
        INSERT INTO public.outbox (id, topic, envelope, created_at)
        VALUES ($1, $2, $3, now())
        "#,
    )
    .bind(id)
    .bind(topic)
    .bind(envelope)
    .execute(executor)
    .await?;
    Ok(id)
}

/// Claim a batch of pending rows for publishing. Caller publishes and then
/// calls `mark_shipped` with the returned ids.
pub async fn claim_batch(pool: &sqlx::PgPool, limit: i64) -> Result<Vec<OutboxRow>, sqlx::Error> {
    let rows = sqlx::query_as::<_, OutboxRow>(
        r#"
        WITH cte AS (
            SELECT id FROM public.outbox
            WHERE published_at IS NULL
            ORDER BY created_at
            FOR UPDATE SKIP LOCKED
            LIMIT $1
        )
        UPDATE public.outbox o
        SET published_at = NULL  -- claim marker stays NULL; we only lock
        FROM cte
        WHERE o.id = cte.id
        RETURNING o.id, o.topic, o.envelope, o.created_at, o.published_at
        "#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn mark_shipped(pool: &sqlx::PgPool, ids: &[Uuid]) -> Result<(), sqlx::Error> {
    if ids.is_empty() { return Ok(()); }
    sqlx::query(
        r#"
        UPDATE public.outbox
        SET published_at = now()
        WHERE id = ANY($1)
        "#,
    )
    .bind(ids)
    .execute(pool)
    .await?;
    Ok(())
}

// sqlx::FromRow impl for OutboxRow
impl<'r> sqlx::FromRow<'r, sqlx::postgres::PgRow> for OutboxRow {
    fn from_row(row: &'r sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        use sqlx::Row;
        Ok(Self {
            id: row.try_get("id")?,
            topic: row.try_get("topic")?,
            envelope: row.try_get("envelope")?,
            created_at: row.try_get("created_at")?,
            published_at: row.try_get("published_at")?,
        })
    }
}
