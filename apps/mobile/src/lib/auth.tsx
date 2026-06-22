import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, type ApiUser } from './api';

const ACCESS = 'je.accessToken';
const REFRESH = 'je.refreshToken';

export const authStorage = {
  async getAccessToken() {
    return AsyncStorage.getItem(ACCESS);
  },
  async getRefreshToken() {
    return AsyncStorage.getItem(REFRESH);
  },
  async setSession(accessToken: string, refreshToken: string) {
    await AsyncStorage.multiSet([
      [ACCESS, accessToken],
      [REFRESH, refreshToken],
    ]);
  },
  async clear() {
    await AsyncStorage.multiRemove([ACCESS, REFRESH]);
  },
};

type State =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: ApiUser };

type Ctx = State & {
  signInAfterOtp(user: ApiUser, accessToken: string, refreshToken: string): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      const token = await authStorage.getAccessToken();
      if (!token) {
        setState({ status: 'anonymous' });
        return;
      }
      try {
        const user = await api.auth.me();
        setState({ status: 'authenticated', user });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await authStorage.clear();
        }
        setState({ status: 'anonymous' });
      }
    })();
  }, []);

  const signInAfterOtp = useCallback(
    async (user: ApiUser, accessToken: string, refreshToken: string) => {
      await authStorage.setSession(accessToken, refreshToken);
      setState({ status: 'authenticated', user });
    },
    [],
  );

  const signOut = useCallback(async () => {
    const refresh = await authStorage.getRefreshToken();
    if (refresh) {
      try {
        await api.auth.logout(refresh);
      } catch {}
    }
    await authStorage.clear();
    setState({ status: 'anonymous' });
  }, []);

  const ctx = useMemo<Ctx>(() => ({ ...state, signInAfterOtp, signOut }), [
    state,
    signInAfterOtp,
    signOut,
  ]);

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
