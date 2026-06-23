'use client';

// VendorProducts — Our Products section rendered only on stall-owner
// profiles. Mirrors the screenshot: card image + title + category +
// Enquire Now CTA. Clicking Enquire Now opens a dialog with a message
// box; signed-in users submit straight to /enquiries, anonymous users
// are bounced to /login first.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type PublicProduct } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export function VendorProducts({ username }: { username: string }) {
  const [products, setProducts] = useState<PublicProduct[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [enquireOn, setEnquireOn] = useState<PublicProduct | null>(null);

  useEffect(() => {
    let alive = true;
    api.products
      .listForUsername(username)
      .then((rows) => alive && setProducts(rows))
      .catch((e) => alive && setErr(e instanceof ApiError ? e.message : (e as Error).message));
    return () => {
      alive = false;
    };
  }, [username]);

  if (err) {
    return null; // silently hide on error — feature degrades gracefully
  }
  if (products !== null && products.length === 0) {
    return null; // nothing to show until the owner adds products
  }

  return (
    <section className="mt-6 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-navy-800 sm:text-lg">
          Our Products <span className="text-ink-400">(Platform Enquiries Only)</span>
        </h2>
        <Link
          href="#products"
          className="text-sm font-bold text-ribbon-purple hover:underline"
        >
          View All
        </Link>
      </div>

      {products === null ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-cream-100" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onEnquire={() => setEnquireOn(p)} />
          ))}
        </div>
      )}

      {enquireOn && (
        <EnquiryDialog
          product={enquireOn}
          onClose={() => setEnquireOn(null)}
        />
      )}
    </section>
  );
}

function ProductCard({
  product,
  onEnquire,
}: {
  product: PublicProduct;
  onEnquire: () => void;
}) {
  const cover = product.imageUrls[0];
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="aspect-square w-full overflow-hidden bg-cream-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-cream-300">🛍️</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-sm font-extrabold text-navy-800">{product.name}</h3>
        <p className="mt-0.5 text-xs text-ink-500">{product.category ?? 'Uncategorised'}</p>
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
  product: PublicProduct;
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
    if (!message.trim()) {
      setErr('Tell the seller what you need.');
      return;
    }
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
      setErr(uerr instanceof Error ? uerr.message : 'Failed to send enquiry');
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
              <p className="text-xs text-ink-500">From {inr(product.priceFromPaise)}</p>
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
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                    className="input mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy-800">Phone <span className="text-ink-400">(optional)</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={40}
                    className="input mt-1"
                  />
                </div>
              </div>
              {err && <div className="text-xs font-semibold text-rose-700">⚠ {err}</div>}
            </>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-black/[0.06] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-navy-700"
          >
            {sent ? 'Close' : 'Cancel'}
          </button>
          {!sent && (
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-purple-gradient px-5 py-2 text-sm font-extrabold text-white shadow-purple disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send enquiry'}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
