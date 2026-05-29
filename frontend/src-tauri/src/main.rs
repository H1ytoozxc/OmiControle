#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let show     = MenuItem::with_id(app, "show",   "Open Sequoia", true, None::<&str>)?;
            let quick    = MenuItem::with_id(app, "quick",  "Quick action…", true, Some("Cmd+Shift+K"))?;
            let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit     = MenuItem::with_id(app, "quit",   "Quit",          true, Some("Cmd+Q"))?;
            let menu = Menu::with_items(app, &[&show, &quick, &separator, &quit])?;

            let _ = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show"  => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); } }
                        "quick" => { if let Some(w) = app.get_webview_window("main") { let _ = w.emit("sequoia://palette/open", ()); } }
                        "quit"  => { app.exit(0); }
                        _ => {}
                    }
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![keyring_get, keyring_set])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Read a secret from the OS keyring (Keychain / Credential Manager / kwallet).
/// Used for storing the encrypted refresh-token + device session secret so the
/// desktop session can re-authenticate without re-prompting on launch.
#[tauri::command]
fn keyring_get(service: String, key: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(&service, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn keyring_set(service: String, key: String, value: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}
