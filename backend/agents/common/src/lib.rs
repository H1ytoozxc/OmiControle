//! Cross-platform device agent core.
//!
//! Platform-specific glue (service registration, OS keyring, sandbox) lives
//! in `agents/desktop` and `agents/android`; everything else is here.

pub mod stream;
pub mod state;
pub mod commands;
pub mod telemetry;
pub mod updater;
