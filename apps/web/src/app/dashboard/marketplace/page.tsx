'use client';

// /dashboard/marketplace — member-facing browse-all-products surface.
// Mirrors the per-profile product grid but spans every stall-owner.
// Each card shows the cover, name, category, "From ₹X,XXX", seller handle,
// and an Enquire Now CTA that opens the same dialog as the public profile.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type MarketplaceProduct } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function MarketplacePage() {
  const auth = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceProduct[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enquireOn, setEnquireOn] = useState<MarketplaceProduct | null>(null);

  // Members + vendors browse this; organisers get bounced (they have their
  // own surfaces — events, applications, etc).
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    if (auth.user.primaryRole === 'organiser') {
      router.replace('/dashboard');
    }
  }, [auth, auth.status, router]);

  useEffect(() => {
    let alive = true;
    api.products
      .discover({ limit: 24 })
      .then((page) => {
        if (!alive) return;
        setItems(page.items);
        setCursor(page.nextCursor);
      })
      .catch((err) =>
        alive &&
        setError(err instanceof ApiError ? err.message : (err as Error).message),
      )
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    setError(null);
    try {
      const page = await api.products.discover({ cursor, limit: 24 });
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Marketplace
        </div>
        <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-navy-800 sm:text-[28px]">
          Browse products
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Handmade goods, food, decor and more — all from verified stall owners.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {!loaded ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
            🛍️
          </div>
          <h3 className="text-base font-extrabold text-navy-800">No products yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Stall owners haven't listed anything yet. Check back soon!
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} onEnquire={() => setEnquireOn(p)} />
            ))}
          </div>
          {cursor && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-navy-700 shadow-soft transition hover:bg-cream-100 disabled:opacity-50"
              >
                {busy ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {enquireOn && (
        <EnquiryDialog product={enquireOn} onClose={() => setEnquireOn(null)} />
      )}
    </div>
  );
}

function ProductCard({
  product,
  onEnquire,
}: {
  product: MarketplaceProduct;
  onEnquire: () => void;
}) {
  const cover = product.imageUrls[0];
  const sellerInitial = (product.seller.displayName?.[0] ?? '?').toUpperCase();
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-soft transition hover:-translate-y-0.5">
      <Link href={`/org/${encodeURIComponent(product.seller.username)}`} className="block">
        <div className="aspect-square w-full overflow-hidden bg-cream-200">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-cream-300">
              🛍️
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-sm font-extrabold text-navy-800">{product.name}</h3>
        <p className="mt-0.5 text-xs text-ink-500">{product.category ?? 'Uncategorised'}</p>
        <Link
          href={`/org/${encodeURIComponent(product.seller.username)}`}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-ribbon-purple hover:underline"
        >
          {product.seller.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.seller.avatarUrl}
              alt=""
              className="h-4 w-4 rounded-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-gradient text-[8px] font-extrabold text-white">
              {sellerInitial}
            </span>
          )}
          <span className="truncate">{product.seller.displayName}</span>
          {product.seller.verified && <span className="text-emerald-600">✓</span>}
        </Link>
        <div className="mt-1 text-sm font-extrabold text-brand-purple">
          From {inr(product.priceFromPaise)}
        </div>
        <button
          type="button"
          onClick={onEnquire}
          className="mt-3 inline-flex items-center justify-center gap-1 rounded-xl border-2 border-brand-purple bg-white px-3 py-2 text-xs font-extrabold text-brand-purple transition hover:bg-brand-purple/5"
        >
          Enquire Now
        </button>
      </div>
    </article>
  );
}

function EnquiryDialog({
  product,
  onClose,
}: {
  product: MarketplaceProduct;
  onClose: () => void;
}) {
  const auth = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (auth.status !== 'authenticated') {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!message.trim()) return setErr('Tell the seller what you need.');
    setBusy(true);
    try {
      await api.enquiries.create({
        productId: product.id,
        message: message.trim(),
        buyerName: name.trim() || null,
        buyerPhone: phone.trim() || null,
      });
      setSent(true);
    } catch (uerr) {
      setErr(uerr instanceof Error ? uerr.message : 'Failed to send');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-soft"
      >
        <header className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <h2 className="text-base font-extrabold text-navy-800">
            {sent ? 'Enquiry sent' : 'Enquire about this product'}
          </h2>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-navy-800" aria-label="Close">
            ×
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-cream-100 p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-200">
              {product.imageUrls[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrls[0]} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-sm font-extrabold text-navy-800">{product.name}</h3>
              <p className="text-xs text-ink-500">
                by {product.seller.displayName} · From {inr(product.priceFromPaise)}
              </p>
            </div>
          </div>
          {sent ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              ✓ The seller will reach out to you shortly.
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-navy-800">Your message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="input mt-1"
                  placeholder="Hi — interested in this. Could you share more details?"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-navy-800">Your name <span className="text-ink-400">(optional)</span></label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy-800">Phone <span className="text-ink-400">(optional)</span></label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} className="input mt-1" />
                </div>
              </div>
              {err && <div className="text-xs font-semibold text-rose-700">⚠ {err}</div>}
            </>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-black/[0.06] px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-navy-700">
            {sent ? 'Close' : 'Cancel'}
          </button>
          {!sent && (
            <button type="submit" disabled={busy} className="rounded-xl bg-purple-gradient px-5 py-2 text-sm font-extrabold text-white shadow-purple disabled:opacity-60">
              {busy ? 'Sending…' : 'Send enquiry'}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
