import { SectionTitle } from './SectionTitle';

const FEATURES = [
  {
    icon: '🎪',
    title: 'Stall Booking',
    body: 'Organizers can list stall spaces, categories, price and availability in one place.',
  },
  {
    icon: '🏙️',
    title: 'Society Events',
    body: 'Discover events happening in societies, communities, fairs and local markets.',
  },
  {
    icon: '🛍️',
    title: 'Vendor Profiles',
    body: 'Stall owners can showcase products, brand photos, social links and past events.',
  },
  {
    icon: '📊',
    title: 'Organizer Dashboard',
    body: 'Track vendors, applications, confirmed bookings and available stall spaces.',
  },
  {
    icon: '✅',
    title: 'Verified Records',
    body: 'Keep proper booking records to avoid confusion and duplicate stall allotment.',
  },
  {
    icon: '🔔',
    title: 'Instant Updates',
    body: 'Vendors get updates for new events and organizers can notify connected stalls.',
  },
];

export function Features() {
  return (
    <section id="features" className="px-[5%] py-[88px] sm:px-[7%]">
      <SectionTitle
        eyebrow="Platform Features"
        title="Everything needed to manage event stall bookings"
        description="Simple tools for early users, powerful features for future growth."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="rounded-3xl border border-black/5 bg-white p-[30px] shadow-card transition hover:-translate-y-2 hover:shadow-hover"
          >
            <div className="mb-[18px] flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-cream-300 text-[29px]">
              {f.icon}
            </div>
            <h3 className="mb-2.5 text-[21px] font-bold text-ink-700">{f.title}</h3>
            <p className="text-[15px] leading-[1.7] text-ink-300">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
