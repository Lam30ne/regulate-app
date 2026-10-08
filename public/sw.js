const CACHE_VERSION = "regulate-v1";
const BASE_PATH = new URL("./", self.location).pathname;

const SHELL_ASSETS = [
  BASE_PATH,
  BASE_PATH + "manifest.json",
  BASE_PATH + "icons/icon-192.png",
  BASE_PATH + "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(BASE_PATH).then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  if (
    url.pathname.startsWith(BASE_PATH) &&
    (url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".ico") ||
      url.pathname.endsWith(".json") ||
      url.pathname.endsWith(".woff2"))
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
