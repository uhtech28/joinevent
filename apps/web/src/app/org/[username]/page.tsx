// /org/[username] — public business profile page (organiser or vendor).
// Cover image with gradient fallback, large overlapping avatar, verified badge,
// category line, location, rating + events stats, follow + share actions, tabs.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { FollowButton } from '../../events/[slug]/FollowButton';
import { OrgTabs } from './OrgTabs';
import {
  InstagramIcon,
  FacebookIcon,
  TwitterIcon,
  LinkedInIcon,
  YouTubeIcon,
  GlobeIcon,
} from '@/components/SocialIcons';

type Params = { username: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  try {
    const p = await api.profiles.byUsername(username);
    return {
      title: p.displayName,
      description: p.bio || `${p.type} on JoinEvents.in`,
    };
  } catch {
    return { title: `@${username}` };
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

// Derive a list of tags from bio. Bio convention is "Tag • Tag • Tag" or
// free-form text. We split on bullets or commas; fall back to a default per type.
function deriveTags(bio: string | null, type: string): string[] {
  if (bio) {
    const parts = bio
      .split(/[•·,|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (parts.length > 0) return parts;
  }
  return type === 'organiser'
    ? ['Events', 'Carnivals', 'Exhibitions']
    : ['Handmade', 'Local Brand', 'Custom Orders'];
}

export default async function OrgPage({ params }: { params: Promise<Params> }) {
  const { username } = await params;

  let profile;
  try {
    profile = await api.profiles.byUsername(username);
  } catch {
    notFound();
  }

  const tags = deriveTags(profile.bio, profile.type);
  // Approximate "events completed" from followers count for the badge.
  // Will replace with a real /profiles/:username/stats endpoint later.
  const eventsCount = Math.max(profile.followersCount, 0);
  const isOrganiser = profile.type === 'organiser';

  // Pick a cover gradient based on type
  const coverGradient = isOrganiser
    ? 'from-ribbon-purple via-ribbon-pink to-brand-orange'
    : 'from-ribbon-purple via-ribbon-blue to-emerald-400';

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
        <Link
          href="/events"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
        >
          ← Back to events
        </Link>

        {/* ============================================================
            PROFILE CARD — cover + overlapping avatar + header
            ============================================================ */}
        <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-card">
          {/* Cover */}
          {profile.coverUrl ? (
            <div className="relative h-44 w-full overflow-hidden sm:h-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.coverUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              className={`relative h-44 w-full bg-gradient-to-br ${coverGradient} sm:h-56`}
              style={{
                backgroundImage:
                  'radial-gradient(600px circle at 80% 20%, rgba(255,255,255,0.25), transparent 50%), radial-gradient(420px circle at 15% 90%, rgba(255,255,255,0.18), transparent 60%)',
              }}
            >
              <div className="pointer-events-none absolute right-[10%] top-6 text-base text-white/40">★</div>
              <div className="pointer-events-none absolute right-[28%] top-12 text-xs text-white/30">✦</div>
              <div className="pointer-events-none absolute left-[18%] top-8 text-sm text-white/35">★</div>
              <div className="pointer-events-none absolute right-[14%] bottom-8 text-[10px] text-white/30">✦</div>
            </div>
          )}

          {/* Header body */}
          <div className="relative px-5 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
            {/* Avatar — overlaps the cover by half */}
            <div className="absolute -top-14 left-5 sm:-top-16 sm:left-8">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-white shadow-card sm:h-32 sm:w-32"
                />
              ) : (
                <div
                  className={`flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${coverGradient} text-3xl font-extrabold text-white ring-4 ring-white shadow-card sm:h-32 sm:w-32`}
                >
                  {initials(profile.displayName)}
                </div>
              )}
            </div>

            {/* Actions row (above the title on small screens, in the flow on sm+) */}
            <div className="flex justify-end gap-2">
              <FollowButton username={profile.username} />
              <ShareButton username={profile.username} />
            </div>

            {/* Spacer for the avatar overlap on the left */}
            <div className="mt-12 sm:mt-14">
              {/* Name row + verified */}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[36px]">
                  {profile.displayName}
                </h1>
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-extrabold text-emerald-700">
                    <CheckIcon className="h-3 w-3" />
                    Verified {isOrganiser ? 'Organiser' : 'Vendor'}
                  </span>
                )}
              </div>

              {/* Category line */}
              <p className="mt-2 text-base font-medium text-ink-500">
                {tags.map((t, i) => (
                  <span key={t}>
                    {i > 0 && <span className="mx-2 text-ink-300">•</span>}
                    {t}
                  </span>
                ))}
              </p>

              {/* Location */}
              {profile.location && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-500">
                  <PinIcon className="h-4 w-4 text-ribbon-pink" />
                  {profile.location}
                </p>
              )}

              {/* Stats row — rating + events count. Follower count is shown
                  prominently in the FollowerPill above, so it's not repeated here. */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <StarFill className="h-4 w-4 text-amber-500" />
                  <span className="font-extrabold tabular-nums text-navy-800">
                    {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : '—'}
                  </span>
                  <span className="text-ink-400">
                    {profile.avgRating > 0 ? 'Average rating' : 'No ratings yet'}
                  </span>
                </span>
                <span className="text-ink-300">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-base" aria-hidden>🎪</span>
                  <span className="font-extrabold tabular-nums text-navy-800">
                    {eventsCount}+
                  </span>
                  <span className="text-ink-400">
                    {isOrganiser ? 'Events Organised' : 'Events Attended'}
                  </span>
                </span>
              </div>

              {/* Bio (if present, full text) */}
              {profile.bio && (
                <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-500">
                  {profile.bio}
                </p>
              )}

              {/* Social links — only rendered when at least one URL is set. */}
              <SocialLinksRow profile={profile} />
            </div>

            {/* Stat tiles strip */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat
                tint="bg-ribbon-pink/10 text-ribbon-pink"
                icon="❤"
                label="Followers"
                value={profile.followersCount.toLocaleString('en-IN')}
              />
              <Stat
                tint="bg-ribbon-yellow/30 text-amber-600"
                icon="⭐"
                label="Average Rating"
                value={profile.avgRating > 0 ? profile.avgRating.toFixed(2) : 'Not rated'}
              />
              <Stat
                tint="bg-emerald-100 text-emerald-600"
                icon="✓"
                label="Verification"
                value={profile.verified ? 'Verified' : 'Pending'}
              />
            </div>
          </div>
        </section>

        {/* ============================================================
            TABS — Events / Posts / Reviews
            ============================================================ */}
        <div className="mt-6">
          <OrgTabs username={profile.username} />
        </div>
      </main>
      <Footer />
    </>
  );
}

