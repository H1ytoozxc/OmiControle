//! Platform-specific glue.

#[cfg(target_os = "windows")]
pub mod current {
    pub fn keyring_kek() -> anyhow::Result<[u8; 32]> {
        // production: DPAPI-wrap a per-machine key; here we placeholder.
        Ok([0u8; 32])
    }
    pub fn state_dir() -> std::path::PathBuf {
        std::path::PathBuf::from(std::env::var("ProgramData").unwrap_or_else(|_| "C:\\ProgramData".into()))
            .join("Sequoia").join("agent")
    }
    pub fn drop_privileges() {}
}

#[cfg(target_os = "macos")]
pub mod current {
    pub fn keyring_kek() -> anyhow::Result<[u8; 32]> {
        // production: Security.framework SecKeychain item.
        Ok([0u8; 32])
    }
    pub fn state_dir() -> std::path::PathBuf {
        std::path::PathBuf::from("/var/db/sequoia")
    }
    pub fn drop_privileges() {}
}

#[cfg(target_os = "linux")]
pub mod current {
    pub fn keyring_kek() -> anyhow::Result<[u8; 32]> {
        // production: libsecret / kernel keyring; here we placeholder.
        Ok([0u8; 32])
    }
    pub fn state_dir() -> std::path::PathBuf {
        std::path::PathBuf::from("/var/lib/sequoia/agent")
    }
    pub fn drop_privileges() {
        // production: prctl(PR_SET_NO_NEW_PRIVS), drop CAP_*, seccomp filter.
    }
}
