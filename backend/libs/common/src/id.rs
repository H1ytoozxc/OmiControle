use std::fmt;
use std::marker::PhantomData;
use std::str::FromStr;

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use ulid::Ulid;
use uuid::Uuid;

/// Strongly-typed identifier wrapping a ULID.
///
/// `T` is a marker type that prevents accidentally mixing `Id<User>` with
/// `Id<Device>`. The on-wire representation is Crockford base32 (ULID), the
/// in-database representation is `uuid` (lex-sortable bytes are preserved).
// PhantomData<fn() -> T> is always Clone+Copy+Eq+Hash regardless of T, but
// derive would generate T: Clone etc. bounds. Implement manually instead.
pub struct Id<T> {
    inner: Ulid,
    _t: PhantomData<fn() -> T>,
}

impl<T> Clone for Id<T> {
    fn clone(&self) -> Self { *self }
}
impl<T> Copy for Id<T> {}
impl<T> PartialEq for Id<T> {
    fn eq(&self, other: &Self) -> bool { self.inner == other.inner }
}
impl<T> Eq for Id<T> {}
impl<T> std::hash::Hash for Id<T> {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) { self.inner.hash(state); }
}

impl<T> Id<T> {
    pub fn new() -> Self {
        Self { inner: Ulid::new(), _t: PhantomData }
    }

    pub fn from_ulid(u: Ulid) -> Self {
        Self { inner: u, _t: PhantomData }
    }

    pub fn from_uuid(u: Uuid) -> Self {
        Self { inner: Ulid::from(u.as_u128()), _t: PhantomData }
    }

    pub fn as_ulid(&self) -> Ulid {
        self.inner
    }

    pub fn as_uuid(&self) -> Uuid {
        Uuid::from_u128(self.inner.0)
    }

    pub fn as_bytes(&self) -> [u8; 16] {
        self.inner.to_bytes()
    }

    /// Extracts the timestamp embedded in the ULID. Useful for `created_at`
    /// inference without a separate column.
    pub fn timestamp_ms(&self) -> u64 {
        self.inner.timestamp_ms()
    }
}

impl<T> Default for Id<T> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T> fmt::Debug for Id<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.inner)
    }
}

impl<T> fmt::Display for Id<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.inner)
    }
}

impl<T> FromStr for Id<T> {
    type Err = ulid::DecodeError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self::from_ulid(Ulid::from_str(s)?))
    }
}

impl<T> Serialize for Id<T> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.collect_str(&self.inner)
    }
}

impl<'de, T> Deserialize<'de> for Id<T> {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let s = String::deserialize(d)?;
        Self::from_str(&s).map_err(serde::de::Error::custom)
    }
}

// Marker types used elsewhere to specialize Id<T>.
pub mod kind {
    #[derive(Debug)] pub struct User;
    #[derive(Debug)] pub struct Tenant;
    #[derive(Debug)] pub struct Device;
    #[derive(Debug)] pub struct Session;
    #[derive(Debug)] pub struct Role;
    #[derive(Debug)] pub struct Permission;
    #[derive(Debug)] pub struct Agent;
    #[derive(Debug)] pub struct Run;
    #[derive(Debug)] pub struct Tool;
    #[derive(Debug)] pub struct Workflow;
    #[derive(Debug)] pub struct WorkflowInstance;
    #[derive(Debug)] pub struct Step;
    #[derive(Debug)] pub struct Plugin;
    #[derive(Debug)] pub struct PluginInstall;
    #[derive(Debug)] pub struct Notification;
    #[derive(Debug)] pub struct AuditEvent;
    #[derive(Debug)] pub struct Command;
}
