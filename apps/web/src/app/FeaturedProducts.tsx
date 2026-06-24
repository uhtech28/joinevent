'use client';

// FeaturedProducts — landing section, mockup-exact.
// Five hardcoded showcase items styled to match the dashboard's
// Featured Products row: cover image, name, "Handmade | <material>"
// category line, current price + strikethrough old price, View CTA.
//
// Static on purpose — no API call. The five items mirror the design
// reference the client signed off on (Macrame Wall Hanging / Ceramic
// Planter / Scented Soy Candle / Wooden Table Lamp / Handpainted Vase).

import Link from 'next/link';

type ShowcaseProduct = {
  name: string;
  category: string;
  pricePaise: number;
  oldPricePaise: number;
  imageUrl: string;
  emoji: string; // fallback when the network image fails to load
};

const SHOWCASE: ShowcaseProduct[] = [
  {
    name: 'Macrame Wall Hanging',
    category: 'Handmade | Cotton',
    pricePaise: 129_900,
    oldPricePaise: 169_900,
    imageUrl:
      'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?auto=format&fit=crop&w=600&q=70',
    emoji: '🪢',
  },
  {
    name: 'Ceramic Planter',
    category: 'Handmade | Ceramic',
    pricePaise: 59_900,
    oldPricePaise: 89_900,
    imageUrl:
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=70',
    emoji: '🪴',
  },
  {
    name: 'Scented Soy Candle',
    category: 'Handmade | Natural Wax',
    pricePaise: 49_900,
    oldPricePaise: 69_900,
    imageUrl:
      'https://images.unsplash.com/photo-1602874801006-e26594c2e2d8?auto=format&fit=crop&w=600&q=70',
    emoji: '🕯️',
  },
  {
    name: 'Wooden Table Lamp',
    category: 'Handmade | Wood',
    pricePaise: 189_900,
    oldPricePaise: 249_900,
    imageUrl:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=70',
    emoji: '💡',
  },
  {
    name: 'Handpainted Vase',
    category: 'Handmade | Ceramic',
    pricePaise: 79_900,
    oldPricePaise: 119_900,
    imageUrl:
      'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?auto=format&fit=crop&w=600&q=70',
    emoji: '🏺',
  },
];

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export function FeaturedProducts() {
  return (
    <section id="featured-products" className="bg-cream-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
              Featured Products
            </h2>
            <p className="mt-1.5 text-sm text-ink-500 sm:text-base">
              Handmade, hand-picked items from verified stall owners.
            </p>
          </div>
          <Link
            href="/dashboard/marketplace"
            className="text-sm font-extrabold text-brand-purple hover:underline"
          >
            View All Products →
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SHOWCASE.map((p) => (
            <ProductCard key={p.name} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: ShowcaseProduct }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="aspect-square w-full overflow-hidden bg-cream-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition hover:scale-[1.02]"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            const fallback = target.parentElement?.querySelector('.fallback') as HTMLElement | null;
            target.style.display = 'none';
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div
          className="fallback hidden h-full w-full items-center justify-center text-5xl text-cream-300"
          aria-hidden
        >
          {product.emoji}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-sm font-extrabold text-navy-800">
          {product.name}
        </h3>
        <p className="mt-0.5 text-xs text-ink-500">{product.category}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-extrabold text-brand-purple">
            {inr(product.pricePaise)}
          </span>
          <span className="text-xs font-semibold text-ink-300 line-through">
            {inr(product.oldPricePaise)}
          </span>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="mt-3 inline-flex items-center justify-center rounded-xl border border-brand-purple/40 bg-brand-purple/5 py-2 text-[12px] font-extrabold text-brand-purple transition hover:bg-brand-purple/10"
        >
          View
        </Link>
      </div>
    </article>
  );
}
