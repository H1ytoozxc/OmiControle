//! TimescaleDB-aware metric queries: time_bucket + aggregator.

use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct DataPoint { pub ts: OffsetDateTime, pub value: f64 }

pub async fn query_metric(
    pool: &PgPool,
    tenant: Uuid,
    metric: &str,
    from: OffsetDateTime,
    to: OffsetDateTime,
    step_seconds: i32,
    agg: &str,
) -> sqlx::Result<Vec<DataPoint>> {
    let agg_sql = match agg {
        "sum" => "sum(value)",
        "avg" => "avg(value)",
        "min" => "min(value)",
        "max" => "max(value)",
        "p50" => "percentile_disc(0.5) WITHIN GROUP (ORDER BY value)",
        "p95" => "percentile_disc(0.95) WITHIN GROUP (ORDER BY value)",
        "p99" => "percentile_disc(0.99) WITHIN GROUP (ORDER BY value)",
        _ => "avg(value)",
    };
    let sql = format!(
        "SELECT time_bucket(make_interval(secs => $1), ts) AS bucket, {agg_sql} AS v \
         FROM telemetry.metrics_raw \
         WHERE tenant_id = $2 AND metric = $3 AND ts BETWEEN $4 AND $5 \
         GROUP BY bucket ORDER BY bucket"
    );
    let rows = sqlx::query_as::<_, (OffsetDateTime, f64)>(&sql)
        .bind(step_seconds).bind(tenant).bind(metric).bind(from).bind(to)
        .fetch_all(pool).await?;
    Ok(rows.into_iter().map(|(ts, value)| DataPoint { ts, value }).collect())
}
