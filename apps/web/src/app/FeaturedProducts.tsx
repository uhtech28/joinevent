'use client';

// FeaturedProducts — landing section, mockup-exact.
// Five compact product cards in a tight 5-column grid (matches the
// dashboard's Featured Products row from the reference image): cover
// image, name, "Handmade | <material>" line, current price in dark navy
// + strikethrough old price next to it, outlined View CTA.
//
// Static — no API, no live fetch.

import Link from 'next/link';

type Showcase = {
  name: string;
  category: string;
  price: number;   // in rupees
  oldPrice: number;
  imageUrl: string;
  emoji: string;
};

const SHOWCASE: Showcase[] = [
  {
    name: 'Macrame Wall Hanging',
    category: 'Handmade | Cotton',
    price: 1299,
    oldPrice: 1699,
    imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=500&q=70',
    emoji: '🪢',
  },
  {
    name: 'Ceramic Planter',
    category: 'Handmade | Ceramic',
    price: 599,
    oldPrice: 899,
    imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=500&q=70',
    emoji: '🪴',
  },
  {
    name: 'Scented Soy Candle',
    category: 'Handmade | Natural Wax',
    price: 499,
    oldPrice: 699,
    imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=500&q=70',
    emoji: '🕯️',
  },
  {
    name: 'Wooden Table Lamp',
    category: 'Handmade | Wood',
    price: 1899,
    oldPrice: 2499,
    imageUrl: 'https://images.unsplash.com/photo-1543198126-a4d0d3464e92?auto=format&fit=crop&w=500&q=70',
    emoji: '💡',
  },
  {
    name: 'Handpainted Vase',
    category: 'Handmade | Ceramic',
    price: 799,
    oldPrice: 1199,
    imageUrl: 'https://images.unsplash.com/photo-1612196808214-b40b3bb53e15?auto=format&fit=crop&w=500&q=70',
    emoji: '🏺',
  },
];

const inr = (rupees: number) => `₹${rupees.toLocaleString('en-IN')}`;

export function FeaturedProducts() {
  return (
    <section id="featured-products" className="bg-cream-50 py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[24px] font-extrabold tracking-tight text-navy-800 sm:text-[28px]">
              Featured Products
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Handmade, hand-picked items from verified stall owners.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm font-extrabold text-brand-purple hover:underline"
          >
            View All Products →
          </Link>
        </div>

        {/* Tight 5-up grid on lg+, 3-up on md, 2-up on small */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {SHOWCASE.map((p) => (
            <ProductCard key={p.name} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Showcase }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="relative aspect-square w-full overflow-hidden bg-cream-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            const fallback = target.nextElementSibling as HTMLElement | null;
            target.style.display = 'none';
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div
          className="absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-brand-purple/10 to-ribbon-pink/10 text-5xl"
          aria-hidden
        >
          {product.emoji}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 text-[13px] font-extrabold text-navy-800">
          {product.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">
          {product.category}
        </p>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-[14px] font-extrabold text-navy-800">
            {inr(product.price)}
          </span>
          <span className="text-[11px] font-semibold text-ink-300 line-through">
            {inr(product.oldPrice)}
          </span>
        </div>
        <Link
          href="/login"
          className="mt-2.5 inline-flex items-center justify-center rounded-lg border border-brand-purple/40 bg-white py-1.5 text-[11px] font-extrabold text-brand-purple transition hover:bg-brand-purple/5"
        >
          View
        </Link>
      </div>
    </article>
  );
}
