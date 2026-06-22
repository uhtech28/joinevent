'use client';

// Registers /sw.js in production. In dev we ACTIVELY UNREGISTER any existing
// SW + nuke its caches — otherwise stale HTML/JS gets served forever and
// every edit looks like it "didn't take".

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // Tear down any previously-installed SW + caches so dev edits show up.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ignore */
    });
  }, []);
  return null;
}
