// Tiny localStorage wrapper for the auth tokens.
// We migrate to httpOnly cookies in Step 5 — the public shape stays the same
// (everything goes through getAccessToken / setSession / clearSession).

const ACCESS_KEY = 'joinevents.accessToken';
const REFRESH_KEY = 'joinevents.refreshToken';
const ACCESS_EXPIRES_KEY = 'joinevents.accessExpiresAt';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number; // epoch ms
};

export const authStorage = {
  getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  getSession(): StoredSession | null {
    if (!isBrowser()) return null;
    const accessToken = window.localStorage.getItem(ACCESS_KEY);
    const refreshToken = window.localStorage.getItem(REFRESH_KEY);
    const expiresAtRaw = window.localStorage.getItem(ACCESS_EXPIRES_KEY);
    if (!accessToken || !refreshToken || !expiresAtRaw) return null;
    return { accessToken, refreshToken, accessExpiresAt: Number(expiresAtRaw) };
  },
  setSession(s: { accessToken: string; refreshToken: string; accessExpiresInSeconds: number }) {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_KEY, s.accessToken);
    window.localStorage.setItem(REFRESH_KEY, s.refreshToken);
    window.localStorage.setItem(
      ACCESS_EXPIRES_KEY,
      String(Date.now() + s.accessExpiresInSeconds * 1000),
    );
  },
  clearSession() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(ACCESS_EXPIRES_KEY);
  },
};
