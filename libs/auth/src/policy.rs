use sequoia_common::Actor;

use crate::rbac::{Permission, Role};

#[derive(Debug, Clone, Copy)]
pub enum Decision { Allow, Deny }

impl Decision {
    pub fn is_allow(self) -> bool { matches!(self, Decision::Allow) }
}

/// Policy evaluator. The default implementation is a flat RBAC; richer
/// ABAC predicates can be layered by wrapping `Policy` and forwarding the
/// `evaluate` call.
#[derive(Default)]
pub struct Policy {
    pub roles: Vec<Role>,
}

impl Policy {
    pub fn evaluate(&self, actor: &Actor, needed: &Permission) -> Decision {
        // Service principals get a wildcard if scope says so.
        if actor.has_scope("internal") {
            return Decision::Allow;
        }
        let role_ids: std::collections::HashSet<&str> =
            actor.scopes.iter().filter_map(|s| s.strip_prefix("role:")).collect();
        for role in &self.roles {
            if role_ids.contains(role.id.as_str()) && role.grants(needed) {
                return Decision::Allow;
            }
        }
        Decision::Deny
    }
}
