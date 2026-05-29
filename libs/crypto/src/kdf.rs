//! HKDF-SHA256 helper.

use ring::hkdf::{Salt, HKDF_SHA256};

pub fn hkdf(salt: &[u8], ikm: &[u8], info: &[u8], out_len: usize) -> Vec<u8> {
    let prk = Salt::new(HKDF_SHA256, salt).extract(ikm);
    let okm = prk.expand(&[info], MyLen(out_len)).expect("hkdf expand");
    let mut buf = vec![0u8; out_len];
    okm.fill(&mut buf).expect("hkdf fill");
    buf
}

struct MyLen(usize);
impl ring::hkdf::KeyType for MyLen {
    fn len(&self) -> usize { self.0 }
}
