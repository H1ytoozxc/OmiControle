"use client";

import { create } from "zustand";

/**
 * Session state — what the client knows about the authenticated user.
 *
 * Storage policy:
 *   - access_token in memory only (vanishes on tab close — refresh re-fetches)
 *   - refresh_token in localStorage (acceptable trade-off for v0.1; longer-
 *     term we want the gateway to set it as a Secure HttpOnly cookie so JS
 *     can't read it)
 *   - tenant + tokens are read once on mount via hydrate()
 *
 * Components should never write to localStorage directly — go through the
 * setSession / clearSession actions so all subscribers stay in sync.
 */

const REFRESH_KEY = "sequoia_refresh";
const TENANT_KEY = "sequoia_tenant";

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  tenantId: string | null;
  /// True once hydrate() ran — components use this to avoid flashing the
  /// login redirect before localStorage was read.
  hydrated: boolean;

  hydrate: () => void;
  setSession: (s: { accessToken: string; refreshToken: string; tenantId: string }) => void;
  clearSession: () => void;
}

export const useSession = create<SessionState>((set) => ({
  accessToken: null,
  refreshToken: null,
  tenantId: null,
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const tenantId = localStorage.getItem(TENANT_KEY);
    set({ refreshToken, tenantId, hydrated: true });
  },

  setSession: ({ accessToken, refreshToken, tenantId }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(REFRESH_KEY, refreshToken);
      localStorage.setItem(TENANT_KEY, tenantId);
      // Presence cookie read by middleware (Edge) to gate (app) routes.
      // Not a secret — real auth is the access JWT sent to the API.
      document.cookie = `sq_auth=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
    set({ accessToken, refreshToken, tenantId, hydrated: true });
  },

  clearSession: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(TENANT_KEY);
      document.cookie = "sq_auth=; path=/; max-age=0";
    }
    set({ accessToken: null, refreshToken: null, tenantId: null });
  },
}));

/// Snapshot helper used by non-React code (api/client.ts) that can't subscribe.
export function getAccessToken(): string | null {
  return useSession.getState().accessToken;
}

export function getRefreshToken(): string | null {
  return useSession.getState().refreshToken;
}
