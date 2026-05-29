# Sequoia Agent — Android

Android port shape:

```
agents/android/
├── app/                              # Kotlin module
│   ├── build.gradle.kts
│   └── src/main/kotlin/...
│       └── SequoiaForegroundService.kt
└── jni/
    └── (rust cdylib output, aarch64-linux-android)
```

The Kotlin foreground service is a thin shell:

1. Acquires `FOREGROUND_SERVICE_DATA_SYNC` permission and a persistent
   notification (Android 14+ requirement).
2. Loads the Sequoia native library (`libsequoia_agent_android.so`) built from
   `agents/desktop` reused via `cdylib`.
3. Invokes `sequoia_agent_start(jwt_path, endpoint)` over JNI.
4. The Rust code does **everything else** — gRPC stream, command exec
   (within Android sandboxing limits), encrypted state in
   `getFilesDir()/state.bin` with KEK from **Android Keystore (AES/GCM)**.

Build:

```
cargo ndk -t arm64-v8a -t armeabi-v7a -- build --release \
    -p sequoia-agent-desktop --lib
```

Pack into an AAR alongside the Kotlin module; publish via internal Play app.
