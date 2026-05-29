//! Shared auth primitives: JWT, JWKS cache, RBAC policy.

pub mod jwt;
pub mod jwks;
pub mod rbac;
pub mod policy;
pub mod ticket;

pub use jwt::{Claims, Issuer, Verifier, IssueParams};
pub use rbac::{Permission, Role};
pub use policy::{Policy, Decision};
pub use ticket::{VerifiedTicket, TicketError};
