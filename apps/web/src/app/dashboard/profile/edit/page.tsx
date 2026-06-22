'use client';

// /dashboard/profile/edit — owner edits their business profile.
// Updates display name + bio. The bio doubles as the "category line" on the
// public /org/[username] page (split on "•").

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type PublicBusinessProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ImageUploader } from '@/components/profile/ImageUploader';

export default function EditProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const [profile, setProfile] = useState<PublicBusinessProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    (async () => {
      try {
        const list = await api.profiles.mine();
        const first = list[0] ?? null;
        setProfile(first);
        if (first) {
          setUsername(first.username);
          setDisplayName(first.displayName);
          setBio(first.bio ?? '');
          setAvatarUrl(first.avatarUrl ?? '');
          setCoverUrl(first.coverUrl ?? '');
          setLocation(first.location ?? '');
          setWebsiteUrl(first.websiteUrl ?? '');
          setInstagramUrl(first.instagramUrl ?? '');
          setFacebookUrl(first.facebookUrl ?? '');
          setTwitterUrl(first.twitterUrl ?? '');
          setLinkedinUrl(first.linkedinUrl ?? '');
          setYoutubeUrl(first.youtubeUrl ?? '');
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      } finally {
        setLoaded(true);
      }
    })();
  }, [auth.status]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.profiles.updateMine({
        ...(username.trim() !== profile.username && { username: username.trim() }),
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        coverUrl: coverUrl.trim() || null,
        location: location.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        facebookUrl: facebookUrl.trim() || null,
        twitterUrl: twitterUrl.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        youtubeUrl: youtubeUrl.trim() || null,
      });
      setProfile(updated);
      setUsername(updated.username);
      setDisplayName(updated.displayName);
      setBio(updated.bio ?? '');
      setAvatarUrl(updated.avatarUrl ?? '');
      setCoverUrl(updated.coverUrl ?? '');
      setLocation(updated.location ?? '');
      setWebsiteUrl(updated.websiteUrl ?? '');
      setInstagramUrl(updated.instagramUrl ?? '');
      setFacebookUrl(updated.facebookUrl ?? '');
      setTwitterUrl(updated.twitterUrl ?? '');
      setLinkedinUrl(updated.linkedinUrl ?? '');
      setYoutubeUrl(updated.youtubeUrl ?? '');
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-64 animate-pulse rounded-xl bg-white shadow-soft" />
        <div className="h-96 animate-pulse rounded-3xl bg-white shadow-soft" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-purple/15 text-3xl">
          🎤
        </div>
        <h2 className="text-xl font-extrabold text-navy-800">No business profile yet</h2>
        <p className="mt-2 text-sm text-ink-500">
          Create your organiser or vendor profile to start posting events and accepting bookings.
        </p>
        <Link href="/dashboard/profile/new" className="btn btn-primary mt-5 inline-block">
          Create profile
        </Link>
      </div>
    );
  }

  const tags = (bio || '')
    .split(/[•·,|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
            Settings
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
            Edit Profile
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Update how vendors and visitors see you on JoinEvents.
          </p>
        </div>
        <Link
          href={`/org/${profile.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-navy-700 shadow-soft transition hover:bg-cream-100"
        >
          View public profile →
        </Link>
      </header>

      {/* Live preview card */}
      <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft">
        <div className="relative h-24 w-full overflow-hidden">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-ribbon-purple via-ribbon-pink to-brand-purple" />
          )}
        </div>
        <div className="relative px-6 pt-12 pb-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="absolute -top-8 left-6 h-16 w-16 rounded-full object-cover ring-4 ring-white"
            />
          ) : (
            <div className="absolute -top-8 left-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ribbon-purple via-ribbon-pink to-brand-purple text-xl font-extrabold text-white ring-4 ring-white">
              {displayName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase() ?? '')
                .join('') || '?'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-all text-lg font-extrabold text-navy-800">
                {displayName || 'Your profile name'}
              </h3>
              {profile.verified && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                  ✓ Verified
                </span>
              )}
            </div>
            {tags.length > 0 ? (
              <p className="mt-1 text-sm text-ink-500">
                {tags.map((t, i) => (
                  <span key={t}>
                    {i > 0 && <span className="mx-1.5 text-ink-300">•</span>}
                    {t}
                  </span>
                ))}
              </p>
            ) : (
              <p className="mt-1 text-sm italic text-ink-400">
                Add tags below — they appear here on your public profile
              </p>
            )}
            <p className="mt-1 text-xs text-ink-400">@{profile.username}</p>
          </div>
        </div>
      </section>

      {/* Edit form */}
      <form
        onSubmit={onSave}
        className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft sm:p-8"
      >
        <div className="space-y-5">
          <Field
            label="Display Name"
            hint="Your public brand name. Vendors will see this on every event."
          >
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              required
              className={inputClass}
              placeholder="e.g. JoinEvents Creations"
            />
          </Field>

          <Field
            label="Bio / Tags"
            hint='Separate tags with "•" — they show as your category line. Example: "Events • Carnivals • Exhibitions"'
          >
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              className={`${inputClass} resize-y`}
              placeholder="Events • Carnivals • Exhibitions • Community Festivals"
            />
            <div className="mt-1.5 flex justify-between text-xs text-ink-400">
              <span>{tags.length} tag{tags.length === 1 ? '' : 's'} detected</span>
              <span>{bio.length} / 500</span>
            </div>
          </Field>

          <Field label="Location" hint="Where your business operates.">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={120}
              className={inputClass}
              placeholder="Noida, Uttar Pradesh"
            />
          </Field>

          <Field label="Profile picture" hint="Square image (400×400 or larger) works best.">
            <ImageUploader
              variant="avatar"
              value={avatarUrl}
              onUploaded={(url) => setAvatarUrl(url)}
              onClear={() => setAvatarUrl('')}
            />
          </Field>

          <Field label="Cover photo" hint="Wide banner shown at the top of your public profile (recommended 1500×500).">
            <ImageUploader
              variant="cover"
              value={coverUrl}
              onUploaded={(url) => setCoverUrl(url)}
              onClear={() => setCoverUrl('')}
            />
          </Field>

          <Field
            label="Username"
            hint="Your URL handle — 3–32 lowercase letters / digits / dashes. Changing this breaks any links you've already shared."
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                maxLength={32}
                required
                className={`${inputClass} pl-9`}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-400">
              Public URL:{' '}
              <Link
                href={`/org/${username || profile.username}`}
                className="font-semibold text-ribbon-purple hover:underline"
              >
                joinevents.in/org/{username || profile.username}
              </Link>
            </p>
          </Field>

          {/* --- Social links --- */}
          <div className="border-t border-black/[0.06] pt-5">
            <h3 className="text-base font-extrabold text-navy-800">Social channels</h3>
            <p className="mt-1 text-xs text-ink-500">
              Add full URLs to your accounts. They show up as icons on your public profile and
              the Share Your Profile card.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Website" hint="e.g. https://yourbrand.com">
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://"
                  className={inputClass}
                />
              </Field>
              <Field label="Instagram">
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://instagram.com/yourhandle"
                  className={inputClass}
                />
              </Field>
              <Field label="Facebook">
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://facebook.com/yourpage"
                  className={inputClass}
                />
              </Field>
              <Field label="Twitter / X">
                <input
                  type="url"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://twitter.com/yourhandle"
                  className={inputClass}
                />
              </Field>
              <Field label="LinkedIn">
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://linkedin.com/company/yourbrand"
                  className={inputClass}
                />
              </Field>
              <Field label="YouTube">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://youtube.com/@yourchannel"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠ {error}
          </div>
        )}

        {savedAt && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✓ Saved at {new Date(savedAt).toLocaleTimeString()}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-sm font-semibold text-ink-500 hover:text-brand-purple"
          >
            ← Back to dashboard
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-purple-gradient px-5 py-3 text-sm font-extrabold text-white ring-1 ring-inset ring-white/15 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Verification status card */}
      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft">
        <h2 className="text-base font-extrabold text-navy-800">Account Verification</h2>
        <p className="mt-1 text-sm text-ink-500">
          Verified profiles get a green badge, priority placement, and access to high-trust events.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-cream-50 p-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                profile.verified
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {profile.verified ? '✓' : '⏳'}
            </div>
            <div>
              <div className="text-sm font-bold text-navy-800">
                {profile.verified ? 'Verified' : `KYC ${profile.kycStatus}`}
              </div>
              <div className="text-xs text-ink-400">
                {profile.verified
                  ? 'Your profile is verified and trusted.'
                  : 'Submit your KYC documents to get verified.'}
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/kyc"
            className="rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-navy-700 transition hover:bg-cream-100"
          >
            {profile.verified ? 'View KYC' : 'Submit KYC →'}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
        {label}
      </span>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
    </label>
  );
}

const inputClass =
  'w-full rounded-2xl border border-black/10 bg-cream-50 px-4 py-3 text-sm font-medium text-navy-800 outline-none transition focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15';
