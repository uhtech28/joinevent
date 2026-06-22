'use client';

// /events client shell — Step 4 + FINAL.
// Handles:
//   - location prompt + geo discovery
//   - filter rail (category, price, verified, society)
//   - search bar (full-text via Postgres)
//   - sort modes: date / trending / featured

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type ApiEvent } from '@/lib/api';
import { EventCard } from '@/components/EventCard';
import { DEFAULT_COORDS, useLocation } from '@/lib/use-location';

const RADIUS_OPTIONS = [3000, 5000, 10000, 25000] as const;
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

export function EventsClient({
  initialEvents,
  initialApiOk,
  initialApiMessage,
  initialQuery = '',
}: {
  initialEvents: ApiEvent[];
  initialApiOk: boolean;
  initialApiMessage: string;
  initialQuery?: string;
}) {
  const loc = useLocation();
  const [events, setEvents] = useState<ApiEvent[]>(initialEvents);
  const [mode, setMode] = useState<'list' | 'geo'>('list');
  const [radiusM, setRadiusM] = useState<(typeof RADIUS_OPTIONS)[number]>(5000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters — pre-fill q from URL so the topbar search lands here
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [bucketIdx, setBucketIdx] = useState(0);
  const [sort, setSort] = useState<'date' | 'trending' | 'featured'>('featured');

  const fetchGeo = useCallback(
    async (lat: number, lng: number, radius: number) => {
      setBusy(true);
      setError(null);
      try {
        const res = await api.discover({ lat, lng, radiusM: radius, limit: 30 });
        setEvents(res.items);
        setMode('geo');
      } catch (err) {
        const msg =
          err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message;
        setError(`Discovery failed — ${msg}`);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const fetchList = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const bucket = PRICE_BUCKETS[bucketIdx];
      const res = await api.listEvents({
        category: category || undefined,
        verifiedOnly: verifiedOnly || undefined,
        minPricePaise: bucket.min,
        maxPricePaise: bucket.max,
        q: q || undefined,
        sort,
        limit: 30,
      });
      setEvents(res.items);
      setMode('list');
    } catch (err) {
      const msg =
        err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message;
      setError(`Fetch failed — ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [category, verifiedOnly, bucketIdx, q, sort]);

  // On filter changes, refetch (debounced for q).
  useEffect(() => {
    if (mode === 'geo') return;
    const t = setTimeout(fetchList, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [fetchList, mode, q]);

  // When location resolves
  useEffect(() => {
    if (loc.status === 'granted' || loc.status === 'denied' || loc.status === 'unavailable') {
      fetchGeo(loc.lat, loc.lng, radiusM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.status]);

  const onRadius = (n: (typeof RADIUS_OPTIONS)[number]) => {
    setRadiusM(n);
    if (mode === 'geo') fetchGeo(loc.lat, loc.lng, n);
  };

  return (
    <>
      {/* Status row */}
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatusRow ok={true} label="Web" detail="Next.js 15 · You are here" />
        <StatusRow ok={initialApiOk} label="API" detail={initialApiMessage} />
        <StatusRow
          ok={initialApiOk && events.length > 0}
          label="Mode"
          detail={
            mode === 'geo'
              ? `Geo: ${events.length} within ${(radiusM / 1000).toFixed(0)} km`
              : `List · sort: ${sort}`
          }
        />
      </section>

      {/* Search + location */}
      <section className="mb-4 rounded-3xl border border-black/5 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Search events, addresses, descriptions…"
            className="flex-1 rounded-xl border border-black/10 bg-cream-100 px-4 py-2.5 text-sm outline-none focus:border-brand-orange focus:bg-white focus:ring-2 focus:ring-brand-orange/20"
          />
          <button
            type="button"
            onClick={loc.request}
            disabled={loc.status === 'loading' || busy}
            className="btn btn-primary !py-2 disabled:opacity-60"
          >
            {loc.status === 'loading'
              ? 'Asking…'
              : loc.status === 'granted'
                ? '📍 Nearby'
                : 'Use my location'}
          </button>
        </div>

        {mode === 'geo' && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-ink-400">Radius:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRadius(r)}
                className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                  r === radiusM
                    ? 'bg-brand-orange text-white shadow-brand'
                    : 'border border-black/10 bg-white text-ink-600 hover:bg-cream-200'
                }`}
              >
                {r / 1000} km
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                loc.reset();
                setMode('list');
                fetchList();
              }}
              className="ml-auto text-xs text-brand-orange hover:underline"
            >
              Clear location
            </button>
          </div>
        )}
      </section>

      {/* Filter rail */}
      <section className="mb-6 rounded-3xl border border-black/5 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 font-semibold text-ink-600"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Price */}
          <select
            value={bucketIdx}
            onChange={(e) => setBucketIdx(Number(e.target.value))}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 font-semibold text-ink-600"
          >
            {PRICE_BUCKETS.map((b, i) => (
              <option key={b.label} value={i}>
                {b.label}
              </option>
            ))}
          </select>

          {/* Verified */}
          <label className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 font-semibold text-ink-600">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Verified only
          </label>

          {/* Sort */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-ink-400">Sort:</span>
            {(['featured', 'trending', 'date'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`rounded-xl px-3 py-2 font-semibold capitalize ${
                  sort === s
                    ? 'bg-brand-orange text-white shadow-brand'
                    : 'border border-black/10 bg-white text-ink-600 hover:bg-cream-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Events grid */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-ink-700 sm:text-3xl">
            {mode === 'geo' ? 'Closest to you' : 'Events'}
          </h2>
          <span className="text-sm text-ink-300">
            {events.length} result{events.length === 1 ? '' : 's'}
          </span>
        </div>

        {events.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-brand-orange/40 bg-cream-200 p-10 text-center text-sm text-ink-400">
            Nothing matches. Try clearing some filters or expanding the radius.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card">
      <span
        aria-hidden
        className={`mt-1 inline-block h-3 w-3 shrink-0 rounded-full ${
          ok ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-700">{label}</div>
        <div className="truncate text-xs text-ink-300">{detail}</div>
      </div>
    </div>
  );
}
