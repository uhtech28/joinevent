'use client';

// /dashboard/people — Explore (profile discovery).
// A profile-search hub: users can search organiser + vendor profiles by
// username / display name / bio / location, filter by type, and jump to the
// public profile at /org/[username].
//
// Default state (no query) shows popular profiles via /business-profiles/discover.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PublicBusinessProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type TypeFilter = 'all' | 'organiser' | 'vendor';

export default function ExplorePeoplePage() {
  const auth = useAuth();
  const [q, setQ] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [profiles, setProfiles] = useState<PublicBusinessProfile[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [didInitialFetch, setDidInitialFetch] = useState(false);

  // Debounce the search so we don't fire on every keystroke.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfiles = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const term = q.trim();
      const opts = { type: type === 'all' ? undefined : type, limit: 30 };
      // Backend search requires ≥ 2 characters; otherwise fall back to discover.
      const rows =
        term.length >= 2
          ? await api.profiles.search(term, opts)
          : await api.profiles.discover(opts);
      setProfiles(rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setProfiles([]);
    } finally {
      setBusy(false);
      setDidInitialFetch(true);
    }
  }, [q, type]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Debounce only the search box; type changes refetch immediately.
    debounceRef.current = setTimeout(() => {
      void fetchProfiles();
    }, q.trim() ? 250 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [auth.status, fetchProfiles, q]);

  return (
    <div className="space-y-5">
      {/* ---------- Header ---------- */}
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Explore
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Discover organisers &amp; stall owners
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Find people behind the events — search by handle, name, or area.
        </p>
      </header>

      {/* ---------- Search + type filter ---------- */}
      <div className="rounded-2xl border border-black/[0.08] bg-white p-3 shadow-card sm:p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by @username, name, or location…"
            className="h-11 w-full rounded-xl border border-black/[0.08] bg-cream-50 pl-10 pr-3 text-sm font-medium text-navy-800 outline-none transition focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <TypeChip active={type === 'all'} onClick={() => setType('all')}>
            Everyone
          </TypeChip>
          <TypeChip
            active={type === 'organiser'}
            onClick={() => setType('organiser')}
          >
            Organisers
          </TypeChip>
          <TypeChip
            active={type === 'vendor'}
            onClick={() => setType('vendor')}
          >
            Stall owners
          </TypeChip>
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="ml-auto rounded-lg px-2 py-1.5 text-xs font-bold text-brand-purple hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* ---------- Results header ---------- */}
      {!busy && !error && didInitialFetch && (
        <div className="text-xs text-ink-400">
          {q.trim().length >= 2 ? (
            <>
              {profiles.length} match{profiles.length === 1 ? '' : 'es'} for &ldquo;{q.trim()}&rdquo;
            </>
          ) : (
            <>Popular {type === 'all' ? 'profiles' : type + 's'}</>
          )}
        </div>
      )}

      {/* ---------- Loading ---------- */}
      {busy && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl bg-white shadow-card"
            />
          ))}
        </div>
      )}

      {/* ---------- Error ---------- */}
      {!busy && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {/* ---------- Empty ---------- */}
      {!busy && !error && profiles.length === 0 && (
        <EmptyState querying={q.trim().length >= 2} q={q.trim()} />
      )}

      {/* ---------- Grid ---------- */}
      {!busy && !error && profiles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ProfileCard — square avatar + identity + bio + CTA.
// ============================================================
function ProfileCard({ profile }: { profile: PublicBusinessProfile }) {
  const initial = (profile.displayName?.[0] ?? profile.username[0] ?? '?').toUpperCase();
  const ratingNum = Number(profile.avgRating) || 0;
  // Track avatar load failure so dead URLs (e.g. wiped local-disk uploads)
  // fall back to the initial-on-gradient circle instead of a broken-image icon.
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showAvatar = !!profile.avatarUrl && !avatarFailed;
  return (
    <Link
      href={`/org/${encodeURIComponent(profile.username)}`}
      className="group flex flex-col gap-3 rounded-2xl border border-black/[0.08] bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl!}
              alt={profile.displayName}
              className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white shadow"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-gradient text-xl font-extrabold text-white shadow-purple">
              {initial}
            </div>
          )}
          {profile.verified && (
            <span
              title="Verified"
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-purple text-[10px] font-bold text-white ring-2 ring-white"
            >
              ✓
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-extrabold text-navy-800 group-hover:text-brand-purple">
              {profile.displayName}
            </h3>
            <TypeBadge type={profile.type} />
          </div>
          <div className="truncate text-xs font-semibold text-ink-500">
            @{profile.username}
          </div>
          {profile.location && (
            <div className="mt-1 flex items-center gap-1 truncate text-[11px] text-ink-400">
              <PinIcon className="h-3 w-3" />
              <span className="truncate">{profile.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="line-clamp-2 text-[13px] leading-snug text-ink-600">
          {profile.bio}
        </p>
      )}

      {/* Stats row */}
      <div className="mt-auto flex items-center justify-between border-t border-black/5 pt-3 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1 font-semibold text-navy-800">
          <UserGroupIcon className="h-3.5 w-3.5 text-brand-purple" />
          {formatCount(profile.followersCount)} followers
        </span>
        {ratingNum > 0 ? (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
            ★ {ratingNum.toFixed(1)}
          </span>
        ) : (
          <span className="text-ink-300">No reviews yet</span>
        )}
      </div>
    </Link>
  );
}

// ============================================================
// Small chrome
// ============================================================
function TypeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
        active
          ? 'bg-purple-gradient text-white shadow-purple'
          : 'text-ink-500 hover:bg-cream-100 hover:text-navy-800'
      }`}
    >
      {children}
    </button>
  );
}

function TypeBadge({ type }: { type: 'organiser' | 'vendor' }) {
  const map = {
    organiser: {
      label: 'Organiser',
      cls: 'bg-brand-purple/10 text-brand-purple',
    },
    vendor: {
      label: 'Stall',
      cls: 'bg-amber-500/10 text-amber-700',
    },
  } as const;
  const c = map[type];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

function EmptyState({ querying, q }: { querying: boolean; q: string }) {
  if (querying) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
          🔍
        </div>
        <h3 className="text-base font-extrabold text-navy-800">
          No profiles match &ldquo;{q}&rdquo;
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
          Try a different spelling, or search by area name.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
        👥
      </div>
      <h3 className="text-base font-extrabold text-navy-800">
        No profiles to show yet
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
        Once organisers and stall owners join, they&rsquo;ll appear here.
      </p>
    </div>
  );
}

// Compact number formatter — 1234 → 1.2k, 1_200_000 → 1.2M.
function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

// ============================================================
// Icons (inline so we don't pull in a library)
// ============================================================
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}
function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
