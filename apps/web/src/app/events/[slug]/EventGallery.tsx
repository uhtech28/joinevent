'use client';

// EventGallery — hero image + thumbnail strip for the event detail page.
//
// Behaviour:
//   - 0 images: nothing renders.
//   - 1 image:  just the hero (no thumbs, no arrows).
//   - 2+ images: hero with left/right arrow buttons, a small "i / N" pill,
//                and a clickable thumbnail strip below.
//
// Keyboard: ← / → cycle the hero when the gallery is focused.

import { useCallback, useEffect, useRef, useState } from 'react';

export function EventGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [idx, setIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const count = images.length;
  const safeIdx = count > 0 ? Math.min(idx, count - 1) : 0;
  const current = images[safeIdx];

  const next = useCallback(() => {
    setIdx((i) => (count === 0 ? 0 : (i + 1) % count));
  }, [count]);

  const prev = useCallback(() => {
    setIdx((i) => (count === 0 ? 0 : (i - 1 + count) % count));
  }, [count]);

  // Keyboard navigation when the gallery (or any child) has focus.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [next, prev]);

  if (count === 0) return null;

  const showControls = count > 1;

  return (
    <div ref={rootRef} className="mb-6" tabIndex={-1}>
      {/* Hero — fixed 16:9 aspect ratio with object-contain so the whole image
          is visible (no heads getting cropped). A dark navy backdrop fills the
          letterbox bands when an image isn't exactly 16:9. */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-navy-900 shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current /* force fade on src change */}
          src={current}
          alt={alt}
          className="h-full w-full object-contain transition-opacity duration-200"
        />

        {showControls && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>

            <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              {safeIdx + 1} / {count}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {showControls && (
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Event images"
        >
          {images.map((src, i) => {
            const active = i === safeIdx;
            return (
              <button
                key={`${src}-${i}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Show image ${i + 1}`}
                onClick={() => setIdx(i)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition sm:h-20 sm:w-28 ${
                  active
                    ? 'ring-brand-purple shadow-purple'
                    : 'ring-transparent opacity-70 hover:opacity-100 hover:ring-black/10'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Icons
// ============================================================
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
