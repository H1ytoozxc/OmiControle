"use client";

/**
 * Sequoia realtime client.
 *
 * Responsibilities:
 *   - Open the WebSocket against the realtime-gateway using a short-lived ticket
 *     (60s TTL) issued by auth-service. The ticket is fetched on every connect
 *     attempt — JWT never travels in the URL.
 *   - Reconnect with full-jitter exponential backoff (max 30s), reset on success.
 *   - Heartbeat: WS protocol-level ping is enough on browsers; the server pings
 *     every 20s and we autoreply via the browser. Layer a 30s app-level
 *     liveness pong: if no envelope in 30s we treat the socket as dead.
 *   - Emit RxEnvelope events to subscribers; integrates with Zustand store.
 *   - Buffer outbound messages while offline (bounded 256 frames).
 */

import type { Envelope } from "@/types/events";

type Listener = (env: Envelope) => void;
type Status = "idle" | "connecting" | "open" | "closed" | "errored";

interface ClientOptions {
  url: string;
  fetchTicket: () => Promise<string>;
  onStatus?: (s: Status, detail?: string) => void;
}

const MAX_QUEUE = 256;
const MAX_BACKOFF_MS = 30_000;
const LIVENESS_MS = 30_000;

export class RealtimeClient {
  private ws?: WebSocket;
  private listeners = new Set<Listener>();
  private outbox: string[] = [];
  private backoff = 0;
  private attempt = 0;
  private liveness?: ReturnType<typeof setTimeout>;
  private destroyed = false;

  constructor(private opts: ClientOptions) {}

  connect() {
    if (this.destroyed) return;
    this.report("connecting");
    this.opts
      .fetchTicket()
      .then((ticket) => {
        const url = new URL(this.opts.url);
        url.searchParams.set("ticket", ticket);
        this.ws = new WebSocket(url.toString());
        this.ws.onopen = () => {
          this.attempt = 0;
          this.backoff = 0;
          this.report("open");
          for (const f of this.outbox.splice(0)) this.ws!.send(f);
          this.resetLiveness();
        };
        this.ws.onmessage = (e) => {
          this.resetLiveness();
          if (typeof e.data === "string") {
            try {
              const env = JSON.parse(e.data) as Envelope;
              for (const l of this.listeners) l(env);
            } catch {
              // ignore — server may also send opaque control frames
            }
          }
        };
        this.ws.onclose = (e) => {
          this.report("closed", `code=${e.code}`);
          this.scheduleReconnect();
        };
        this.ws.onerror = () => {
          this.report("errored");
          this.ws?.close();
        };
      })
      .catch((err) => {
        this.report("errored", String(err?.message ?? err));
        this.scheduleReconnect();
      });
  }

  send(frame: object) {
    const data = JSON.stringify(frame);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(data);
    else {
      if (this.outbox.length >= MAX_QUEUE) this.outbox.shift();
      this.outbox.push(data);
    }
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  destroy() {
    this.destroyed = true;
    this.ws?.close();
  }

  private resetLiveness() {
    clearTimeout(this.liveness);
    this.liveness = setTimeout(() => {
      // Stale connection — close and let reconnect fire.
      try { this.ws?.close(); } catch {}
    }, LIVENESS_MS);
  }

  private scheduleReconnect() {
    if (this.destroyed) return;
    this.attempt++;
    const base = Math.min(500 * 2 ** this.attempt, MAX_BACKOFF_MS);
    const jitter = Math.random() * base;
    this.backoff = jitter;
    setTimeout(() => this.connect(), jitter);
  }

  private report(s: Status, d?: string) {
    this.opts.onStatus?.(s, d);
  }
}
