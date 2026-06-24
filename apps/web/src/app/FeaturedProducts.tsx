'use client';

// FeaturedProducts — homepage section that mirrors the dashboard's
// "Featured Products" card grid. Pulls live data from /products/discover
// so the landing always shows real stall-owner listings, with a
// graceful empty state when nothing has been published yet.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type MarketplaceProduct } from '@/lib/api';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export function FeaturedProducts() {
  const [items, setItems] = useState<MarketplaceProduct[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api.products
      .discover({ limit: 5 })
      .then((page) => alive && setItems(page.items))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // Hide the entire section if there's nothing real to show — keeps the
  // landing tight when the platform is fresh.
  if (failed || (items !== null && items.length === 0)) return null;

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
          {items === null
            ? [0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl bg-white shadow-soft"
                />
              ))
            : items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: MarketplaceProduct }) {
  const cover = product.imageUrls[0];
  const [imgFailed, setImgFailed] = useState(false);
  const showCover = cover && !imgFailed;
  return (
    <Link
      href={`/org/${encodeURIComponent(product.seller.username)}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="aspect-square w-full overflow-hidden bg-cream-200">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-cream-300">
            🛍️
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-extrabold text-navy-800">
          {product.name}
        </h3>
        <p className="mt-0.5 text-xs text-ink-500">
          {product.category ?? 'Uncategorised'}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-extrabold text-brand-purple">
            {inr(product.priceFromPaise)}
          </span>
        </div>
        <span className="mt-3 inline-flex items-center justify-center rounded-xl border border-brand-purple/40 bg-brand-purple/5 py-2 text-[12px] font-extrabold text-brand-purple transition group-hover:bg-brand-purple/10">
          View Product
        </span>
      </div>
    </Link>
  );
}
