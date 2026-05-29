/**
 * Tauri bridge — guarded by `isTauri()` so the same UI code runs in browser.
 *
 * Capabilities exposed:
 *   - Native notifications (deliver alerts even when the window is closed).
 *   - OS keyring access for the refresh token.
 *   - System tray quick-action emitter ("sequoia://palette/open").
 *   - Deep-link handler (sequoia://device/<id>) → router.push().
 */

export function isTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function notify(title: string, body?: string) {
  if (!isTauri()) {
    // Browser fallback.
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
    return;
  }
  const { sendNotification, isPermissionGranted, requestPermission } =
    await import("@tauri-apps/plugin-notification");
  if (!(await isPermissionGranted())) {
    const p = await requestPermission();
    if (p !== "granted") return;
  }
  sendNotification({ title, body });
}

export async function keyringGet(key: string): Promise<string | null> {
  if (!isTauri()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return (await invoke("keyring_get", { service: "io.sequoia.desktop", key })) ?? null;
}

export async function keyringSet(key: string, value: string): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("keyring_set", { service: "io.sequoia.desktop", key, value });
}

/** Subscribe to tray + deep-link events that should affect the running app. */
export async function bindDesktopHooks(router: { push: (p: string) => void }) {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const offs: (() => void)[] = [];

  offs.push(await listen("sequoia://palette/open", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }));

  // Deep links: sequoia://device/<id>
  offs.push(await listen<string>("deep-link://new-url", (e) => {
    try {
      const u = new URL(e.payload);
      router.push(u.pathname);
    } catch { /* ignore */ }
  }));

  return () => offs.forEach((off) => off());
}
