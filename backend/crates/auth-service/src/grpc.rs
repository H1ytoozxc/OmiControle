//! Inbound adapter: gRPC AuthService.

use std::sync::Arc;

use prost_types::Timestamp;
use sequoia_proto::sequoia::v1 as pb;
use tonic::{Request, Response, Status};
use uuid::Uuid;

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
                Err(Status::unimplemented("oidc not yet wired"))
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
        Err(Status::unimplemented("issued by api-gateway directly"))
    }

    async fn jwks(
        &self,
        _req: Request<pb::Empty>,
    ) -> Result<Response<pb::JwksResponse>, Status> {
        Err(Status::unimplemented("served via HTTPS /.well-known/jwks.json"))
    }

    async fn register(
        &self,
        req: Request<pb::RegisterRequest>,
    ) -> Result<Response<pb::RegisterResponse>, Status> {
        let r = req.into_inner();
        let tenant = parse_uuid(&r.tenant_id)
            .map_err(|_| Status::invalid_argument("bad tenant_id"))?;
        let display = if r.display_name.is_empty() { None } else { Some(r.display_name.as_str()) };
        let user_id = self.app
            .register(tenant, &r.email, &r.password, display)
            .await
            .map_err(map_err)?;
        Ok(Response::new(pb::RegisterResponse {
            user_id: user_id.to_string(),
            status: "pending_approval".into(),
        }))
    }

    async fn list_pending_users(
        &self,
        req: Request<pb::ListPendingUsersRequest>,
    ) -> Result<Response<pb::ListPendingUsersResponse>, Status> {
        let ctx = req.into_inner().context.ok_or_else(|| Status::invalid_argument("missing context"))?;
        let tenant = parse_uuid(&ctx.tenant_id)
            .map_err(|_| Status::invalid_argument("bad tenant_id"))?;
        let users = self.app.list_pending(tenant).await.map_err(map_err)?;
        let items = users.into_iter().map(|u| pb::PendingUser {
            user_id: u.id.to_string(),
            email: u.email,
            display_name: u.display_name.unwrap_or_default(),
            registered_at: Some(Timestamp {
                seconds: u.created_at.unix_timestamp(),
                nanos: 0,
            }),
        }).collect();
        Ok(Response::new(pb::ListPendingUsersResponse { users: items }))
    }

    async fn approve_user(
        &self,
        req: Request<pb::ApproveUserRequest>,
    ) -> Result<Response<pb::Empty>, Status> {
        let r = req.into_inner();
        let ctx = r.context.ok_or_else(|| Status::invalid_argument("missing context"))?;
        let tenant = parse_uuid(&ctx.tenant_id)
            .map_err(|_| Status::invalid_argument("bad tenant_id"))?;
        let user = parse_uuid(&r.user_id)
            .map_err(|_| Status::invalid_argument("bad user_id"))?;
        self.app.approve(tenant, user).await.map_err(map_err)?;
        Ok(Response::new(pb::Empty {}))
    }

    async fn reject_user(
        &self,
        req: Request<pb::RejectUserRequest>,
    ) -> Result<Response<pb::Empty>, Status> {
        let r = req.into_inner();
        let ctx = r.context.ok_or_else(|| Status::invalid_argument("missing context"))?;
        let tenant = parse_uuid(&ctx.tenant_id)
            .map_err(|_| Status::invalid_argument("bad tenant_id"))?;
        let user = parse_uuid(&r.user_id)
            .map_err(|_| Status::invalid_argument("bad user_id"))?;
        self.app.reject(tenant, user).await.map_err(map_err)?;
        Ok(Response::new(pb::Empty {}))
    }

    async fn get_me(
        &self,
        req: Request<pb::RequestContext>,
    ) -> Result<Response<pb::UserProfile>, Status> {
        let ctx = req.into_inner();
        let user_id = parse_uuid(&ctx.actor.as_ref().map(|a| a.id.as_str()).unwrap_or(""))
            .map_err(|_| Status::unauthenticated("missing actor"))?;
        let user = self.app.get_me(user_id).await.map_err(map_err)?;
        Ok(Response::new(user_to_profile(user)))
    }

    async fn update_me(
        &self,
        req: Request<pb::UpdateMeRequest>,
    ) -> Result<Response<pb::UserProfile>, Status> {
        let r = req.into_inner();
        let ctx = r.context.ok_or_else(|| Status::invalid_argument("missing context"))?;
        let user_id = parse_uuid(&ctx.actor.as_ref().map(|a| a.id.as_str()).unwrap_or(""))
            .map_err(|_| Status::unauthenticated("missing actor"))?;
        let user = self.app.update_me(user_id, &r.display_name, &r.bio, &r.email).await.map_err(map_err)?;
        Ok(Response::new(user_to_profile(user)))
    }

    async fn change_password(
        &self,
        req: Request<pb::ChangePasswordRequest>,
    ) -> Result<Response<pb::Empty>, Status> {
        let r = req.into_inner();
        let ctx = r.context.ok_or_else(|| Status::invalid_argument("missing context"))?;
        let user_id = parse_uuid(&ctx.actor.as_ref().map(|a| a.id.as_str()).unwrap_or(""))
            .map_err(|_| Status::unauthenticated("missing actor"))?;
        self.app.change_password(user_id, &r.current_password, &r.new_password).await.map_err(map_err)?;
        Ok(Response::new(pb::Empty {}))
    }

    async fn delete_me(
        &self,
        req: Request<pb::RequestContext>,
    ) -> Result<Response<pb::Empty>, Status> {
        let ctx = req.into_inner();
        let user_id = parse_uuid(&ctx.actor.as_ref().map(|a| a.id.as_str()).unwrap_or(""))
            .map_err(|_| Status::unauthenticated("missing actor"))?;
        self.app.delete_me(user_id).await.map_err(map_err)?;
        Ok(Response::new(pb::Empty {}))
    }

    async fn issue_service_token(
        &self,
        req: Request<pb::IssueServiceTokenRequest>,
    ) -> Result<Response<pb::ServiceTokenCreated>, Status> {
        let r = req.into_inner();
        let ctx = r.context.ok_or_else(|| Status::invalid_argument("missing context"))?;
        let tenant = parse_uuid(&ctx.tenant_id)
            .map_err(|_| Status::invalid_argument("bad tenant_id"))?;
        let user_id = parse_uuid(&ctx.actor.as_ref().map(|a| a.id.as_str()).unwrap_or(""))
            .map_err(|_| Status::unauthenticated("missing actor"))?;
        let (tok, full_token) = self.app.issue_service_token(tenant, user_id, &r.name).await.map_err(map_err)?;
        Ok(Response::new(pb::ServiceTokenCreated {
            user_id: user_id.to_string(),
            token_id: tok.id.to_string(),
            name: tok.name,
            prefix: tok.prefix,
            token: full_token,
            created_at: Some(Timestamp { seconds: tok.created_at.unix_timestamp(), nanos: 0 }),
        }))
    }

    async fn list_service_tokens(
        &self,
        req: Request<pb::RequestContext>,
    ) -> Result<Response<pb::ServiceTokensResponse>, Status> {
        let ctx = req.into_inner();
        let tenant = parse_uuid(&ctx.tenant_id)
            .map_err(|_| Status::invalid_argument("bad tenant_id"))?;
        let tokens = self.app.list_service_tokens(tenant).await.map_err(map_err)?;
        let items = tokens.into_iter().map(|t| pb::ServiceTokenDto {
            token_id: t.id.to_string(),
            name: t.name,
            prefix: t.prefix,
            created_at: Some(Timestamp { seconds: t.created_at.unix_timestamp(), nanos: 0 }),
            last_used_at: t.last_used_at.map(|ts| Timestamp { seconds: ts.unix_timestamp(), nanos: 0 }),
        }).collect();
        Ok(Response::new(pb::ServiceTokensResponse { tokens: items }))
    }

    async fn revoke_service_token(
        &self,
        req: Request<pb::RevokeServiceTokenRequest>,
    ) -> Result<Response<pb::Empty>, Status> {
        let r = req.into_inner();
        let ctx = r.context.ok_or_else(|| Status::invalid_argument("missing context"))?;
        let tenant = parse_uuid(&ctx.tenant_id)
            .map_err(|_| Status::invalid_argument("bad tenant_id"))?;
        let token_id = parse_uuid(&r.token_id)
            .map_err(|_| Status::invalid_argument("bad token_id"))?;
        self.app.revoke_service_token(token_id, tenant).await.map_err(map_err)?;
        Ok(Response::new(pb::Empty {}))
    }
}

fn user_to_profile(user: crate::domain::User) -> pb::UserProfile {
    pb::UserProfile {
        user_id: user.id.to_string(),
        tenant_id: user.tenant_id.to_string(),
        email: user.email,
        display_name: user.display_name.unwrap_or_default(),
        bio: user.bio.unwrap_or_default(),
        status: format!("{:?}", user.status).to_lowercase(),
        created_at: Some(Timestamp { seconds: user.created_at.unix_timestamp(), nanos: 0 }),
        last_login_at: user.last_login_at.map(|ts| Timestamp { seconds: ts.unix_timestamp(), nanos: 0 }),
    }
}

fn parse_uuid(s: &str) -> Result<Uuid, ()> {
    Uuid::parse_str(s).map_err(|_| ())
        .or_else(|_| ulid::Ulid::from_string(s).map(|u| Uuid::from_u128(u.0)).map_err(|_| ()))
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
