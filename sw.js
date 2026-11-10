// BidLedger offline support.
// Network first, so updates show up as soon as you're online; if there's
// no connection (or it's too slow), the last saved copy is used instead.
const CACHE = "bidledger-v3";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./styles.css",
];
const NETWORK_TIMEOUT = 4000; // ms before falling back to the saved copy

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Everything the app needs is on the same site; nothing else is loaded
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const network = fetch(req).then((res) => {
        if (res && res.ok) {
          cache.put(req, res.clone());
        }
        return res;
      });

      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT),
        );
        return await Promise.race([network, timeout]);
      } catch (_) {
        const cached =
          (await cache.match(req, { ignoreSearch: true })) ||
          (req.mode === "navigate" && (await cache.match("./index.html")));
        if (cached) return cached;
        return network; // nothing saved; let the request finish or fail
      }
    })(),
  );
});
