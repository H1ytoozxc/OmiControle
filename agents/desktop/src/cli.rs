use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "sequoia-agent", version, about = "Sequoia device agent")]
pub struct Args {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Subcommand)]
pub enum Command {
    /// First-time enrollment with a one-time code.
    Enroll(EnrollOpts),
    /// Long-running mode (default for service).
    Run,
    /// Print a one-line status.
    Status,
}

#[derive(Parser)]
pub struct EnrollOpts {
    /// Gateway gRPC endpoint, e.g. https://device.sequoia.example:443
    #[arg(long, env = "SEQUOIA_ENDPOINT")]
    pub endpoint: String,
    /// Enrollment code from the operator UI.
    #[arg(long)]
    pub code: String,
    /// Optional hostname override.
    #[arg(long)]
    pub hostname: Option<String>,
}
