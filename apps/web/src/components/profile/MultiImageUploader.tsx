'use client';

// MultiImageUploader — pick or drag multiple images, uploads each one through
// the /uploads/profile-image endpoint, returns the array of public URLs via
// onChange. Supports reordering and per-image removal.

import { useCallback, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function MultiImageUploader({
  values,
  onChange,
  max = 8,
  min = 0,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  max?: number;
  min?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, max - values.length);
  const slotsFull = remaining === 0;

  const handleFiles = useCallback(
    async (rawFiles: FileList | File[] | null) => {
      if (!rawFiles) return;
      const files = Array.from(rawFiles);
      if (files.length === 0) return;

      setError(null);
      const accepted: File[] = [];
      for (const f of files) {
        if (accepted.length >= remaining) break;
        if (!f.type.startsWith('image/')) {
          setError('Some files were skipped — only images allowed.');
          continue;
        }
        if (f.size > MAX_BYTES) {
          setError(`"${f.name}" is too large (max 8 MB) — skipped.`);
          continue;
        }
        accepted.push(f);
      }
      if (accepted.length === 0) return;

      setUploadingCount(accepted.length);
      let next = [...values];
      try {
        // Upload in parallel for speed, but cap at remaining slots
        const results = await Promise.allSettled(
          accepted.map((f) => api.uploads.profileImage(f)),
        );
        for (const r of results) {
          if (r.status === 'fulfilled') {
            next.push(r.value.url);
          } else {
            const reason = r.reason;
            const msg =
              reason instanceof ApiError
                ? reason.message
                : (reason as Error)?.message ?? 'Upload failed';
            setError(msg);
          }
        }
        // Trim to max in case parallel uploads overshot
        next = next.slice(0, max);
        onChange(next);
      } finally {
        setUploadingCount(0);
      }
    },
    [max, onChange, remaining, values],
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= values.length) return;
    const next = [...values];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
    setError(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (slotsFull) return;
    void handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {values.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {values.map((url, i) => (
            <figure
              key={`${url}-${i}`}
              className="relative aspect-[5/3] overflow-hidden rounded-xl border border-black/10 bg-cream-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-2 top-2 inline-flex items-center rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-navy-800 backdrop-blur">
                  Main
                </span>
              )}
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <IconButton
                    label="Move left"
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    ←
                  </IconButton>
                  <IconButton
                    label="Move right"
                    disabled={i === values.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    →
                  </IconButton>
                </div>
                <IconButton
                  label="Remove image"
                  variant="danger"
                  onClick={() => removeAt(i)}
                >
                  ×
                </IconButton>
              </div>
            </figure>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {!slotsFull && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={uploadingCount > 0}
          className={`relative block w-full overflow-hidden rounded-2xl border-2 border-dashed transition ${
            dragging
              ? 'border-brand-orange bg-brand-orange/10'
              : 'border-black/15 bg-cream-100 hover:border-brand-orange/40 hover:bg-brand-orange/5'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          style={{ aspectRatio: values.length > 0 ? '5 / 1.4' : '5 / 2' }}
        >
          <div className="flex h-full w-full flex-col items-center justify-center text-ink-400">
            <UploadIcon className="h-6 w-6" />
            <span className="mt-2 text-xs font-bold uppercase tracking-wider">
              {values.length > 0
                ? `Add more (${remaining} slot${remaining === 1 ? '' : 's'} left)`
                : 'Upload event photos'}
            </span>
            <span className="mt-1 text-[11px] text-ink-300">
              Drop here, or click to browse — up to {max} images
            </span>
          </div>
          {uploadingCount > 0 && <Overlay count={uploadingCount} />}
        </button>
      )}

      {/* Hint + count */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-400">
        <span>
          JPG, PNG, WEBP — max 8 MB each. The first image is shown as the main cover.
        </span>
        <span className="tabular-nums">
          {values.length} / {max}
          {min > 0 && values.length < min && (
            <span className="ml-1 font-bold text-amber-700">(at least {min})</span>
          )}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={(e) => void handleFiles(e.target.files)}
        className="hidden"
      />

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold shadow-soft transition disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === 'danger'
          ? 'bg-black/80 text-white hover:bg-red-600'
          : 'bg-white text-navy-800 hover:bg-cream-100'
      }`}
    >
      {children}
    </button>
  );
}

function Overlay({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
      <div className="rounded-xl bg-navy-800 px-4 py-2 text-xs font-bold text-white">
        Uploading {count} image{count === 1 ? '' : 's'}…
      </div>
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
