const CACHE_NAME = "model-cache-v4";
// Cache only same-origin assets. Remote resources can fail to load when served
// from the service worker cache, breaking the 3D viewer.
const ASSETS = [
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
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)),
        ),
      )
      .then(() => self.clients.claim()),
  );
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
