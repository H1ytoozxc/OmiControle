//! Sequoia Device Agent (desktop edition).
//!
//! Single binary running as a long-lived background service on Windows
//! (Windows Service), macOS (launchd), and Linux (systemd).
//!
//! Lifecycle:
//!  1. Load encrypted state (or run `enroll` subcommand first time).
//!  2. Open bi-di gRPC stream to Device Service.
//!  3. Spawn telemetry loop, command dispatcher, plugin runner.
//!  4. On SIGTERM: drain pending acks, flush state, exit.

mod cli;
mod platform;
mod runtime;

use clap::Parser;

fn main() -> anyhow::Result<()> {
    let args = cli::Args::parse();
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info,h2=warn".into()))
        .init();

    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .worker_threads(2)
        .build()?;

    rt.block_on(async move {
        match args.command {
            cli::Command::Enroll(o) => runtime::enroll(o).await,
            cli::Command::Run       => runtime::run().await,
            cli::Command::Status    => runtime::status().await,
        }
    })
}
