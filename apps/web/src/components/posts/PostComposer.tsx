'use client';

// PostComposer — "What's on your mind?" input that profile owners use to
// publish a post visible on their public profile and in followers' feeds.
//
// Image flow: clicking the Photos button opens the OS file picker; users can
// also drag-and-drop files onto the composer. Each file is uploaded in parallel
// via api.uploads.profileImage() and we show a loading placeholder per file
// until the upload resolves. The resulting absolute URLs are sent with the
// post as `mediaUrls`.

import { useRef, useState, type DragEvent } from 'react';
import { api, ApiError, type PublicBusinessProfile, type PublicPost } from '@/lib/api';

const MAX_LENGTH = 2000;
const MAX_MEDIA = 4;
const MAX_BYTES = 8 * 1024 * 1024; // server limit (mirror)

type Slot =
  | { kind: 'uploaded'; url: string }
  | { kind: 'uploading'; tempId: string; previewUrl: string }
  | { kind: 'error'; tempId: string; previewUrl: string; message: string };

export function PostComposer({
  profile,
  onPublish,
}: {
  profile: PublicBusinessProfile;
  onPublish: (post: PublicPost) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [content, setContent] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const trimmed = content.trim();
  const charCount = content.length;
  const overLimit = charCount > MAX_LENGTH;
  const uploadingCount = slots.filter((s) => s.kind === 'uploading').length;
  const uploadedUrls = slots
    .filter((s): s is Extract<Slot, { kind: 'uploaded' }> => s.kind === 'uploaded')
    .map((s) => s.url);
  const canPost = trimmed.length > 0 && !busy && uploadingCount === 0 && !overLimit;

  async function publish() {
    if (!canPost) return;
    setBusy(true);
    setError(null);
    try {
      const post = await api.posts.create({
        content: trimmed,
        mediaUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });
      onPublish(post);
      setContent('');
      setSlots([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ---------- File upload pipeline ----------
  function handleFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    if (list.length === 0) return;

    // Enforce remaining capacity client-side.
    const remaining = MAX_MEDIA - slots.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_MEDIA} images per post.`);
      return;
    }
    const accepted = list.slice(0, remaining);
    if (accepted.length < list.length) {
      setError(`Only the first ${accepted.length} image(s) added (limit ${MAX_MEDIA}).`);
    }

    // Validate types + sizes up-front so we don't waste a round-trip.
    const valid: File[] = [];
    for (const f of accepted) {
      if (!f.type.startsWith('image/')) {
        setError(`"${f.name}" isn't an image — use JPG, PNG, WEBP or GIF.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        setError(`"${f.name}" is over 8MB.`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;

    // Add an "uploading" slot for each file immediately so the user sees feedback.
    const newSlots: Slot[] = valid.map((f) => ({
      kind: 'uploading',
      tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      previewUrl: URL.createObjectURL(f),
    }));
    setSlots((prev) => [...prev, ...newSlots]);

    // Upload each in parallel, swapping the slot in place when it resolves.
    newSlots.forEach((slot, i) => {
      const file = valid[i];
      api.uploads
        .profileImage(file)
        .then((res) => {
          setSlots((prev) =>
            prev.map((s) =>
              s.kind === 'uploading' && s.tempId === slot.tempId
                ? ({ kind: 'uploaded', url: res.url } as Slot)
                : s,
            ),
          );
          // Free the object URL once we have a server URL.
          URL.revokeObjectURL(slot.previewUrl);
        })
        .catch((err: unknown) => {
          const message =
            err instanceof ApiError ? err.message : (err as Error).message;
          setSlots((prev) =>
            prev.map((s) =>
              s.kind === 'uploading' && s.tempId === slot.tempId
                ? ({ kind: 'error', tempId: slot.tempId, previewUrl: slot.previewUrl, message } as Slot)
                : s,
            ),
          );
        });
    });
  }

  function removeSlot(index: number) {
    setSlots((prev) => {
      const target = prev[index];
      if (target && target.kind !== 'uploaded') {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function openPicker() {
    fileRef.current?.click();
  }

  // ---------- Drag and drop ----------
  function onDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative overflow-hidden rounded-3xl border bg-white shadow-card transition ${
        dragOver
          ? 'border-brand-purple ring-2 ring-brand-purple/20'
          : 'border-black/[0.06]'
      }`}
    >
      {/* Hidden file input — opened programmatically by the Photos button. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          // Reset so picking the same file twice still fires onChange.
          e.target.value = '';
        }}
      />

      {/* Drag overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-brand-purple/5 backdrop-blur-[1px]">
          <div className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-brand-purple shadow-purple">
            Drop images to attach
          </div>
        </div>
      )}

      {/* ===== Top row: avatar + textarea ===== */}
      <div className="flex gap-3 p-5 pb-3">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white shadow"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-gradient text-base font-extrabold text-white ring-2 ring-white shadow-purple">
            {initials(profile.displayName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="truncate text-sm font-extrabold text-navy-800">
              {profile.displayName}
            </span>
            <span className="truncate text-xs font-semibold text-ink-400">
              @{profile.username}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_LENGTH + 200}
            rows={3}
            placeholder={`What's new, ${profile.displayName.split(' ')[0]}?`}
            className="w-full resize-none rounded-2xl border border-black/[0.08] bg-cream-50 px-4 py-3 text-[15px] leading-relaxed text-navy-800 placeholder:text-ink-400 outline-none transition focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15"
          />
        </div>
      </div>

      {/* ===== Media preview grid ===== */}
      {slots.length > 0 && (
        <div className="grid grid-cols-4 gap-2 px-5 pb-3">
          {slots.map((slot, i) => (
            <ImageSlot
              key={slot.kind === 'uploaded' ? slot.url : slot.tempId}
              slot={slot}
              onRemove={() => removeSlot(i)}
            />
          ))}
        </div>
      )}

      {/* ===== Error banner ===== */}
      {error && (
        <div className="mx-5 mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          ⚠ {error}
        </div>
      )}

      {/* ===== Footer: photos button + counter + Post ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] bg-cream-50/60 px-5 py-3">
        <button
          type="button"
          onClick={openPicker}
          disabled={slots.length >= MAX_MEDIA}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            slots.length > 0
              ? 'bg-brand-purple/10 text-brand-purple'
              : 'text-ink-500 hover:bg-cream-100 hover:text-navy-800'
          }`}
        >
          <PhotoIcon className="h-4 w-4" />
          {slots.length > 0
            ? `Photos · ${slots.length}/${MAX_MEDIA}`
            : 'Add photos'}
        </button>

        <div className="flex items-center gap-3">
          <span
            className={`text-[11px] tabular-nums ${
              overLimit
                ? 'font-bold text-rose-600'
                : charCount > MAX_LENGTH - 200
                  ? 'font-semibold text-amber-600'
                  : 'text-ink-400'
            }`}
          >
            {charCount} / {MAX_LENGTH}
          </span>
          <button
            type="button"
            onClick={publish}
            disabled={!canPost}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-gradient px-5 py-2 text-xs font-extrabold text-white shadow-purple transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? (
              <>
                <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                Posting…
              </>
            ) : uploadingCount > 0 ? (
              <>
                <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <SendIcon className="h-3.5 w-3.5" />
                Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ImageSlot — a single thumbnail tile with state-aware overlays.
// ============================================================
function ImageSlot({
  slot,
  onRemove,
}: {
  slot: Slot;
  onRemove: () => void;
}) {
  const src = slot.kind === 'uploaded' ? slot.url : slot.previewUrl;
  return (
    // Outer wrapper has NO overflow-hidden so the floating × badge can extend
    // past the thumbnail's rounded corners without getting clipped.
    // Padding reserves space for the badge so it doesn't bleed into the
    // composer's grid gap or the next slot.
    <div className="group relative aspect-square pr-1.5 pt-1.5">
      <div className="relative h-full w-full overflow-hidden rounded-xl ring-1 ring-black/[0.06]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />

        {slot.kind === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
            <SpinnerIcon className="h-5 w-5 animate-spin text-white" />
          </div>
        )}

        {slot.kind === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-rose-600/85 px-2 text-center text-[10px] font-extrabold leading-tight text-white">
            <span>Upload failed</span>
            <span className="line-clamp-2 font-medium opacity-85">{slot.message}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute right-0 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white shadow ring-2 ring-white transition hover:bg-rose-600"
      >
        ×
      </button>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

// ============================================================
// Icons
// ============================================================
function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="1.5" fill="currentColor" />
      <path d="M21 16l-5-5-7 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3.4 20.7l17-8a.8.8 0 0 0 0-1.4l-17-8a.8.8 0 0 0-1.1 1l2.6 6.7H12a.5.5 0 0 1 0 1H4.9l-2.6 6.7a.8.8 0 0 0 1.1 1z" />
    </svg>
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
