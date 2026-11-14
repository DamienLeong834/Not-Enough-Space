/* ============================================================
   Not Enough Space — offline service worker

   Strategy
   - HTML / JS / CSS / JSON : network first (they are tiny), so an
     update always lands on the very next load. Cache is the offline
     fallback.
   - Fonts, icons, comic art: cache first (they never change), with a
     background refresh.
   - The precache is written with cache:"reload" so we never store a
     stale copy from the browser's HTTP cache.
   - When a new worker takes over, the page reloads once so the user is
     never left looking at an old build.
   ============================================================ */
const CACHE = "nes-v3";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/i18n.js",
  "./js/ui.js",
  "./js/data.js",
  "./js/nssdc-data.js",
  "./js/nssdc.js",
  "./js/state.js",
  "./js/tts.js",
  "./js/sfx.js",
  "./js/bg.js",
  "./js/game.js",
  "./js/app.js",
  "./fonts/fredoka-latin.woff2",
  "./fonts/fredoka-latin-ext.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
];

// Files that must always be fresh when the network is available.
const NETWORK_FIRST = [/\.html?$/i, /\.js$/i, /\.css$/i, /\.webmanifest$/i, /\.json$/i];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // cache:"reload" bypasses the HTTP cache so we never store a stale copy
      await Promise.all(
        CORE.map(async (url) => {
          try {
            const res = await fetch(new Request(url, { cache: "reload" }));
            if (res && res.ok) await cache.put(url, res);
          } catch (e) {
            /* offline during install — the runtime cache will fill in later */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isNetworkFirst(url) {
  return NETWORK_FIRST.some((re) => re.test(url.pathname));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  // ---- network first: code and documents ----
  if (req.mode === "navigate" || isNetworkFirst(url)) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            const cache = await caches.open(CACHE);
            cache.put(req, copy);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (req.mode === "navigate") {
            const shell = await caches.match("./index.html");
            if (shell) return shell;
          }
          return new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })()
    );
    return;
  }

  // ---- cache first: fonts, icons, comic art ----
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const network = fetch(req)
        .then(async (res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            const cache = await caches.open(CACHE);
            cache.put(req, copy);
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});
