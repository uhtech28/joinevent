// Landing page — premium role-chooser style.
// Modelled on the slide-1 mockup ("Organize Events. Book Stalls. Grow Business.")
// — purple gradient hero with a 2-card role chooser, mini dashboard preview,
// 8-tile category grid, 4-step how-it-works, 4-icon trust strip, footer.

import Link from 'next/link';
import { FeaturedProducts } from './FeaturedProducts';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream-50 text-navy-800">
      <TopNav />
      <main>
        <Hero />
        <FeaturedEvents />
        <FeaturedProducts />
        <TopRatedStalls />
        <HowItWorks />
        <WhyJoinEvents />
      </main>
      <Footer />
    </div>
  );
}

// =============================================================
// TOP NAV
// =============================================================
function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.04] bg-cream-50/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <SparkIcon className="h-7 w-7 text-brand-purple" />
          <div className="flex flex-col leading-none">
            <span className="text-[18px] font-extrabold tracking-tight">
              Join<span className="text-brand-purple">Events</span>
            </span>
            <span className="mt-0.5 hidden text-[10px] font-semibold tracking-[0.18em] text-ink-400 sm:block">
              EVENTS · CONNECTIONS · GROWTH
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-navy-700 lg:flex">
          <NavLink href="#for-organisers">For Organisers</NavLink>
          <NavLink href="#for-businesses">For Businesses</NavLink>
          <NavLink href="/login">Events</NavLink>
          <NavLink href="#how-it-works">How It Works</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-navy-700 transition hover:bg-cream-100 sm:inline-flex"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-xl bg-purple-gradient px-4 text-sm font-extrabold text-white shadow-purple transition hover:opacity-95 sm:px-5"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="transition hover:text-brand-purple">
      {children}
    </Link>
  );
}

// =============================================================
// HERO
// =============================================================
function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(900px circle at 0% 0%, rgba(124,93,250,0.18), transparent 50%), radial-gradient(700px circle at 100% 100%, rgba(255,107,168,0.08), transparent 55%)',
      }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:px-8 lg:py-20">
        {/* LEFT — copy + role chooser */}
        <div className="min-w-0 self-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-purple/10 px-3.5 py-1.5 text-[12px] font-extrabold text-brand-purple">
            <SparkIcon className="h-3.5 w-3.5" />
            India&apos;s All-in-One Event &amp; Stall Booking Platform
          </span>

          <h1 className="mt-5 text-[36px] font-extrabold leading-[1.05] tracking-tight text-navy-800 sm:text-[44px] lg:text-[52px]">
            Organize Events.
            <br />
            Book Stalls. <span className="text-brand-purple">Grow Business.</span>
          </h1>

          <p className="mt-5 max-w-lg text-base text-ink-500 sm:text-[17px]">
            JoinEvents connects Event Organisers with Businesses for stall
            bookings and better event experiences.
          </p>

          {/* Role chooser */}
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <RoleCard
              icon={<UserIcon className="h-5 w-5" />}
              title="I'm an Event Organiser"
              body="Organize events, manage stalls, vendors & grow your audience."
              href="/login?role=organiser"
              accent
            />
            <RoleCard
              icon={<StoreIcon className="h-5 w-5" />}
              title="I'm a Business / Vendor"
              body="Find events, book stalls & showcase your business."
              href="/login?role=vendor"
            />
          </div>

          {/* Primary CTAs */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-purple-gradient px-6 text-sm font-extrabold text-white shadow-purple transition hover:opacity-95"
            >
              Get Started <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border-2 border-brand-purple/40 bg-white px-6 text-sm font-extrabold text-brand-purple transition hover:bg-brand-purple/5"
            >
              Explore Events <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>

          {/* Trust strip */}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-ink-500">
            <TrustItem icon={<ShieldIcon className="h-4 w-4 text-emerald-500" />} label="Trusted by 500+ Organisers" />
            <TrustItem icon={<CheckIcon className="h-4 w-4 text-emerald-500" />} label="25K+ Stalls Booked" />
            <TrustItem icon={<HeartIcon className="h-4 w-4 text-rose-500" />} label="Great for Businesses" />
          </div>
        </div>

        {/* RIGHT — dashboard mock + phone */}
        <div className="relative mx-auto hidden w-full max-w-[560px] self-center lg:block">
          <DashboardMock />
          <PhoneMock />
        </div>
      </div>
    </section>
  );
}

