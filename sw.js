// BidLedger offline support.
// Network first, so updates show up as soon as you're online; if there's
// no connection (or it's too slow), the last saved copy is used instead.
const CACHE = "bidledger-v2";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];
const TAILWIND = "https://cdn.tailwindcss.com";
const NETWORK_TIMEOUT = 4000; // ms before falling back to the saved copy

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(CORE);
      // Styling comes from the Tailwind CDN; save it too so the app looks
      // right offline. Ignore failures so install still succeeds.
      try {
        await cache.add(new Request(TAILWIND, { mode: "no-cors" }));
      } catch (_) {}
    }),
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
  const sameOrigin = url.origin === self.location.origin;
  const isTailwind = url.origin === new URL(TAILWIND).origin;
  if (!sameOrigin && !isTailwind) return;

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const network = fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
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
