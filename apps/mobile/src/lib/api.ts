// Mobile API client — mirror of the web's apps/web/src/lib/api.ts.
// Single-file, plain fetch. Reads API URL from Expo Constants.

import Constants from 'expo-constants';
import { authStorage } from './auth';

const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (withAuth) {
    const t = await authStorage.getAccessToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.code ?? `http_${res.status}`,
      body?.message ?? res.statusText,
    );
  }
  return body as T;
}

// ---------- Types (subset of web) ----------
export type ApiEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImages: string[];
  startsAt: string;
  endsAt: string;
  addressText: string;
  latitude: number;
  longitude: number;
  organiser: { username: string; displayName: string; verified: boolean; avgRating: number };
  society: { slug: string; name: string; city: string } | null;
  stalls: { available: number; booked: number; priceFromPaise: number | null };
  isFeatured?: boolean;
};

export type ApiUser = {
  id: string;
  phone: string | null;
  email: string | null;
  primaryRole: string;
  isVerified: boolean;
  isAdmin: boolean;
  displayName: string | null;
};

export type WalletPayload = {
  wallet: { balancePaise: number; pendingPaise: number };
  entries: Array<{ id: string; direction: 'D' | 'C'; amountPaise: number; reason: string; createdAt: string }>;
};

export type ApiBooking = {
  id: string;
  amountPaise: number;
  status: string;
  createdAt: string;
  event?: { slug: string; title: string; startsAt: string; addressText: string };
  stall?: { category: string };
};

// ---------- API surface ----------
export const api = {
  health: () => call<{ status: string }>('/health'),
  listEvents: () => call<{ items: ApiEvent[]; nextCursor: string | null }>('/events?limit=20'),
  eventBySlug: (slug: string) => call<ApiEvent>(`/events/${encodeURIComponent(slug)}`),
  discover: (lat: number, lng: number) =>
    call<{ items: ApiEvent[] }>('/discover', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, radiusM: 10000 }),
    }),
  auth: {
    requestOtp: (phone: string) =>
      call<{ delivered: true; otpDevOnly?: string }>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    verifyOtp: (phone: string, otp: string) =>
      call<{
        user: ApiUser;
        tokens: {
          accessToken: string;
          refreshToken: string;
          accessExpiresInSeconds: number;
          refreshExpiresInSeconds: number;
        };
      }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      }),
    me: () => call<ApiUser>('/auth/me', {}, true),
    logout: (refreshToken: string) =>
      call<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
  },
  wallet: {
    mine: () => call<WalletPayload>('/wallet', {}, true),
    topup: (amountPaise: number) =>
      call<{ newBalancePaise?: number }>(
        '/wallet/topup',
        { method: 'POST', body: JSON.stringify({ amountPaise }) },
        true,
      ),
  },
  bookings: {
    mine: () => call<ApiBooking[]>('/bookings/mine', {}, true),
  },
};
