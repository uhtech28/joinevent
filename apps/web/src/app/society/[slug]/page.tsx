'use client';

import { use, useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api, ApiError, type ApiSocietyPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function SocietyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const auth = useAuth();
  const [posts, setPosts] = useState<ApiSocietyPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPosts(await api.societyPosts.list(slug));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.societyPosts.create(slug, title.trim(), body.trim());
      setTitle('');
      setBody('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/events"
          className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline"
        >
          ← Back
        </Link>

        <h1 className="bg-brand-gradient-text bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          {slug.replace(/-/g, ' ')}
        </h1>
        <p className="mt-2 text-ink-400">Community notice board.</p>

        {auth.status === 'authenticated' ? (
          <form
            onSubmit={submit}
            className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-card"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Headline (e.g. Diwali decoration meet)"
              required
              minLength={3}
              maxLength={140}
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's the post about?"
              rows={3}
              required
              minLength={10}
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary mt-3 disabled:opacity-60"
            >
              {busy ? 'Posting…' : 'Post'}
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl border border-black/5 bg-cream-200 p-5 text-center text-sm text-ink-400">
            <Link href="/login" className="font-bold text-brand-orange hover:underline">
              Sign in
            </Link>{' '}
            to post.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-3">
          {!posts && <div className="h-24 animate-pulse rounded-2xl bg-white shadow-card" />}
          {posts && posts.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-brand-orange/40 bg-cream-200 p-8 text-center text-sm text-ink-400">
              No posts yet. Be the first.
            </p>
          )}
          {posts?.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-card"
            >
              <h3 className="text-base font-bold text-ink-700">{p.title}</h3>
              <p className="mt-1 text-xs text-ink-300">
                by {p.author.label} · {new Date(p.createdAt).toLocaleString('en-IN')}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-400">
                {p.body}
              </p>
              <p className="mt-3 text-xs text-ink-300">
                {p.replyCount} repl{p.replyCount === 1 ? 'y' : 'ies'}
              </p>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
