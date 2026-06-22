# JoinEvents.in

Hyperlocal event & stall discovery platform for Delhi NCR. Built as a PWA (PC + mobile) on Next.js 15 and NestJS, backed by Postgres 16 + PostGIS and Redis.

## Build progress

- ✅ **Step 1** — Project skeleton (Next.js + NestJS + Docker Postgres/Redis)
- ✅ **Step 2** — Database schema + first real endpoint (Prisma, 5 core tables, seed data, `GET /api/v1/events`)
- ✅ **Step 2.5** — Launch landing page (warm orange/amber design, Poppins, all sections from your reference)
- ✅ **Step 3** — Authentication (Mobile OTP login, JWT, refresh-token rotation, `/login` UI)
- ✅ **Step 4** — Geo-aware discovery (PostGIS `ST_DWithin`, `/api/v1/discover`, browser geolocation, real cover images)
- ✅ **Step 5** — Event creation flow (`/dashboard`, become organiser, 2-step event wizard, `POST /events`)
- ✅ **Step 6** — Wallet system (double-entry ledger, stubbed PayU top-up, `/dashboard/wallet`)
- ✅ **Step 6b** — Stall booking (event detail page, atomic booking, 10% commission to house, escrow to organiser)
- ✅ **Step 7** — Reviews (event ratings, Bayesian shrinkage on organiser avg, histogram on event detail)
- ✅ **Step 7b** — Followers (Follow/Following toggle on event detail, `/following` endpoint)
- ✅ **Step 7c** — Public org profile page at `/org/[username]` (upcoming + past + reviews tabs)
- ✅ **Step 8** — Admin panel foundations: `User.isAdmin`, AdminGuard, KYC queue, immutable audit log, overview dashboard with ledger invariant
- ✅ **Step 7d** — In-app notifications (bell badge polls every 60s, /dashboard/notifications, triggers on booking, review, follow, KYC decision)
- ✅ **FINAL Sprint** — Booking cancellation + refunds, withdrawal flow with admin approval, full filter rail + search + sort modes, featured listings (boost), society auto-resolve + reputation recompute, PWA service worker
- ✅ **CLOSEOUT** — Attendance-gated reviews, featured listings geo cap, Bull workers (escrow release T+1 + monthly subscription billing), KYC document submission with admin viewer, three Plus subscriptions (₹99/₹499/₹2000 monthly via wallet), society notice board, AI co-attendance recommendations, Meilisearch search engine
- ⏳ **Step 7d.2** — Web push (VAPID + service worker + FCM) — needs FCM credentials
- ⏳ **Step 5.5** — Image uploads (Cloudflare R2) + Maps picker — needs R2 + Google Maps API key
- ⏳ **Step 3.5** — Google Sign-In + MSG91 real SMS — needs Google OAuth + MSG91 account
- ⏳ **Step 6.5** — Real PayU integration — needs PayU account
- ⏳ **Escrow release T+1 worker** — Bull queue + cron (small follow-up)
- ⏳ **Step 7e** — Attendance-gated reviews (require a confirmed booking)
- ⏳ **Step 8b** — User search/suspend + event/content moderation
- ⏳ **Step 8c** — Refunds + manual wallet adjustments
- ⏳ **Step 3.5** — Google Sign-In + MSG91 real SMS provider
- ⏳ **Step 5.5** — Image uploads (Cloudflare R2 + signed PUT) + Google Maps picker
- ⏳ **Step 6.5** — Real PayU integration (live PSP, webhook HMAC, withdrawals)
- ⏳ **Step 7** — Reviews + followers + notifications
- ⏳ **Step 8** — Admin panel + KYC verification UI

---

## What's at each URL

