/**
 * Typed fetch wrapper.
 *
 * Conventions:
 *   - All non-2xx throw an ApiError carrying status + RFC-7807 problem details.
 *   - Adds `Authorization: Bearer <access_token>` from the session store when
 *     present. The gateway also accepts cookies, kept on for forward-compat.
 *   - `x-correlation-id` minted client-side for trace continuity if the
 *     SSR layer didn't supply one.
 *   - On 401, tries one silent token refresh then retries the original request.
 */

import { getAccessToken, getRefreshToken, useSession } from "@/lib/auth/session";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public traceId?: string
  ) { super(message); this.name = "ApiError"; }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  searchParams?: Record<string, string | number | undefined>;
  /** Internal — prevents infinite refresh loops. */
  _retry?: boolean;
}

const BASE = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function doFetch<T>(path: string, opts: RequestOptions): Promise<T> {
  const url = new URL(path, BASE());
  for (const [k, v] of Object.entries(opts.searchParams ?? {}))
    if (v !== undefined) url.searchParams.set(k, String(v));

  const corr = crypto.randomUUID().replace(/-/g, "");
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "accept": "application/json",
    "x-correlation-id": corr,
    ...((opts.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    credentials: "include",
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache,
    signal: opts.signal,
  });

  if (res.status === 401 && !opts._retry) {
    // Try to refresh and retry once
    const refreshed = await tryRefresh();
    if (refreshed) return doFetch<T>(path, { ...opts, _retry: true });
    // Refresh failed — clear session (middleware will redirect to /login)
    useSession.getState().clearSession();
  }

  if (!res.ok) {
    let problem: { code?: string; detail?: string; trace_id?: string } = {};
    try { problem = await res.json(); } catch {}
    throw new ApiError(
      res.status,
      problem.code ?? `http_${res.status}`,
      problem.detail ?? res.statusText,
      problem.trace_id ?? corr
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Attempt a silent refresh. Returns true if a new access token was stored. */
let refreshingPromise: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  // Deduplicate: if a refresh is in flight, wait for it
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    const rt = getRefreshToken();
    const tenantId = useSession.getState().tenantId ?? "";
    if (!rt) return false;
    try {
      const res = await fetch(`${BASE()}/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return false;
      const resp: { access_token: string; refresh_token: string } = await res.json();
      useSession.getState().setSession({
        accessToken: resp.access_token,
        refreshToken: resp.refresh_token,
        tenantId,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshingPromise = null;
    }
  })();
  return refreshingPromise;
}

export function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return doFetch<T>(path, opts);
}
