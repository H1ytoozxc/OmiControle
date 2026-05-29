use serde::Serialize;
use thiserror::Error;

/// Result alias used across the platform.
pub type Result<T, E = Error> = std::result::Result<T, E>;

/// Top-level error type that maps to RFC 7807 problem responses at HTTP edges.
///
/// Service-local errors should convert into this enum via `From` to surface
/// uniformly to clients. Avoid leaking internal details — `Internal` carries
/// a redacted message; the real cause is logged with the trace id.
#[derive(Debug, Error)]
pub enum Error {
    #[error("invalid request: {0}")]
    BadRequest(String),

    #[error("unauthenticated")]
    Unauthenticated,

    #[error("forbidden: {0}")]
    Forbidden(&'static str),

    #[error("not found: {0}")]
    NotFound(&'static str),

    #[error("conflict: {0}")]
    Conflict(&'static str),

    #[error("precondition failed: {0}")]
    PreconditionFailed(&'static str),

    #[error("rate limited (retry after {retry_after_ms} ms)")]
    RateLimited { retry_after_ms: u64 },

    #[error("upstream unavailable: {0}")]
    UpstreamUnavailable(&'static str),

    #[error("validation failed: {0}")]
    Validation(String),

    #[error("internal error")]
    Internal(#[source] anyhow::Error),
}

impl Error {
    /// Stable, machine-readable error code for clients.
    pub fn code(&self) -> &'static str {
        match self {
            Error::BadRequest(_) => "bad_request",
            Error::Unauthenticated => "unauthenticated",
            Error::Forbidden(_) => "forbidden",
            Error::NotFound(_) => "not_found",
            Error::Conflict(_) => "conflict",
            Error::PreconditionFailed(_) => "precondition_failed",
            Error::RateLimited { .. } => "rate_limited",
            Error::UpstreamUnavailable(_) => "upstream_unavailable",
            Error::Validation(_) => "validation_failed",
            Error::Internal(_) => "internal",
        }
    }

    pub fn http_status(&self) -> u16 {
        match self {
            Error::BadRequest(_) | Error::Validation(_) => 400,
            Error::Unauthenticated => 401,
            Error::Forbidden(_) => 403,
            Error::NotFound(_) => 404,
            Error::Conflict(_) => 409,
            Error::PreconditionFailed(_) => 412,
            Error::RateLimited { .. } => 429,
            Error::UpstreamUnavailable(_) => 502,
            Error::Internal(_) => 500,
        }
    }

    pub fn grpc_status(&self) -> tonic_status::Code {
        use tonic_status::Code::*;
        match self {
            Error::BadRequest(_) | Error::Validation(_) => InvalidArgument,
            Error::Unauthenticated => Unauthenticated,
            Error::Forbidden(_) => PermissionDenied,
            Error::NotFound(_) => NotFound,
            Error::Conflict(_) => AlreadyExists,
            Error::PreconditionFailed(_) => FailedPrecondition,
            Error::RateLimited { .. } => ResourceExhausted,
            Error::UpstreamUnavailable(_) => Unavailable,
            Error::Internal(_) => Internal,
        }
    }
}

impl From<anyhow::Error> for Error {
    fn from(e: anyhow::Error) -> Self {
        Error::Internal(e)
    }
}

/// Local re-export so we don't pull `tonic` into a leaf crate just for the enum.
mod tonic_status {
    /// Mirror of `tonic::Code`; we only carry the variants we map to.
    #[derive(Debug, Clone, Copy)]
    pub enum Code {
        InvalidArgument,
        Unauthenticated,
        PermissionDenied,
        NotFound,
        AlreadyExists,
        FailedPrecondition,
        ResourceExhausted,
        Unavailable,
        Internal,
    }
}

pub use tonic_status::Code as GrpcCode;

/// RFC 7807 problem-json body shape.
#[derive(Serialize, Debug)]
pub struct ProblemDetails<'a> {
    #[serde(rename = "type")]
    pub ty: &'a str,
    pub title: &'a str,
    pub status: u16,
    pub code: &'a str,
    pub detail: String,
    pub trace_id: Option<String>,
}

impl<'a> ProblemDetails<'a> {
    pub fn from_error(err: &'a Error, trace_id: Option<String>) -> Self {
        Self {
            ty: "https://sequoia.dev/errors",
            title: err.code(),
            status: err.http_status(),
            code: err.code(),
            detail: err.to_string(),
            trace_id,
        }
    }
}
