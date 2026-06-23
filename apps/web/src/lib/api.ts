// Typed API client. Single place that knows how to talk to the backend.
// Step 3: adds auth methods + access-token injection on every call.

import { authStorage } from './auth-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

// ---------- Event types (Step 2) ----------
export type ApiStall = {
  id: string;
  category: string;
  pricePaise: number;
  available: number;
  booked: number;
  slotsLeft: number;
  facilities: Record<string, unknown>;
};

export type ApiEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImages: string[];
  startsAt: string;
  endsAt: string;
  addressText: string;
  capacity: number | null;
  latitude: number;
  longitude: number;
  metadata: Record<string, unknown>;
  /** Present only on /discover responses. */
  distanceM?: number;
  /** Active FeaturedListing exists. */
  isFeatured?: boolean;
  organiser: {
    id?: string;
    username: string;
    displayName: string;
    verified: boolean;
    avgRating: number;
  };
  society: {
    slug: string;
    name: string;
    city: string;
    reputationScore: number;
  } | null;
  stalls: {
    available: number;
    booked: number;
    priceFromPaise: number | null;
  };
  /** Present only on detail (findBySlug) responses. */
  stallsList?: ApiStall[];
};

export type ListEventsResponse = {
  items: ApiEvent[];
  nextCursor: string | null;
};

// ---------- Discover (Step 4) ----------
export type DiscoverRequest = {
  lat: number;
  lng: number;
  radiusM?: number;
  daysAhead?: number;
  categories?: string[];
  limit?: number;
};

export type DiscoverResponse = {
  items: ApiEvent[];
  meta: { lat: number; lng: number; radiusM: number };
};

// ---------- Business profiles (Step 5) ----------
export type PublicBusinessProfile = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  type: 'organiser' | 'vendor';
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
  verified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected';
  followersCount: number;
  postsCount: number;
  avgRating: number;
  createdAt: string;
  /** Set on detail responses when the request is authenticated (Step 7b). */
  isFollowing?: boolean;
};

// ---------- Vendor application workflow ----------
export const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'payment_pending',
  'booked',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type ApplicationStatusFilter = ApplicationStatus | 'all';

export type PublicApplication = {
  id: string;
  status: ApplicationStatus;
  businessName: string;
  category: string;
  productType: string | null;
  message: string | null;
  rejectionReason: string | null;
  createdAt: string;
  decisionAt: string | null;
  event: {
    id: string;
    slug: string;
    title: string;
    startsAt: string;
    endsAt: string;
    coverImage: string | null;
    organiserUsername: string;
  };
  applicant: {
    id: string;
    displayName: string | null;
    profileUsername: string | null;
    profileAvatarUrl: string | null;
  };
};

// ---------- Posts (Facebook-style profile feed) ----------
export type PublicPost = {
  id: string;
  kind: 'text' | 'event' | 'image';
  content: string;
  mediaUrls: string[];
  eventId: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  liked: boolean;
  profile: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    verified: boolean;
    type: 'organiser' | 'vendor';
  };
};

export type PublicComment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export type PostPage = { items: PublicPost[]; nextCursor: string | null };

// ---------- Followers (Step 7b) ----------
export type FollowedProfile = {
  id: string;
  username: string;
  displayName: string;
  type: 'organiser' | 'vendor';
  verified: boolean;
  followersCount: number;
  avgRating: number;
  followedAt: string;
};

export type FollowToggleResponse = {
  isFollowing: boolean;
  followersCount: number;
};

export type CreateBusinessProfileBody = {
  username: string;
  displayName: string;
  type: 'organiser' | 'vendor';
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  location?: string;
};

// ---------- Societies (Step 5) ----------
export type PublicSociety = {
  id: string;
  slug: string;
  name: string;
  city: string;
  type: 'gated' | 'sector' | 'locality';
  centroidLat: number;
  centroidLng: number;
  reputationScore: number;
  eventsCount: number;
};

// ---------- Event mutation (Step 5) ----------
export type CreateEventBody = {
  title: string;
  description: string;
  societySlug?: string;
  addressText: string;
  latitude: number;
  longitude: number;
  startsAt: string; // ISO
  endsAt: string;
  /** @deprecated Use coverImageUrls. */
  coverImageUrl?: string;
  /** Up to 8 cover photos shown as a gallery on the event page. */
  coverImageUrls?: string[];
  capacity?: number;
  metadata?: Record<string, unknown>;
  stalls: Array<{
    category: string;
    pricePaise: number;
    available: number;
    facilities?: Record<string, unknown>;
  }>;
};

