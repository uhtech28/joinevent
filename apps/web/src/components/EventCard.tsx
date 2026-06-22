'use client';

// EventCard — premium marketplace card per the master design spec.
// Renders the lifecycle badge (LIVE pulse / Upcoming / Ending Soon / Sold Out /
// Ended), 🔥 Trending flag, stall stats, View Details CTA, and an Apply Stall
// CTA that's only shown to vendors (stall owners). Regular users and organisers
// don't need the Apply CTA so it's hidden and View Details goes full-width.
//
// All status logic comes from `getEventLifecycle` so every surface stays in sync.

import Link from 'next/link';
import type { ApiEvent } from '@/lib/api';
import { formatDistance } from '@/lib/use-location';
import { getEventLifecycle } from '@/lib/event-lifecycle';
import { useAuth } from '@/lib/auth-context';
import { LifecycleBadge } from './LifecycleBadge';

const inr = (paise: number | null) =>
  paise == null ? null : `₹${(paise / 100).toLocaleString('en-IN')}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function EventCard({ event }: { event: ApiEvent }) {
  const auth = useAuth();
  const role = auth.status === 'authenticated' ? auth.user.primaryRole : null;
  // Only stall owners (vendors) get the Apply Stall CTA. Regular users and
  // organisers see a full-width View Details. Anonymous viewers also see only
  // View Details — the apply flow on the event page handles its own login gate.
  const showApplyCta = role === 'vendor';

  const lifecycle = getEventLifecycle(event);
  const price = inr(event.stalls.priceFromPaise);
  const cover = event.coverImages?.[0];
  const stallsLeft = Math.max(0, event.stalls.available - event.stalls.booked);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      {/* Cover */}
      <Link href={`/events/${event.slug}`} className="relative block h-44 w-full overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={event.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-ribbon-purple via-brand-purple to-brand-purple-light" aria-hidden />
        )}

        {/* Top-left: lifecycle badge (LIVE pulse / Upcoming / Sold out / etc) */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <LifecycleBadge badge={lifecycle.badge} size="sm" />
          {lifecycle.warning && <LifecycleBadge badge={lifecycle.warning} size="sm" />}
          {lifecycle.isTrending && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-soft">
              🔥 Trending
            </span>
          )}
        </div>

        {/* Top-right: verified + distance */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {event.organiser.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 backdrop-blur">
              ✓ Verified
            </span>
          )}
          {typeof event.distanceM === 'number' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ribbon-purple px-2 py-0.5 text-[10px] font-extrabold text-white shadow-purple">
              📍 {formatDistance(event.distanceM)}
            </span>
          )}
        </div>

        {/* Bottom strip: countdown if set */}
        {lifecycle.countdown && (
          <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            ⏱ {lifecycle.countdown}
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/events/${event.slug}`} className="block">
          <h3 className="line-clamp-2 text-[15px] font-extrabold leading-tight text-navy-800 group-hover:text-ribbon-purple">
            {event.title}
          </h3>
        </Link>

        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-400">
          <Link
            href={`/org/${event.organiser.username}`}
            className="font-semibold text-ink-500 hover:text-ribbon-purple hover:underline"
          >
            @{event.organiser.username}
          </Link>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-0.5">
            <span className="text-amber-500">⭐</span>
            {event.organiser.avgRating.toFixed(2)}
          </span>
        </div>

        <p className="mt-2 text-[11px] text-ink-500">
          📅 {formatDate(event.startsAt)}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">
          📍 {event.addressText}
        </p>

        {/* Stall stats row (matches mockup: "X / Y Stalls", visitors) */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-cream-50 p-2.5 text-center">
          <Stat label="Total" value={event.stalls.available.toString()} tint="text-navy-800" />
          <Stat
            label={lifecycle.isSoldOut ? 'Sold out' : 'Available'}
            value={stallsLeft.toString()}
            tint={lifecycle.isSoldOut ? 'text-rose-500' : 'text-emerald-600'}
          />
          <Stat
            label="From"
            value={price ?? '—'}
            tint="text-ribbon-purple"
          />
        </div>

        {/* CTAs — single View Details for users/organisers; dual CTA for vendors. */}
        {showApplyCta ? (
          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/events/${event.slug}`}
              className="flex-1 rounded-xl border border-ribbon-purple/30 bg-ribbon-purple/5 py-2 text-center text-[12px] font-bold text-ribbon-purple transition hover:bg-ribbon-purple/10"
            >
              View Details
            </Link>
            {lifecycle.acceptsBookings && stallsLeft > 0 ? (
              <Link
                href={`/events/${event.slug}#stalls`}
                className="flex-1 rounded-xl bg-purple-gradient py-2 text-center text-[12px] font-extrabold text-white shadow-purple transition hover:opacity-95"
              >
                Apply Stall
              </Link>
            ) : (
              <span className="flex-1 cursor-not-allowed rounded-xl bg-cream-200 py-2 text-center text-[12px] font-bold text-ink-400">
                {lifecycle.isSoldOut ? 'Sold out' : 'Closed'}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <Link
              href={`/events/${event.slug}`}
              className="block w-full rounded-xl bg-purple-gradient py-2.5 text-center text-[12px] font-extrabold text-white shadow-purple transition hover:opacity-95"
            >
              View Details
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

function Stat({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div>
      <div className={`text-sm font-extrabold leading-none ${tint}`}>{value}</div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-400">
        {label}
      </div>
    </div>
  );
}
