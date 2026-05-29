use serde::{Deserialize, Serialize};

use crate::id::{kind, Id};

/// What kind of principal is acting on a request.
#[derive(Debug, Clone, Copy, Eq, PartialEq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum ActorKind {
    User,
    Device,
    Service,
    Plugin,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Actor {
    pub kind: ActorKind,
    pub id: String,
    /// Comma-separated scopes lifted from the JWT, for fast contains() checks.
    #[serde(default)]
    pub scopes: Vec<String>,
    /// Optional principal we are acting on behalf of (delegation / impersonation).
    pub on_behalf_of: Option<Box<Actor>>,
}

impl Actor {
    pub fn user(id: Id<kind::User>) -> Self {
        Self { kind: ActorKind::User, id: id.to_string(), scopes: Vec::new(), on_behalf_of: None }
    }

    pub fn device(id: Id<kind::Device>) -> Self {
        Self { kind: ActorKind::Device, id: id.to_string(), scopes: Vec::new(), on_behalf_of: None }
    }

    pub fn service(name: &str) -> Self {
        Self { kind: ActorKind::Service, id: name.to_owned(), scopes: Vec::new(), on_behalf_of: None }
    }

    pub fn has_scope(&self, s: &str) -> bool {
        self.scopes.iter().any(|x| x == s)
    }
}
