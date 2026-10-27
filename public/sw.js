// Lumina does not use a service worker (#150).
//
// The booking page used to register an offline worker scoped to the whole
// site, which kept a copy of every page it loaded, signed-in pages included.
// Browsers that installed it check this file for an update on their next
// visit. This replacement deletes every cache the old worker made,
// unregisters itself, and reloads open tabs so the network serves them again.
// It must never cache anything or answer a fetch.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      windows.forEach(client => client.navigate(client.url));
    })()
  );
});
