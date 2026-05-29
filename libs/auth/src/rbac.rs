use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Permission(pub String);

impl Permission {
    pub fn new<S: Into<String>>(s: S) -> Self { Self(s.into()) }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub id: String,
    pub name: String,
    pub permissions: BTreeSet<Permission>,
}

impl Role {
    pub fn grants(&self, perm: &Permission) -> bool {
        self.permissions.contains(perm)
    }
}
