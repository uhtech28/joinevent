'use client';

// /dashboard/profile — Facebook-style owner profile dashboard.
//
// First-time visit (no business profile yet) → shows a clean setup wizard that
// asks for username (required) + display name + bio + avatar URL + cover URL.
//
// After that → renders a full profile view: cover banner, large overlapping
// avatar, name + verified badge, category line, location, stats, Edit/Public
// buttons, post composer, and the live timeline of their own posts.

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  api,
  ApiError,
  type PublicBusinessProfile,
  type PublicPost,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PostCard } from '@/components/posts/PostCard';
import { PostComposer } from '@/components/posts/PostComposer';
import { ImageUploader } from '@/components/profile/ImageUploader';

export default function OwnerProfilePage() {
  const auth = useAuth();
  const router = useRouter();

  // Members (regular users) don't have a business profile yet. Send them to
  // their personal profile editor instead of the organiser/vendor view that
  // would otherwise let them publish posts.
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    const role = auth.user.primaryRole;
    if (role !== 'organiser' && role !== 'vendor') {
      router.replace('/dashboard/settings/profile');
    }
  }, [auth.status, auth, router]);
  const [profile, setProfile] = useState<PublicBusinessProfile | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    (async () => {
      try {
        const list = await api.profiles.mine();
        const first = list[0] ?? null;
        setProfile(first);
        if (first) {
          const page = await api.posts.listForProfile(first.username);
          setPosts(page.items);
          setPostsLoaded(true);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      } finally {
        setLoaded(true);
      }
    })();
  }, [auth.status]);

  function onCreated(post: PublicPost) {
    setPosts((prev) => [post, ...prev]);
    setProfile((p) => (p ? { ...p, postsCount: p.postsCount + 1 } : p));
  }

  function onPostChanged(id: string, next: PublicPost | null) {
    if (next === null) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setProfile((p) => (p ? { ...p, postsCount: Math.max(0, p.postsCount - 1) } : p));
    } else {
      setPosts((prev) => prev.map((p) => (p.id === id ? next : p)));
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-3xl bg-white shadow-soft" />
        <div className="h-32 animate-pulse rounded-3xl bg-white shadow-soft" />
      </div>
    );
  }

  if (!profile) {
    return <SetupWizard onCreated={(p) => setProfile(p)} />;
  }

  const tags = parseTags(profile.bio);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Cover + avatar + identity */}
      <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft">
        <div className="relative h-44 w-full overflow-hidden sm:h-56">
          {profile.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-ribbon-purple via-ribbon-pink to-brand-purple" />
          )}
        </div>
        <div className="relative px-5 pb-5 sm:px-7">
          <div className="absolute -top-14 left-5 sm:left-7">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-white sm:h-32 sm:w-32"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-ribbon-purple via-ribbon-pink to-brand-purple text-3xl font-extrabold text-white ring-4 ring-white sm:h-32 sm:w-32">
                {initials(profile.displayName)}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 pt-16 sm:pt-20">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
                  {profile.displayName}
                </h1>
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                    ✓ Verified {profile.type === 'organiser' ? 'Organiser' : 'Vendor'}
                  </span>
                )}
              </div>
              {tags.length > 0 && (
                <p className="mt-1 text-sm text-ink-500">
                  {tags.map((t, i) => (
                    <span key={t}>
                      {i > 0 && <span className="mx-1.5 text-ink-300">•</span>}
                      {t}
                    </span>
                  ))}
                </p>
              )}
              {profile.location && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                  <span className="text-brand-pink">📍</span>
                  {profile.location}
                </p>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-navy-700">
                <span className="flex items-center gap-1">
                  <span className="text-amber-500">⭐</span>
                  {Number(profile.avgRating).toFixed(1)}
                </span>
                <span className="text-ink-300">·</span>
                <span>{profile.followersCount} followers</span>
                <span className="text-ink-300">·</span>
                <span>{profile.postsCount} posts</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/profile/edit"
                className="rounded-2xl bg-purple-gradient px-4 py-2.5 text-sm font-extrabold text-white ring-1 ring-inset ring-white/15 transition hover:opacity-95"
              >
                Edit Profile
              </Link>
              <Link
                href={`/org/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-navy-700 shadow-soft transition hover:bg-cream-100"
              >
                Public Profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Composer */}
      <PostComposer profile={profile} onPublish={onCreated} />

      {/* Posts timeline */}
      {!postsLoaded && (
        <div className="h-32 animate-pulse rounded-3xl bg-white shadow-soft" />
      )}
      {postsLoaded && posts.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
            ✍️
          </div>
          <h3 className="text-base font-extrabold text-navy-800">No posts yet</h3>
          <p className="mt-1 text-sm text-ink-500">
            Write your first post above — your followers will see it on their feed.
          </p>
        </div>
      )}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            canDelete
            onChange={(next) => onPostChanged(post.id, next)}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Setup wizard — first-time profile creation
// ============================================================
function SetupWizard({ onCreated }: { onCreated: (p: PublicBusinessProfile) => void }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [type, setType] = useState<'organiser' | 'vendor'>('organiser');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username preview — lowercase + dashes only
  const usernameValid = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(username);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!usernameValid) {
      setError('Username must be lowercase letters, digits or dashes (3–32 chars).');
      return;
    }
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.profiles.create({
        username,
        displayName: displayName.trim(),
        type,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
        location: location.trim() || undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Set up your profile
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Create your business profile
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          This is the page your followers and customers will see. Username is required —
          everything else can be added later.
        </p>
      </header>

      {/* Live preview */}
      <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft">
        <div className="relative h-32 w-full overflow-hidden">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-ribbon-purple via-ribbon-pink to-brand-purple" />
          )}
        </div>
        <div className="relative px-5 pb-5 pt-14">
          <div className="absolute -top-10 left-5">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-4 ring-white"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-ribbon-purple via-ribbon-pink to-brand-purple text-xl font-extrabold text-white ring-4 ring-white">
                {initials(displayName) || '?'}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="break-all text-lg font-extrabold text-navy-800">
              {displayName || 'Your business name'}
            </h3>
            <p className="break-all text-xs text-ink-400">
              @{username || 'your-username'}
            </p>
            {bio && (
              <p className="mt-2 text-sm text-ink-500">{bio}</p>
            )}
          </div>
        </div>
      </section>

      {/* Form */}
      <form
        onSubmit={submit}
        className="space-y-5 rounded-3xl border border-black/5 bg-white p-6 shadow-soft sm:p-8"
      >
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-cream-50 p-1.5">
          <TypeChip active={type === 'organiser'} onClick={() => setType('organiser')}>
            🎪 Organiser
          </TypeChip>
          <TypeChip active={type === 'vendor'} onClick={() => setType('vendor')}>
            🏪 Stall Owner
          </TypeChip>
        </div>

        <Field
          label="Username"
          required
          hint="Your URL handle. Lowercase letters, digits, and dashes. Cannot be changed later."
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              maxLength={32}
              required
              className={`${inputClass} pl-9`}
              placeholder="join-events-creations"
            />
          </div>
          {username && !usernameValid && (
            <p className="mt-1 text-xs text-amber-700">
              Use 3–32 lowercase letters, digits, or dashes (no leading / trailing dash).
            </p>
          )}
        </Field>

        <Field label="Business name (optional)" hint="The full name shown on your profile.">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            className={inputClass}
            placeholder="JoinEvents Creations"
          />
        </Field>

        <Field
          label="Bio / tags (optional)"
          hint='Separate categories with "•" — they show as your tag line.'
        >
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={2}
            className={`${inputClass} resize-y`}
            placeholder="Events • Carnivals • Exhibitions"
          />
        </Field>

        <Field label="Location (optional)" hint="Where your business operates.">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            className={inputClass}
            placeholder="Noida, Uttar Pradesh"
          />
        </Field>

        <Field label="Profile picture (optional)" hint="Square image works best.">
          <ImageUploader
            variant="avatar"
            value={avatarUrl}
            onUploaded={(url) => setAvatarUrl(url)}
            onClear={() => setAvatarUrl('')}
          />
        </Field>

        <Field label="Cover photo (optional)" hint="Wide banner shown at the top of your profile.">
          <ImageUploader
            variant="cover"
            value={coverUrl}
            onUploaded={(url) => setCoverUrl(url)}
            onClear={() => setCoverUrl('')}
          />
        </Field>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !usernameValid || !displayName.trim()}
          className="w-full rounded-2xl bg-purple-gradient py-3.5 text-sm font-extrabold text-white ring-1 ring-inset ring-white/15 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Creating profile…' : 'Create my profile'}
        </button>
      </form>
    </div>
  );
}

function TypeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl py-2.5 text-sm font-bold transition ${
        active
          ? 'bg-white text-navy-800 shadow-soft'
          : 'text-ink-500 hover:text-navy-800'
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
        {label}
        {required && <span className="text-brand-purple">*</span>}
      </span>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
    </label>
  );
}

const inputClass =
  'w-full rounded-2xl border border-black/10 bg-cream-50 px-4 py-3 text-sm font-medium text-navy-800 outline-none transition focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

function parseTags(bio: string | null): string[] {
  if (!bio) return [];
  return bio
    .split(/[•·,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
