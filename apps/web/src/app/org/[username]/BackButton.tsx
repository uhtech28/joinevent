'use client';

// BackButton — smart back navigation for the public org profile.
//
// Behaviour:
//   1. If the user landed here from somewhere on the same origin
//      (e.g. /dashboard/explore, /dashboard/feed, /events/<slug>), call
//      router.back() so they return to exactly where they came from with
//      scroll position preserved.
//   2. If they landed here directly (referrer is empty or external), route
//      to the most likely entry point — /dashboard/explore for signed-in
//      visitors. The dashboard layout will redirect anonymous visitors to
//      /login on its own.

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  function goBack() {
    if (typeof window === 'undefined') return;
    const sameOrigin =
      document.referrer && document.referrer.startsWith(window.location.origin);
    if (sameOrigin && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/explore');
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
    >
      ← Back
    </button>
  );
}
