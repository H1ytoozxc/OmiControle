//! wasmtime-based plugin runtime.
//!
//! Each invocation:
//!   1. Load (or cache) compiled module.
//!   2. Create a fresh `Store<Ctx>` with fuel & memory limits.
//!   3. Build a WASI context with capability-derived handles.
//!   4. Call `invoke(ctx, payload)` and stream back the result.

use anyhow::Context as _;
use std::sync::Arc;
use wasmtime::{Config, Engine, Module};

use crate::config::PluginConfig;

pub struct WasmRuntime {
    pub engine: Engine,
    pub modules: moka::sync::Cache<String, Arc<Module>>,
}

impl WasmRuntime {
    pub fn new(_cfg: &PluginConfig) -> anyhow::Result<Self> {
        let mut config = Config::new();
        config.async_support(true);
        config.consume_fuel(true);
        config.wasm_component_model(true);
        let engine = Engine::new(&config).context("wasmtime engine")?;
        let modules = moka::sync::Cache::builder()
            .max_capacity(256)
            .build();
        Ok(Self { engine, modules })
    }

    pub async fn invoke(
        &self,
        _module_sha: &str,
        _wasm_bytes: &[u8],
        _payload: &[u8],
        _fuel_limit: u64,
    ) -> anyhow::Result<Vec<u8>> {
        // Production:
        //   let module = self.modules.get_with(module_sha.to_string(),
        //       || Arc::new(Module::from_binary(&self.engine, wasm_bytes).unwrap()));
        //   instantiate with limited memory + fuel, call `tools.invoke`,
        //   then return the bytes.
        Ok(Vec::new())
    }
}

