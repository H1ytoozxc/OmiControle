use std::sync::Arc;

use sequoia_proto::sequoia::v1 as pb;
use sqlx::PgPool;
use tonic::{Request, Response, Status};

use crate::config::PluginConfig;
use crate::runtime::WasmRuntime;

pub struct PluginGrpc {
    pub pool: PgPool,
    pub runtime: Arc<WasmRuntime>,
    pub cfg: Arc<PluginConfig>,
}

#[tonic::async_trait]
impl pb::plugin_host_server::PluginHost for PluginGrpc {
    async fn upload_bundle(&self, _req: Request<pb::UploadBundleRequest>) -> Result<Response<pb::Bundle>, Status> {
        Err(Status::unimplemented("todo"))
    }
    async fn install_plugin(&self, _req: Request<pb::InstallRequest>) -> Result<Response<pb::Installation>, Status> {
        Err(Status::unimplemented("todo"))
    }
    async fn uninstall_plugin(&self, _req: Request<pb::UninstallRequest>) -> Result<Response<pb::Empty>, Status> {
        Ok(Response::new(pb::Empty {}))
    }
    async fn invoke(&self, _req: Request<pb::InvokeRequest>) -> Result<Response<pb::InvokeResponse>, Status> {
        Err(Status::unimplemented("todo"))
    }
    async fn list_installed(&self, _req: Request<pb::ListInstalledRequest>) -> Result<Response<pb::ListInstalledResponse>, Status> {
        Ok(Response::new(pb::ListInstalledResponse { items: vec![], next_cursor: String::new() }))
    }
}
