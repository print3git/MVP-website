const CACHE_NAME = 'model-cache-v1';
const ASSETS = [
  'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  'https://modelviewer.dev/shared-assets/environments/neutral.hdr',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event) => {
  if (ASSETS.some((url) => event.request.url.startsWith(url))) {
    event.respondWith(
      caches.match(event.request).then((resp) => {
        return (
          resp ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
        );
      })
    );
  }
});
