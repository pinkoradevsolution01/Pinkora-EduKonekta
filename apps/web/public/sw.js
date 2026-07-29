const CACHE_NAME = 'pinkora-edukonekta-shell-v3';

const offlineResponse = () =>
  new Response('The application is temporarily offline. Please reconnect and refresh.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add('/'))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

  // Application routes and Next.js bundles must prefer the latest deployed version.
  if (event.request.mode === 'navigate' || event.request.url.includes('/_next/')) {
    event.respondWith(
      fetch(event.request).catch(
        async () => (await caches.match(event.request)) ?? offlineResponse(),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request)) ?? offlineResponse()),
  );
});
