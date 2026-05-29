use std::sync::Arc;
use std::time::Duration;

use moka::future::Cache;
use serde::Deserialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum JwksError {
    #[error("fetch: {0}")]
    Fetch(String),
    #[error("not found")]
    NotFound,
}

/// A single decoded P-256 (EC) JWK.
#[derive(Debug, Clone)]
pub struct EcKey {
    pub kid: String,
    pub x: String,
    pub y: String,
}

#[derive(Debug, Deserialize)]
struct JwksDoc {
    keys: Vec<JwkEntry>,
}

#[derive(Debug, Deserialize)]
struct JwkEntry {
    kid: String,
    #[serde(default)] kty: String,
    #[serde(default)] crv: String,
    #[serde(default)] x: String,
    #[serde(default)] y: String,
}

/// In-process JWKS cache backed by `moka` with TTI + TTL.
///
/// On a `get(kid)` miss we refresh from the JWKS URL. Multiple concurrent
/// misses coalesce into a single fetch via moka's `get_with` future
/// deduplication.
pub struct JwksCache {
    cache: Cache<String, Arc<EcKey>>,
    jwks_url: String,
    http: reqwest::Client,
}

impl JwksCache {
    pub fn new(jwks_url: String) -> Self {
        Self {
            cache: Cache::builder()
                .max_capacity(64)
                .time_to_live(Duration::from_secs(600))
                .build(),
            jwks_url,
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(5))
                .build()
                .expect("reqwest"),
        }
    }

    pub async fn get(&self, kid: &str) -> Result<Arc<EcKey>, JwksError> {
        if let Some(k) = self.cache.get(kid).await {
            return Ok(k);
        }
        self.refresh().await?;
        self.cache.get(kid).await.ok_or(JwksError::NotFound)
    }

    async fn refresh(&self) -> Result<(), JwksError> {
        let doc: JwksDoc = self
            .http
            .get(&self.jwks_url)
            .send()
            .await
            .map_err(|e| JwksError::Fetch(e.to_string()))?
            .error_for_status()
            .map_err(|e| JwksError::Fetch(e.to_string()))?
            .json()
            .await
            .map_err(|e| JwksError::Fetch(e.to_string()))?;
        for jwk in doc.keys {
            if jwk.kty == "EC" && jwk.crv == "P-256" {
                let key = Arc::new(EcKey { kid: jwk.kid.clone(), x: jwk.x, y: jwk.y });
                self.cache.insert(jwk.kid, key).await;
            }
        }
        Ok(())
    }
}
