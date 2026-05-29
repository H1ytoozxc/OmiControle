//! Generated gRPC bindings. `tonic-build` writes one module per package.

pub mod sequoia {
    pub mod v1 {
        tonic::include_proto!("sequoia.v1");
    }
}

pub const FILE_DESCRIPTOR_SET: &[u8] =
    tonic::include_file_descriptor_set!("sequoia_descriptor");
