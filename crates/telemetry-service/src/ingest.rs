//! Batch insertion into `telemetry.metrics_raw` using COPY for high throughput.

use sqlx::PgPool;

pub async fn insert_batch(
    pool: &PgPool,
    rows: &[(time::OffsetDateTime, uuid::Uuid, uuid::Uuid, &str, f64, serde_json::Value)],
) -> sqlx::Result<u64> {
    if rows.is_empty() { return Ok(0); }
    // For maximum throughput, production uses sqlx::PgConnection::copy_in_raw
    // with binary COPY format. For clarity we use an UNNEST batch here.
    let mut ts = Vec::with_capacity(rows.len());
    let mut tn = Vec::with_capacity(rows.len());
    let mut dv = Vec::with_capacity(rows.len());
    let mut mt = Vec::with_capacity(rows.len());
    let mut vl = Vec::with_capacity(rows.len());
    let mut lb = Vec::with_capacity(rows.len());
    for r in rows {
        ts.push(r.0); tn.push(r.1); dv.push(r.2); mt.push(r.3.to_owned()); vl.push(r.4); lb.push(r.5.clone());
    }
    let result = sqlx::query(
        r#"INSERT INTO telemetry.metrics_raw (ts, tenant_id, device_id, metric, value, labels)
           SELECT * FROM UNNEST($1::timestamptz[], $2::uuid[], $3::uuid[], $4::text[], $5::float8[], $6::jsonb[])"#,
    )
    .bind(&ts).bind(&tn).bind(&dv).bind(&mt).bind(&vl).bind(&lb)
    .execute(pool).await?;
    Ok(result.rows_affected())
}
