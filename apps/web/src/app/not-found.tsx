// 404 page.

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-200 text-3xl">
        🔍
      </div>
      <h1 className="mb-3 text-3xl font-extrabold text-ink-700">Page not found</h1>
      <p className="mb-6 text-ink-500">
        The page you were looking for doesn&apos;t exist — or has moved.
      </p>
      <Link href="/" className="btn btn-primary">
        Go home
      </Link>
    </div>
  );
}
