use serde::{Deserialize, Serialize};
use std::net::IpAddr;

use crate::actor::Actor;
use crate::tenant::TenantId;

/// Per-request context threaded through every handler and outbound call.
///
/// Constructed once at the inbound boundary (Axum extractor / gRPC interceptor)
/// from authenticated metadata, and propagated unchanged across internal hops
/// so distributed traces & audit logs reconstruct the full causal chain.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestContext {
    pub tenant: TenantId,
    pub actor: Actor,
    /// W3C `traceparent` compatible id (32 hex chars) — duplicated here so
    /// it's available in logs / events even outside of a tracing span.
    pub correlation_id: String,
    /// The id of the upstream request that caused this one (one hop back).
    pub causation_id: Option<String>,
    pub client_ip: Option<IpAddr>,
    /// Free-form labels (region, build, feature flags, etc.).
    #[serde(default)]
    pub labels: Vec<(String, String)>,
}

impl RequestContext {
    pub fn child(&self, new_correlation: String) -> Self {
        Self {
            tenant: self.tenant,
            actor: self.actor.clone(),
            correlation_id: new_correlation,
            causation_id: Some(self.correlation_id.clone()),
            client_ip: self.client_ip,
            labels: self.labels.clone(),
        }
    }
}
