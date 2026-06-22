// SELF-DESTRUCT SERVICE WORKER
// Unregisters itself, deletes all caches, and reloads every open client.
// Once the old SW is gone, dev edits hot-reload normally.
// (In production, this file will be re-populated with the real PWA SW.)

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete every cache the previous SW created.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // Unregister this SW.
      await self.registration.unregister();

      // Force every open tab to reload — they'll come back uncontrolled.
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});
