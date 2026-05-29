//! Model router: picks the best provider for a (model, policy) pair.

use std::sync::Arc;

use crate::provider::{LlmProvider, ProviderError, ProviderRegistry};

/// Policy hints from the caller (typed; not free-form).
#[derive(Debug, Clone, Copy)]
pub struct RoutePolicy {
    pub prefer_local: bool,
    pub max_cost_usd_micro: Option<u64>,
}

pub struct ModelRouter {
    pub providers: Arc<ProviderRegistry>,
}

impl ModelRouter {
    pub fn resolve(&self, model: &str, _policy: RoutePolicy) -> Result<Arc<dyn LlmProvider>, ProviderError> {
        self.providers
            .pick_for(model)
            .ok_or_else(|| ProviderError::UnsupportedModel(model.into()))
    }
}