| URL                                            | What it is                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| http://localhost:3000                          | **Launch landing page** — your design, all sections, waitlist CTAs    |
| http://localhost:3000/login                    | **Login** — Mobile OTP flow (Step 3)                                  |
| http://localhost:3000/dashboard                | **Dashboard** — your business profiles + your events (Step 5)         |
| http://localhost:3000/dashboard/profile/new    | **Become an organiser** — 30-second signup (Step 5)                   |
| http://localhost:3000/dashboard/events/new     | **Create event** — 2-step wizard (Step 5)                             |
| http://localhost:3000/dashboard/wallet         | **Wallet** — balance + history + top-up (Step 6)                      |
| http://localhost:3000/dashboard/bookings       | **Bookings** — stalls you've booked (Step 6b)                         |
| http://localhost:3000/events/:slug             | **Event detail** — descriptions + stall booking panel (Step 6b)       |
| http://localhost:3000/org/:username            | **Org profile** — events + reviews + follow (Step 7c)                 |
| http://localhost:3000/admin                    | **Admin overview** — platform stats + ledger invariant (Step 8)       |
| http://localhost:3000/admin/kyc                | **Admin KYC queue** — approve / reject business profiles (Step 8)     |
| http://localhost:3000/admin/audit-log          | **Admin audit log** — immutable action history (Step 8)               |
| http://localhost:3000/dashboard/notifications  | **Notifications** — chronological feed grouped by date (Step 7d)      |
| http://localhost:3000/events                   | **Demo** — geo-aware feed (Step 4 — try "Use my location")            |
| http://localhost:4000/api/v1/health            | Backend health check                                                  |
| http://localhost:4000/api/v1/societies         | GET → list of seeded societies                                        |
| http://localhost:4000/api/v1/business-profiles | POST → create organiser/vendor profile (auth)                         |
| http://localhost:4000/api/v1/business-profiles/me | GET → your profiles (auth)                                         |
| http://localhost:4000/api/v1/events            | All seeded events (JSON)                                              |
| http://localhost:4000/api/v1/events/mine       | GET → events you own (auth)                                           |
| http://localhost:4000/api/v1/events            | POST → create draft (auth, organiser-only)                            |
| http://localhost:4000/api/v1/events/:id        | PATCH → update (owner only)                                           |
| http://localhost:4000/api/v1/events/:id/submit | POST → draft → live (dev) / pending (prod)                            |
| http://localhost:4000/api/v1/discover          | POST `{lat,lng,radiusM?}` → geo-radius events with distance & ranking |
| http://localhost:4000/api/v1/wallet            | GET → balance + recent entries (auth)                                 |
| http://localhost:4000/api/v1/wallet/topup      | POST `{amountPaise}` → instant credit in dev, PayU URL in prod (auth) |
| http://localhost:4000/api/v1/wallet/\_audit    | GET → sum(D) vs sum(C) — invariant check                              |
| http://localhost:4000/api/v1/payments/payu/webhook | POST → PayU server-to-server (HMAC verified)                       |
| http://localhost:4000/api/v1/events/:slug      | GET → event detail with full `stallsList`                             |
| http://localhost:4000/api/v1/events/:eventId/stalls/:stallId/book | POST → atomic stall booking (auth)                 |
| http://localhost:4000/api/v1/bookings/mine     | GET → your bookings (auth)                                            |
| http://localhost:4000/api/v1/events/:slug/reviews | GET → reviews + summary (count, avg, Bayesian, histogram)          |
| http://localhost:4000/api/v1/events/:slug/reviews | POST `{stars,body?}` → create review (auth)                        |
| http://localhost:4000/api/v1/business-profiles/:username/follow | POST → follow (auth, idempotent)                       |
| http://localhost:4000/api/v1/business-profiles/:username/follow | DELETE → unfollow (auth, idempotent)                   |
| http://localhost:4000/api/v1/following         | GET → list of profiles you follow (auth)                              |
| http://localhost:4000/api/v1/business-profiles/:username | GET → profile detail; with `isFollowing` when authed          |
| http://localhost:4000/api/v1/business-profiles/:username/events?when=upcoming\|past | GET → events list                |
| http://localhost:4000/api/v1/business-profiles/:username/reviews | GET → all reviews + organiser-level summary          |
| http://localhost:4000/api/v1/admin/overview    | GET → platform stats + ledger (admin)                                 |
| http://localhost:4000/api/v1/admin/kyc/pending | GET → pending KYC queue (admin)                                       |
| http://localhost:4000/api/v1/admin/kyc/:id/approve | POST → approve KYC + audit (admin)                                |
| http://localhost:4000/api/v1/admin/kyc/:id/reject  | POST `{reason,note}` → reject KYC + audit (admin)                 |
| http://localhost:4000/api/v1/admin/audit-log   | GET → admin action history (admin)                                    |
| http://localhost:4000/api/v1/notifications     | GET → paginated feed (auth, optional `?onlyUnread=true`)              |
| http://localhost:4000/api/v1/notifications/unread-count | GET → `{unread: N}` (auth)                                   |
| http://localhost:4000/api/v1/notifications/:id/read | POST → mark single as read (auth)                                |
| http://localhost:4000/api/v1/notifications/read-all | POST → mark every unread as read (auth)                          |
| http://localhost:4000/api/v1/bookings/:id/cancel | POST → cancel & refund (auth, owner)                                |
| http://localhost:4000/api/v1/wallet/withdraw   | POST `{amountPaise,bankAccountRef,ifsc,accountHolder}` → request withdrawal |
| http://localhost:4000/api/v1/wallet/withdraw/mine | GET → your withdrawal history                                      |
| http://localhost:4000/api/v1/admin/withdrawals | GET → pending withdrawal queue (admin)                                |
| http://localhost:4000/api/v1/admin/withdrawals/:id/decide | POST `{approve,note?}` → admin decision                      |
| http://localhost:4000/api/v1/featured/tiers    | GET → Boost / Spotlight / City tier prices                            |
| http://localhost:4000/api/v1/events/:id/boost  | POST `{tier}` → buy a featured listing (auth, owner)                  |
| http://localhost:4000/api/v1/events?q=&category=&sort=trending&verifiedOnly=true&minPricePaise= | Filter + search |
| http://localhost:4000/api/v1/auth/otp/request  | POST `{phone}` → sends OTP (logged to console in dev)                 |
| http://localhost:4000/api/v1/auth/otp/verify   | POST `{phone, otp}` → issues access + refresh tokens                  |
| http://localhost:4000/api/v1/auth/refresh      | POST `{refreshToken}` → rotates session                               |
| http://localhost:4000/api/v1/auth/logout       | POST `{refreshToken}` → revokes session                               |
| http://localhost:4000/api/v1/auth/me           | GET (Bearer auth) → current user                                      |

