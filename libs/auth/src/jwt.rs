use jsonwebtoken::{
    decode, decode_header, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use thiserror::Error;
use time::OffsetDateTime;

use crate::jwks::JwksCache;

#[derive(Debug, Error)]
pub enum JwtError {
    #[error("jwt encode: {0}")]
    Encode(String),
    #[error("jwt decode: {0}")]
    Decode(String),
    #[error("unknown kid: {0}")]
    UnknownKid(String),
    #[error("invalid token")]
    Invalid,
}

/// Sequoia-standard JWT claims.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub iss: String,
    pub aud: String,
    pub sub: String,
    /// Tenant id (ULID string).
    pub tid: String,
    /// Actor kind: user | device | service.
    pub kind: String,
    /// Scopes — space-separated for OAuth compat.
    #[serde(default)]
    pub scope: String,
    pub iat: i64,
    pub nbf: i64,
    pub exp: i64,
    /// Unique JWT id — also used for revocation lists.
    pub jti: String,
    /// Optional acted-on-behalf principal chain (delegation).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub act: Option<Box<Claims>>,
}

pub struct IssueParams<'a> {
    pub kid: &'a str,
    pub key_pem: &'a [u8],
    pub issuer: &'a str,
    pub audience: &'a str,
    pub subject: &'a str,
    pub tenant: &'a str,
    pub kind: &'a str,
    pub scope: &'a str,
    pub ttl_secs: i64,
}

#[derive(Clone)]
pub struct Issuer {
    inner: Arc<IssuerInner>,
}

struct IssuerInner {
    kid: String,
    encoding: EncodingKey,
}

impl Issuer {
    pub fn from_es256_pem(kid: String, pem: &[u8]) -> Result<Self, JwtError> {
        let encoding = EncodingKey::from_ec_pem(pem)
            .map_err(|e| JwtError::Encode(e.to_string()))?;
        Ok(Self { inner: Arc::new(IssuerInner { kid, encoding }) })
    }

    pub fn issue(&self, p: IssueParams<'_>) -> Result<(String, Claims), JwtError> {
        let now = OffsetDateTime::now_utc().unix_timestamp();
        let claims = Claims {
            iss: p.issuer.to_owned(),
            aud: p.audience.to_owned(),
            sub: p.subject.to_owned(),
            tid: p.tenant.to_owned(),
            kind: p.kind.to_owned(),
            scope: p.scope.to_owned(),
            iat: now,
            nbf: now,
            exp: now + p.ttl_secs,
            jti: ulid::Ulid::new().to_string(),
            act: None,
        };
        let mut header = Header::new(Algorithm::ES256);
        header.kid = Some(self.inner.kid.clone());
        let token = encode(&header, &claims, &self.inner.encoding)
            .map_err(|e| JwtError::Encode(e.to_string()))?;
        Ok((token, claims))
    }
}

#[derive(Clone)]
pub struct Verifier {
    issuer: Arc<String>,
    audience: Arc<String>,
    jwks: Arc<JwksCache>,
}

impl Verifier {
    pub fn new(issuer: String, audience: String, jwks: Arc<JwksCache>) -> Self {
        Self { issuer: Arc::new(issuer), audience: Arc::new(audience), jwks }
    }

    pub async fn verify(&self, token: &str) -> Result<Claims, JwtError> {
        let header = decode_header(token).map_err(|e| JwtError::Decode(e.to_string()))?;
        let kid = header.kid.as_deref().ok_or(JwtError::Invalid)?;
        let key = self
            .jwks
            .get(kid)
            .await
            .map_err(|_| JwtError::UnknownKid(kid.to_owned()))?;
        let decoding = DecodingKey::from_ec_components(&key.x, &key.y)
            .map_err(|e| JwtError::Decode(e.to_string()))?;

        let mut validation = Validation::new(Algorithm::ES256);
        validation.set_issuer(&[self.issuer.as_str()]);
        validation.set_audience(&[self.audience.as_str()]);
        validation.leeway = 30;

        let data = decode::<Claims>(token, &decoding, &validation)
            .map_err(|e| JwtError::Decode(e.to_string()))?;
        Ok(data.claims)
    }
}
