'use client';

// /dashboard/events — Event management page.
// Stats summary · filter tabs · search · sortable card grid · empty state.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, type OwnerEvent, type PublicBusinessProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Filter = 'all' | 'live' | 'upcoming' | 'pending_verification' | 'draft' | 'past' | 'cancelled';

// Calendar-day-aware "is this event happening today?" — start day is floored to
// local midnight, so an event scheduled for later today (e.g. 6pm) is already
// counted as live from 12am. End boundary stays exact, so events flip to
// not-live the instant they end.
function isLiveNow(e: { status: string; startsAt: string; endsAt: string }, now: number) {
  if (e.status !== 'live') return false;
  const end = new Date(e.endsAt).getTime();
  if (end < now) return false;
  const sd = new Date(e.startsAt);
  sd.setHours(0, 0, 0, 0);
  return sd.getTime() <= now;
}
function isUpcoming(e: { status: string; startsAt: string; endsAt: string }, now: number) {
  if (e.status !== 'live') return false;
  const sd = new Date(e.startsAt);
  sd.setHours(0, 0, 0, 0);
  return sd.getTime() > now;
}
type Sort = 'newest' | 'oldest' | 'starts_soonest' | 'most_booked';

export default function EventsPage() {
  const auth = useAuth();
  const [events, setEvents] = useState<OwnerEvent[] | null>(null);
  const [profiles, setProfiles] = useState<PublicBusinessProfile[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    (async () => {
      const [ev, ps] = await Promise.all([
        api.events.mine().catch(() => [] as OwnerEvent[]),
        api.profiles.mine().catch(() => [] as PublicBusinessProfile[]),
      ]);
      setEvents(ev);
      setProfiles(ps);
      setLoaded(true);
    })();
  }, [auth.status]);

  const organiser = profiles?.find((p) => p.type === 'organiser');

  // ----- Derived counts -----
  const counts = useMemo(() => {
    const all = events ?? [];
    const now = Date.now();
    return {
      all: all.length,
      live: all.filter((e) => isLiveNow(e, now)).length,
      upcoming: all.filter((e) => isUpcoming(e, now)).length,
      pending_verification: all.filter((e) => e.status === 'pending_verification').length,
      draft: all.filter((e) => e.status === 'draft').length,
      past: all.filter((e) => new Date(e.endsAt).getTime() < now).length,
      cancelled: all.filter((e) => e.status === 'cancelled').length,
    };
  }, [events]);

  // ----- Filter + search + sort pipeline -----
  const view = useMemo(() => {
    let list = events ?? [];
    const now = Date.now();
    if (filter === 'live') list = list.filter((e) => isLiveNow(e, now));
    else if (filter === 'upcoming') list = list.filter((e) => isUpcoming(e, now));
    else if (filter === 'pending_verification')
      list = list.filter((e) => e.status === 'pending_verification');
    else if (filter === 'draft') list = list.filter((e) => e.status === 'draft');
    else if (filter === 'past') list = list.filter((e) => new Date(e.endsAt).getTime() < now);
    else if (filter === 'cancelled') list = list.filter((e) => e.status === 'cancelled');

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(needle) ||
          e.addressText.toLowerCase().includes(needle) ||
          (e.society?.name.toLowerCase().includes(needle) ?? false),
      );
    }

    switch (sort) {
      case 'newest':
        list = [...list].sort(
          (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
        );
        break;
      case 'oldest':
        list = [...list].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
        break;
      case 'starts_soonest': {
        const t = Date.now();
        list = [...list].sort((a, b) => {
          const da = new Date(a.startsAt).getTime();
          const db = new Date(b.startsAt).getTime();
          const aFut = da > t ? 0 : 1;
          const bFut = db > t ? 0 : 1;
          if (aFut !== bFut) return aFut - bFut;
          return da - db;
        });
        break;
      }
      case 'most_booked':
        list = [...list].sort((a, b) => (b.stalls.booked ?? 0) - (a.stalls.booked ?? 0));
        break;
    }
    return list;
  }, [events, filter, q, sort]);

  if (!loaded) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* ---------- Page header ---------- */}
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Events
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Your Events
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Manage drafts, track live events, and watch bookings roll in.
        </p>
      </header>

      {/* ---------- Stat tiles ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          accent="bg-ribbon-blue"
          tint="bg-ribbon-blue/10 text-ribbon-blue"
          icon={<TotalIcon className="h-5 w-5" />}
          eyebrow="Total Events"
          value={counts.all}
          hint="All time"
        />
        <StatTile
          accent="bg-emerald-500"
          tint="bg-emerald-50 text-emerald-600"
          icon={<LiveIcon className="h-5 w-5" />}
          eyebrow="Live Now"
          value={counts.live}
          hint="Happening today"
        />
        <StatTile
          accent="bg-amber-500"
          tint="bg-amber-50 text-amber-600"
          icon={<PendingIcon className="h-5 w-5" />}
          eyebrow="Pending Review"
          value={counts.pending_verification}
          hint="Waiting for admin approval"
        />
        <StatTile
          accent="bg-ink-400"
          tint="bg-cream-200 text-ink-500"
          icon={<DraftIcon className="h-5 w-5" />}
          eyebrow="Drafts"
          value={counts.draft}
          hint="Not yet submitted"
        />
      </div>

      {/* ---------- Toolbar: filter tabs · search · sort ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          value={filter}
          onChange={setFilter}
          counts={counts}
        />
        <div className="flex items-center gap-2">
          <SearchInput value={q} onChange={setQ} />
          <SortDropdown value={sort} onChange={setSort} />
        </div>
      </div>

      {/* ---------- Grid or empty ---------- */}
      {view.length === 0 ? (
        <EmptyState organiser={organiser} hasAnyEvents={(events ?? []).length > 0} filter={filter} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {view.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STAT TILE
// ============================================================
function StatTile({
  icon,
  tint,
  accent,
  eyebrow,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tint: string;
  accent: string;
  eyebrow: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="group rounded-xl border border-black/[0.06] bg-white p-5 transition hover:border-black/[0.12]">
      {/* Icon + label on one row */}
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}>
          {icon}
        </div>
        <div className="text-[13px] font-semibold text-ink-500">{eyebrow}</div>
      </div>

      {/* Hero number */}
      <div className="mt-4 flex items-baseline gap-2">
        <div className="text-[36px] font-bold leading-none tracking-tight text-navy-800 tabular-nums">
          {value}
        </div>
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${accent}`} aria-hidden />
      </div>

      {/* Caption */}
      <div className="mt-3 text-xs text-ink-400">{hint}</div>
    </div>
  );
}

// ---------- Stat icons ----------
function TotalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 4v4M16 4v4M7 13h4M7 17h6" strokeLinecap="round" />
    </svg>
  );
}
function LiveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PendingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DraftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" strokeLinejoin="round" />
      <path d="M14 3v6h6M8 13h6M8 17h4" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================
// FILTER TABS
// ============================================================
const FILTER_TABS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'pending_verification', label: 'Pending' },
  { key: 'draft', label: 'Drafts' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

function FilterTabs({
  value,
  onChange,
  counts,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  counts: Record<Filter, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {FILTER_TABS.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
              active
                ? 'bg-navy-800 text-white'
                : 'text-ink-500 hover:bg-cream-100 hover:text-navy-800'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`tabular-nums text-[11px] ${
                active ? 'text-white/70' : 'text-ink-300'
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// SEARCH + SORT
// ============================================================
function SearchInput({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        placeholder="Search events…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-black/[0.08] bg-cream-50 pl-9 pr-3 text-sm font-medium text-ink-700 outline-none transition focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15 sm:w-56"
      />
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Sort)}
        className="h-9 appearance-none rounded-lg border border-black/[0.08] bg-cream-50 pl-3 pr-9 text-sm font-semibold text-ink-700 outline-none transition hover:bg-white focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="starts_soonest">Starts soonest</option>
        <option value="most_booked">Most booked</option>
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ============================================================
// EVENT CARD
// ============================================================
function EventCard({ event }: { event: OwnerEvent }) {
  const cover = event.coverImages?.[0] ?? '';
  const start = new Date(event.startsAt);
  const day = start.toLocaleDateString('en-IN', { day: '2-digit' });
  const month = start.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
  const dateRange = formatDateRange(event.startsAt, event.endsAt);
  const occupancy =
    event.stalls.available > 0
      ? Math.round((event.stalls.booked / event.stalls.available) * 100)
      : 0;
  const estRevenue =
    event.stalls.booked > 0 && event.stalls.priceFromPaise
      ? (event.stalls.booked * event.stalls.priceFromPaise) / 100
      : 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft transition hover:-translate-y-0.5">
      {/* Cover */}
      <div className="relative h-44 w-full overflow-hidden bg-cream-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={event.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-cream-300">
            🎪
          </div>
        )}
        {/* Date block */}
        <div className="absolute left-3 top-3 flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-white text-navy-800 shadow-soft">
          <div className="text-lg font-extrabold leading-none">{day}</div>
          <div className="text-[10px] font-bold tracking-wider text-brand-purple">{month}</div>
        </div>
        {/* Status pill — lifecycle aware (UPCOMING / LIVE NOW / ENDED) for
            published events, workflow state (DRAFT / PENDING / CANCELLED) for
            anything else. */}
        <div className="absolute right-3 top-3">
          <EventStatusPill
            status={event.status}
            startsAt={event.startsAt}
            endsAt={event.endsAt}
          />
        </div>
        {/* Featured badge */}
        {event.isFeatured && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-ribbon-yellow/95 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-navy-800 backdrop-blur">
            ★ Featured
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-extrabold leading-tight text-navy-800">
          {event.title}
        </h3>
        <p className="mt-1 truncate text-xs text-ink-500">
          {dateRange} · {event.addressText}
        </p>
        {event.society && (
          <p className="mt-0.5 truncate text-xs font-semibold text-ribbon-purple">
            @{event.society.slug}
          </p>
        )}

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-cream-100 p-3">
          <Stat
            label="Stalls"
            value={`${event.stalls.booked}/${event.stalls.available}`}
            color="text-navy-800"
          />
          <Stat
            label="Occupancy"
            value={`${occupancy}%`}
            color={occupancy >= 70 ? 'text-emerald-600' : occupancy >= 30 ? 'text-amber-600' : 'text-ink-500'}
          />
          <Stat
            label="Est. revenue"
            value={
              estRevenue > 0
                ? `₹${estRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                : '—'
            }
            color="text-brand-purple"
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/events/${event.slug}`}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-navy-700 transition hover:bg-cream-100"
          >
            View page
          </Link>
          {(event.status === 'draft' || event.status === 'pending_verification') && (
            <Link
              href={`/dashboard/events/${event.id}/edit`}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-navy-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-navy-800"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-base font-extrabold leading-none ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
        {label}
      </div>
    </div>
  );
}

function EventStatusPill({
  status,
  startsAt,
  endsAt,
}: {
  status: string;
  startsAt: string;
  endsAt: string;
}) {
  type Pill = { bg: string; text: string; label: string; dot?: string };

  // Workflow states (draft / pending_verification / cancelled) always win —
  // they describe whether the event is allowed to be shown publicly at all,
  // independent of its scheduled dates.
  const workflow: Record<string, Pill> = {
    draft: { bg: 'bg-cream-300/95', text: 'text-ink-500', label: 'Draft', dot: 'bg-ink-400' },
    pending_verification: { bg: 'bg-amber-100/95', text: 'text-amber-700', label: 'Pending', dot: 'bg-amber-500' },
    cancelled: { bg: 'bg-rose-100/95', text: 'text-rose-700', label: 'Cancelled', dot: 'bg-rose-500' },
  };
  if (workflow[status]) {
    const p = workflow[status];
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full ${p.bg} px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${p.text} backdrop-blur`}>
        {p.dot && <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />}
        {p.label}
      </span>
    );
  }

  // For 'live' (i.e. published) events, derive the badge from the schedule.
  // "Live" in the DB sense just means "published"; what the organiser actually
  // wants to see is whether the event hasn't started, is happening now, or is
  // already over — same vocabulary used on the public Browse Events page.
  if (status === 'live') {
    const now = Date.now();
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    let pill: Pill;
    if (end < now) {
      pill = { bg: 'bg-cream-300/95', text: 'text-ink-500', label: 'Ended', dot: 'bg-ink-400' };
    } else if (start <= now && now <= end) {
      pill = { bg: 'bg-emerald-100/95', text: 'text-emerald-700', label: 'Live now', dot: 'bg-emerald-500' };
    } else {
      pill = { bg: 'bg-brand-purple/10', text: 'text-brand-purple', label: 'Upcoming', dot: 'bg-brand-purple' };
    }
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full ${pill.bg} px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${pill.text} backdrop-blur`}>
        {pill.dot && <span className={`h-1.5 w-1.5 rounded-full ${pill.dot} ${pill.label === 'Live now' ? 'animate-pulse' : ''}`} />}
        {pill.label}
      </span>
    );
  }

  // Unknown status — render verbatim.
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-200/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-500 backdrop-blur">
      {status}
    </span>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyState({
  organiser,
  hasAnyEvents,
  filter,
}: {
  organiser?: PublicBusinessProfile;
  hasAnyEvents: boolean;
  filter: Filter;
}) {
  if (!organiser) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-ribbon-green/30 bg-emerald-50/40 p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-ribbon-green/15 text-3xl">
          🎤
        </div>
        <h3 className="text-xl font-extrabold text-navy-800">Become an organiser first</h3>
        <p className="mt-2 text-sm text-ink-500">
          Create a verified organiser profile to start posting events — 30 seconds.
        </p>
        <Link
          href="/dashboard/profile/new"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-ribbon-green px-5 py-3 text-sm font-extrabold text-white ring-1 ring-inset ring-white/15 transition hover:opacity-95"
        >
          Become an organiser →
        </Link>
      </div>
    );
  }
  if (hasAnyEvents) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-black/10 bg-cream-100 p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-cream-300 text-3xl">
          🔍
        </div>
        <h3 className="text-xl font-extrabold text-navy-800">
          No events match this filter
        </h3>
        <p className="mt-2 text-sm text-ink-500">
          Try a different tab — there&apos;s nothing under <strong>{filter}</strong> right now.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-purple/15 text-3xl">
        🎪
      </div>
      <h3 className="text-xl font-extrabold text-navy-800">No events yet</h3>
      <p className="mt-2 text-sm text-ink-500">
        Post your first event — society fair, exhibition, pop-up market, anything.
      </p>
      <Link
        href="/dashboard/events/new"
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-purple-gradient px-5 py-3 text-sm font-extrabold text-white ring-1 ring-inset ring-white/15 transition hover:opacity-95"
      >
        + Create your first event
      </Link>
    </div>
  );
}

// ============================================================
// SKELETON
// ============================================================
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-64 animate-pulse rounded-xl bg-white shadow-soft" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skel /><Skel /><Skel /><Skel />
      </div>
      <div className="h-20 animate-pulse rounded-3xl bg-white shadow-soft" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Skel className="h-80" /><Skel className="h-80" /><Skel className="h-80" />
      </div>
    </div>
  );
}
function Skel({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl bg-white shadow-soft ${className ?? 'h-32'}`} />;
}

// ============================================================
// helpers
// ============================================================
function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    const month = start.toLocaleDateString('en-IN', { month: 'short' });
    return `${start.getDate()}–${end.getDate()} ${month} ${start.getFullYear()}`;
  }
  return `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString(
    'en-IN',
    { day: '2-digit', month: 'short', year: 'numeric' },
  )}`;
}
