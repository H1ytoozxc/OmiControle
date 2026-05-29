use std::path::PathBuf;

fn main() -> std::io::Result<()> {
    let proto_root: PathBuf = PathBuf::from("../../proto");
    let files = [
        "sequoia/v1/common.proto",
        "sequoia/v1/auth.proto",
        "sequoia/v1/device.proto",
        "sequoia/v1/ai.proto",
        "sequoia/v1/realtime.proto",
        "sequoia/v1/telemetry.proto",
        "sequoia/v1/notification.proto",
        "sequoia/v1/workflow.proto",
        "sequoia/v1/plugin.proto",
        "sequoia/v1/command.proto",
    ];

    let descriptor_path = std::env::var("OUT_DIR")
        .map(|d| PathBuf::from(d).join("sequoia_descriptor.bin"))
        .unwrap();

    tonic_build::configure()
        .build_server(true)
        .build_client(true)
        .build_transport(true)
        .file_descriptor_set_path(&descriptor_path)
        .type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]")
        .compile_protos(
            &files.iter().map(|f| proto_root.join(f)).collect::<Vec<_>>(),
            &[proto_root.clone()],
        )?;
    Ok(())
}