export type OwnerEvent = ApiEvent & { status: string };

// ---------- Wallet (Step 6) ----------
export type ApiWallet = {
  id: string;
  ownerType: 'user' | 'business' | 'platform';
  ownerId: string | null;
  currency: 'INR';
  balancePaise: number;
  pendingPaise: number;
  createdAt: string;
};

export type ApiWalletEntry = {
  id: string;
  walletId: string;
  txnId: string;
  direction: 'D' | 'C';
  amountPaise: number;
  reason: string;
  bucket: 'available' | 'pending';
  meta: Record<string, unknown>;
  createdAt: string;
};

export type WalletPayload = {
  wallet: ApiWallet;
  entries: ApiWalletEntry[];
};

export type TopupResponse =
  | {
      provider: 'stub';
      status: 'completed';
      paymentEventId: string;
      newBalancePaise: number;
    }
  | {
      provider: 'payu';
      status: 'redirect_required';
      paymentEventId: string;
      paymentUrl: string;
    };

// ---------- Subscriptions (CLOSEOUT) ----------
export type ApiPlan = {
  id: string;
  code: string;
  name: string;
  pricePaise: number;
  billingCycle: string;
  benefits: string[];
};

export type ApiSubscription = {
  id: string;
  planCode: string;
  planName: string;
  status: string;
  startedAt: string;
  nextBillingAt: string;
  cancelledAt: string | null;
};

// ---------- KYC (CLOSEOUT) ----------
export type ApiKycRequest = {
  id: string;
  businessProfileId: string;
  status: 'submitted' | 'in_review' | 'approved' | 'rejected';
  companyName: string | null;
  registrationType: string | null;
  registrationNo: string | null;
  panNumber: string | null;
  aadhaarLast4: string | null;
  gstin: string | null;
  rwaPermissionNote: string | null;
  reviewerNote: string | null;
  documents: Array<{
    id: string;
    kind: string;
    filename: string;
    sizeBytes: number;
    contentType: string;
    downloadUrl: string;
  }>;
  createdAt: string;
};

// ---------- Society posts (CLOSEOUT) ----------
export type ApiSocietyPost = {
  id: string;
  societyId: string;
  title: string;
  body: string;
  author: { label: string };
  createdAt: string;
  replyCount: number;
};

export type ApiPostReply = {
  id: string;
  postId: string;
  body: string;
  author: { label: string };
  createdAt: string;
};

// ---------- Withdrawals (FINAL) ----------
export type ApiWithdrawal = {
  id: string;
  userId: string;
  amountPaise: number;
  feePaise: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  bankAccountRef: string | null;
  ifsc: string | null;
  accountHolder: string | null;
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type WithdrawRequestBody = {
  amountPaise: number;
  bankAccountRef: string;
  ifsc: string;
  accountHolder: string;
  note?: string;
};

// ---------- Featured (FINAL) ----------
export type FeaturedTier = 'boost' | 'spotlight' | 'city';
export type FeaturedTierInfo = {
  tier: FeaturedTier;
  label: string;
  durationDays: number;
  pricePaise: number;
};

// ---------- Notifications (Step 7d) ----------
export type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  meta: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsListResponse = {
  items: ApiNotification[];
  nextCursor: string | null;
};

// ---------- Admin (Step 8) ----------
export type AdminOverview = {
  users: { total: number; verified: number; admins: number };
  businessProfiles: { total: number; verified: number; pendingKyc: number };
  events: { total: number; live: number; draft: number; cancelled: number };
  bookings: { confirmed: number; cancelled: number; released: number };
  reviews: { total: number; flagged: number };
  ledger: { debitsPaise: number; creditsPaise: number; balanced: boolean };
  recentAuditCount: number;
};

export type PendingKycCase = {
  id: string;
  username: string;
  displayName: string;
  type: 'organiser' | 'vendor';
  bio: string | null;
  createdAt: string;
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    createdAt: string;
  };
  flags: string[];
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  targetTable: string;
  targetId: string;
  note: string | null;
  diff: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; label: string };
};