---

## What's in the box

```
Join Events/
├── apps/
│   ├── web/                Next.js 15 PWA
│   │   ├── src/app/
│   │   │   ├── page.tsx           ← Launch landing page
│   │   │   ├── login/page.tsx     ← OTP login (Step 3)
│   │   │   └── events/page.tsx    ← Demo events
│   │   ├── src/components/
│   │   │   ├── landing/           ← 13 landing-page sections
│   │   │   └── EventCard.tsx
│   │   └── src/lib/
│   │       ├── api.ts             ← Typed REST client
│   │       ├── auth-context.tsx   ← React auth state (Step 3)
│   │       ├── auth-storage.ts    ← Token storage (Step 3)
│   │       └── constants.ts
│   └── api/                NestJS 10 — backend
│       ├── prisma/         schema.prisma + seed.ts
│       └── src/
│           ├── auth/       Module + controller + service (Step 3)
│           ├── redis/      RedisService (Step 3)
│           ├── prisma/     PrismaService
│           ├── events/
│           └── health/
├── infra/postgres/         init.sql — enables PostGIS
├── docker-compose.yml
└── package.json            Root scripts
```

---

## Prerequisites

| Tool           | Version | Check                |
| -------------- | ------- | -------------------- |
| Node.js        | 20.x    | `node --version`     |
| pnpm           | 9.x     | `pnpm --version`     |
| Docker Desktop | 24.x    | `docker --version`   |
| Git            | 2.x     | `git --version`      |

If you don't have pnpm: `npm install -g pnpm`

---

## First-time setup

In this folder (`Join Events/`):

```bash
# 1. Copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 2. Install (runs prisma generate automatically)
pnpm install

# 3. Start Postgres + Redis (Docker Desktop must be running)
pnpm db:up

# 4. Migrate + seed
pnpm db:setup

# 5. Run dev
pnpm dev
```

**Windows PowerShell:** use `Copy-Item .env.example .env` for the copies.

> **If you previously ran Step 2's migration**, the Prisma schema now has a new `user_sessions` table. Run `pnpm db:migrate` (Prisma will name it something like `add_user_sessions`). The seed is unchanged.

### Verify the auth flow (Step 3)

