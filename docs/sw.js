// Yam Palata service worker — offline shell + last-known data.
// Strategy:
//   • App shell (this page, icons, wave sprites): precached at install, cache-first afterwards.
//   • Navigations: network-first so updates land immediately, cached shell when offline.
//   • Forecast APIs (open-meteo) + data/*.json (buoy, jellyfish): network-first — fresh data
//     preferred, but the last successful response is served when offline ("the forecast you
//     saw this morning" beats a blank screen at the beach).
//   • Google Fonts: cache-first (immutable files).
// Bump VERSION on any shell change — activate cleans older caches.
const VERSION = "v5";
const SHELL_CACHE = `yp-shell-${VERSION}`;
const API_CACHE = `yp-api-${VERSION}`;
const FONT_CACHE = `yp-fonts-${VERSION}`;
const API_CACHE_MAX = 60;   // the hourly ?v= cache-busters would otherwise grow this forever

const SHELL = [
  "./", "manifest.json", "palata.js",
  "icon-192.png", "icon-512.png", "icon-192-maskable.png", "icon-512-maskable.png",
  "brand-badge.png", "apple-touch-icon.png", "favicon.ico", "badge-96.png",
  ...Array.from({ length: 10 }, (_, i) => `img/waves/wave-${i}.png`),
];

self.addEventListener("install", e => {
  // Per-asset, not addAll: one missing PNG must not silently veto the whole install.
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  const keep = [SHELL_CACHE, API_CACHE, FONT_CACHE];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}

async function networkFirst(req, cacheName, max) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) { cache.put(req, res.clone()); if (max) trimCache(cache, max); }
    else if (res && !res.ok) {
      // A 429/500 from the API is as useless as no network — the last good forecast beats it.
      const hit = await cache.match(req);
      if (hit) return hit;
    }
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
  if (req.method !== "GET" || !req.url.startsWith("http")) return;   // ignore chrome-extension:// etc.
  const url = new URL(req.url);

  // Page navigations: fresh when online, cached shell when offline. Only a 2xx page may
  // overwrite the stored shell — caching a GitHub Pages 404/500 would break offline for good.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            // waitUntil keeps the worker alive until the write lands — on mobile the SW can be
            // killed right after responding, losing the fresh shell mid-put.
            e.waitUntil(caches.open(SHELL_CACHE).then(c => c.put("./", copy)));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("./")))
    );
    return;
  }

  if (url.origin === location.origin) {
    // Hourly-refreshed data feeds (buoy, jellyfish) — prefer fresh, fall back to last known.
    if (url.pathname.includes("/data/")) { e.respondWith(networkFirst(req, API_CACHE, API_CACHE_MAX)); return; }
    // Static shell assets.
    e.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // Forecast + archive APIs: last successful forecast is the offline fallback.
  if (url.hostname.endsWith("open-meteo.com")) { e.respondWith(networkFirst(req, API_CACHE, API_CACHE_MAX)); return; }

  // Web fonts.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }
  // Everything else: straight to the network, untouched.
});

// ---- Web Push: the server-sent twin of the in-app palata alert ----
// Payload JSON: { title, body, tag, url } — composed by scripts/send-push.mjs (the copy pool
// lives there and in index.html's notifyCopy; keep the voice in sync).
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title || "🌊 ים פלטה!", {
    body: d.body || "הים רגוע — שווה לבדוק.",
    icon: "icon-192.png",
    badge: "badge-96.png",
    tag: d.tag || "yam-palata",
    lang: "he", dir: "rtl",
    data: { url: d.url || "./" },
  }));
});

// Browsers occasionally rotate push subscriptions; re-subscribe so the permission stays live.
// The page re-submits the fresh subscription to the sheet on its next open.
self.addEventListener("pushsubscriptionchange", e => {
  const opts = e.oldSubscription && e.oldSubscription.options;
  if (opts && opts.applicationServerKey) {
    e.waitUntil(self.registration.pushManager.subscribe({
      userVisibleOnly: true, applicationServerKey: opts.applicationServerKey,
    }).catch(() => {}));
  }
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) return c.focus();   // app already open — bring it forward
    return clients.openWindow(e.notification.data && e.notification.data.url || "./");
  }));
});
