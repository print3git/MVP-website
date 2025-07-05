const CACHE_NAME = "model-cache-v2";
const ASSETS = [
  "models/bag.glb",
  "https://modelviewer.dev/shared-assets/environments/neutral.hdr",
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js",
  "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer-legacy.js",
  "js/printclub.js",
  "js/rewardBadge.js",
  "js/basket.js",
  "js/trackingPixel.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (ASSETS.some((url) => event.request.url.includes(url))) {
    event.respondWith(
      caches.match(event.request).then((resp) => {
        return (
          resp ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
            return response;
          })
        );
      }),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "prefetch-models") {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          Promise.all(
            ASSETS.map((url) =>
              fetch(url).then((resp) => cache.put(url, resp.clone())),
            ),
          ),
        ),
    );
  }
});
