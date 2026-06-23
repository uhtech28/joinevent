'use client';

// /dashboard — role-aware. Organisers get the rich profile-hero layout with
// the right-rail. Users and vendors get the simpler stat-tiles layout.

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import {
  api,
  type ApiBooking,
  type ApiEvent,
  type OwnerEvent,
  type PublicBusinessProfile,
  type WalletPayload,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  InstagramIcon,
  FacebookIcon,
  TwitterIcon,
  LinkedInIcon,
  YouTubeIcon,
  GlobeIcon,
  WhatsAppIcon,
} from '@/components/SocialIcons';

export default function DashboardPage() {
  const auth = useAuth();

  const [profiles, setProfiles] = useState<PublicBusinessProfile[] | null>(null);
  const [events, setEvents] = useState<OwnerEvent[] | null>(null);
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [bookings, setBookings] = useState<ApiBooking[] | null>(null);
  const [discovery, setDiscovery] = useState<ApiEvent[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    (async () => {
      const [ps, es, w, bks, ev] = await Promise.all([
        api.profiles.mine().catch(() => [] as PublicBusinessProfile[]),
        api.events.mine().catch(() => [] as OwnerEvent[]),
        api.wallet.mine().catch(() => null),
        api.bookings.mine().catch(() => [] as ApiBooking[]),
        api.listEvents({ limit: 8 }).then((r) => r.items).catch(() => [] as ApiEvent[]),
      ]);
      setProfiles(ps);
      setEvents(es);
      setWallet(w);
      setBookings(bks);
      setDiscovery(ev);
      setLoaded(true);
    })();
  }, [auth.status]);

  const user = auth.status === 'authenticated' ? auth.user : null;
  const role = (user?.primaryRole ?? 'user') as 'organiser' | 'vendor' | 'user';
  const friendly = user ? friendlyName(user.displayName, user.email, user.phone) : 'there';
  const organiser = profiles?.find((p) => p.type === 'organiser');
  const upcomingBookings = (bookings ?? []).filter(
    (b) => b.status === 'confirmed' && b.event && new Date(b.event.startsAt) > new Date(),
  );

  if (!loaded) return <DashboardSkeleton />;

  // Organiser → rich profile-hero layout from the design mockup
  if (role === 'organiser' && organiser) {
    return (
      <OrganiserDashboard
        profile={organiser}
        events={events ?? []}
      />
    );
  }
  // Silence unused warning for wallet
  void wallet;

  // User / Vendor → simplified honest layout
  return (
    <SimpleDashboard
      name={friendly}
      role={role}
      events={events ?? []}
      bookings={bookings ?? []}
      upcomingBookings={upcomingBookings}
      discovery={discovery ?? []}
      isVerified={!!user?.isVerified}
    />
  );
}

