// event-lifecycle.ts — single source of truth for the marketplace status badges.
//
// Every surface (cards, hero banners, list rows, explore filters) calls
// `getEventLifecycle(event)` and renders the returned descriptor. That way
// the LIVE pulse, countdown chip, Sold Out badge, Ending Soon urgency, and
// Hot/Trending flags all stay perfectly in sync everywhere.

import type { ApiEvent, OwnerEvent } from './api';

export type EventStatus =
  | 'draft'
  | 'pending_verification'
  | 'live_now' // currently happening
  | 'upcoming'
  | 'ended'
  | 'archived'
  | 'cancelled'
  | 'sold_out';

export type LifecycleBadge = {
  /** Stable machine status — fine for filtering / analytics. */
  status: EventStatus;
  /** Human label shown on the badge. */
  label: string;
  /** Tailwind classes for the badge container. */
  tone:
    | 'live'
    | 'upcoming'
    | 'ending-soon'
    | 'sold-out'
    | 'ended'
    | 'archived'
    | 'draft'
    | 'cancelled';
  /** True when we should render the animated pulse dot on the badge. */
  pulse: boolean;
};

export type LifecycleDescriptor = {
  badge: LifecycleBadge;
  /** Optional secondary badge (e.g. "Ending Soon" on top of "Live"). */
  warning: LifecycleBadge | null;
  /** True if booked >= available. */
  isSoldOut: boolean;
  /** True if event ends within 24 hours. */
  isEndingSoon: boolean;
  /** True if booking velocity / occupancy crosses the trending threshold. */
  isTrending: boolean;
  /** Human countdown line, e.g. "Starts in 5 days", "Ends in 2 hours". */
  countdown: string | null;
  /** Tells the booking panel whether new applications are still allowed. */
  acceptsBookings: boolean;
};

// Anything = OwnerEvent | ApiEvent — both carry the fields we read.
type EventLike = Pick<
  OwnerEvent | ApiEvent,
  'startsAt' | 'endsAt' | 'stalls'
> & {
  status?: string;
  isFeatured?: boolean;
};

const ARCHIVE_THRESHOLD_DAYS = 30;

export function getEventLifecycle(event: EventLike, now: number = Date.now()): LifecycleDescriptor {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const status = event.status ?? 'live';

  const booked = event.stalls.booked ?? 0;
  const available = event.stalls.available ?? 0;
  const occupancyPct = available > 0 ? booked / available : 0;
  const isSoldOut = available > 0 && booked >= available;
  const isEndingSoon = end > now && end - now <= 24 * 60 * 60 * 1000;
  const isTrending = !!event.isFeatured || (occupancyPct >= 0.7 && start > now);

  // Hard-status routes (no time math)
  if (status === 'draft') {
    return barebones({
      status: 'draft',
      label: 'Draft',
      tone: 'draft',
      pulse: false,
    });
  }
  if (status === 'cancelled') {
    return barebones({
      status: 'cancelled',
      label: 'Cancelled',
      tone: 'cancelled',
      pulse: false,
    });
  }
  if (status === 'pending_verification') {
    return barebones({
      status: 'pending_verification',
      label: 'Pending review',
      tone: 'draft',
      pulse: false,
    });
  }

  // Archived = ended more than 30 days ago
  const archivedAt = end + ARCHIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  if (now > archivedAt) {
    return {
      badge: { status: 'archived', label: 'Archived', tone: 'archived', pulse: false },
      warning: null,
      isSoldOut,
      isEndingSoon: false,
      isTrending: false,
      countdown: null,
      acceptsBookings: false,
    };
  }

  // Ended (within archive window)
  if (end < now) {
    return {
      badge: { status: 'ended', label: 'Event completed', tone: 'ended', pulse: false },
      warning: null,
      isSoldOut,
      isEndingSoon: false,
      isTrending: false,
      countdown: relativeTime(end, now, 'past'),
      acceptsBookings: false,
    };
  }

  // Live now
  if (start <= now && end >= now) {
    const live: LifecycleBadge = {
      status: 'live_now',
      label: 'Live',
      tone: 'live',
      pulse: true,
    };
    const warning: LifecycleBadge | null = isEndingSoon
      ? { status: 'ended', label: 'Ending soon', tone: 'ending-soon', pulse: false }
      : null;
    return {
      badge: live,
      warning,
      isSoldOut,
      isEndingSoon,
      isTrending,
      countdown: `Ends ${relativeTime(end, now, 'future')}`,
      acceptsBookings: !isSoldOut,
    };
  }

  // Upcoming — start > now
  const upcoming: LifecycleBadge = isSoldOut
    ? { status: 'sold_out', label: 'Sold out', tone: 'sold-out', pulse: false }
    : { status: 'upcoming', label: 'Upcoming', tone: 'upcoming', pulse: false };

  return {
    badge: upcoming,
    warning: null,
    isSoldOut,
    isEndingSoon: false,
    isTrending,
    countdown: `Starts ${relativeTime(start, now, 'future')}`,
    acceptsBookings: !isSoldOut,
  };
}

function barebones(badge: LifecycleBadge): LifecycleDescriptor {
  return {
    badge,
    warning: null,
    isSoldOut: false,
    isEndingSoon: false,
    isTrending: false,
    countdown: null,
    acceptsBookings: false,
  };
}

/** "in 3 days" / "in 2 hours" / "3 hours ago". */
function relativeTime(ts: number, now: number, dir: 'future' | 'past'): string {
  const delta = Math.abs(ts - now);
  const min = Math.floor(delta / 60_000);
  const hr = Math.floor(delta / 3_600_000);
  const day = Math.floor(delta / (24 * 3_600_000));

  if (dir === 'future') {
    if (day >= 1) return `in ${day} day${day === 1 ? '' : 's'}`;
    if (hr >= 1) return `in ${hr} hour${hr === 1 ? '' : 's'}`;
    if (min >= 1) return `in ${min} minute${min === 1 ? '' : 's'}`;
    return 'in a moment';
  }
  // past
  if (day >= 1) return `${day} day${day === 1 ? '' : 's'} ago`;
  if (hr >= 1) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  if (min >= 1) return `${min} minute${min === 1 ? '' : 's'} ago`;
  return 'just now';
}

// ============================================================
// Tailwind classes for each tone — keeps badge styling identical everywhere
// ============================================================
export const LIFECYCLE_TONE_CLASSES: Record<LifecycleBadge['tone'], string> = {
  live: 'bg-emerald-500 text-white shadow-soft',
  upcoming: 'bg-ribbon-purple/10 text-ribbon-purple ring-1 ring-inset ring-ribbon-purple/20',
  'ending-soon': 'bg-orange-500 text-white shadow-soft',
  'sold-out': 'bg-rose-500 text-white shadow-soft',
  ended: 'bg-cream-300 text-ink-500',
  archived: 'bg-ink-400/15 text-ink-500',
  draft: 'bg-cream-200 text-ink-500 ring-1 ring-inset ring-black/10',
  cancelled: 'bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200',
};
