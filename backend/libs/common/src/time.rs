//! Time helpers — single source of "now" so tests can fake the clock.

use std::sync::Arc;
use time::OffsetDateTime;

#[async_trait::async_trait]
pub trait Clock: Send + Sync + 'static {
    fn now(&self) -> OffsetDateTime;
}

pub type ClockRef = Arc<dyn Clock>;

#[derive(Default)]
pub struct SystemClock;

#[async_trait::async_trait]
impl Clock for SystemClock {
    fn now(&self) -> OffsetDateTime {
        OffsetDateTime::now_utc()
    }
}

/// A clock that always returns the same instant — for tests.
pub struct FrozenClock(pub OffsetDateTime);

#[async_trait::async_trait]
impl Clock for FrozenClock {
    fn now(&self) -> OffsetDateTime { self.0 }
}