function RoleCard({
  icon,
  title,
  body,
  href,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card-hover ${
        accent
          ? 'border-brand-purple/40 ring-2 ring-brand-purple/15'
          : 'border-black/[0.08]'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          accent ? 'bg-purple-gradient text-white' : 'bg-brand-purple/10 text-brand-purple'
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-extrabold text-navy-800">{title}</div>
        <div className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{body}</div>
      </div>
    </Link>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold">
      {icon}
      {label}
    </span>
  );
}

// -------------------------------------------------------------
// Dashboard preview mock — pure CSS, no real screenshot. Looks like
// the organiser dashboard so the value prop is concrete at a glance.
// -------------------------------------------------------------
function DashboardMock() {
  return (
    <div className="relative rounded-2xl border border-black/5 bg-white p-3 shadow-2xl ring-1 ring-black/5">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-1 pb-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 h-5 flex-1 rounded-md bg-cream-100" />
      </div>

      <div className="flex gap-2">
        {/* Sidebar */}
        <aside className="hidden w-[110px] shrink-0 rounded-xl bg-navy-800 p-2 text-white sm:block">
          <div className="text-[10px] font-extrabold tracking-tight">
            Join<span className="text-brand-purple-light">Events</span>
          </div>
          <ul className="mt-3 space-y-1 text-[9.5px] font-bold">
            <li className="rounded-md bg-purple-gradient px-2 py-1.5">Dashboard</li>
            <li className="px-2 py-1.5 text-white/60">Events</li>
            <li className="px-2 py-1.5 text-white/60">Stall Bookings</li>
            <li className="px-2 py-1.5 text-white/60">Vendors</li>
            <li className="px-2 py-1.5 text-white/60">Analytics</li>
            <li className="px-2 py-1.5 text-white/60">Promotions</li>
            <li className="px-2 py-1.5 text-white/60">Messages</li>
            <li className="px-2 py-1.5 text-white/60">Reviews</li>
            <li className="px-2 py-1.5 text-white/60">Payouts</li>
            <li className="px-2 py-1.5 text-white/60">Settings</li>
          </ul>
        </aside>

        {/* Main */}
        <div className="flex-1 rounded-xl bg-cream-50 p-3">
          {/* Topbar of mock */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-navy-800">Organizer Dashboard</div>
              <div className="text-[9.5px] text-ink-500">Welcome back, Rahul! 👋</div>
            </div>
            <span className="inline-flex h-5 items-center rounded-md bg-purple-gradient px-2 text-[9px] font-extrabold text-white">+ Create Event</span>
          </div>

          {/* KPI strip */}
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            <MiniKpi label="Total Events" value="12" />
            <MiniKpi label="Stalls Booked" value="45" />
            <MiniKpi label="Total Revenue" value="₹2,45,000" />
            <MiniKpi label="Profile Views" value="1,234" />
          </div>

          {/* Upcoming events list */}
          <div className="mt-2.5 rounded-lg bg-white p-2 ring-1 ring-black/[0.03]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-navy-800">Upcoming Events</span>
              <span className="text-[8.5px] font-bold text-brand-purple">View All</span>
            </div>
            <ul className="mt-1.5 space-y-1.5">
              <EventRow title="Summer Carnival 2024" sub="22–24 Jun · Leisure Valley Park" tone="live" />
              <EventRow title="Noida Art & Crafts Expo" sub="06 Jul · Noida Stadium" tone="upcoming" />
              <EventRow title="Delhi Society Fest" sub="30 Jul · Akshardham Lawns" tone="upcoming" />
            </ul>
          </div>

          {/* Earnings line graph mock */}
          <div className="mt-2.5 rounded-lg bg-white p-2 ring-1 ring-black/[0.03]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-navy-800">Earnings Overview</span>
              <span className="text-[8.5px] font-bold text-emerald-600">+15% this month</span>
            </div>
            <svg viewBox="0 0 200 50" className="mt-1 h-10 w-full">
              <defs>
                <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7C5DFA" />
                  <stop offset="100%" stopColor="#C7A8FF" />
                </linearGradient>
              </defs>
              <path
                d="M 0 35 Q 25 30 40 28 T 75 22 T 110 24 T 145 14 T 200 10"
                fill="none"
                stroke="url(#line-grad)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-1.5 ring-1 ring-black/[0.03]">
      <div className="text-[8.5px] font-bold uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="text-[12px] font-extrabold text-navy-800">{value}</div>
    </div>
  );
}

function EventRow({ title, sub, tone }: { title: string; sub: string; tone: 'live' | 'upcoming' }) {
  return (
    <li className="flex items-center justify-between rounded-md bg-cream-50 px-1.5 py-1">
      <div className="min-w-0">
        <div className="truncate text-[9.5px] font-extrabold text-navy-800">{title}</div>
        <div className="truncate text-[8.5px] text-ink-500">{sub}</div>
      </div>
      <span
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider ${
          tone === 'live'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-brand-purple/10 text-brand-purple'
        }`}
      >
        {tone === 'live' ? 'Live' : 'Upcoming'}
      </span>
    </li>
  );
}

// -------------------------------------------------------------
// Phone mockup overlapping the dashboard's bottom-right.
// -------------------------------------------------------------
function PhoneMock() {
  return (
    <div className="absolute -bottom-8 right-[-12px] hidden w-[180px] rotate-[3deg] rounded-[26px] border-[6px] border-navy-800 bg-white shadow-2xl xl:block">
      <div className="overflow-hidden rounded-[18px]">
        <div className="flex items-center justify-between px-3 pt-2 text-[8.5px] font-bold text-navy-800">
          <span>9:41</span>
          <span>📍 Gurgaon</span>
        </div>
        <div className="px-3 pb-3 pt-1">
          <div className="rounded-xl bg-purple-gradient p-2 text-white">
            <div className="text-[8.5px] font-extrabold">Summer Community Fest</div>
            <div className="mt-0.5 text-[7px]">22 – 23 June 2024 · Leisure Valley Park</div>
            <button type="button" className="mt-1.5 rounded-md bg-white px-2 py-0.5 text-[8px] font-extrabold text-brand-purple">
              Book Stall Now
            </button>
          </div>
          <div className="mt-2 flex justify-between text-[8px] font-bold text-navy-800">
            <span>Categories</span>
            <span className="text-brand-purple">View All</span>
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {['👗', '🍔', '🏠', '🧵'].map((e, i) => (
              <div key={i} className="aspect-square rounded-md bg-cream-100 text-center text-[12px] leading-[1.7]">
                {e}
              </div>
            ))}
          </div>
          <div className="mt-2 text-[8px] font-bold text-navy-800">Upcoming Events</div>
          <div className="mt-1 rounded-md bg-cream-100 p-1.5 text-[7.5px] font-semibold text-navy-800">
            Noida Art &amp; Crafts Expo
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// FEATURED EVENTS — 4 event cards with date badge + stall + visitor counts.
// =============================================================
type ShowcaseEvent = {
  day: string;
  month: string;
  title: string;
  venue: string;
  dateRange: string;
  stalls: string;
  visitors: string;
  imageUrl: string;
  emoji: string;
};

const EVENTS: ShowcaseEvent[] = [
  {
    day: '25',
    month: 'MAY',
    title: 'Summer Food & Lifestyle Festival',
    venue: 'DLF Cyber Hub, Gurgaon',
    dateRange: '20 – 27 May 2024',
    stalls: '65 Stalls',
    visitors: '3K+ Visitors',
    imageUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=70',
    emoji: '🍔',
  },
  {
    day: '08',
    month: 'JUN',
    title: 'Noida Art & Crafts Expo',
    venue: 'Noida Stadium, Noida',
    dateRange: '08 – 10 Jun 2024',
    stalls: '80 Stalls',
    visitors: '4K+ Visitors',
    imageUrl:
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=70',
    emoji: '🎨',
  },
  {
    day: '22',
    month: 'JUN',
    title: 'Corporate Connect Summit 2024',
    venue: 'Leela Ambience, Gurgaon',
    dateRange: '22 – 23 Jun 2024',
    stalls: '120 Stalls',
    visitors: '2.5K+ Visitors',
    imageUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=70',
    emoji: '🤝',
  },
  {
    day: '14',
    month: 'JUL',
    title: 'Kids Carnival Summer Edition',
    venue: 'Leisure Valley Park, Gurgaon',
    dateRange: '14 – 16 Jul 2024',
    stalls: '40 Stalls',
    visitors: '2K+ Visitors',
    imageUrl:
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=70',
    emoji: '🎡',
  },
];

function FeaturedEvents() {
  return (
    <section id="featured-events" className="bg-cream-50 py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[24px] font-extrabold tracking-tight text-navy-800 sm:text-[28px]">
              Featured Events
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Upcoming fairs, expos and markets — book your stall now.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm font-extrabold text-brand-purple hover:underline"
          >
            View All Events →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EVENTS.map((e) => (
            <EventCard key={e.title} event={e} />
          ))}
        </div>
      </div>
    </section>
  );
}

function EventCard({ event }: { event: ShowcaseEvent }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="relative h-36 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.imageUrl}
          alt={event.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute left-3 top-3 flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-white text-navy-800 shadow-soft">
          <div className="text-[15px] font-extrabold leading-none">{event.day}</div>
          <div className="text-[9px] font-bold tracking-wider text-brand-purple">
            {event.month}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-[13px] font-extrabold leading-tight text-navy-800">
          {event.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-[11px] text-ink-500">
          📍 {event.venue}
        </p>
        <p className="mt-1 text-[11px] text-ink-500">📅 {event.dateRange}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-semibold">
          <span className="text-navy-800">{event.stalls}</span>
          <span className="text-ink-300">·</span>
          <span className="text-emerald-600">{event.visitors}</span>
        </div>
        <Link
          href="/login"
          className="mt-2.5 inline-flex items-center justify-center rounded-lg border border-brand-purple/40 bg-white py-1.5 text-[11px] font-extrabold text-brand-purple transition hover:bg-brand-purple/5"
        >
          Book Stall
        </Link>
      </div>
    </article>
  );
}

// =============================================================
// TOP RATED STALLS — 5 stall-owner cards with rating + From-price.
// =============================================================
type ShowcaseStall = {
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  fromPrice: number;
  imageUrl: string;
  emoji: string;
};

const STALLS: ShowcaseStall[] = [
  {
    name: 'The Handmade Store',
    category: 'Home Decor',
    rating: 4.8,
    reviewCount: 128,
    fromPrice: 5999,
    imageUrl:
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=500&q=70',
    emoji: '🏺',
  },
  {
    name: 'Tasty Bites',
    category: 'Food & Beverages',
    rating: 4.7,
    reviewCount: 95,
    fromPrice: 6499,
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=70',
    emoji: '🍱',
  },
  {
    name: 'Trendy Threads',
    category: 'Fashion & Clothing',
    rating: 4.9,
    reviewCount: 76,
    fromPrice: 6999,
    imageUrl:
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=500&q=70',
    emoji: '👗',
  },
  {
    name: 'Green Corner',
    category: 'Plants & Gardening',
    rating: 4.6,
    reviewCount: 64,
    fromPrice: 4999,
    imageUrl:
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=500&q=70',
    emoji: '🪴',
  },
  {
    name: 'Bookish World',
    category: 'Books & Stationery',
    rating: 4.7,
    reviewCount: 45,
    fromPrice: 3499,
    imageUrl:
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=500&q=70',
    emoji: '📚',
  },
];

function TopRatedStalls() {
  return (
    <section id="top-rated" className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[24px] font-extrabold tracking-tight text-navy-800 sm:text-[28px]">
              Top Rated Stalls &amp; Businesses
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Trusted by event organisers across India.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm font-extrabold text-brand-purple hover:underline"
          >
            View All Stalls →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {STALLS.map((s) => (
            <StallCard key={s.name} stall={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StallCard({ stall }: { stall: ShowcaseStall }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="relative aspect-square w-full overflow-hidden bg-cream-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stall.imageUrl}
          alt={stall.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-500 shadow-soft backdrop-blur">
          ★ {stall.rating.toFixed(1)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 text-[13px] font-extrabold text-navy-800">
          {stall.name}
        </h3>
        <p className="mt-0.5 text-[11px] text-ink-500">{stall.category}</p>
        <p className="mt-1 text-[10.5px] font-semibold text-ink-400">
          {stall.reviewCount} reviews
        </p>
        <div className="mt-1.5 text-[13px] font-extrabold text-brand-purple">
          From ₹{stall.fromPrice.toLocaleString('en-IN')}
        </div>
      </div>
    </article>
  );
}

// =============================================================
// HOW IT WORKS
// =============================================================
const STEPS = [
  {
    icon: '👥',
    title: 'Create or Join',
    body: 'Organisers create events, businesses sign up.',
  },
  {
    icon: '📋',
    title: 'List or Discover',
    body: 'Organisers list events, businesses discover & filter.',
  },
  {
    icon: '🤝',
    title: 'Book Stalls',
    body: 'Businesses book stalls seamlessly online.',
  },
  {
    icon: '📈',
    title: 'Grow Together',
    body: 'Successful events, stronger business growth.',
  },
] as const;

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-[26px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
            How It Works
          </h2>
          <p className="mt-1.5 text-sm text-ink-500 sm:text-base">
            Simple steps to create events and book stalls
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-purple/10 text-2xl ring-1 ring-brand-purple/15">
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold text-brand-purple">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="text-[15px] font-extrabold text-navy-800">
                    {s.title}
                  </div>
                  <div className="mt-1 text-[13px] text-ink-500">{s.body}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowIcon className="absolute -right-3 top-5 hidden h-5 w-5 text-brand-purple/40 lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================
// WHY JOINEVENTS
// =============================================================
const TRUST = [
  { icon: <ShieldIcon className="h-5 w-5" />, label: 'Verified Organisers' },
  { icon: <LockIcon className="h-5 w-5" />, label: 'Secure Payments' },
  { icon: <StoreIcon className="h-5 w-5" />, label: 'Easy Stall Management' },
  { icon: <EyeIcon className="h-5 w-5" />, label: 'Better Visibility for Business' },
] as const;

function WhyJoinEvents() {
  return (
    <section id="why" className="bg-cream-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-[20px] font-extrabold tracking-tight text-navy-800 sm:text-[22px]">
              Why <span className="text-brand-purple">JoinEvents</span>?
            </div>
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4 lg:max-w-3xl">
              {TRUST.map((t) => (
                <div key={t.label} className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
                    {t.icon}
                  </span>
                  <span className="text-[13px] font-extrabold text-navy-800">
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================
// FOOTER
// =============================================================
function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <SparkIcon className="h-6 w-6 text-brand-purple" />
            <span className="text-[17px] font-extrabold tracking-tight">
              Join<span className="text-brand-purple">Events</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-[13px] text-ink-500">
            India&apos;s all-in-one platform connecting Event Organisers with
            Stall Owners &amp; Small Businesses.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { href: '/login', label: 'Browse Events' },
            { href: '/login', label: 'Categories' },
            { href: '/login', label: 'How It Works' },
            { href: '/login', label: 'Pricing' },
          ]}
        />
        <FooterCol
          title="For You"
          links={[
            { href: '/login?role=organiser', label: 'For Organisers' },
            { href: '/login?role=vendor', label: 'For Businesses' },
            { href: '/login', label: 'Log In' },
            { href: '/login', label: 'Sign Up' },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { href: '#', label: 'About' },
            { href: '#', label: 'Contact' },
            { href: '#', label: 'Privacy' },
            { href: '#', label: 'Terms' },
          ]}
        />
      </div>
      <div className="border-t border-black/5 py-4 text-center text-[12px] text-ink-400">
        © {new Date().getFullYear()} JoinEvents. Made for Indian event communities.
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-500">
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm font-semibold text-navy-700">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="transition hover:text-brand-purple">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================
// ICONS
// =============================================================
function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l2.39 6.96L22 11.5l-7.61 2.54L12 22l-2.39-7.96L2 11.5l7.61-2.54L12 2z" />
    </svg>
  );
}
function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className} aria-hidden>
      <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
}
function StoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M3 8l1.5-4h15L21 8M3 8h18v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V8z" strokeLinejoin="round" />
      <path d="M5 11v9h14v-9" />
    </svg>
  );
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} aria-hidden>
      <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
    </svg>
  );
}
function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
