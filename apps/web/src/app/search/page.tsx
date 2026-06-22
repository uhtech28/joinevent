// /search?q=… — unified results: matching organisers + vendors + events.
// Server-renders both halves in parallel.

import Link from 'next/link';
import {
  api,
  type ApiEvent,
  type PublicBusinessProfile,
} from '@/lib/api';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { EventCard } from '@/components/EventCard';

export const metadata = { title: 'Search' };

async function runSearch(q: string): Promise<{
  profiles: PublicBusinessProfile[];
  events: ApiEvent[];
}> {
  const [profiles, eventsRes] = await Promise.all([
    api.profiles.search(q).catch(() => [] as PublicBusinessProfile[]),
    api.listEvents({ q, limit: 12 }).catch(() => ({ items: [] as ApiEvent[], nextCursor: null })),
  ]);
  return { profiles, events: eventsRes.items };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const term = typeof params.q === 'string' ? params.q.trim() : '';
  const { profiles, events } = term.length >= 2
    ? await runSearch(term)
    : { profiles: [] as PublicBusinessProfile[], events: [] as ApiEvent[] };

  const totalHits = profiles.length + events.length;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
        <div className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Search
        </div>

        {/* Inline search box (server-rendered form, reloads with new q) */}
        <form method="GET" action="/search" className="mb-6">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              name="q"
              defaultValue={term}
              placeholder="Search events, organisers, stall owners…"
              autoFocus
              className="h-12 w-full rounded-2xl border border-black/10 bg-white pl-11 pr-3 text-[15px] font-medium text-navy-800 shadow-soft outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15"
            />
          </div>
        </form>

        {term.length < 2 && (
          <p className="rounded-2xl border-2 border-dashed border-black/10 bg-cream-50 p-8 text-center text-sm text-ink-400">
            Type at least 2 characters to search across events and profiles.
          </p>
        )}

        {term.length >= 2 && totalHits === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
              🔍
            </div>
            <h3 className="text-base font-extrabold text-navy-800">
              No matches for &ldquo;{term}&rdquo;
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              Try a different spelling, broader keyword, or browse events directly.
            </p>
            <Link
              href="/events"
              className="mt-4 inline-block rounded-2xl bg-purple-gradient px-5 py-2.5 text-sm font-extrabold text-white ring-1 ring-inset ring-white/15 transition hover:opacity-95"
            >
              Browse all events
            </Link>
          </div>
        )}

        {/* Organisers + vendors */}
        {profiles.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-extrabold text-navy-800">
                Organisers &amp; stalls
              </h2>
              <span className="text-xs text-ink-400">
                {profiles.length} result{profiles.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {profiles.map((p) => (
                <ProfileResultCard key={p.id} profile={p} />
              ))}
            </div>
          </section>
        )}

        {/* Events */}
        {events.length > 0 && (
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-extrabold text-navy-800">Events</h2>
              <span className="text-xs text-ink-400">
                {events.length} result{events.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

function ProfileResultCard({ profile }: { profile: PublicBusinessProfile }) {
  const initials =
    profile.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || '?';
  return (
    <Link
      href={`/org/${profile.username}`}
      className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white p-4 transition hover:-translate-y-0.5 hover:border-black/[0.15]"
    >
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt={profile.displayName}
          className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ribbon-purple via-ribbon-pink to-brand-purple text-sm font-extrabold text-white ring-2 ring-white">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-extrabold text-navy-800">
            {profile.displayName}
          </span>
          {profile.verified && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700">
              ✓
            </span>
          )}
        </div>
        <div className="text-[11px] text-ink-400">
          @{profile.username} · {profile.type === 'organiser' ? 'Organiser' : 'Stall owner'}
        </div>
        {profile.location && (
          <div className="mt-0.5 truncate text-[11px] text-ink-500">
            📍 {profile.location}
          </div>
        )}
      </div>
      <div className="text-right text-[11px] text-ink-400">
        <div className="font-bold text-navy-800">{profile.followersCount}</div>
        <div>followers</div>
      </div>
    </Link>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
