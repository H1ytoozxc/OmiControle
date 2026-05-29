use base64::{engine::general_purpose::URL_SAFE_NO_PAD as B64, Engine};
use serde::{Deserialize, Serialize};

/// Opaque cursor: time + tiebreaker id, base64url-encoded.
///
/// Combined with a composite index on `(tenant_id, created_at DESC, id DESC)`
/// this yields keyset pagination that is correct under concurrent writes
/// and constant-time at the database.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cursor {
    /// Unix millis of the last item's `created_at`.
    pub ts_ms: i64,
    /// Tiebreaker id (raw ULID bytes).
    pub id: [u8; 16],
}

impl Cursor {
    pub fn encode(&self) -> String {
        let mut buf = [0u8; 24];
        buf[..8].copy_from_slice(&self.ts_ms.to_be_bytes());
        buf[8..24].copy_from_slice(&self.id);
        B64.encode(buf)
    }

    pub fn decode(s: &str) -> Option<Self> {
        let raw = B64.decode(s).ok()?;
        if raw.len() != 24 { return None; }
        let mut ts = [0u8; 8]; ts.copy_from_slice(&raw[..8]);
        let mut id = [0u8; 16]; id.copy_from_slice(&raw[8..24]);
        Some(Self { ts_ms: i64::from_be_bytes(ts), id })
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct PageRequest {
    #[serde(default)]
    pub cursor: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_limit() -> u32 { 50 }

impl PageRequest {
    pub const MAX_LIMIT: u32 = 500;

    /// Apply server-side caps to the user-supplied limit.
    pub fn capped_limit(&self) -> u32 {
        self.limit.clamp(1, Self::MAX_LIMIT)
    }

    pub fn decoded_cursor(&self) -> Option<Cursor> {
        self.cursor.as_deref().and_then(Cursor::decode)
    }
}

#[derive(Debug, Serialize)]
pub struct Page<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<String>,
}

impl<T> Page<T> {
    pub fn new(items: Vec<T>, next_cursor: Option<Cursor>) -> Self {
        Self { items, next_cursor: next_cursor.as_ref().map(Cursor::encode) }
    }
}
