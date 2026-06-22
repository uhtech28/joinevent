import { SectionTitle } from './SectionTitle';
import { WAITLIST_URL } from '@/lib/constants';

const CATEGORIES = [
  { label: '🎪 All Events', color: 'bg-[#f5f0ff] text-brand-purple' },
  { label: '🛍 Exhibitions', color: 'bg-[#fff4f4] text-ink-700' },
  { label: '🛒 Flea Markets', color: 'bg-[#f5fff1] text-ink-700' },
  { label: '🍔 Food Events', color: 'bg-[#fff8ed] text-ink-700' },
  { label: '🎉 Festivals', color: 'bg-[#f8f0ff] text-ink-700' },
  { label: '🏪 Stalls', color: 'bg-[#f2f7ff] text-ink-700' },
];

export function MarketplacePreview() {
  return (
    <section className="px-[5%] py-[60px] sm:px-[7%] sm:py-[88px]">
      <div className="mb-12 rounded-[28px] border border-black/5 bg-white p-6 shadow-soft sm:rounded-[34px] sm:p-8">
        {/* Top toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="rounded-2xl bg-cream-200 px-4 py-3.5 font-bold text-brand-orange">
              📍 Noida
            </div>
            <div className="min-w-[260px] rounded-2xl bg-cream-50 px-4 py-3.5 text-ink-300 sm:min-w-[320px]">
              🔍 Search events, societies, stalls & products...
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 px-4 py-3.5 font-bold text-ink-600">
            ⚙ Filters
          </div>
        </div>

        {/* Inner hero */}
        <div className="mb-7 grid items-center overflow-hidden rounded-[26px] bg-[#f8f5ff] sm:rounded-[30px] lg:grid-cols-2">
          <div className="p-7 sm:p-[42px]">
            <h2 className="mb-4 text-[32px] font-extrabold leading-[1.1] tracking-tight text-ink-700 sm:text-[44px] lg:text-[52px]">
              Discover. Connect.{' '}
              <span className="text-brand-purple">Grow.</span>
            </h2>
            <p className="mb-5 leading-[1.8] text-ink-300">
              Explore upcoming society events, book stalls, discover businesses and grow your brand
              with JoinEvents.
            </p>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"
            alt="Carnival Event"
            className="h-full min-h-[260px] w-full object-cover lg:min-h-[320px]"
          />
        </div>

        {/* Category pills */}
        <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <div
              key={c.label}
              className={`whitespace-nowrap rounded-2xl px-5 py-4 text-sm font-bold ${c.color}`}
            >
              {c.label}
            </div>
          ))}
        </div>
      </div>

      <SectionTitle
        eyebrow="Event Marketplace"
        title="Built for carnivals, society events, exhibitions and local business stalls"
        description="JoinEvents brings the event organizer and stall owner network into one clean, simple and trusted digital platform."
      />

      {/* Image grid */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1556125574-d7f27ec36a06?auto=format&fit=crop&w=1200&q=80"
          alt="Outdoor event crowd and lights"
          className="h-[260px] w-full rounded-[28px] object-cover shadow-soft sm:h-[360px]"
        />
        <div className="grid gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80"
            alt="Community event gathering"
            className="h-[160px] w-full rounded-[28px] object-cover shadow-soft sm:h-[168px]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80"
            alt="Festival event lights"
            className="h-[160px] w-full rounded-[28px] object-cover shadow-soft sm:h-[168px]"
          />
        </div>
      </div>
    </section>
  );
}
