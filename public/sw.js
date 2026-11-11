// Offline support: keeps a copy of the app itself (never any patient data, never /api) so it opens with no signal.
// Network first with a short timeout, so updates arrive whenever you're online.
const CACHE = "rounds-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-180.png", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  const nav = e.request.mode === "navigate";
  const key = nav ? "/" : u.pathname;
  if (!nav && !SHELL.includes(key)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    try {
      const r = await fetch(key, { signal: ctrl.signal, cache: "no-cache" });
      clearTimeout(timer);
      if (r.ok) cache.put(key, r.clone());
      return r;
    } catch (err) {
      clearTimeout(timer);
      const hit = await cache.match(key);
      if (hit) return hit;
      throw err;
    }
  })());
});