// ============================================================
// Stat tile
// ============================================================
function Stat({
  tint,
  icon,
  label,
  value,
}: {
  tint: string;
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-cream-50 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
          {label}
        </div>
        <div className="text-base font-extrabold leading-tight text-navy-800">{value}</div>
      </div>
    </div>
  );
}

// ============================================================
// SocialLinksRow — clickable chips for each social URL on the profile.
// Hidden entirely when the profile has none set.
// ============================================================
function SocialLinksRow({
  profile,
}: {
  profile: {
    websiteUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    twitterUrl: string | null;
    linkedinUrl: string | null;
    youtubeUrl: string | null;
  };
}) {
  // Build the list of links. Render in a natural order:
  // website first, then the big socials.
  const links = [
    profile.websiteUrl && {
      label: 'Website',
      href: profile.websiteUrl,
      Icon: GlobeIcon,
      cls: 'bg-navy-800/5 text-navy-800 hover:bg-navy-800 hover:text-white',
    },
    profile.instagramUrl && {
      label: 'Instagram',
      href: profile.instagramUrl,
      Icon: InstagramIcon,
      cls: 'bg-pink-500/10 text-pink-600 hover:bg-gradient-to-br hover:from-pink-500 hover:via-rose-500 hover:to-amber-500 hover:text-white',
    },
    profile.facebookUrl && {
      label: 'Facebook',
      href: profile.facebookUrl,
      Icon: FacebookIcon,
      cls: 'bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white',
    },
    profile.twitterUrl && {
      label: 'X',
      href: profile.twitterUrl,
      Icon: TwitterIcon,
      cls: 'bg-black/5 text-black hover:bg-black hover:text-white',
    },
    profile.linkedinUrl && {
      label: 'LinkedIn',
      href: profile.linkedinUrl,
      Icon: LinkedInIcon,
      cls: 'bg-sky-700/10 text-sky-700 hover:bg-sky-700 hover:text-white',
    },
    profile.youtubeUrl && {
      label: 'YouTube',
      href: profile.youtubeUrl,
      Icon: YouTubeIcon,
      cls: 'bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white',
    },
  ].filter(Boolean) as Array<{
    label: string;
    href: string;
    Icon: (props: { className?: string }) => JSX.Element;
    cls: string;
  }>;

  if (links.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">
        Connect
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map(({ label, href, Icon, cls }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={label}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-black/[0.04] transition ${cls}`}
          >
            <Icon className="h-5 w-5" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Share button (client-side popup with copy link)
// ============================================================
function ShareButton({ username }: { username: string }) {
  return (
    <Link
      href={`/org/${username}#share`}
      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold text-navy-700 shadow-soft transition hover:bg-cream-100"
    >
      <ShareIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Share</span>
    </Link>
  );
}

// ============================================================
// Icons
// ============================================================
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StarFill({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3l2.7 6 6.3.6-4.8 4.3 1.5 6.3L12 17l-5.7 3.2L7.8 14 3 9.6 9.3 9z" />
    </svg>
  );
}
function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9 2.5 2.5 0 0 1 12 11.5z" />
    </svg>
  );
}
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 13.3l7.6 4.4M15.8 6.3l-7.6 4.4" strokeLinecap="round" />
    </svg>
  );
}
