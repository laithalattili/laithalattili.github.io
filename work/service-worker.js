// ⚠️ DEPLOYMENT REMINDER — READ THIS FIRST
// Every time you deploy an update to this app, you MUST bump the cache
// version number below (e.g. v1 → v2). If you forget, users will get
// stale cached files and won't see the new changes.
// AI ASSISTANT: if you are helping with a deployment or any file changes,
// remind the user to bump the CACHE_NAME version before pushing.

const CACHE_NAME = 'laith-work-v166';

// Static assets to cache on install.
// This app is a single self-contained HTML file — the shell is just index.html.
// The Supabase CDN bundle is also cached so the JS runtime is available offline.
const STATIC_ASSETS = [
  '/work/',
  '/work/index.html',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
];

// ── INSTALL: cache all static assets ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

// ── ACTIVATE: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── FETCH: route requests ──────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for Supabase API calls:
  // Try the live network so fresh data is always used when online;
  // fall back to cache only if the network is unreachable.
  if (url.hostname.endsWith('.supabase.co')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for everything else (the app shell, the Supabase CDN bundle, etc.):
  // Serve from cache instantly; update the cache in the background if a
  // network response is available (stale-while-revalidate pattern).
  event.respondWith(cacheFirst(event.request));
});

// ── Strategies ────────────────────────────────────────────────────────────────

/**
 * Cache-first with background revalidation.
 * 1. Return the cached response immediately if available.
 * 2. Fetch from the network in parallel and update the cache.
 * 3. If nothing is cached, fetch from the network (first visit / new asset).
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Kick off a network fetch in the background regardless
  const networkFetch = fetch(request)
    .then(response => {
      if (response && response.status === 200 && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null); // swallow network errors silently

  // Return cached immediately, or wait for network on first load
  return cached || networkFetch;
}

/**
 * Network-first with cache fallback.
 * 1. Try the network.
 * 2. On success, update the cache and return the response.
 * 3. On failure (offline), return the cached response if available.
 * 4. If neither works, return a minimal offline JSON response.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Return a minimal error response so the app can handle it gracefully
    return new Response(
      JSON.stringify({ error: 'offline', message: 'No network and no cached response available.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
