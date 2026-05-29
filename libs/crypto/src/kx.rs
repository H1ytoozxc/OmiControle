//! X25519 ephemeral-static key agreement helper used by the device-server
//! Noise XX handshake (a Noise crate can be layered on top, but for now we
//! expose the primitive).

use rand::rngs::OsRng;
use x25519_dalek::{EphemeralSecret, PublicKey, StaticSecret};

pub fn generate_static() -> (StaticSecret, PublicKey) {
    let sk = StaticSecret::random_from_rng(OsRng);
    let pk = PublicKey::from(&sk);
    (sk, pk)
}

pub fn ephemeral() -> (EphemeralSecret, PublicKey) {
    let sk = EphemeralSecret::random_from_rng(OsRng);
    let pk = PublicKey::from(&sk);
    (sk, pk)
}

pub fn dh_static(sk: &StaticSecret, peer: &PublicKey) -> [u8; 32] {
    sk.diffie_hellman(peer).to_bytes()
}
