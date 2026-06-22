'use client';

// AuthContext — single source of truth for the logged-in user on the client.
// Reads the access token from localStorage on mount, fetches /auth/me to hydrate.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, type PublicUser } from './api';
import { authStorage } from './auth-storage';

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: PublicUser };

type AuthContextValue = AuthState & {
  /** Called by /login after successful OTP verify. */
  handleSession: (args: { user: PublicUser; tokens: { accessToken: string; refreshToken: string; accessExpiresInSeconds: number } }) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  // Hydrate on mount: if we have a token, ask the server who we are.
  useEffect(() => {
    let alive = true;
    (async () => {
      const session = authStorage.getSession();
      if (!session) {
        if (alive) setState({ status: 'anonymous' });
        return;
      }
      try {
        const user = await api.auth.me();
        if (alive) setState({ status: 'authenticated', user });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Try to refresh.
          try {
            const refresh = authStorage.getRefreshToken();
            if (!refresh) throw err;
            const res = await api.auth.refresh(refresh);
            authStorage.setSession(res.tokens);
            if (alive) setState({ status: 'authenticated', user: res.user });
            return;
          } catch {
            authStorage.clearSession();
            if (alive) setState({ status: 'anonymous' });
            return;
          }
        }
        authStorage.clearSession();
        if (alive) setState({ status: 'anonymous' });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleSession = useCallback<AuthContextValue['handleSession']>(
    ({ user, tokens }) => {
      authStorage.setSession({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresInSeconds: tokens.accessExpiresInSeconds,
      });
      setState({ status: 'authenticated', user });
    },
    [],
  );

  const logout = useCallback(async () => {
    const refresh = authStorage.getRefreshToken();
    if (refresh) {
      try {
        await api.auth.logout(refresh);
      } catch {
        /* best-effort */
      }
    }
    authStorage.clearSession();
    setState({ status: 'anonymous' });
  }, []);

  const refresh = useCallback(async () => {
    const token = authStorage.getRefreshToken();
    if (!token) return;
    try {
      const res = await api.auth.refresh(token);
      authStorage.setSession(res.tokens);
      setState({ status: 'authenticated', user: res.user });
    } catch {
      authStorage.clearSession();
      setState({ status: 'anonymous' });
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, handleSession, logout, refresh }),
    [state, handleSession, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
