//! Per-binary telemetry initialization.
//!
//! Call `init(TelemetryConfig { service_name, ... })` early in `main`
//! (before any spawned task). Returns a `TelemetryGuard`; drop it on shutdown
//! to flush exporters cleanly.

use opentelemetry::trace::TracerProvider as _;
use opentelemetry::KeyValue;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::propagation::TraceContextPropagator;
use opentelemetry_sdk::trace::{TracerProvider, Sampler};
use opentelemetry_sdk::Resource;
use serde::Deserialize;
use thiserror::Error;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::EnvFilter;

#[derive(Debug, Error)]
pub enum TelemetryError {
    #[error("init: {0}")]
    Init(String),
}

#[derive(Debug, Clone, Deserialize)]
pub struct TelemetryConfig {
    pub service_name: String,
    #[serde(default = "default_namespace")]
    pub service_namespace: String,
    #[serde(default)]
    pub otlp_endpoint: Option<String>,
    /// Head-sampling fraction for non-error traces. 1.0 = always sample.
    #[serde(default = "default_sample")]
    pub sample_ratio: f64,
    #[serde(default = "default_log_filter")]
    pub log_filter: String,
    /// If true, also expose a Prometheus `/metrics` endpoint.
    #[serde(default = "default_true")]
    pub enable_prometheus: bool,
}

fn default_namespace() -> String { "sequoia".into() }
fn default_sample() -> f64 { 0.1 }
fn default_log_filter() -> String { "info,h2=warn,hyper=warn,sqlx=warn".into() }
fn default_true() -> bool { true }

pub struct TelemetryGuard {
    _tracer: TracerProvider,
    /// Handle to the Prometheus recorder when `enable_prometheus` is true.
    /// Services that want to expose `/metrics` call `render()` on this.
    pub prometheus: Option<metrics_exporter_prometheus::PrometheusHandle>,
}

impl Drop for TelemetryGuard {
    fn drop(&mut self) {
        let _ = self._tracer.shutdown();
    }
}

pub fn init(cfg: TelemetryConfig) -> Result<TelemetryGuard, TelemetryError> {
    opentelemetry::global::set_text_map_propagator(TraceContextPropagator::new());

    let resource = Resource::new(vec![
        KeyValue::new(
            opentelemetry_semantic_conventions::attribute::SERVICE_NAME,
            cfg.service_name.clone(),
        ),
        KeyValue::new("service.namespace", cfg.service_namespace.clone()),
        KeyValue::new(
            opentelemetry_semantic_conventions::attribute::SERVICE_VERSION,
            env!("CARGO_PKG_VERSION"),
        ),
    ]);

    let sampler = Sampler::ParentBased(Box::new(Sampler::TraceIdRatioBased(cfg.sample_ratio)));

    let tracer_provider = if let Some(endpoint) = cfg.otlp_endpoint.as_deref() {
        let exporter = opentelemetry_otlp::SpanExporter::builder()
            .with_tonic()
            .with_endpoint(endpoint)
            .build()
            .map_err(|e| TelemetryError::Init(format!("otlp exporter: {e}")))?;

        TracerProvider::builder()
            .with_resource(resource)
            .with_sampler(sampler)
            .with_batch_exporter(exporter, opentelemetry_sdk::runtime::Tokio)
            .build()
    } else {
        TracerProvider::builder()
            .with_resource(resource)
            .with_sampler(sampler)
            .build()
    };

    let tracer = tracer_provider.tracer(cfg.service_name.clone());

    let fmt_layer = tracing_subscriber::fmt::layer().json().with_target(true);
    let otel_layer = tracing_opentelemetry::layer().with_tracer(tracer);
    let filter = EnvFilter::try_new(&cfg.log_filter)
        .or_else(|_| EnvFilter::try_from_default_env())
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(filter)
        .with(fmt_layer)
        .with(otel_layer)
        .try_init()
        .map_err(|e| TelemetryError::Init(format!("subscriber: {e}")))?;

    let prometheus = if cfg.enable_prometheus {
        let handle = metrics_exporter_prometheus::PrometheusBuilder::new()
            .install_recorder()
            .map_err(|e| TelemetryError::Init(format!("prom: {e}")))?;
        Some(handle)
    } else {
        None
    };

    Ok(TelemetryGuard { _tracer: tracer_provider, prometheus })
}
