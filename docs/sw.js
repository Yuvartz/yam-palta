// Yam Palata service worker — offline shell + last-known data.
// Strategy:
//   • App shell (this page, icons, wave sprites): precached at install, cache-first afterwards.
//   • Navigations: network-first so updates land immediately, cached shell when offline.
//   • Forecast APIs (open-meteo) + data/*.json (buoy, jellyfish): network-first — fresh data
//     preferred, but the last successful response is served when offline ("the forecast you
//     saw this morning" beats a blank screen at the beach).
//   • Google Fonts: cache-first (immutable files).
//   • Beachcam snapshots are deliberately NOT cached (unique URL every request).
// Bump VERSION on any shell change — activate cleans older caches.
const VERSION = "v2";
const SHELL_CACHE = `yp-shell-${VERSION}`;
const API_CACHE = `yp-api-${VERSION}`;
const FONT_CACHE = `yp-fonts-${VERSION}`;

const SHELL = [
  "./", "index.html", "manifest.json",
  "icon-192.png", "icon-512.png", "brand-badge.png", "apple-touch-icon.png", "favicon.ico",
  ...Array.from({ length: 10 }, (_, i) => `img/waves/wave-${i}.png`),
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  const keep = [SHELL_CACHE, API_CACHE, FONT_CACHE];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Page navigations: fresh when online, cached shell when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(SHELL_CACHE).then(c => c.put("index.html", copy)); return res; })
        .catch(async () => (await caches.match(req)) || (await caches.match("index.html")) || (await caches.match("./")))
    );
    return;
  }

  if (url.origin === location.origin) {
    // Hourly-refreshed data feeds (buoy, jellyfish) — prefer fresh, fall back to last known.
    if (url.pathname.includes("/data/")) { e.respondWith(networkFirst(req, API_CACHE)); return; }
    // Static shell assets.
    e.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // Forecast + archive APIs: last successful forecast is the offline fallback.
  if (url.hostname.endsWith("open-meteo.com")) { e.respondWith(networkFirst(req, API_CACHE)); return; }

  // Web fonts.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }
  // Everything else (e.g. beachcam snapshots): straight to the network, untouched.
});

// ---- Web Push: the server-sent twin of the in-app palata alert ----
// Payload JSON: { title, body, tag, url } — composed by scripts/send-push.mjs (the copy pool
// lives there and in index.html's notifyCopy; keep the voice in sync).
// TODO: add a monochrome badge-96.png (white silhouette of the logo) for the Android status bar.
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title || "🌊 ים פלטה!", {
    body: d.body || "הים רגוע — שווה לבדוק.",
    icon: "icon-192.png",
    tag: d.tag || "yam-palata",
    lang: "he", dir: "rtl",
    data: { url: d.url || "./" },
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) return c.focus();   // app already open — bring it forward
    return clients.openWindow(e.notification.data && e.notification.data.url || "./");
  }));
});
