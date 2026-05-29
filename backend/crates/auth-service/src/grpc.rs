//! Inbound adapter: gRPC AuthService.

use std::sync::Arc;

use sequoia_proto::sequoia::v1 as pb;
use tonic::{Request, Response, Status};

use crate::app::AuthApp;

pub struct AuthGrpc {
    pub app: Arc<AuthApp>,
}

#[tonic::async_trait]
impl pb::auth_service_server::AuthService for AuthGrpc {
    async fn issue_tokens(
        &self,
        req: Request<pb::IssueTokensRequest>,
    ) -> Result<Response<pb::TokenPair>, Status> {
        let r = req.into_inner();
        match r.primary {
            Some(pb::issue_tokens_request::Primary::Password(p)) => {
                let tenant = parse_uuid(&r.context.as_ref().map(|c| c.tenant_id.clone()).unwrap_or_default())
                    .map_err(|_| Status::invalid_argument("bad tenant_id"))?;
                let pair = self.app.login_password(tenant, &p.email, &p.password)
                    .await
                    .map_err(map_err)?;
                Ok(Response::new(pb::TokenPair {
                    access_token:  pair.access_token,
                    refresh_token: pair.refresh_token,
                    access_ttl_s:  pair.access_ttl_s,
                    refresh_ttl_s: pair.refresh_ttl_s,
                }))
            }
            Some(pb::issue_tokens_request::Primary::Oidc(_)) => {
                Err(Status::unimplemented("oidc flow wired via /auth/oidc/* HTTP endpoints"))
            }
            None => Err(Status::invalid_argument("primary credential missing")),
        }
    }

    async fn refresh(
        &self,
        req: Request<pb::RefreshRequest>,
    ) -> Result<Response<pb::TokenPair>, Status> {
        let r = req.into_inner();
        let pair = self.app.refresh(&r.refresh_token).await.map_err(map_err)?;
        Ok(Response::new(pb::TokenPair {
            access_token: pair.access_token,
            refresh_token: pair.refresh_token,
            access_ttl_s: pair.access_ttl_s,
            refresh_ttl_s: pair.refresh_ttl_s,
        }))
    }

    async fn logout(
        &self,
        req: Request<pb::LogoutRequest>,
    ) -> Result<Response<pb::Empty>, Status> {
        let r = req.into_inner();
        self.app.logout(&r.refresh_token).await.map_err(map_err)?;
        Ok(Response::new(pb::Empty {}))
    }

    async fn verify(
        &self,
        _req: Request<pb::VerifyRequest>,
    ) -> Result<Response<pb::VerifyResponse>, Status> {
        Err(Status::unimplemented("verify happens at gateway via JWKS"))
    }

    async fn issue_ws_ticket(
        &self,
        _req: Request<pb::RequestContext>,
    ) -> Result<Response<pb::WsTicket>, Status> {
        Err(Status::unimplemented("not yet"))
    }

    async fn jwks(
        &self,
        _req: Request<pb::Empty>,
    ) -> Result<Response<pb::JwksResponse>, Status> {
        Err(Status::unimplemented("served via HTTPS /.well-known/jwks.json"))
    }
}

fn parse_uuid(s: &str) -> Result<uuid::Uuid, ()> {
    uuid::Uuid::parse_str(s).map_err(|_| ())
        .or_else(|_| ulid::Ulid::from_string(s).map(|u| uuid::Uuid::from_u128(u.0)).map_err(|_| ()))
}

fn map_err(e: sequoia_common::Error) -> Status {
    use sequoia_common::error::GrpcCode::*;
    let code = match e.grpc_status() {
        InvalidArgument    => tonic::Code::InvalidArgument,
        Unauthenticated    => tonic::Code::Unauthenticated,
        PermissionDenied   => tonic::Code::PermissionDenied,
        NotFound           => tonic::Code::NotFound,
        AlreadyExists      => tonic::Code::AlreadyExists,
        FailedPrecondition => tonic::Code::FailedPrecondition,
        ResourceExhausted  => tonic::Code::ResourceExhausted,
        Unavailable        => tonic::Code::Unavailable,
        Internal           => tonic::Code::Internal,
    };
    Status::new(code, e.to_string())
}
