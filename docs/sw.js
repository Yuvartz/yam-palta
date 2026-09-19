// Yam Palata service worker — offline shell + last-known data.
// Strategy:
//   • App shell (this page, icons, wave sprites): precached at install, cache-first afterwards.
//     Essentials (page, palata.js, manifest) MUST land or the install fails; images are best-effort.
//   • Navigations: network-first so updates land immediately, cached shell when offline or on a
//     server error.
//   • Forecast APIs (open-meteo) + data/*.json (buoy, jellyfish): network-first — fresh data
//     preferred, but the last successful response is served when offline ("the forecast you
//     saw this morning" beats a blank screen at the beach). A cached fallback is STAMPED with
//     X-YP-Cache: stale + X-YP-Fetched-At so the page can say so instead of claiming "updated now".
//   • Google Fonts: cache-first (immutable files).
// Bump VERSION on any shell change — activate cleans older yp-* caches (only ours: Cache Storage
// is shared by every project on this GitHub Pages origin).
const VERSION = "v6";
const PREFIX = "yp-";
const SHELL_CACHE = `${PREFIX}shell-${VERSION}`;
const API_CACHE = `${PREFIX}api-${VERSION}`;
const FONT_CACHE = `${PREFIX}fonts-${VERSION}`;
const API_CACHE_MAX = 60;   // the hourly ?v= cache-busters would otherwise grow this forever

const SHELL_ESSENTIAL = ["./", "manifest.json", "palata.js"];
const SHELL_OPTIONAL = [
  "icon-192.png", "icon-512.png", "icon-192-maskable.png", "icon-512-maskable.png",
  "brand-badge.png", "apple-touch-icon.png", "favicon.ico", "badge-96.png",
  ...Array.from({ length: 10 }, (_, i) => `img/waves/wave-${i}.png`),
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_ESSENTIAL).then(() => Promise.allSettled(SHELL_OPTIONAL.map(u => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  const keep = [SHELL_CACHE, API_CACHE, FONT_CACHE];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}

// data/*.json carries an hourly ?v= buster; cache under the bare path so an older snapshot still
// matches when offline in a later hour.
function cacheKeyFor(req) {
  const u = new URL(req.url);
  if (u.origin === location.origin && u.pathname.includes("/data/")) { u.search = ""; return u.toString(); }
  return req;
}

function stamped(res, headers) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
async function staleFrom(cache, key) {
  const hit = await cache.match(key);
  if (!hit) return null;
  return stamped(hit, { "X-YP-Cache": "stale" });
}

async function networkFirst(e, req, cacheName, max) {
  const cache = await caches.open(cacheName), key = cacheKeyFor(req);
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const copy = stamped(res.clone(), { "X-YP-Fetched-At": new Date().toISOString() });
      // Keep the worker alive until the write + trim land (mobile kills it right after responding).
      e.waitUntil(cache.put(key, copy).then(() => max ? trimCache(cache, max) : null).catch(() => {}));
      return res;
    }
    // A 429/500 from the API is as useless as no network — the last good forecast beats it.
    return (await staleFrom(cache, key)) || res;
  } catch (err) {
    const hit = await staleFrom(cache, key);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;   // ignore chrome-extension:// etc.
  const url = new URL(req.url);

  // Page navigations: fresh when online, cached shell when offline or when the host answers with
  // an error page. Only a 2xx page may overwrite the stored shell.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const copy = res.clone();
          e.waitUntil(caches.open(SHELL_CACHE).then(c => c.put("./", copy)));
          return res;
        }
        return (await caches.match(req)) || (await caches.match("./")) || res;
      } catch (err) {
        const hit = (await caches.match(req)) || (await caches.match("./"));
        if (hit) return hit;
        throw err;
      }
    })());
    return;
  }

  if (url.origin === location.origin) {
    // Hourly-refreshed data feeds (buoy, jellyfish) — prefer fresh, fall back to last known.
    if (url.pathname.includes("/data/")) { e.respondWith(networkFirst(e, req, API_CACHE, API_CACHE_MAX)); return; }
    // Static shell assets.
    e.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // Forecast + archive APIs: last successful forecast is the offline fallback.
  if (url.hostname.endsWith("open-meteo.com")) { e.respondWith(networkFirst(e, req, API_CACHE, API_CACHE_MAX)); return; }

  // Web fonts.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }
  // Everything else: straight to the network, untouched.
});

// ---- Web Push: the server-sent twin of the in-app palata alert ----
// Payload JSON: { title, body, tag, url } — composed by scripts/send-push.mjs (the copy pool
// lives in palata.js; keep the voice in sync).
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
  const target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) { if ("navigate" in c && target !== "./") c.navigate(target).catch(() => {}); return c.focus(); }
    return clients.openWindow(target);
  }));
});