1. Open **http://localhost:3000** — the landing page should now show a **"Login"** button in the header.
2. Click **Login** → you land on `/login`.
3. Enter a phone in E.164 format, e.g. **`+919876543210`**, then click **Send OTP**.
4. In dev mode, the OTP is **printed to the API terminal** AND **autofilled into the form** (you'll see "Dev mode: OTP is 123456" in green). In production neither would happen.
5. Click **Verify & Continue** → you're redirected to `/`. The header now shows **Logout** and (on wide screens) your phone number.
6. Click **Logout** → the session is revoked server-side and you're back to anonymous.

That's the full auth loop. Tokens are stored in `localStorage` for now; we move to httpOnly cookies in Step 5.

### Manually test the API

```bash
# 1. Request OTP
curl -X POST http://localhost:4000/api/v1/auth/otp/request \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919876543210"}'
# → {"delivered":true,"otpDevOnly":"123456"}

# 2. Verify
curl -X POST http://localhost:4000/api/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919876543210","otp":"123456"}'
# → {"user":{...},"tokens":{"accessToken":"eyJ...","refreshToken":"...","accessExpiresInSeconds":900,...}}

# 3. Authenticated /me
curl http://localhost:4000/api/v1/auth/me \
  -H 'Authorization: Bearer eyJ...'
# → {"id":"...","phone":"+919876543210","primaryRole":"user",...}
```

If all three work, **Step 3 is done.** ✅

---

## Useful commands

```bash
# Dev
pnpm dev               # Run web + api in parallel
pnpm dev:web           # Just the frontend
pnpm dev:api           # Just the backend
pnpm build             # Production build
pnpm lint
pnpm typecheck
pnpm format

# Docker
pnpm db:up             # Start Postgres + Redis
pnpm db:down           # Stop containers (data preserved)
pnpm db:logs           # Tail Postgres logs
pnpm db:reset          # ⚠️ Wipe volume

# Prisma
pnpm db:setup          # Migrate + seed (most common)
pnpm db:migrate        # Create + apply a new migration
pnpm db:seed
pnpm db:studio         # Open Prisma Studio at :5555
```

---

## Editing the landing page

Everything lives in `apps/web/src/components/landing/`. Each file is one section. Common things you might want to change:

| What                                            | File                                          |
| ----------------------------------------------- | --------------------------------------------- |
| Nav menu items                                  | `src/lib/constants.ts` (`NAV_LINKS`)          |
| Waitlist Google Form URL                        | `src/lib/constants.ts` (`WAITLIST_URL`)       |
| Hero headline & sub-copy                        | `landing/Hero.tsx`                            |
| Stat numbers (1.2K events, 850 societies, etc.) | `landing/MarketplacePreview.tsx` (`STATS`)    |
| Stall package prices / features                 | `landing/Packages.tsx` (`PACKAGES`)           |
| Membership perks                                | `landing/Membership.tsx` (`MEMBERSHIP_PERKS`) |
| Feature cards                                   | `landing/Features.tsx` (`FEATURES`)           |
| How-it-works steps                              | `landing/HowItWorks.tsx` (`STEPS`)            |
| Colors (brand orange, etc.)                     | `apps/web/tailwind.config.ts`                 |

All copy is centralised as `const` arrays at the top of each section — quick to edit.

---

## What changed in Step 4

- **PostGIS geo column on `events`** — auto-generated `geography(Point, 4326)` from `latitude`/`longitude`, with a GIST index. Added idempotently at the top of `seed.ts` so a fresh `pnpm db:setup` provisions it.
- **`POST /api/v1/discover`** — accepts `{lat, lng, radiusM?, daysAhead?, categories?, limit?}` and returns ranked events with `distanceM` on each.
- **Composite ranking** — `0.4 × distance_freshness + 0.3 × organiser_rating + 0.3 × date_freshness`, computed inside the SQL ORDER BY.
- **Browser geolocation hook** at `src/lib/use-location.ts`. Falls back to NCR center if the user denies permission.
- **`/events` page upgraded** — Server still renders an initial list; the client adds a "Use my location" button + radius selector and swaps to `/discover`.
- **Real cover images** on every seed event (Unsplash for now; Cloudflare Images lands in Step 5).
- **`EventCard`** now renders the real cover + a distance pill (e.g. "1.2 km") when present.

### Verify Step 4

After `pnpm db:setup` and `pnpm dev`:

1. Visit **http://localhost:3000/events**. Initial paint shows a date-ordered list with real cover images.
2. Click **Use my location**. Allow the prompt.
3. The grid re-fetches via `POST /api/v1/discover`. Cards now show a distance pill on the cover.
4. Change the **radius** (3 / 5 / 10 / 25 km). The grid refetches.
5. (Optional) cURL test:
   ```bash
   curl -X POST http://localhost:4000/api/v1/discover \
     -H 'Content-Type: application/json' \
     -d '{"lat":28.5731,"lng":77.3712,"radiusM":5000}'
   ```
   You should see `items[].distanceM` integers ordered by ranking.

If all that works, **Step 4 is done.** ✅

---

## What changed in Step 5

- **`POST /business-profiles`** — sign-in user upgrades to organiser (or vendor). KYC auto-approves in dev so the create-event flow is unblocked; in production this is admin-gated.
- **`GET /societies`** — drives the society dropdown in the create-event form.
- **Events CRUD** — `POST /events`, `PATCH /events/:id`, `POST /events/:id/submit`, `GET /events/mine`. All mutations require auth + ABAC (you can only touch events your profile owns).
- **`/dashboard`** — shows your business profiles, your events with status pills, and clear next-step CTAs.
- **`/dashboard/profile/new`** — 30-second "become an organiser" form. Username auto-derived from display name.
- **`/dashboard/events/new`** — 2-step wizard from master doc §3.6. Location autofill via the geolocation hook, society dropdown autofills lat/lng from centroid.
- **Header** — shows a **Dashboard** button (instead of "Login") when authenticated.

### Verify Step 5

```bash
# 1. Pull in the schema changes (no new migration — only new tables/columns were
#    added but seed handles them). Just regenerate the Prisma client.
cd apps/api && pnpm prisma:generate && cd ../..

# 2. Run dev (assuming docker is up)
pnpm dev
```

Then in the browser:

1. Visit **http://localhost:3000/login**, sign in with any phone (e.g. `+919999900001`). OTP autofills.
2. After login, the header shows **Dashboard**. Click it.
3. You see an empty dashboard. Click **Become an organiser**.
4. Fill in display name (e.g. "My Society RWA") → username auto-fills → submit.
5. Back at dashboard, click **+ Create event**.
6. **Page 1**: title, description, pick a society (lat/lng autofills), address, date/time, optional cover URL. Click **Next: stalls →**.
7. **Page 2**: capacity + at least one stall row. Click **Publish event**.
8. You're back on the dashboard with the new event listed and a green **live** pill.
9. Open **http://localhost:3000/events** in another tab → your new event appears in the feed.
10. If you set lat/lng inside NCR, click **Use my location** → it sorts by distance and your event shows up with a distance pill.

If all that works, **Step 5 is done.** ✅

cURL test for the API surface:
```bash
TOKEN="…"  # paste the accessToken returned by /auth/otp/verify

curl -X POST http://localhost:4000/api/v1/business-profiles \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"my-rwa","displayName":"My RWA","type":"organiser","bio":"Sector 78"}'

curl http://localhost:4000/api/v1/societies   # → list of seeded societies

curl -X POST http://localhost:4000/api/v1/events \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "title":"Test event from curl",
    "description":"A test event with at least twenty characters of description.",
    "societySlug":"noida-sector-76",
    "addressText":"Some address",
    "latitude":28.5731,"longitude":77.3712,
    "startsAt":"2026-07-10T17:00:00.000Z",
    "endsAt":"2026-07-10T22:00:00.000Z",
    "stalls":[{"category":"food","pricePaise":100000,"available":5}]
  }'
```

---

## What changed in Step 6

- **Three new Prisma tables**: `wallets`, `wallet_entries`, `payment_events`. The wallet holds two materialised balances: `balancePaise` (spendable) and `pendingPaise` (in-escrow).
- **`WalletService.transfer()`** — the only way money moves on the platform. Takes an array of legs, validates `sum(D) == sum(C)`, runs the inserts and balance updates inside a single Postgres transaction. Returns a `txnId`.
- **`/wallet/topup`** — stub provider that credits instantly in dev. The same endpoint returns a PayU URL in production. Either way, a `payment_event` row is opened so PayU's webhook can finalise idempotently via `externalId`.
- **`/payments/payu/webhook`** — public endpoint with HMAC verification. Idempotent: a duplicate `externalId` is a no-op.
- **`/wallet/_audit`** — running invariant check (sum of debits equals sum of credits across the entire `wallet_entries` table).
- **`/dashboard/wallet`** — live UI: balance card, in-escrow card, quick top-ups (₹100/500/1000/2000) + custom amount, transaction history with credit/debit colours and "held" pills.

### Apply Step 6 (one-time)

The schema added three tables. From the project root:

```bash
# 1. Regenerate Prisma client + apply migration
cd apps/api
pnpm prisma:migrate         # name suggestion: add_wallets_and_payments
cd ../..

# 2. Restart dev so Nest picks up the new modules
pnpm dev
```

### Verify Step 6

1. Sign in at **/login**.
2. Visit **/dashboard** → you'll see a new orange **Your wallet** quick-card.
3. Click it → **/dashboard/wallet** shows ₹0 balance.
4. Tap **+ ₹500** → toast: "Added ₹500. New balance ₹500." History row appears.
5. Try a custom amount → same instant credit.
6. Open **http://localhost:4000/api/v1/wallet/\_audit** → expect:
   ```json
   {"debitsPaise": 50000, "creditsPaise": 50000, "balanced": true}
   ```
   For every top-up, the platform-house wallet is debited by the same amount the user is credited — the invariant holds.

If all that works, **Step 6 is done.** ✅

cURL test:
```bash
TOKEN="…"  # accessToken from /auth/otp/verify

curl http://localhost:4000/api/v1/wallet -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:4000/api/v1/wallet/topup \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amountPaise": 100000}'

curl http://localhost:4000/api/v1/wallet/_audit
```

---

## What changed in Step 6b

- **New `Booking` table** with the full money breakdown (`amountPaise`, `platformFeePaise`, `escrowHeldPaise`) and the wallet `bookingTxnId` linking back to the ledger entries.
- **CHECK constraint** `wallets_balance_non_negative` — a user/business wallet can never go negative at the database level. Added idempotently in `seed.ts`.
- **`POST /events/:eventId/stalls/:stallId/book`** — atomic in a SERIALIZABLE transaction. Locks the stall row (`SELECT … FOR UPDATE`), validates availability, calls `WalletService.transfer()` with the three-leg split, increments `booked`, and inserts the `Booking` row.
- **`GET /bookings/mine`** — your bookings with embedded event + stall info.
- **Event detail page** at `/events/[slug]` — server-rendered for SEO, with cover image, description, organiser badge, and a sticky `BookingPanel` client island.
- **`BookingPanel`** — pick a stall row → confirm summary (price / fee / organiser net / you-pay) → atomic book. Handles insufficient-funds with a one-tap deep link to `/dashboard/wallet`.
- **`/dashboard/bookings`** — your booking history with status pills.
- **EventCard** is now a Link to the detail page.
- **Dashboard** has a new gradient "Your bookings" quick-card.

### Apply Step 6b (one-time)

```bash
# 1. Add the new table + CHECK constraint
cd apps/api
pnpm prisma:migrate   # name suggestion: add_bookings_and_check
cd ../..

# 2. Re-seed so the CHECK gets added (idempotent)
pnpm db:seed

# 3. Restart dev
pnpm dev
```

### Verify Step 6b

1. Sign in as **User A** (e.g. `+919876543210`).
2. Visit **/dashboard/wallet** → tap **+ ₹2000** to top up.
3. Visit **/events** → click any card (e.g. **Sector 76 Diwali Mela** which has stalls from ₹1,800).
4. On the detail page, scroll the right panel → pick a stall → confirm panel shows the split: stall ₹X, fee 10%, organiser net 90%, you pay X.
5. Click **Book this stall · ₹X** → green success banner. Wallet balance is debited by exactly the stall price.
6. Click **View bookings** → your booking appears with the three amounts (Paid / Platform fee / Organiser).
7. Open **http://localhost:4000/api/v1/wallet/_audit** → invariant still balanced.
8. **Sanity test the CHECK**: if you try to book without enough wallet money, the API returns:
   ```json
   {"code":"insufficient_funds","message":"You need ₹X in your wallet. Top up first.","shortfallPaise":...}
   ```
   The BookingPanel shows an **Add money →** button.

If all that works, **Step 6b is done.** ✅

---

## What changed in Step 7

- **New `reviews` table** — `(authorId, eventId)` unique so one user can't spam reviews on the same event. Indexed on `eventId` and `authorId`.
- **`POST /events/:slug/reviews`** — auth required. Returns the created review + an updated event summary.
- **`GET /events/:slug/reviews`** — public, paginated, with the same summary embedded so a single round-trip can render everything.
- **`EventReviewsSummary`** — `count`, plain `average`, **`bayesian`** (the master-doc formula `(10×4.2 + sum) / (10 + n)`), and a star **`histogram`** (1-5 counts).
- **Organiser `avg_rating`** recomputed after every review via a single SQL `UPDATE` that aggregates across all the organiser's events. So `business_profiles.avg_rating` always reflects shrunk reality.
- **`/events/[slug]`** gets a new **Reviews** section: average card + Bayesian pill + horizontal histogram bars + leave-a-review form (with star picker + textarea) + chronological list.

### Apply Step 7

```bash
cd apps/api
pnpm prisma:migrate     # name suggestion: add_reviews
cd ../..
pnpm dev
```

### Verify Step 7

1. Sign in as **User A** at **/login**.
2. Open **/events** → click any event → scroll to **Reviews** at the bottom.
3. Pick **5 stars**, optional body → **Submit review**. Summary refreshes immediately.
4. Look at the event's organiser on **/events** — their avg_rating updated.
5. Log out, sign in as **User B**, leave a 3-star review on the same event → the summary now shows count=2, average ≈ 4.0, Bayesian ≈ 4.16. Notice Bayesian < raw average because n is small.
6. Try to leave a second review as **User B** → `409 already_reviewed`.

cURL:
```bash
TOKEN="…"
curl http://localhost:4000/api/v1/events/sector-76-diwali-mela/reviews

curl -X POST http://localhost:4000/api/v1/events/sector-76-diwali-mela/reviews \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"stars":5,"body":"Beautifully organised. Great food stalls."}'
```

If both work, **Step 7 is done.** ✅

---

## What changed in Step 7b

- **New `followers` table** — `(followerUserId, businessProfileId)` unique. `onDelete: Cascade` cleans up follows if a profile is deleted.
- **`POST/DELETE /business-profiles/:username/follow`** — both idempotent, both wrapped in a Prisma transaction with `followersCount` increment/decrement.
- **`GET /following`** — chronological list of profiles the user follows.
- **`GET /business-profiles/:username`** is now optionally-authed (via `OptionalJwtAuthGuard`) — when called with a Bearer token it includes `isFollowing` for the viewer.
- **`FollowButton`** on event detail page — optimistic toggle, rolls back on error. Shows count + button; anonymous viewers deep-link to `/login?next=…` so they bounce back to the event after signing in.

### Apply Step 7b

```bash
cd apps/api
pnpm prisma:migrate     # name suggestion: add_followers
cd ../..
pnpm dev
```

### Verify Step 7b

1. Sign in (User A) → open any event.
2. Right under the organiser name, see **`N followers · Follow`**.
3. Click **Follow** → button optimistically becomes **✓ Following**, count goes +1.
4. Click again → back to Follow, count back down. Open `/api/v1/following` → empty array.
5. Click Follow once more → reload the page → state persists (came from server `isFollowing`).
6. Open `/api/v1/following` → JSON has the profile with `followedAt`.
7. Try to follow yourself (sign in as the organiser's user, visit their event) → friendly `cannot_follow_self` 400.

cURL:
```bash
TOKEN="…"
curl -X POST http://localhost:4000/api/v1/business-profiles/green-acres-rwa/follow \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:4000/api/v1/business-profiles/green-acres-rwa \
  -H "Authorization: Bearer $TOKEN"   # → "isFollowing":true

curl http://localhost:4000/api/v1/following -H "Authorization: Bearer $TOKEN"
```

If all that works, **Step 7b is done.** ✅

---

## What changed in Step 7c

- **`/org/[username]`** — server-rendered hero (initials avatar, name, bio, verified badge, follower count, follow button) + client-side tabs (Upcoming / Past / Reviews). Each tab lazy-loads on first view.
- **`GET /business-profiles/:username/events?when=upcoming|past`** — `EventsService.listForOrganiser()`. Public endpoint.
- **`GET /business-profiles/:username/reviews`** — `ReviewsService.listForOrganiser()` + `organiserSummary()` aggregated across all the organiser's events. Public endpoint.
- **Event detail page** — `@username` now links to `/org/[username]`.

### Verify Step 7c

1. Open any event from `/events`.
2. Click `@green-acres-rwa` (or similar organiser handle) → lands at `/org/green-acres-rwa`.
3. Hero shows initials avatar, follower count, follow button.
4. Click **Past** tab → loads past events (empty for seed; current events are all future-dated).
5. Click **Reviews** → loads aggregated reviews across all their events. Summary card shows raw average + Bayesian + total count.
6. Each review row links back to the specific event it was left on.

cURL:
```bash
curl http://localhost:4000/api/v1/business-profiles/green-acres-rwa/events?when=upcoming
curl http://localhost:4000/api/v1/business-profiles/green-acres-rwa/reviews
```

If both work, **Step 7c is done.** ✅

---

## What changed in Step 8

- **`User.isAdmin`** boolean — orthogonal to `primaryRole`. A user can be `{user, organiser}` AND admin. Set by direct DB access or by an existing SuperAdmin; **never** elevated via the API.
- **`admin_audit_logs`** table — actor, action, target_table/target_id, diff JSON, note, IP, user-agent. Written inside the same Prisma transaction as the mutation.
- **`AdminGuard`** — `@UseGuards(JwtAuthGuard, AdminGuard)` requires both auth + `isAdmin=true`.
- **`GET /admin/overview`** — counts across users, profiles, events, bookings, reviews, and a live `walletService.ledgerInvariant()` check (master-doc §3.12.1 invariant).
- **`GET /admin/kyc/pending`** — pending business profiles with **lightweight fraud signals** auto-computed: `multiple_pending_per_user`, `account_under_1h`, `thin_bio`.
- **`POST /admin/kyc/:id/approve` and `/reject`** — atomic update + audit log entry. Idempotent (returns 400 if already in target state).
- **`/admin/*` UI** — sidebar shell with Overview / KYC Queue / Audit Log. Approve is one click; Reject is reason + optional note inline.
- **Header** — when signed in as an admin, a purple **Admin** button appears next to Dashboard.
- **Seed** — first user (`+919000000001`) is promoted to admin. Their profile (`@green-acres-rwa`) is intentionally left as `kycStatus: 'pending'` so the queue is non-empty for testing.

### Apply Step 8

```bash
cd apps/api
pnpm prisma:migrate    # name suggestion: add_admin_and_audit
cd ../..

# Re-seed to promote the first user to admin + reset green-acres KYC to pending
pnpm db:seed

pnpm dev
```

### Verify Step 8

1. Sign in at `/login` with **`+919000000001`** (any OTP, it'll be in the API terminal).
2. After auth, the Header shows a purple **Admin** button next to Dashboard.
3. Click **Admin** → land at `/admin`. Overview shows live stats and a green "Ledger balanced" pill at the top.
4. Click **KYC Queue** → see `@green-acres-rwa` waiting with simple fraud flags (e.g. none, or `thin_bio` depending on seed).
5. Click **Approve** → row disappears, queue empty. Click **Audit Log** → see the `approve_kyc` entry with the diff `{kycStatus: ['pending','approved']}`.
6. Sign in as a non-admin (`+919000000002`) → no Admin button in header. Navigating to `/admin` redirects you to `/`. The backend returns `403 not_admin` regardless.

cURL:
```bash
TOKEN="…"  # admin's accessToken
curl http://localhost:4000/api/v1/admin/overview -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/v1/admin/kyc/pending -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/v1/admin/audit-log -H "Authorization: Bearer $TOKEN"
```

If all that works, **Step 8 is done.** ✅

---

## What changed in Step 7d

- **New `notifications` table** — `(userId, createdAt DESC)` and `(userId, readAt)` indexes for fast feed + unread queries.
- **`NotificationsService`** (global) — fire-and-forget `create()` that never throws (a failed notification must never roll back a successful booking).
- **4 trigger points wired**:
  - `BookingsService.book()` → `booking_received` for the organiser
  - `ReviewsService.create()` → `review_received` for the organiser
  - `FollowersService.follow()` → `new_follower` for the followed user
  - `AdminService.approveKyc()/rejectKyc()` → `kyc_approved`/`kyc_rejected` for the owner
- **4 endpoints**: list (paginated, optionally `onlyUnread`), unread-count, mark-read, mark-all-read.
- **Header bell** polls `/unread-count` every 60s and refreshes on `window.focus`. Shows a brand-orange dot with the count (capped at 99+).
- **`/dashboard/notifications`** — grouped by Today / Yesterday / This week / Earlier. Click a row → marked read + navigate to its link.

### Apply Step 7d

```bash
cd apps/api
pnpm prisma:migrate    # name suggestion: add_notifications
cd ../..
pnpm dev
```

### Verify Step 7d (the full loop)

1. Sign in as the **organiser** of one of the seeded events (e.g. `+919000000001` who owns @green-acres-rwa).
2. Header has a bell icon, count 0.
3. In a **second browser/incognito**, sign in as a different user (e.g. `+919000000005`, any new phone).
4. Visit any green-acres event, leave a 5-star review → backend fires `review_received`.
5. Back in the organiser tab, within 60s the bell shows a red `1`.
6. Click the bell → `/dashboard/notifications` → see "New 5★ review: …" entry under **Today**.
7. Click it → marked read, navigated to the event page.
8. Other triggers to test:
   - **Booking received** — sign in as a vendor, top up wallet, book a stall → organiser gets notified.
   - **New follower** — Follow `@green-acres-rwa` from any user → organiser's owner-user gets notified.
   - **KYC approved/rejected** — admin approves a profile in `/admin/kyc` → owner gets notified.

cURL:
```bash
TOKEN="…"
curl http://localhost:4000/api/v1/notifications/unread-count -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/v1/notifications -H "Authorization: Bearer $TOKEN"
```

If all four triggers fire, **Step 7d is done.** ✅

---

## What changed in the FINAL Sprint

This step ships every remaining product feature from the PDF that doesn't need an external account (PayU, Google OAuth, R2, FCM, MSG91). Specifically:

### 1. Booking cancellation + refunds
- `POST /bookings/:id/cancel` — vendor can cancel before the event starts. Atomic 3-leg ledger reversal: organiser escrow debited, house fee debited, vendor credited the full amount. Stall slot is restored to inventory in the same transaction.
- `Booking.refundTxnId` links to the wallet entries for trivial reconciliation.
- UI: red **Cancel & refund** button on `/dashboard/bookings` for confirmed bookings.

### 2. Withdrawal flow
- New **`withdrawal_requests`** table.
- `POST /wallet/withdraw` — validates IFSC format, holds funds (available → pending bucket) immediately so they can't be double-spent. ₹5 flat fee debited to house upfront.
- `GET /admin/withdrawals` + `POST /admin/withdrawals/:id/decide` — admin sees the queue, approves (releases pending → house, notifies user, audit log) or rejects (restores funds + refunds fee).
- UI: **Withdraw to bank** form on `/dashboard/wallet`; new **Withdrawals** tab in admin sidebar.

### 3. Filter rail + search + sort modes on `/events`
- Backend `list` endpoint extended with `category`, `societySlug`, `verifiedOnly`, `minPricePaise`, `maxPricePaise`, `q` (full text on title/description/address), `sort` (`date | trending | featured`).
- **Trending sort** = composite of `recency × organiser rating × featured boost`, computed in app code.
- **Featured sort** = active boost listings float to the top, then date order.
- UI: redesigned `/events` with a search bar, category select, price bucket, verified-only checkbox, and a 3-way sort toggle.

### 4. Featured listings (revenue mechanic — master doc §19.3)
- New **`featured_listings`** table.
- Three tiers: **Boost** (₹499 · 3d), **Spotlight** (₹1499 · 7d), **City Feature** (₹2499 · 1d).
- `POST /events/:id/boost` — organiser pays from wallet → platform-house credited → ranking boost active until `endsAt`.
- UI: **⭐ Boost** button next to each live event on the dashboard; pricing page at `/dashboard/events/:id/boost`; purple **⭐ Featured** pill on EventCard.

### 5. Society auto-resolve + reputation recompute
- On event creation, if no `societySlug` is provided we auto-link the nearest society within 3 km using `ST_DWithin`.
- `recomputeSocietyReputation()` runs after every event (fire-and-forget) per master doc §3.14.3.

### 6. PWA polish
- `public/sw.js` — minimal network-first-for-HTML, cache-first-for-static service worker.
- Auto-registered via `<ServiceWorkerRegister />` mounted in the root layout.
- Cached: `/`, `/events`, `/login`, `/manifest.json`. API calls deliberately bypass cache.

### Apply the FINAL sprint

```bash
cd apps/api
pnpm prisma:migrate    # name suggestion: final_sprint_withdrawals_featured_refunds
cd ../..
pnpm dev
```

### Verify

1. **Cancel + refund**: book a stall → `/dashboard/bookings` → **Cancel & refund** → wallet jumps back to pre-booking balance; `/wallet/_audit` still balanced.
2. **Withdraw**: top up ₹500 → request a ₹100 withdrawal with any account/IFSC → sign in as admin → `/admin/withdrawals` → approve → user gets a notification.
3. **Filters**: visit `/events` → search "diwali", flip to **trending** sort, filter category "food", check **verified only**.
4. **Boost**: dashboard → **⭐ Boost** next to a live event → buy Boost (₹499) → `/events` with sort=featured → that event jumps to the top with a purple **⭐ Featured** pill.
5. **PWA**: in Chrome, install the site (`⋮` → Install). Reload offline → cached shell still renders.

If all five flows work, **the platform matches the PDF spec.** ✅

---

## What's deferred (external accounts required)

| Feature | What you need to enable it |
| --- | --- |
| Real **PayU** payment URLs | PayU merchant account (sandbox keys are free) |
| Real **SMS OTP** via MSG91 | MSG91 account (₹500 ≈ 2000 OTPs) |
| **Google Sign-In** button | Google Cloud OAuth client ID |
| **Image uploads** (R2 + signed PUT) | Cloudflare R2 bucket + API token |
| **Map picker** on event creation | Google Maps API key (~$200 free credit/mo) |
| **Web push** notifications | FCM project + VAPID keys |
| **Email** notifications | Postmark account |

All seven plug into the existing service pipelines without further refactoring — each is a ~3-file change to swap the `stub` provider with the real client and put credentials in `.env`.

---

## What's next

**Step 5.5** plugs the two gaps in event creation:
- **Image uploads** — Cloudflare R2 + signed PUT URLs. The cover-image field becomes a drag-and-drop instead of a URL input.
- **Map picker** — Google Maps autocomplete + drag-to-pin for the lat/lng instead of numeric inputs.

**Step 3.5** completes auth: Google Sign-In + MSG91 real SMS.

**Step 6** — Payments (PayU) + double-entry wallet ledger.

Reply with **"Step 5 green ✓"** when ready and we'll proceed.