// =============================================================
// ORGANISER DASHBOARD — Profile hero · 5 KPI · Upcoming · Right rail
// =============================================================
function OrganiserDashboard({
  profile,
  events,
}: {
  profile: PublicBusinessProfile;
  events: OwnerEvent[];
}) {
  // --- Real numbers, all sourced from the organiser's own events.
  // (We deliberately do NOT use api.bookings.mine() here — that returns
  // bookings the signed-in user *made*, which is a vendor concern, not
  // the organiser's revenue.)
  const eventsOrganised = events.length;
  const stallsBooked = events.reduce((sum, e) => sum + e.stalls.booked, 0);
  const avgRating = Number(profile.avgRating) || 0;
  // Revenue = sum of (stalls booked × stall price). priceFromPaise is the
  // lowest-tier price, so this is a *conservative* but real-derived figure
  // (matches the calc on /dashboard/analytics so the two pages agree).
  const totalRevenueRupees = Math.round(
    events.reduce(
      (sum, e) => sum + e.stalls.booked * (e.stalls.priceFromPaise ?? 0),
      0,
    ) / 100,
  );

  // --- Upcoming events (top 3, in chronological order)
  const upcoming = [...events]
    .filter((e) => new Date(e.endsAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  const tags = (profile.bio ?? '')
    .split(/[•·,|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* MAIN COLUMN */}
      <div className="min-w-0 space-y-5">
        {/* --- Profile hero --- */}
        <ProfileHero profile={profile} tags={tags} eventsCount={eventsOrganised} avgRating={avgRating} />

        {/* --- KPI cards row --- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            tint="bg-ribbon-purple/12 text-ribbon-purple"
            icon={<CalendarFilledIcon className="h-5 w-5" />}
            value={eventsOrganised.toString()}
            label="Events"
            sub="All time"
          />
          <KpiCard
            tint="bg-emerald-100 text-emerald-600"
            icon={<StoreIcon className="h-5 w-5" />}
            value={stallsBooked.toString()}
            label="Stalls booked"
            sub="Across events"
          />
          <KpiCard
            tint="bg-yellow-100 text-amber-600"
            icon={<StarIcon className="h-5 w-5" />}
            value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
            label="Avg rating"
            sub={`${profile.followersCount} followers`}
          />
          <KpiCard
            tint="bg-indigo-100 text-indigo-600"
            icon={<WalletIcon className="h-5 w-5" />}
            value={formatRupees(totalRevenueRupees)}
            label="Revenue"
            sub="All time"
          />
        </div>

        {/* --- Upcoming Events --- */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-navy-800">Upcoming Events</h2>
            <Link
              href="/dashboard/events"
              className="text-xs font-bold text-ribbon-purple hover:underline"
            >
              View All Events →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-ribbon-purple/30 bg-cream-100 p-8 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-ribbon-purple/15 text-xl">
                🎪
              </div>
              <h3 className="text-sm font-extrabold text-navy-800">No upcoming events</h3>
              <p className="mt-1 text-xs text-ink-500">
                Create an event and it will show up here.
              </p>
              <Link
                href="/dashboard/events/new"
                className="mt-3 inline-block rounded-xl bg-purple-gradient px-4 py-2 text-xs font-extrabold text-white shadow-purple"
              >
                + Create Event
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => (
                <UpcomingEventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* RIGHT RAIL */}
      <aside className="space-y-5">
        <ShareProfileCard profile={profile} />
      </aside>
    </div>
  );
}

// =============================================================
// Profile hero — cover photo + avatar + identity + actions
// =============================================================
function ProfileHero({
  profile,
  tags,
  eventsCount,
  avgRating,
}: {
  profile: PublicBusinessProfile;
  tags: string[];
  eventsCount: number;
  avgRating: number;
}) {
  const initials =
    profile.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || '?';

  return (
    <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-soft">
      {/* Cover */}
      <div className="relative h-28 w-full overflow-hidden sm:h-40 lg:h-48">
        {profile.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full bg-gradient-to-br from-ribbon-purple via-brand-purple to-brand-purple-light"
            style={{
              backgroundImage:
                'radial-gradient(600px circle at 80% 20%, rgba(255,255,255,0.25), transparent 50%), radial-gradient(420px circle at 15% 90%, rgba(255,255,255,0.18), transparent 60%)',
            }}
          />
        )}
      </div>

      {/* Body */}
      <div className="relative px-4 pb-4 sm:px-6 sm:pb-6">
        {/* Avatar overlapping cover */}
        <div className="absolute -top-9 left-4 sm:-top-12 sm:left-6">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-[72px] w-[72px] rounded-full object-cover ring-4 ring-white sm:h-24 sm:w-24"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-purple-gradient text-2xl font-extrabold text-white ring-4 ring-white sm:h-24 sm:w-24">
              {initials}
            </div>
          )}
          {/* Verified dot */}
          {profile.verified && (
            <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="h-3.5 w-3.5">
                <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>

        {/* Identity + actions — stacked on mobile, side-by-side on sm+ */}
        <div className="flex flex-col gap-3 pt-11 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pt-16">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[19px] font-extrabold tracking-tight text-navy-800 sm:text-[22px] lg:text-[26px]">
                {profile.displayName}
              </h1>
              {profile.verified && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 sm:px-2.5 sm:text-[11px]">
                  ✓ Verified Organiser
                </span>
              )}
            </div>
            {tags.length > 0 && (
              <p className="mt-1 text-[13px] text-ink-500 sm:text-sm">
                {tags.map((t, i) => (
                  <span key={t}>
                    {i > 0 && <span className="mx-1.5 text-ink-300">•</span>}
                    {t}
                  </span>
                ))}
              </p>
            )}
            {profile.location && (
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-500 sm:text-sm">
                <span className="text-ribbon-pink">📍</span>
                {profile.location}
              </p>
            )}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-navy-700 sm:text-sm">
              <span className="inline-flex items-center gap-1">
                <span className="text-amber-500">⭐</span>
                {avgRating > 0 ? avgRating.toFixed(1) : '—'} ({profile.followersCount} Followers)
              </span>
              <span className="hidden text-ink-300 sm:inline">·</span>
              <span className="inline-flex items-center gap-1">
                🎪 {eventsCount}+ Events Organised
              </span>
            </p>
          </div>
          {/* On mobile this is a horizontal 2-button row spanning full width;
              on sm+ it becomes a tight vertical column anchored right. */}
          <div className="flex gap-2 sm:flex-col sm:items-stretch sm:gap-2">
            <Link
              href="/dashboard/profile/edit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-ribbon-purple/30 bg-ribbon-purple/5 px-3 py-2 text-[13px] font-bold text-ribbon-purple transition hover:bg-ribbon-purple/10 sm:flex-none sm:px-4 sm:text-sm"
            >
              <PencilIcon className="h-4 w-4" />
              Edit Profile
            </Link>
            <Link
              href={`/org/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-[13px] font-bold text-navy-700 transition hover:bg-cream-100 sm:flex-none sm:px-4 sm:text-sm"
            >
              View Public Profile <ExternalIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================
// KPI Card — flat icon · big number · label · optional CTA
// =============================================================
function KpiCard({
  tint,
  icon,
  value,
  label,
  sub,
}: {
  tint: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-black/[0.06] bg-white p-3 transition hover:border-black/[0.12] sm:p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>
        {icon}
      </div>
      <div className="mt-2.5 text-[20px] font-extrabold leading-none tracking-tight text-navy-800 tabular-nums sm:mt-3 sm:text-[22px]">
        {value}
      </div>
      <div className="mt-1 truncate text-[12px] font-semibold text-ink-500">{label}</div>
      {sub && <div className="mt-1 truncate text-[11px] text-ink-400">{sub}</div>}
    </div>
  );
}

// =============================================================
// Upcoming event card
// =============================================================
function UpcomingEventCard({ event }: { event: OwnerEvent }) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const now = Date.now();
  const isLive = start.getTime() <= now && end.getTime() >= now;
  const cover = event.coverImages?.[0];
  const occupancyPct =
    event.stalls.available > 0
      ? Math.round((event.stalls.booked / event.stalls.available) * 100)
      : 0;
  const dateRange = formatDateRange(event.startsAt, event.endsAt);

  return (
    <article className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="relative h-32 w-full overflow-hidden bg-cream-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={event.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-cream-300">🎪</div>
        )}
        <span
          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-soft ${
            isLive
              ? 'bg-emerald-500 text-white'
              : 'bg-white/95 text-navy-800 backdrop-blur'
          }`}
        >
          {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
          {isLive ? 'Live' : 'Upcoming'}
        </span>
      </div>
      <div className="p-3.5">
        <h3 className="line-clamp-1 text-sm font-extrabold text-navy-800">{event.title}</h3>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-ink-500">
          📅 {dateRange}
        </p>
        <p className="mt-0.5 line-clamp-1 inline-flex items-center gap-1.5 text-[11px] text-ink-500">
          📍 {event.addressText}
        </p>

        {/* Stalls progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-600">
            <span>
              {event.stalls.booked} / {event.stalls.available} Stalls Filled
            </span>
            <span className="tabular-nums text-ribbon-purple">{occupancyPct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ribbon-purple to-brand-purple-light"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>

        <div className="mt-3">
          <Link
            href={`/dashboard/events/${event.id}/edit`}
            className="block w-full rounded-lg border border-ribbon-purple/30 bg-ribbon-purple/5 py-1.5 text-center text-[12px] font-bold text-ribbon-purple transition hover:bg-ribbon-purple/10"
          >
            Manage Event
          </Link>
        </div>
      </div>
    </article>
  );
}

// =============================================================
// Right rail — Share Your Profile
// =============================================================
function ShareProfileCard({ profile }: { profile: PublicBusinessProfile }) {
  const [copied, setCopied] = useState(false);
  const [downloadingQR, setDownloadingQR] = useState(false);
  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/org/${profile.username}`
      : `joinevents.in/org/${profile.username}`;
  const displayUrl = `joinevents.in/${profile.username}`;

  // The owner's actual social handles (set on Settings → Edit Profile)
  const ownSocials = [
    { url: profile.websiteUrl, label: 'Website', Icon: GlobeIcon, tint: 'bg-cream-200 text-navy-800' },
    { url: profile.instagramUrl, label: 'Instagram', Icon: InstagramIcon, tint: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white' },
    { url: profile.facebookUrl, label: 'Facebook', Icon: FacebookIcon, tint: 'bg-[#1877F2] text-white' },
    { url: profile.twitterUrl, label: 'Twitter / X', Icon: TwitterIcon, tint: 'bg-black text-white' },
    { url: profile.linkedinUrl, label: 'LinkedIn', Icon: LinkedInIcon, tint: 'bg-[#0A66C2] text-white' },
    { url: profile.youtubeUrl, label: 'YouTube', Icon: YouTubeIcon, tint: 'bg-[#FF0000] text-white' },
  ].filter((s) => s.url);

  function copy() {
    navigator.clipboard.writeText(publicUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  // Download a high-res PNG of a QR code that links to this organiser /
  // stall-owner's public profile. Uses qrserver.com — free, no auth,
  // permitted by our CSP (connect-src *).
  async function downloadQR() {
    if (downloadingQR) return;
    setDownloadingQR(true);
    try {
      const apiUrl =
        `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20` +
        `&format=png&data=${encodeURIComponent(publicUrl)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('QR service is temporarily unavailable.');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${profile.username}-joinevents-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Failed to download QR code.',
      );
    } finally {
      setDownloadingQR(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <h3 className="text-sm font-extrabold text-navy-800">Share Your Profile</h3>
      <p className="mt-1 text-[12px] text-ink-500">
        Share your public profile and receive more event enquiries.
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/[0.08] bg-cream-50 px-3 py-2">
        <span className="flex-1 truncate text-xs font-semibold text-navy-700">{displayUrl}</span>
        <button
          type="button"
          onClick={copy}
          className="text-ink-500 transition hover:text-ribbon-purple"
          aria-label="Copy link"
        >
          {copied ? '✓' : <CopyIcon className="h-4 w-4" />}
        </button>
      </div>

      {/* Owner's own social handles — only renders if at least one is set */}
      {ownSocials.length > 0 && (
        <>
          <div className="mt-4 mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-400">
            Your channels
          </div>
          <div className="flex flex-wrap gap-2">
            {ownSocials.map((s) => (
              <a
                key={s.label}
                href={s.url!}
                target="_blank"
                rel="noopener noreferrer"
                title={s.label}
                aria-label={s.label}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg shadow-soft transition hover:-translate-y-0.5 ${s.tint}`}
              >
                <s.Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </>
      )}

      {/* Share-this-profile buttons (always present) */}
      <div className="mt-4 mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-400">
        Share via
      </div>
      <div className="grid grid-cols-4 gap-2">
        <ShareTo
          href={`https://wa.me/?text=${encodeURIComponent(`Check out ${profile.displayName} on JoinEvents: ${publicUrl}`)}`}
          tint="bg-[#25D366] text-white"
          Icon={WhatsAppIcon}
          label="WhatsApp"
        />
        <ShareTo
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`}
          tint="bg-[#1877F2] text-white"
          Icon={FacebookIcon}
          label="Facebook"
        />
        <ShareTo
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`}
          tint="bg-[#0A66C2] text-white"
          Icon={LinkedInIcon}
          label="LinkedIn"
        />
        <ShareTo
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${profile.displayName}`)}&url=${encodeURIComponent(publicUrl)}`}
          tint="bg-black text-white"
          Icon={TwitterIcon}
          label="Twitter / X"
        />
      </div>
      <button
        type="button"
        onClick={downloadQR}
        disabled={downloadingQR}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white py-2.5 text-xs font-bold text-navy-700 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-60"
        title={`Download a QR code that points to ${publicUrl}`}
      >
        <QrIcon className="h-4 w-4" />
        {downloadingQR ? 'Generating…' : 'Download QR'}
      </button>
    </section>
  );
}

function ShareTo({
  href,
  tint,
  Icon,
  label,
}: {
  href: string;
  tint: string;
  Icon: (props: { className?: string }) => ReactElement;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={`flex h-11 items-center justify-center rounded-xl shadow-soft transition hover:-translate-y-0.5 ${tint}`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </a>
  );
}

// =============================================================
// Simple dashboard for user + vendor roles
// =============================================================
function SimpleDashboard({
  name,
  role,
  events,
  bookings,
  upcomingBookings,
  discovery,
  isVerified,
}: {
  name: string;
  role: 'user' | 'vendor' | 'organiser';
  events: OwnerEvent[];
  bookings: ApiBooking[];
  upcomingBookings: ApiBooking[];
  discovery: ApiEvent[];
  isVerified: boolean;
}) {
  return (
    <div className="space-y-5">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-ribbon-purple">
          Welcome
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Good to see you, {name}!
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {role === 'vendor' ? 'Browse events near you and book your next stall.' : 'Discover events and follow your favourite organisers.'}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SimpleStat icon="🎪" tint="bg-emerald-100 text-emerald-600" label={role === 'vendor' ? 'My Bookings' : 'Followed events'} value={bookings.length.toString()} />
        <SimpleStat icon="🗓" tint="bg-ribbon-purple/15 text-ribbon-purple" label="Upcoming" value={upcomingBookings.length.toString()} />
        <SimpleStat icon="🌐" tint="bg-ribbon-blue/15 text-ribbon-blue" label="Browsable events" value={discovery.length.toString()} />
      </div>

      {discovery.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-navy-800">Recommended events</h2>
            <Link href="/dashboard/explore" className="text-xs font-bold text-ribbon-purple hover:underline">
              Browse all →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discovery.slice(0, 6).map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.slug}`}
                className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="h-28 w-full bg-cream-200">
                  {e.coverImages?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.coverImages[0]} alt={e.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <h4 className="line-clamp-1 text-sm font-extrabold text-navy-800">{e.title}</h4>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">{e.addressText}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SimpleStat({ icon, tint, label, value }: { icon: string; tint: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-base ${tint}`}>{icon}</div>
      <div className="mt-3 text-[26px] font-extrabold leading-none tabular-nums text-navy-800">{value}</div>
      <div className="mt-2 text-[12px] font-semibold text-ink-500">{label}</div>
    </div>
  );
}

// =============================================================
// Skeleton
// =============================================================
function DashboardSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div className="h-52 animate-pulse rounded-2xl bg-white shadow-soft" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-white shadow-soft" />
        ))}
      </div>
    </div>
  );
}

