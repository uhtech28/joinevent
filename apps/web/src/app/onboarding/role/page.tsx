'use client';

// /onboarding/role — premium role picker with photo-header cards.
// Background image: /public/onboarding-bg.jpg
// Per-card photos: /public/onboarding-{organiser,vendor,visitor}.jpg
// Until those photos exist, cards show a tinted gradient fallback.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, type UserRole } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Choice = {
  role: UserRole;
  /** Heading: "I'm an Organiser" / "I'm a Stall Owner" / "I'm a Visitor" */
  heading: { lead: string; emphasis: string };
  tagline: string;
  perks: string[];
  ctaLabel: string;
  /** Photo path under /public; falls back to gradient if not present. */
  imageSrc: string;
  /** Gradient used both for image fallback and the CTA button. */
  ctaGradient: string;
  fallbackGradient: string;
  /** Accent color tokens — solid + tinted. */
  iconBg: string;
  accentText: string;
  accentTint: string;
  icon: React.ReactNode;
};

const CHOICES: Choice[] = [
  {
    role: 'organiser',
    heading: { lead: "I'm an ", emphasis: 'Organiser' },
    tagline: 'Create events, manage stalls, and grow your audience.',
    perks: [
      'Create unlimited events',
      'Manage stall bookings',
      'Track sales & analytics',
      'Promote to a wider audience',
      'Build your organiser profile',
    ],
    ctaLabel: 'Continue as Organiser',
    imageSrc: '/onboarding-organiser.jpg',
    ctaGradient: 'from-brand-purple to-[#e85d2a]',
    fallbackGradient: 'from-brand-purple/30 via-amber-200/30 to-ribbon-yellow/20',
    iconBg: 'bg-brand-purple text-white',
    accentText: 'text-brand-purple',
    accentTint: 'bg-brand-purple/10',
    icon: <UsersIcon className="h-7 w-7" />,
  },
  {
    role: 'vendor',
    heading: { lead: "I'm a ", emphasis: 'Stall Owner' },
    tagline: 'Book verified stalls, reach customers, and sell more.',
    perks: [
      'Browse & book verified stalls',
      'Get more footfall at your stall',
      'Manage orders & payments',
      'Build your business profile',
      'Grow your customer base',
    ],
    ctaLabel: 'Continue as Stall Owner',
    imageSrc: '/onboarding-vendor.jpg',
    ctaGradient: 'from-ribbon-purple to-[#5b32a0]',
    fallbackGradient: 'from-ribbon-purple/30 via-violet-300/30 to-fuchsia-200/30',
    iconBg: 'bg-ribbon-purple text-white',
    accentText: 'text-ribbon-purple',
    accentTint: 'bg-ribbon-purple/10',
    icon: <StoreIcon className="h-7 w-7" />,
  },
  {
    role: 'user',
    heading: { lead: "I'm a ", emphasis: 'Visitor' },
    tagline: 'Discover amazing events, book tickets, and explore.',
    perks: [
      'Discover events near you',
      'Book tickets in seconds',
      'Save favourites for later',
      'Get updates & reminders',
      'Write reviews & rate events',
    ],
    ctaLabel: 'Continue as Visitor',
    imageSrc: '/onboarding-visitor.jpg',
    ctaGradient: 'from-ribbon-blue to-sky-500',
    fallbackGradient: 'from-ribbon-blue/30 via-sky-300/30 to-cyan-200/30',
    iconBg: 'bg-ribbon-blue text-white',
    accentText: 'text-ribbon-blue',
    accentTint: 'bg-ribbon-blue/10',
    icon: <UserIcon className="h-7 w-7" />,
  },
];

export default function OnboardingRolePage() {
  const router = useRouter();
  const auth = useAuth();
  const [busyRole, setBusyRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status === 'anonymous') router.replace('/login');
    else if (auth.status === 'authenticated' && auth.user.onboardedAt) {
      router.replace('/dashboard');
    }
  }, [auth.status, router]);

  async function pick(role: UserRole) {
    if (busyRole) return;
    setBusyRole(role);
    setError(null);
    try {
      await api.auth.onboard({ role });
      await auth.refresh();
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setBusyRole(null);
    }
  }

  if (auth.status !== 'authenticated' || auth.user.onboardedAt) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cream-200 border-t-brand-purple" />
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-cream-100">
      {/* ============================================================
          HERO with festival background photo
          ============================================================ */}
      <section className="relative overflow-hidden bg-navy-900">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/onboarding-bg.jpg)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(12,22,56,0.55) 0%, rgba(12,22,56,0.5) 45%, rgba(12,22,56,0.92) 100%)',
          }}
          aria-hidden
        />

        {/* Top brand + utility bar */}
        <div
          className="relative z-10 flex items-center justify-between gap-2 px-4 pt-4 sm:px-10 sm:pt-6"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <Link
            href="/"
            className="inline-flex items-baseline gap-0.5 text-[17px] font-extrabold tracking-tight text-white sm:text-[20px]"
          >
            Join<span className="text-brand-purple">Events</span>
            <span className="text-white/75">.in</span>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="mailto:support@joinevents.in"
              className="hidden min-h-[40px] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10 sm:inline-flex"
            >
              <HelpIcon className="h-3.5 w-3.5" />
              Need help?
            </a>
            <button
              type="button"
              onClick={() => pick('user')}
              disabled={busyRole !== null}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50 sm:px-3.5"
            >
              <span className="hidden xs:inline sm:hidden">Skip</span>
              <span className="xs:hidden sm:inline">I&apos;ll choose later</span>
              <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 px-5 pb-24 pt-10 text-center sm:px-6 sm:pb-28 sm:pt-16">
          <h1 className="mx-auto max-w-3xl text-[26px] font-extrabold leading-[1.15] tracking-tight text-white sm:text-[34px] lg:text-[44px]">
            How will you use <span className="text-brand-purple">JoinEvents</span>?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[13px] text-white/70 sm:mt-4 sm:text-base">
            Pick the option that suits you best.
          </p>
        </div>
      </section>

      {/* ============================================================
          ROLE CARDS — overlap the hero
          ============================================================ */}
      <div className="mx-auto -mt-16 max-w-6xl px-4 pb-10 sm:-mt-20 sm:px-6">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {CHOICES.map((c) => (
            <RoleCard
              key={c.role}
              choice={c}
              busy={busyRole === c.role}
              disabled={busyRole !== null}
              onChoose={() => pick(c.role)}
            />
          ))}
        </div>

        {error && (
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Small signed-in caption at the bottom */}
      <div className="mx-auto mb-12 max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs text-ink-400">
          Signed in as{' '}
          <span className="font-bold text-navy-800">
            {auth.user.email ?? auth.user.phone ?? 'a guest'}
          </span>
        </p>
      </div>
    </main>
  );
}

