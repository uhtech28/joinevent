'use client';

// /dashboard/products — vendor-only product catalogue manager.
// Layout: header, primary CTA (Add Product), responsive grid of cards.
// Each card shows the cover image, name, category, From-price, an active
// toggle, and Edit / Delete actions. Editing opens the same dialog as Add
// pre-filled. Product images upload through the standard /uploads endpoint.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type CreateProductBody, type PublicProduct } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function ProductsPage() {
  const auth = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<PublicProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PublicProduct | 'new' | null>(null);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    if (auth.user.primaryRole !== 'vendor') {
      router.replace('/dashboard');
      return;
    }
    let alive = true;
    api.products.mine()
      .then((rows) => alive && setProducts(rows))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : (err as Error).message));
    return () => { alive = false; };
  }, [auth, auth.status, router]);

  async function handleDelete(p: PublicProduct) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.products.delete(p.id);
      setProducts((prev) => (prev ?? []).filter((x) => x.id !== p.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function handleToggleActive(p: PublicProduct) {
    try {
      const updated = await api.products.update(p.id, { isActive: !p.isActive });
      setProducts((prev) => (prev ?? []).map((x) => (x.id === p.id ? updated : x)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  function handleSaved(updated: PublicProduct) {
    setProducts((prev) => {
      const list = prev ?? [];
      const idx = list.findIndex((x) => x.id === updated.id);
      if (idx === -1) return [updated, ...list];
      const next = list.slice();
      next[idx] = updated;
      return next;
    });
    setEditing(null);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
            Products
          </div>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-navy-800 sm:text-[28px]">
            Your product catalogue
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            List items buyers can enquire about straight from your public profile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-gradient px-4 py-2.5 text-sm font-extrabold text-white shadow-purple"
        >
          <span className="text-lg leading-none">+</span> Add Product
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {products === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
            🛍️
          </div>
          <h3 className="text-base font-extrabold text-navy-800">
            No products yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Add your first item so buyers visiting your profile can enquire about it.
          </p>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="mt-4 inline-flex rounded-2xl bg-purple-gradient px-5 py-2.5 text-sm font-bold text-white shadow-purple"
          >
            + Add Product
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={() => setEditing(p)}
              onDelete={() => handleDelete(p)}
              onToggleActive={() => handleToggleActive(p)}
            />
          ))}
        </div>
      )}

      {editing && (
        <ProductDialog
          existing={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// ProductCard — owner-side card matching the design (image, name,
// category, From-price, active toggle, edit/delete).
// ----------------------------------------------------------------
function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  product: PublicProduct;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const cover = product.imageUrls[0];
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-soft transition hover:-translate-y-0.5">
      <div className="relative h-44 w-full bg-cream-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-cream-300">🛍️</div>
        )}
        {!product.isActive && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur">
            Hidden
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-sm font-extrabold text-navy-800">{product.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">
          {product.category ?? 'Uncategorised'}
        </p>
        <div className="mt-2 text-base font-extrabold text-brand-purple">
          From {inr(product.priceFromPaise)}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-3">
          <button
            type="button"
            onClick={onToggleActive}
            className={`text-[11px] font-bold ${
              product.isActive ? 'text-emerald-600' : 'text-ink-400'
            }`}
            title={product.isActive ? 'Active — visible to buyers' : 'Hidden'}
          >
            {product.isActive ? '● Active' : '○ Hidden'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-ribbon-purple/30 bg-ribbon-purple/5 px-2.5 py-1 text-[11px] font-bold text-ribbon-purple"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-600"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ----------------------------------------------------------------
// ProductDialog — add / edit modal.
// ----------------------------------------------------------------
function ProductDialog({
  existing,
  onClose,
  onSaved,
}: {
  existing: PublicProduct | null;
  onClose: () => void;
  onSaved: (p: PublicProduct) => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [priceRupees, setPriceRupees] = useState<string>(
    existing ? String(Math.round(existing.priceFromPaise / 100)) : '',
  );
  const [imageUrls, setImageUrls] = useState<string[]>(existing?.imageUrls ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const res = await api.uploads.profileImage(file);
      setImageUrls((prev) => [...prev, res.url].slice(0, 8));
    } catch (uerr) {
      setErr(uerr instanceof Error ? uerr.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const priceFromPaise = Math.round(Number(priceRupees) * 100);
    if (!name.trim()) return setErr('Name is required');
    if (!Number.isFinite(priceFromPaise) || priceFromPaise <= 0) {
      return setErr('Enter a starting price');
    }
    if (imageUrls.length === 0) return setErr('Add at least one image');

    const body: CreateProductBody = {
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      priceFromPaise,
      imageUrls,
    };
    setBusy(true);
    try {
      const saved = existing
        ? await api.products.update(existing.id, body)
        : await api.products.create(body);
      onSaved(saved);
    } catch (uerr) {
      setErr(uerr instanceof Error ? uerr.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-soft"
      >
        <header className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <h2 className="text-base font-extrabold text-navy-800">
            {existing ? 'Edit product' : 'Add product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-400 hover:text-navy-800"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div>
            <label className="text-xs font-bold text-navy-800">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="input mt-1"
              placeholder="Macrame Wall Hanging"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-navy-800">Category</label>
              <input
                type="text"
                value={category ?? ''}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={60}
                className="input mt-1"
                placeholder="Home Decor"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-navy-800">Starting price (₹)</label>
              <input
                type="number"
                min={1}
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                className="input mt-1"
                placeholder="999"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-navy-800">Description</label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              className="input mt-1"
              placeholder="Handmade with love…"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-navy-800">
              Images ({imageUrls.length}/8)
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {imageUrls.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-black/[0.06] bg-cream-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrls((p) => p.filter((u) => u !== url))}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-rose-600 shadow-soft"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              {imageUrls.length < 8 && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ribbon-purple/40 bg-cream-100 text-xs font-bold text-ribbon-purple">
                  {uploading ? '…' : '+ Add'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </label>
              )}
            </div>
          </div>

          {err && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              ⚠ {err}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-black/[0.06] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-navy-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || uploading}
            className="rounded-xl bg-purple-gradient px-5 py-2 text-sm font-extrabold text-white shadow-purple disabled:opacity-60"
          >
            {busy ? 'Saving…' : existing ? 'Save changes' : 'Publish'}
          </button>
        </footer>
      </form>
    </div>
  );
}