// =============================================================
// Helpers + icons
// =============================================================
function friendlyName(displayName: string | null, email: string | null, phone: string | null): string {
  if (displayName) return displayName.split(/\s+/)[0] ?? displayName;
  if (email) return email.split('@')[0] ?? 'there';
  if (phone) return 'there';
  return 'there';
}

function formatRupees(rupees: number): string {
  if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(1)}Cr+`;
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)}L+`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    const month = start.toLocaleDateString('en-IN', { month: 'short' });
    return `${start.getDate()} – ${end.getDate()} ${month}, ${start.getFullYear()}`;
  }
  return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function CalendarFilledIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function StoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 8l1.5-4h15L21 8M3 8h18v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V8z" strokeLinejoin="round" />
      <path d="M5 11v9h14v-9" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.5 3.1-6 7-6s7 2.5 7 6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M22 18c0-2.5-2-4-4.5-4" strokeLinecap="round" />
    </svg>
  );
}
function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3l2.7 6 6.3.6-4.8 4.3 1.5 6.3L12 17l-5.7 3.2L7.8 14 3 9.6 9.3 9z" />
    </svg>
  );
}
function WalletIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M16 13h2M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M4 20h4l11-11-4-4L4 16v4z" strokeLinejoin="round" />
    </svg>
  );
}
function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M14 4h6v6M10 14L20 4M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
    </svg>
  );
}
function QrIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  );
}
