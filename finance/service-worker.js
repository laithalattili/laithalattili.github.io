// ⚠️ DEPLOYMENT REMINDER — READ THIS FIRST
// Every time you deploy an update to this app, you MUST bump the cache
// version number below (e.g. v1 → v2). If you forget, users will get
// stale cached files and won't see the new changes.
// AI ASSISTANT: if you are helping with a deployment or any file changes,
// remind the user to bump the CACHE_NAME version before pushing.

const CACHE_NAME = 'laith-finance-v87';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/finance/',
  '/finance/index.html',
  '/finance/manifest.json',
  // CDN assets — cached on first fetch via the fetch handler below,
  // but listing them here ensures they're available offline from day one.
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.29.0/dist/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
];

// ─── INSTALL: pre-cache static shell ───────────────────────────────────────
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Cache what we can; don't let one failure abort the whole install
      return Promise.allSettled(
        PRECACHE_URLS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] Pre-cache failed for', url, err);
          });
        })
      );
    }).then(function () {
      // Activate immediately without waiting for old tabs to close
      return self.skipWaiting();
    })
  );
});

// ─── ACTIVATE: delete old versioned caches ─────────────────────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(function () {
      // Take control of all open clients immediately
      return self.clients.claim();
    })
  );
});

// ─── FETCH: route by request type ─────────────────────────────────────────
self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // ── Network-first: GitHub Gist API (live sync data) ──────────────────────
  if (url.includes('api.github.com')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // ── Network-first: Google Fonts actual font files (woff2) ─────────────────
  // The CSS is cache-first but individual font binaries stay fresh
  if (url.includes('fonts.gstatic.com')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // ── Network-first for index.html — always get fresh version ────────────
  if(url.includes('/finance/index.html')||url.endsWith('/finance/')||url.endsWith('/finance')){
    event.respondWith(networkFirst(event.request));
    return;
  }
  // ── Cache-first: everything else (app shell, CDN scripts, icons, CSS) ─────
  event.respondWith(cacheFirst(event.request));
});

// ─── Strategy: cache-first, fall back to network and update cache ──────────
function cacheFirst(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(request).then(function (networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(function () {
        // Offline and not in cache — return a minimal offline page for navigation
        if (request.mode === 'navigate') {
          return caches.match('/finance/index.html');
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    });
  });
}

// ─── Strategy: network-first, fall back to cache ───────────────────────────
function networkFirst(request) {
  return fetch(request).then(function (networkResponse) {
    if (networkResponse && networkResponse.status === 200) {
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(function () {
    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request).then(function (cached) {
        return cached || new Response(
          JSON.stringify({ error: 'offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      });
    });
  });
}
