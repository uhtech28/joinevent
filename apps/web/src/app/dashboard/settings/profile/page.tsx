'use client';

// /dashboard/settings/profile — user-role profile editor.
//
// Lets a member-role account set the display name + avatar that appear on
// their comments and likes across the app. (Organisers + vendors already
// have a richer editor at /dashboard/profile/edit for their BusinessProfile;
// this page only writes to the User row.)
//
// Hits PATCH /auth/me. Avatar upload uses the same /uploads/profile-image
// endpoint as everything else — multipart upload, returns absolute URL.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PublicUser } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function UserProfileEditPage() {
  const auth = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Prefill from the current auth user.
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    setDisplayName(auth.user.displayName ?? '');
    setAvatarUrl(auth.user.avatarUrl ?? null);
  }, [auth.status, auth.status === 'authenticated' ? auth.user.id : null]);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Pick a JPG, PNG, WEBP or GIF.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image is over 8MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const res = await api.uploads.profileImage(file);
      setAvatarUrl(res.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated: PublicUser = await api.auth.updateMe({
        displayName: displayName.trim() || null,
        avatarUrl: avatarUrl ?? null,
      });
      // Bounce the auth context so the topbar/sidebar pick up the new name
      // and avatar immediately without a hard refresh.
      void auth.refresh();
      setSavedAt(Date.now());
      // Keep local state in sync with what the server returned.
      setDisplayName(updated.displayName ?? '');
      setAvatarUrl(updated.avatarUrl ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function clearAvatar() {
    setAvatarUrl(null);
  }

  if (auth.status === 'loading') return <SkeletonPage />;

  const initial = (displayName || auth.status === 'authenticated' ? (auth.status === 'authenticated' ? auth.user.email ?? auth.user.phone ?? '?' : '?') : '?')[0]?.toUpperCase() ?? '?';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link
          href="/dashboard/settings"
          className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-brand-purple hover:underline"
        >
          ← Back to Settings
        </Link>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Profile
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Edit your profile
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Your name and photo show up on comments, likes, and anywhere you appear across Join Events.
        </p>
      </header>

      {/* Avatar uploader */}
      <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-card">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-500">
          Profile photo
        </div>
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-card"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-purple-gradient text-3xl font-extrabold text-white ring-4 ring-white shadow-purple">
                {initial}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-[1px]">
                <SpinnerIcon className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-navy-700 transition hover:bg-cream-100 disabled:opacity-50"
              >
                <UploadIcon className="h-3.5 w-3.5" />
                {avatarUrl ? 'Change photo' : 'Upload photo'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={clearAvatar}
                  className="inline-flex items-center rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-ink-400">
              JPG, PNG, WEBP or GIF. Max 8MB. Square images look best.
            </p>
          </div>
        </div>
      </section>

      {/* Display name */}
      <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-card">
        <label className="block">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Display name
          </div>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            placeholder="What people should call you"
            className="w-full rounded-xl border border-black/[0.08] bg-cream-50 px-4 py-3 text-sm text-navy-800 outline-none transition focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15"
          />
          <p className="mt-1.5 text-[11px] text-ink-400">
            Visible everywhere you comment or like. Leave blank to stay anonymous as &ldquo;JoinEvents user&rdquo;.
          </p>
        </label>
      </section>

      {/* Error / success banner */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {/* Sticky save row */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-cream-50 px-5 py-3">
        <span className="text-xs text-ink-400">
          {savedAt && Date.now() - savedAt < 4000
            ? '✓ Saved'
            : 'Changes are live as soon as you save.'}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving || uploading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-gradient px-5 py-2.5 text-sm font-extrabold text-white shadow-purple transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {saving ? (
            <>
              <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </div>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-cream-200" />
        <div className="h-8 w-72 animate-pulse rounded bg-cream-200" />
      </div>
      <div className="h-32 animate-pulse rounded-3xl bg-white shadow-card" />
      <div className="h-24 animate-pulse rounded-3xl bg-white shadow-card" />
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 1-9 9" strokeLinecap="round" />
    </svg>
  );
}
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
