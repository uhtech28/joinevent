'use client';

// ImageUploader — drag-drop or click to pick an image, uploads to the API,
// returns the public URL via onUploaded.
//
// Two flavours by `variant`:
//   - "avatar"  — small square preview (recommended 400x400+)
//   - "cover"   — wide banner preview (recommended 1500x500+)

import { useCallback, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';

type Variant = 'avatar' | 'cover';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function ImageUploader({
  variant,
  value,
  onUploaded,
  onClear,
}: {
  variant: Variant;
  value: string | null | undefined;
  onUploaded: (url: string) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      if (!file.type.startsWith('image/')) {
        setError('Pick an image file (JPG, PNG, WEBP, GIF).');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB.`);
        return;
      }
      setBusy(true);
      try {
        const result = await api.uploads.profileImage(file);
        onUploaded(result.url);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [onUploaded],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    void handleFile(file);
  }

  const hasImage = !!value;

  // Avatar variant — circular square thumbnail
  if (variant === 'avatar') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            disabled={busy}
            className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-dashed transition ${
              dragging
                ? 'border-brand-orange bg-brand-orange/10'
                : hasImage
                  ? 'border-black/10'
                  : 'border-black/15 bg-cream-100 hover:border-brand-orange/40 hover:bg-brand-orange/5'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value!} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-ink-400">
                <UploadIcon className="h-5 w-5" />
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">
                  Upload
                </span>
              </div>
            )}
            {busy && <Overlay />}
          </button>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-navy-700 transition hover:bg-cream-100 disabled:opacity-50"
            >
              {busy ? 'Uploading…' : hasImage ? 'Change' : 'Upload photo'}
            </button>
            {hasImage && onClear && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setError(null);
                }}
                disabled={busy}
                className="rounded-xl border border-transparent px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                Remove
              </button>
            )}
            <p className="text-[11px] text-ink-400">JPG, PNG, WEBP — max 8 MB.</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => void handleFile(e.target.files?.[0])}
          className="hidden"
        />
        {error && (
          <p className="text-xs text-amber-700">⚠ {error}</p>
        )}
      </div>
    );
  }

  // Cover variant — wide banner
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={busy}
        className={`relative block aspect-[5/2] w-full overflow-hidden rounded-2xl border-2 border-dashed transition ${
          dragging
            ? 'border-brand-orange bg-brand-orange/10'
            : hasImage
              ? 'border-black/10'
              : 'border-black/15 bg-cream-100 hover:border-brand-orange/40 hover:bg-brand-orange/5'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value!} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-ink-400">
            <UploadIcon className="h-7 w-7" />
            <span className="mt-2 text-xs font-bold uppercase tracking-wider">
              Upload cover photo
            </span>
            <span className="mt-1 text-[11px] text-ink-300">
              Drop a wide image here, or click to browse
            </span>
          </div>
        )}
        {busy && <Overlay />}
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-navy-700 transition hover:bg-cream-100 disabled:opacity-50"
        >
          {busy ? 'Uploading…' : hasImage ? 'Change' : 'Upload cover'}
        </button>
        {hasImage && onClear && (
          <button
            type="button"
            onClick={() => {
              onClear();
              setError(null);
            }}
            disabled={busy}
            className="rounded-xl border border-transparent px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
        <p className="ml-auto text-[11px] text-ink-400">JPG, PNG, WEBP — max 8 MB.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={(e) => void handleFile(e.target.files?.[0])}
        className="hidden"
      />

      {error && <p className="text-xs text-amber-700">⚠ {error}</p>}
    </div>
  );
}

function Overlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
      <div className="text-xs font-bold text-navy-800">Uploading…</div>
    </div>
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
