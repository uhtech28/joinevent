import { SectionTitle } from './SectionTitle';
import { WAITLIST_URL } from '@/lib/constants';

type Package = {
  badge: string;
  title: string;
  price: string;
  features: string[];
  featured?: boolean;
};

const PACKAGES: Package[] = [
  {
    badge: 'Open Setup',
    title: 'Open Stall',
    price: '₹4500',
    features: ['2 Tables', '2 Chairs', 'Open Space Setup', 'Suitable for small brands and home businesses'],
  },
  {
    badge: 'Most Popular',
    title: 'Standard Canopy Stall',
    price: '₹5500',
    features: ['2 Tables', '2 Chairs', '2 Lights', 'Premium Canopy Setup'],
  },
  {
    badge: 'Premium Visibility',
    title: 'Premium Business Stall',
    price: '₹6000',
    features: [
      '2 Tables, 2 Chairs and 2 Lights',
      'Premium Canopy with 1 Fan',
      'Media Coverage and Stage Announcements',
      'Social Media Promotion',
      'Featured Stall Placement',
    ],
  },
];

function PackageCard({ pkg }: { pkg: Package }) {
  return (
    <article
      className={`relative overflow-hidden rounded-[28px] border bg-white p-8 shadow-soft ${
        pkg.featured
          ? 'border-2 border-brand-orange shadow-hover lg:-translate-y-2'
          : 'border-black/5'
      }`}
    >
      <span className="mb-3.5 inline-block rounded-full bg-cream-300 px-3 py-1.5 text-xs font-extrabold text-brand-orange-dark">
        {pkg.badge}
      </span>
      <h3 className="mb-2 text-2xl font-bold text-ink-700">{pkg.title}</h3>
      <div className="mb-[18px] text-[38px] font-extrabold text-brand-orange">{pkg.price}</div>
      <ul className="mb-6 grid gap-3">
        {pkg.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 leading-[1.55] text-ink-400">
            <span className="font-extrabold text-emerald-600">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={WAITLIST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary w-full"
      >
        Book Stall
      </a>
    </article>
  );
}

export function Packages() {
  return (
    <section id="packages" className="px-[5%] py-[88px] sm:px-[7%]">
      <SectionTitle
        eyebrow="Stall Booking"
        title="Grand Society Exhibition & Shopping Carnival Packages"
        description="Launching soon in premium societies across Noida and Ghaziabad. Limited stalls available for shopping brands, food vendors, startups, home businesses and exhibitors."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <PackageCard key={pkg.title} pkg={pkg} />
        ))}
      </div>
    </section>
  );
}
