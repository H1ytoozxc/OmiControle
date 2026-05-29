//! Cross-cutting domain types: errors, IDs, pagination, request context.

pub mod error;
pub mod id;
pub mod pagination;
pub mod context;
pub mod tenant;
pub mod actor;
pub mod time;

pub use error::{Error, Result};
pub use id::Id;
pub use pagination::{Cursor, Page, PageRequest};
pub use context::RequestContext;
pub use tenant::TenantId;
pub use actor::{Actor, ActorKind};
