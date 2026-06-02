// ⚠️ DEPLOYMENT REMINDER — READ THIS FIRST
// Every time you deploy an update to this app, you MUST bump the cache
// version number below (e.g. v1 → v2). If you forget, users will get
// stale cached files and won't see the new changes.
// AI ASSISTANT: if you are helping with a deployment or any file changes,
// remind the user to bump the CACHE_NAME version before pushing.

const CACHE_NAME = 'life-manager-v2';

const STATIC_ASSETS = [
  '/life/',
  '/life/index.html',
  '/life/style.css',
  '/life/app.js',
  '/life/config.js',
  '/life/supabase.js',
  '/life/scheduler.js',
  '/life/manifest.json',
  '/life/pages/reading.js',
  '/life/pages/year.js',
  '/life/pages/library.js',
  '/life/pages/add-book.js',
  '/life/pages/notes.js',
  '/life/pages/settings.js',
  '/life/pages/stats.js',
  '/life/pages/today.js',
  '/life/pages/week.js',
  '/life/pages/book-schedule.js',
  // Google Fonts — cached so app looks right offline too
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap',
];

// ── Install: cache all static assets ────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Add same-origin assets strictly; fonts best-effort
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')))
        .then(() => {
          // Fonts: try to cache but don't block install if they fail
          return Promise.allSettled(
            STATIC_ASSETS.filter(url => url.startsWith('http'))
              .map(url => cache.add(url))
          );
        });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for static, network-first for Supabase ───────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for Supabase API calls — always try live data first
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for navigation requests — keeps the app fresh when online
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with fresh copy
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/life/index.html'))
    );
    return;
  }

  // Cache-first for all other static assets (JS, CSS, fonts, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