// ---------- Bookings (Step 6b) ----------
export type ApiBooking = {
  id: string;
  stallId: string;
  amountPaise: number;
  platformFeePaise: number;
  escrowHeldPaise: number;
  status: 'confirmed' | 'cancelled' | 'released';
  bookingTxnId: string;
  createdAt: string;
  stall?: { category: string; pricePaise: number };
  event?: {
    slug: string;
    title: string;
    startsAt: string;
    endsAt: string;
    addressText: string;
  };
};

export type BookStallResponse = {
  booking: ApiBooking;
  newWalletBalancePaise: number;
};

// ---------- Reviews (Step 7) ----------
export type ApiReview = {
  id: string;
  stars: number;
  body: string | null;
  createdAt: string;
  author: { label: string };
};

export type ReviewsSummary = {
  count: number;
  average: number;
  bayesian: number;
  histogram: { 1: number; 2: number; 3: number; 4: number; 5: number };
};

export type ReviewsListResponse = {
  items: ApiReview[];
  summary: ReviewsSummary;
  nextCursor: string | null;
};

export type CreateReviewResponse = {
  review: ApiReview;
  summary: ReviewsSummary;
};

export type HealthResponse = {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  uptime_seconds: number;
};

// ---------- Auth types (Step 3) ----------
export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds: number;
  refreshExpiresInSeconds: number;
};

export type UserRole = 'user' | 'organiser' | 'vendor';

export type PublicUser = {
  id: string;
  phone: string | null;
  email: string | null;
  emailVerified?: boolean;
  primaryRole: UserRole | string;
  isVerified: boolean;
  isAdmin: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  city: string | null;
  /** ISO timestamp of when the user completed first-run onboarding. */
  onboardedAt: string | null;
  authMethods?: Array<'phone' | 'email' | 'google'>;
};

export type OtpRequestResponse = { delivered: true; otpDevOnly?: string };
export type AuthSessionResponse = { user: PublicUser; tokens: AuthTokens };

// ---------- Errors ----------
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public payload?: unknown,
  ) {
    super(message);
  }
}

// ============================================================
// Auto-refresh-on-401
// JWT access tokens expire after ~15 minutes. Rather than surfacing every
// expiry as a hard error, we transparently refresh once and retry the call.
// A single-flight `inflightRefresh` promise dedupes concurrent 401s so we
// only hit /auth/refresh once even if 10 requests fire simultaneously.
// ============================================================
let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
      if (!res.ok) {
        // Refresh token is expired/revoked — clear the session so the user
        // gets bounced to /login on the next auth-context tick.
        authStorage.clearSession();
        return null;
      }
      const body = (await res.json()) as AuthSessionResponse;
      authStorage.setSession({
        accessToken: body.tokens.accessToken,
        refreshToken: body.tokens.refreshToken,
        accessExpiresInSeconds: body.tokens.accessExpiresInSeconds,
      });
      return body.tokens.accessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await inflightRefresh;
  } finally {
    inflightRefresh = null;
  }
}

