'use client';

// /dashboard/explore — User/Vendor event discovery inside the dashboard.
// Search + filters + sort (distance/date/trending/featured) + status tabs
// (All / Live now / Upcoming / Ended) on top of a card grid.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type ApiEvent } from '@/lib/api';
import { EventCard } from '@/components/EventCard';
import { useLocation } from '@/lib/use-location';

type StatusTab = 'all' | 'live' | 'upcoming' | 'ended';
type SortMode = 'distance' | 'date' | 'trending' | 'featured';

const RADIUS_OPTIONS = [
  { label: '3 km', value: 3000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
  { label: '50 km', value: 50000 },
] as const;

const CATEGORIES = [
  'food',
  'home-decor',
  'fashion',
  'art',
  'books',
  'services',
  'kids',
  'fitness',
] as const;

const PRICE_BUCKETS = [
  { label: 'Any price', min: undefined, max: undefined },
  { label: '< ₹1,000', min: 0, max: 100_000 },
  { label: '₹1,000 – ₹2,500', min: 100_000, max: 250_000 },
  { label: '> ₹2,500', min: 250_000, max: undefined },
] as const;

export default function ExplorePage() {
  const loc = useLocation();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusTab>('all');
  const [sort, setSort] = useState<SortMode>('date');
  const [category, setCategory] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [bucketIdx, setBucketIdx] = useState(0);
  const [radius, setRadius] = useState<number>(10000);

  // ----- Fetcher: switches between /discover (geo) and /events (list) -----
  const fetchEvents = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const useGeo = sort === 'distance' && loc.status === 'granted';
      const bucket = PRICE_BUCKETS[bucketIdx];
      if (useGeo) {
        const res = await api.discover({
          lat: loc.lat,
          lng: loc.lng,
          radiusM: radius,
          limit: 50,
          ...(category ? { categories: [category] } : {}),
        });
        // /discover only returns upcoming events; filter verifiedOnly + price on client.
        let items = res.items;
        if (verifiedOnly) items = items.filter((e) => e.organiser.verified);
        if (bucket.min != null) {
          items = items.filter(
            (e) => (e.stalls.priceFromPaise ?? 0) >= (bucket.min ?? 0),
          );
        }
        if (bucket.max != null) {
          items = items.filter(
            (e) => (e.stalls.priceFromPaise ?? 0) <= (bucket.max ?? Number.MAX_SAFE_INTEGER),
          );
        }
        if (q.trim()) {
          const t = q.trim().toLowerCase();
          items = items.filter(
            (e) =>
              e.title.toLowerCase().includes(t) ||
              e.addressText.toLowerCase().includes(t) ||
              (e.society?.name.toLowerCase().includes(t) ?? false),
          );
        }
        setEvents(items);
      } else {
        const res = await api.listEvents({
          q: q.trim() || undefined,
          category: category || undefined,
          verifiedOnly: verifiedOnly || undefined,
          minPricePaise: bucket.min,
          maxPricePaise: bucket.max,
          sort: sort === 'distance' ? 'date' : sort,
          limit: 50,
        });
        setEvents(res.items);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [sort, loc.status, loc.lat, loc.lng, radius, category, verifiedOnly, bucketIdx, q]);

  // Initial + filter-change fetch (debounced via the dependency list itself)
  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // If user picks Distance sort, ask for location automatically
  useEffect(() => {
    if (sort === 'distance' && loc.status === 'idle') loc.request();
  }, [sort, loc]);

  // ----- Client-side status partitioning -----
  const now = Date.now();
  const partitioned = useMemo(() => {
    const live: ApiEvent[] = [];
    const upcoming: ApiEvent[] = [];
    const ended: ApiEvent[] = [];
    for (const e of events) {
      const s = new Date(e.startsAt).getTime();
      const en = new Date(e.endsAt).getTime();
      if (en < now) ended.push(e);
      else if (s <= now && en >= now) live.push(e);
      else upcoming.push(e);
    }
    return { live, upcoming, ended };
  }, [events, now]);

  const counts = {
    all: events.length,
    live: partitioned.live.length,
    upcoming: partitioned.upcoming.length,
    ended: partitioned.ended.length,
  };

  const view =
    status === 'live'
      ? partitioned.live
      : status === 'upcoming'
        ? partitioned.upcoming
        : status === 'ended'
          ? partitioned.ended
          : [...partitioned.live, ...partitioned.upcoming, ...partitioned.ended];

  return (
    <div className="space-y-5">
      {/* ---------- Header ---------- */}
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Discover
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Browse Events
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Every event nearby — sort by distance, date, or trending.
        </p>
      </header>

      {/* ---------- Toolbar: search + sort + location ---------- */}
      <div className="rounded-2xl border border-black/[0.08] bg-white p-3 shadow-card sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events by title, society, area…"
              className="h-10 w-full rounded-xl border border-black/[0.08] bg-cream-50 pl-10 pr-3 text-sm font-medium text-navy-800 outline-none transition focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="h-10 appearance-none rounded-xl border border-black/[0.08] bg-cream-50 pl-3 pr-9 text-sm font-semibold text-navy-700 outline-none transition hover:bg-white focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15"
            >
              <option value="distance">Nearest first</option>
              <option value="date">Starts soonest</option>
              <option value="trending">Trending</option>
              <option value="featured">Featured</option>
            </select>
            <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          </div>
        </div>

        {/* Location capture row (only relevant when sorting by distance) */}
        {sort === 'distance' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-black/[0.06] bg-cream-50 p-3">
            <span className="text-base">📍</span>
            <span className="flex-1 text-xs text-ink-500">
              {loc.status === 'granted' && (
                <>
                  Sorting by distance from{' '}
                  <span className="font-semibold tabular-nums text-navy-800">
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </span>
                </>
              )}
              {loc.status === 'idle' && 'Grant your browser location to sort by distance.'}
              {loc.status === 'loading' && 'Asking your browser for permission…'}
              {(loc.status === 'denied' || loc.status === 'unavailable') && (
                <>
                  Location {loc.status} — falling back to date sort. Sorting will resume if you
                  re-enable it.
                </>
              )}
            </span>
            {loc.status === 'granted' && (
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-700 outline-none focus:border-brand-purple/40"
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    Within {r.label}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={loc.request}
              disabled={loc.status === 'loading'}
              className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-cream-100 disabled:opacity-50"
            >
              {loc.status === 'granted' ? 'Re-capture' : 'Use my location'}
            </button>
          </div>
        )}

        {/* Filters row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-black/[0.08] bg-cream-50 px-3 py-1.5 text-xs font-semibold text-navy-700 outline-none focus:border-brand-purple/40 focus:bg-white"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/-/g, ' ')}
              </option>
            ))}
          </select>

          <select
            value={bucketIdx}
            onChange={(e) => setBucketIdx(Number(e.target.value))}
            disabled={sort === 'distance' && loc.status === 'granted'}
            className="rounded-lg border border-black/[0.08] bg-cream-50 px-3 py-1.5 text-xs font-semibold text-navy-700 outline-none focus:border-brand-purple/40 focus:bg-white disabled:opacity-50"
          >
            {PRICE_BUCKETS.map((b, i) => (
              <option key={i} value={i}>
                {b.label}
              </option>
            ))}
          </select>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/[0.08] bg-cream-50 px-3 py-1.5 text-xs font-semibold text-navy-700">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-brand-purple"
            />
            Verified only
          </label>

          {(category || bucketIdx !== 0 || verifiedOnly || q) && (
            <button
              type="button"
              onClick={() => {
                setCategory('');
                setBucketIdx(0);
                setVerifiedOnly(false);
                setQ('');
              }}
              className="ml-auto rounded-lg px-2 py-1.5 text-xs font-bold text-brand-purple hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ---------- Status tabs ---------- */}
      <div className="flex flex-wrap items-center gap-1">
        <StatusTabButton active={status === 'all'} onClick={() => setStatus('all')} count={counts.all}>
          All
        </StatusTabButton>
        <StatusTabButton
          active={status === 'live'}
          onClick={() => setStatus('live')}
          count={counts.live}
          dot="bg-emerald-500"
        >
          Live now
        </StatusTabButton>
        <StatusTabButton
          active={status === 'upcoming'}
          onClick={() => setStatus('upcoming')}
          count={counts.upcoming}
        >
          Upcoming
        </StatusTabButton>
        <StatusTabButton
          active={status === 'ended'}
          onClick={() => setStatus('ended')}
          count={counts.ended}
        >
          Ended
        </StatusTabButton>
      </div>

      {/* ---------- Results ---------- */}
      {busy && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      )}

      {!busy && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {!busy && !error && view.length === 0 && (
        <EmptyState status={status} />
      )}

      {!busy && !error && view.length > 0 && (
        <>
          {/* Result count row */}
          <div className="text-xs text-ink-400">
            Showing {view.length} event{view.length === 1 ? '' : 's'}
            {sort === 'distance' && loc.status === 'granted' && (
              <> within {RADIUS_OPTIONS.find((r) => r.value === radius)?.label} of you</>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {view.map((event) => (
              <ExploreEventCard key={event.id} event={event} now={now} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// StatusTabButton
// ============================================================
function StatusTabButton({
  children,
  active,
  onClick,
  count,
  dot,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
        active
          ? 'bg-navy-800 text-white'
          : 'text-ink-500 hover:bg-cream-100 hover:text-navy-800'
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      <span>{children}</span>
      <span className={`tabular-nums text-[11px] ${active ? 'text-white/70' : 'text-ink-300'}`}>
        {count}
      </span>
    </button>
  );
}

// ============================================================
// ExploreEventCard — thin wrapper around EventCard.
// EventCard now handles all status badges, distance pills, and CTAs via
// getEventLifecycle(), so this just renders the card directly.
// ============================================================
function ExploreEventCard({ event }: { event: ApiEvent; now: number }) {
  return <EventCard event={event} />;
}

// ============================================================
// EmptyState
// ============================================================
function EmptyState({ status }: { status: StatusTab }) {
  const copy = {
    all: { icon: '🔍', title: 'No events match your filters', body: 'Try clearing some filters or broadening the radius.' },
    live: { icon: '🎪', title: 'Nothing live right now', body: "There are no events running at this moment — check Upcoming for the next ones." },
    upcoming: { icon: '📅', title: 'No upcoming events', body: 'Nothing on the calendar that matches. Adjust your filters or come back later.' },
    ended: { icon: '🗂', title: 'No past events match', body: 'No events have ended that match your current filters.' },
  }[status];

  return (
    <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
        {copy.icon}
      </div>
      <h3 className="text-base font-extrabold text-navy-800">{copy.title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{copy.body}</p>
      <Link
        href="/dashboard/explore"
        className="mt-4 inline-block rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-navy-700 transition hover:bg-cream-100"
      >
        Reset
      </Link>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
