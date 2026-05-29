use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use sequoia_common::error::{Error, ProblemDetails};

pub struct ApiError(pub Error);

impl<E: Into<Error>> From<E> for ApiError {
    fn from(e: E) -> Self { Self(e.into()) }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = StatusCode::from_u16(self.0.http_status()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        let trace_id = tracing::Span::current()
            .id()
            .map(|id| id.into_u64().to_string());
        let body = ProblemDetails::from_error(&self.0, trace_id);
        let mut resp = (status, Json(body)).into_response();
        resp.headers_mut().insert(
            axum::http::header::CONTENT_TYPE,
            axum::http::HeaderValue::from_static("application/problem+json"),
        );
        resp
    }
}