async function call<T>(
  path: string,
  init: RequestInit = {},
  withAuth: boolean = false,
): Promise<T> {
  const send = async (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${API_URL}${path}`, { cache: 'no-store', ...init, headers });
  };

  const initialToken =
    withAuth && typeof window !== 'undefined' ? authStorage.getAccessToken() : null;
  let res = await send(initialToken);

  // Transparent retry on 401 for authenticated calls — try refreshing once.
  if (res.status === 401 && withAuth && typeof window !== 'undefined') {
    const fresh = await refreshAccessToken();
    if (fresh) res = await send(fresh);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const code =
      (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
        ? body.code
        : `http_${res.status}`) ?? `http_${res.status}`;
    const message =
      (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : res.statusText) ?? 'Request failed';
    throw new ApiError(res.status, code, message, body);
  }
  return body as T;
}

// ============================================================
// PRODUCTS (vendor catalogue) + ENQUIRIES
// ============================================================
export type PublicProduct = {
  id: string;
  profileId: string;
  name: string;
  description: string | null;
  category: string | null;
  priceFromPaise: number;
  imageUrls: string[];
  isActive: boolean;
  createdAt: string;
};

export type CreateProductBody = {
  name: string;
  description?: string | null;
  category?: string | null;
  priceFromPaise: number;
  imageUrls: string[];
};

export type UpdateProductBody = Partial<CreateProductBody> & { isActive?: boolean };

export type PublicEnquiry = {
  id: string;
  product: { id: string; name: string; imageUrls: string[] };
  message: string;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  status: 'new' | 'read' | 'replied' | 'closed' | string;
  ownerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  fromUser: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export type CreateEnquiryBody = {
  productId: string;
  message: string;
  buyerName?: string | null;
  buyerPhone?: string | null;
  buyerEmail?: string | null;
};

export type ProfileFollower = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export const api = {
  // public
  health: () => call<HealthResponse>('/health'),
  listEvents: (params: {
    city?: string;
    category?: string;
    societySlug?: string;
    verifiedOnly?: boolean;
    minPricePaise?: number;
    maxPricePaise?: number;
    q?: string;
    sort?: 'date' | 'trending' | 'featured';
    limit?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.city) q.set('city', params.city);
    if (params.category) q.set('category', params.category);
    if (params.societySlug) q.set('societySlug', params.societySlug);
    if (params.verifiedOnly) q.set('verifiedOnly', 'true');
    if (params.minPricePaise != null) q.set('minPricePaise', String(params.minPricePaise));
    if (params.maxPricePaise != null) q.set('maxPricePaise', String(params.maxPricePaise));
    if (params.q) q.set('q', params.q);
    if (params.sort) q.set('sort', params.sort);
    if (params.limit) q.set('limit', String(params.limit));
    const suffix = q.toString();
    return call<ListEventsResponse>(`/events${suffix ? `?${suffix}` : ''}`);
  },
  discover: (body: DiscoverRequest) =>
    call<DiscoverResponse>('/discover', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  societies: {
    list: (city?: string) =>
      call<PublicSociety[]>(`/societies${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  },

  profiles: {
    mine: () => call<PublicBusinessProfile[]>('/business-profiles/me', {}, /* withAuth */ true),
    updateMine: (body: {
      username?: string;
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      coverUrl?: string | null;
      location?: string | null;
      websiteUrl?: string | null;
      instagramUrl?: string | null;
      facebookUrl?: string | null;
      twitterUrl?: string | null;
      linkedinUrl?: string | null;
      youtubeUrl?: string | null;
    }) =>
      call<PublicBusinessProfile>(
        '/business-profiles/me',
        { method: 'PATCH', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
    // Optional auth — server includes isFollowing when token present.
    byUsername: (username: string) =>
      call<PublicBusinessProfile>(
        `/business-profiles/${encodeURIComponent(username)}`,
        {},
        /* withAuth */ true,
      ),
    search: (q: string, opts: { type?: 'organiser' | 'vendor'; limit?: number } = {}) => {
      const qs = new URLSearchParams({ q });
      if (opts.type) qs.set('type', opts.type);
      if (opts.limit) qs.set('limit', String(opts.limit));
      return call<PublicBusinessProfile[]>(`/business-profiles/search?${qs.toString()}`);
    },
    // Popular profiles for the default Explore state (no search query).
    discover: (opts: { type?: 'organiser' | 'vendor'; limit?: number } = {}) => {
      const qs = new URLSearchParams();
      if (opts.type) qs.set('type', opts.type);
      if (opts.limit) qs.set('limit', String(opts.limit));
      const suffix = qs.toString();
      return call<PublicBusinessProfile[]>(
        `/business-profiles/discover${suffix ? `?${suffix}` : ''}`,
      );
    },
    create: (body: CreateBusinessProfileBody) =>
      call<PublicBusinessProfile>(
        '/business-profiles',
        { method: 'POST', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
  },

  follow: {
    follow: (username: string) =>
      call<FollowToggleResponse>(
        `/business-profiles/${encodeURIComponent(username)}/follow`,
        { method: 'POST' },
        /* withAuth */ true,
      ),
    unfollow: (username: string) =>
      call<FollowToggleResponse>(
        `/business-profiles/${encodeURIComponent(username)}/follow`,
        { method: 'DELETE' },
        /* withAuth */ true,
      ),
    listFollowing: () =>
      call<FollowedProfile[]>('/following', {}, /* withAuth */ true),
  },

  // File uploads (multipart/form-data) — returns absolute or app-relative URLs.
  uploads: {
    profileImage: async (
      file: File,
    ): Promise<{ url: string; key: string; bytes: number }> => {
      // Multipart uploads can't go through call() (FormData body), so we
      // duplicate the auth + refresh-on-401 logic here.
      const send = async (token: string | null): Promise<Response> => {
        const fd = new FormData();
        fd.append('file', file);
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        return fetch(`${API_URL}/uploads/profile-image`, {
          method: 'POST',
          body: fd,
          headers,
        });
      };

      const initialToken =
        typeof window !== 'undefined' ? authStorage.getAccessToken() : null;
      let res = await send(initialToken);

      // Transparent refresh-and-retry on 401, matching call().
      if (res.status === 401 && typeof window !== 'undefined') {
        const fresh = await refreshAccessToken();
        if (fresh) res = await send(fresh);
      }

      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const code =
          (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
            ? body.code
            : `http_${res.status}`) ?? `http_${res.status}`;
        const message =
          (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
            ? body.message
            : res.statusText) ?? 'Upload failed';
        throw new ApiError(res.status, code, message, body);
      }
      const out = body as { url: string; key: string; bytes: number };
      // Local driver returns "/api/v1/storage/..." — convert to absolute against API host.
      if (out.url.startsWith('/')) {
        const apiOrigin = API_URL.replace(/\/api\/v\d+\/?$/, '');
        out.url = `${apiOrigin}${out.url}`;
      }
      return out;
    },
  },

  // Vendor application workflow
  applications: {
    submit: (
      slug: string,
      body: {
        businessName: string;
        category: string;
        productType?: string;
        message?: string;
      },
    ) =>
      call<PublicApplication>(
        `/events/${encodeURIComponent(slug)}/apply`,
        { method: 'POST', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
    mine: (status: ApplicationStatusFilter = 'all') => {
      const qs = status === 'all' ? '' : `?status=${status}`;
      return call<PublicApplication[]>(`/applications/mine${qs}`, {}, /* withAuth */ true);
    },
    received: (status: ApplicationStatusFilter = 'all') => {
      const qs = status === 'all' ? '' : `?status=${status}`;
      return call<PublicApplication[]>(
        `/applications/received${qs}`,
        {},
        /* withAuth */ true,
      );
    },
    decide: (
      id: string,
      body: { decision: 'approve' | 'reject' | 'under_review'; rejectionReason?: string },
    ) =>
      call<PublicApplication>(
        `/applications/${encodeURIComponent(id)}/decide`,
        { method: 'PATCH', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
  },

  // Facebook-style posts (FB-CORE)
  posts: {
    create: (body: { content: string; mediaUrls?: string[]; eventId?: string }) =>
      call<PublicPost>(
        '/posts',
        { method: 'POST', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
    listForProfile: (username: string, cursor?: string) => {
      const q = new URLSearchParams();
      if (cursor) q.set('cursor', cursor);
      const s = q.toString();
      return call<PostPage>(
        `/posts/profile/${encodeURIComponent(username)}${s ? `?${s}` : ''}`,
        {},
        /* withAuth */ true,
      );
    },
    feed: (cursor?: string) => {
      const q = new URLSearchParams();
      if (cursor) q.set('cursor', cursor);
      const s = q.toString();
      return call<PostPage>(`/posts/feed${s ? `?${s}` : ''}`, {}, /* withAuth */ true);
    },
    like: (id: string) =>
      call<{ liked: boolean; likesCount: number }>(
        `/posts/${encodeURIComponent(id)}/like`,
        { method: 'POST' },
        /* withAuth */ true,
      ),
    listComments: (id: string) =>
      call<PublicComment[]>(`/posts/${encodeURIComponent(id)}/comments`),
    addComment: (id: string, content: string) =>
      call<PublicComment>(
        `/posts/${encodeURIComponent(id)}/comments`,
        { method: 'POST', body: JSON.stringify({ content }) },
        /* withAuth */ true,
      ),
    remove: (id: string) =>
      call<{ ok: true }>(
        `/posts/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
        /* withAuth */ true,
      ),
  },

  // ============================================================
  // PRODUCTS — vendor-only CRUD + public catalogue read.
  // ============================================================
  products: {
    listForUsername: (username: string) =>
      call<PublicProduct[]>(`/products/by-username/${encodeURIComponent(username)}`),
    mine: () => call<PublicProduct[]>('/products/mine', {}, /* withAuth */ true),
    get: (id: string) => call<PublicProduct>(`/products/${encodeURIComponent(id)}`),
    create: (body: CreateProductBody) =>
      call<PublicProduct>(
        '/products',
        { method: 'POST', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
    update: (id: string, body: UpdateProductBody) =>
      call<PublicProduct>(
        `/products/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
    delete: (id: string) =>
      call<{ ok: true }>(
        `/products/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
        /* withAuth */ true,
      ),
  },

  // ============================================================
  // ENQUIRIES — buyer -> stall-owner messages.
  // ============================================================
  enquiries: {
    create: (body: CreateEnquiryBody) =>
      call<PublicEnquiry>(
        '/enquiries',
        { method: 'POST', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
    received: () =>
      call<PublicEnquiry[]>('/enquiries/received', {}, /* withAuth */ true),
    reply: (id: string, reply: string) =>
      call<PublicEnquiry>(
        `/enquiries/${encodeURIComponent(id)}/reply`,
        { method: 'PATCH', body: JSON.stringify({ reply }) },
        /* withAuth */ true,
      ),
    markRead: (id: string) =>
      call<PublicEnquiry>(
        `/enquiries/${encodeURIComponent(id)}/read`,
        { method: 'PATCH' },
        /* withAuth */ true,
      ),
  },

  // Org public page endpoints (Step 7c)
  org: {
    followers: (username: string) =>
      call<ProfileFollower[]>(
        `/business-profiles/${encodeURIComponent(username)}/followers`,
      ),
    events: (username: string, when: 'upcoming' | 'past' = 'upcoming') =>
      call<ApiEvent[]>(
        `/business-profiles/${encodeURIComponent(username)}/events?when=${when}`,
      ),
    reviews: (username: string) =>
      call<{
        items: Array<ApiReview & { event: { slug: string; title: string } }>;
        summary: ReviewsSummary;
      }>(`/business-profiles/${encodeURIComponent(username)}/reviews`),
  },

  notifications: {
    list: (params: { onlyUnread?: boolean; cursor?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.onlyUnread) q.set('onlyUnread', 'true');
      if (params.cursor) q.set('cursor', params.cursor);
      const suffix = q.toString();
      return call<NotificationsListResponse>(
        `/notifications${suffix ? `?${suffix}` : ''}`,
        {},
        /* withAuth */ true,
      );
    },
    unreadCount: () =>
      call<{ unread: number }>('/notifications/unread-count', {}, /* withAuth */ true),
    markRead: (id: string) =>
      call<{ ok: true }>(
        `/notifications/${encodeURIComponent(id)}/read`,
        { method: 'POST' },
        /* withAuth */ true,
      ),
    markAllRead: () =>
      call<{ markedRead: number }>(
        '/notifications/read-all',
        { method: 'POST' },
        /* withAuth */ true,
      ),
  },

  // Admin (Step 8)
  admin: {
    overview: () => call<AdminOverview>('/admin/overview', {}, /* withAuth */ true),
    listPendingKyc: () =>
      call<PendingKycCase[]>('/admin/kyc/pending', {}, /* withAuth */ true),
    approveKyc: (profileId: string, note?: string) =>
      call<{ ok: true; kycStatus: 'approved' }>(
        `/admin/kyc/${encodeURIComponent(profileId)}/approve`,
        { method: 'POST', body: JSON.stringify({ note }) },
        /* withAuth */ true,
      ),
    rejectKyc: (
      profileId: string,
      input: {
        reason?:
          | 'docs_unreadable'
          | 'docs_mismatch'
          | 'duplicate_account'
          | 'suspicious_activity'
          | 'incomplete_information'
          | 'other';
        note?: string;
      },
    ) =>
      call<{ ok: true; kycStatus: 'rejected' }>(
        `/admin/kyc/${encodeURIComponent(profileId)}/reject`,
        { method: 'POST', body: JSON.stringify(input) },
        /* withAuth */ true,
      ),
    auditLog: () =>
      call<AdminAuditEntry[]>('/admin/audit-log', {}, /* withAuth */ true),
  },

  events: {
    create: (body: CreateEventBody) =>
      call<OwnerEvent>('/events', { method: 'POST', body: JSON.stringify(body) }, /* withAuth */ true),
    update: (id: string, body: Partial<CreateEventBody>) =>
      call<OwnerEvent>(
        `/events/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
    submit: (id: string) =>
      call<{ status: string }>(
        `/events/${encodeURIComponent(id)}/submit`,
        { method: 'POST' },
        /* withAuth */ true,
      ),
    mine: () => call<OwnerEvent[]>('/events/mine', {}, /* withAuth */ true),
    delete: (id: string) =>
      call<{ ok: true }>(
        `/events/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
        /* withAuth */ true,
      ),
  },

  wallet: {
    mine: () => call<WalletPayload>('/wallet', {}, /* withAuth */ true),
    sparkline: (days = 30) =>
      call<{ points: Array<{ date: string; balance: number }> }>(
        `/wallet/sparkline?days=${days}`,
        {},
        /* withAuth */ true,
      ),
    breakdown: () =>
      call<{
        totalPaise: number;
        categories: Array<{ reason: string; amountPaise: number; pct: number }>;
      }>('/wallet/breakdown', {}, /* withAuth */ true),
    topup: (amountPaise: number) =>
      call<TopupResponse>(
        '/wallet/topup',
        { method: 'POST', body: JSON.stringify({ amountPaise }) },
        /* withAuth */ true,
      ),
    audit: () =>
      call<{ debitsPaise: number; creditsPaise: number; balanced: boolean }>(
        '/wallet/_audit',
      ),
  },

  bookings: {
    book: (eventId: string, stallId: string) =>
      call<BookStallResponse>(
        `/events/${encodeURIComponent(eventId)}/stalls/${encodeURIComponent(stallId)}/book`,
        { method: 'POST' },
        /* withAuth */ true,
      ),
    mine: () => call<ApiBooking[]>('/bookings/mine', {}, /* withAuth */ true),
    cancel: (id: string) =>
      call<{ ok: true; refundedPaise: number; newWalletBalancePaise: number }>(
        `/bookings/${encodeURIComponent(id)}/cancel`,
        { method: 'POST' },
        /* withAuth */ true,
      ),
  },

  withdrawals: {
    request: (body: WithdrawRequestBody) =>
      call<ApiWithdrawal>(
        '/wallet/withdraw',
        { method: 'POST', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
    mine: () => call<ApiWithdrawal[]>('/wallet/withdraw/mine', {}, /* withAuth */ true),
    pending: () =>
      call<Array<ApiWithdrawal & { userLabel: string }>>(
        '/admin/withdrawals',
        {},
        /* withAuth */ true,
      ),
    decide: (id: string, approve: boolean, note?: string) =>
      call<{ ok: true }>(
        `/admin/withdrawals/${encodeURIComponent(id)}/decide`,
        { method: 'POST', body: JSON.stringify({ approve, note }) },
        /* withAuth */ true,
      ),
  },

  featured: {
    tiers: () => call<FeaturedTierInfo[]>('/featured/tiers'),
    boost: (eventId: string, tier: FeaturedTier) =>
      call<{ featured: { id: string; tier: FeaturedTier; endsAt: string }; newWalletBalancePaise: number }>(
        `/events/${encodeURIComponent(eventId)}/boost`,
        { method: 'POST', body: JSON.stringify({ tier }) },
        /* withAuth */ true,
      ),
  },

  subscriptions: {
    plans: () => call<ApiPlan[]>('/subscriptions/plans'),
    mine: () => call<ApiSubscription[]>('/subscriptions/mine', {}, /* withAuth */ true),
    subscribe: (planCode: string) =>
      call<{ subscription: ApiSubscription; newWalletBalancePaise: number }>(
        '/subscriptions',
        { method: 'POST', body: JSON.stringify({ planCode }) },
        /* withAuth */ true,
      ),
    cancel: (id: string) =>
      call<{ ok: true }>(
        `/subscriptions/${encodeURIComponent(id)}/cancel`,
        { method: 'POST' },
        /* withAuth */ true,
      ),
  },

  kyc: {
    mine: () => call<ApiKycRequest | null>('/kyc/mine', {}, /* withAuth */ true),
    submit: async (form: FormData) => {
      const token =
        typeof window !== 'undefined'
          ? (await import('./auth-storage')).authStorage.getAccessToken()
          : null;
      const res = await fetch(`${API_URL}/kyc/submit`, {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body?.code ?? 'http_error', body?.message ?? res.statusText);
      }
      return (await res.json()) as ApiKycRequest;
    },
  },

  societyPosts: {
    list: (slug: string) =>
      call<ApiSocietyPost[]>(`/societies/${encodeURIComponent(slug)}/posts`),
    create: (slug: string, title: string, body: string) =>
      call<ApiSocietyPost>(
        `/societies/${encodeURIComponent(slug)}/posts`,
        { method: 'POST', body: JSON.stringify({ title, body }) },
        /* withAuth */ true,
      ),
    replies: (postId: string) =>
      call<ApiPostReply[]>(`/society-posts/${encodeURIComponent(postId)}/replies`),
    reply: (postId: string, body: string) =>
      call<ApiPostReply>(
        `/society-posts/${encodeURIComponent(postId)}/replies`,
        { method: 'POST', body: JSON.stringify({ body }) },
        /* withAuth */ true,
      ),
  },

  recommendations: (slug: string) =>
    call<ApiEvent[]>(`/events/${encodeURIComponent(slug)}/recommendations`),

  eventBySlug: (slug: string) => call<ApiEvent>(`/events/${encodeURIComponent(slug)}`),

  reviews: {
    list: (slug: string, params: { limit?: number; cursor?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.limit) q.set('limit', String(params.limit));
      if (params.cursor) q.set('cursor', params.cursor);
      const suffix = q.toString();
      return call<ReviewsListResponse>(
        `/events/${encodeURIComponent(slug)}/reviews${suffix ? `?${suffix}` : ''}`,
      );
    },
    create: (slug: string, body: { stars: number; body?: string }) =>
      call<CreateReviewResponse>(
        `/events/${encodeURIComponent(slug)}/reviews`,
        { method: 'POST', body: JSON.stringify(body) },
        /* withAuth */ true,
      ),
  },

  // auth
  auth: {
    requestOtp: (phone: string) =>
      call<OtpRequestResponse>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    verifyOtp: (phone: string, otp: string) =>
      call<AuthSessionResponse>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      }),

    // Email/password
    emailSignup: (email: string, password: string, displayName?: string) =>
      call<AuthSessionResponse & { verificationSent: boolean }>('/auth/email/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      }),
    emailSignin: (email: string, password: string) =>
      call<AuthSessionResponse>('/auth/email/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    verifyEmail: (token: string) =>
      call<{ ok: true }>('/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    forgotPassword: (email: string) =>
      call<{ ok: true }>('/auth/email/forgot', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      call<{ ok: true }>('/auth/email/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),

    // Google OAuth
    googleStatus: () => call<{ enabled: boolean }>('/auth/google/status'),
    googleStartUrl: (apiBase: string, returnTo = '/') => {
      // Browser navigates the WHOLE page here (302 to Google) so this returns a URL string.
      const p = new URLSearchParams({ returnTo });
      return `${apiBase}/auth/google?${p.toString()}`;
    },

    refresh: (refreshToken: string) =>
      call<AuthSessionResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    logout: (refreshToken: string) =>
      call<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    me: () => call<PublicUser>('/auth/me', {}, /* withAuth */ true),

    // PATCH /auth/me — update name / avatar / city on the User row.
    updateMe: (input: {
      displayName?: string | null;
      avatarUrl?: string | null;
      city?: string | null;
    }) =>
      call<PublicUser>(
        '/auth/me',
        { method: 'PATCH', body: JSON.stringify(input) },
        /* withAuth */ true,
      ),

    onboard: (input: { role: UserRole; displayName?: string; city?: string }) =>
      call<{ user: PublicUser }>(
        '/auth/onboarding',
        { method: 'POST', body: JSON.stringify(input) },
        /* withAuth */ true,
      ),

    // Soft-delete the signed-in user. Backend revokes all sessions.
    deleteAccount: () =>
      call<void>('/auth/account', { method: 'DELETE' }, /* withAuth */ true),
  },
};