// ============================================================
// Role card with photo header
// ============================================================
function RoleCard({
  choice,
  busy,
  disabled,
  onChoose,
}: {
  choice: Choice;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-card">
      {/* ---------- Photo + floating icon wrapper ---------- */}
      <div className="relative">
        {/* Photo container — overflow-hidden so the hover zoom is clipped to its rounds */}
        <div className="aspect-[16/10] w-full overflow-hidden">
          {/* Fallback gradient (shown until the photo file exists) */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${choice.fallbackGradient}`}
            aria-hidden
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={choice.imageSrc}
            alt=""
            loading="lazy"
            className="relative h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Icon tile — sibling of the photo container, so it can extend below
            into the card body without being clipped. */}
        <div
          className={`absolute -bottom-7 left-6 z-10 flex h-14 w-14 items-center justify-center rounded-2xl ${choice.iconBg} shadow-card ring-[3px] ring-white`}
        >
          {choice.icon}
        </div>
      </div>

      {/* ---------- Body — top padding clears the icon overlap ---------- */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-12">
        <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-navy-800">
          {choice.heading.lead}
          <span className={choice.accentText}>{choice.heading.emphasis}</span>
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-ink-500">{choice.tagline}</p>

        <div className="my-4 h-px w-full bg-black/5" />

        <ul className="space-y-2.5">
          {choice.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-sm text-navy-700">
              <span
                className={`mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${choice.accentTint} ${choice.accentText}`}
              >
                <CheckIcon className="h-2.5 w-2.5" />
              </span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onChoose}
          disabled={disabled}
          className={`mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${choice.ctaGradient} py-3.5 text-sm font-extrabold text-white ring-1 ring-inset ring-white/15 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {busy ? (
            <>
              <Spinner className="h-4 w-4" />
              Setting up…
            </>
          ) : (
            <>
              {choice.ctaLabel}
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </article>
  );
}

// ============================================================
// Trust stat — icon square + two lines (eyebrow + value)
// ============================================================
function TrustStat({
  icon,
  tint,
  eyebrow,
  value,
}: {
  icon: React.ReactNode;
  tint: string;
  eyebrow: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-ink-400">{eyebrow}</div>
        <div className="truncate text-sm font-extrabold text-navy-800">{value}</div>
      </div>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================
type IconProps = { className?: string };
function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className={className}>
      <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function HelpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UsersIcon({ className }: IconProps) {
  // Filled circles + thicker bodies — much more legible at small sizes against a tinted tile.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5z" />
      <circle cx="17" cy="9.5" r="2.7" />
      <path d="M14 20.5c0-2.4 1.5-4.2 3.3-4.9 1.2-.4 2.5-.5 3.7-.3v3.5c0 .9-.7 1.7-1.7 1.7H14z" />
    </svg>
  );
}
function StoreIcon({ className }: IconProps) {
  // Solid storefront — easier to recognise than thin-line scallops.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.6 4.5h14.8a1 1 0 0 1 .96.72L21.6 9a1 1 0 0 1-.96 1.27h-.13a3 3 0 0 1-2.51-1.36 3 3 0 0 1-5.01 0 3 3 0 0 1-5.01 0 3 3 0 0 1-2.51 1.36h-.13a1 1 0 0 1-.96-1.27l1.25-3.78a1 1 0 0 1 .97-.72z" />
      <path d="M5 12.2v7.3a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-7.3a4.6 4.6 0 0 1-4-.7 4.6 4.6 0 0 1-5 0 4.6 4.6 0 0 1-5 0z" />
    </svg>
  );
}
function UserIcon({ className }: IconProps) {
  // Single solid avatar silhouette.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5c0 .3-.2.5-.5.5h-15a.5.5 0 0 1-.5-.5z" />
    </svg>
  );
}
function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3l2.7 6 6.3.6-4.8 4.3 1.5 6.3L12 17l-5.7 3.2L7.8 14 3 9.6 9.3 9z" />
    </svg>
  );
}
function Spinner({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
