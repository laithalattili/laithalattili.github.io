// LA Omni service worker — NETWORK-FIRST so deployments always show immediately.
// Bump CACHE_V on any deploy where you want old caches purged (optional; network-first
// means stale pages can't happen anyway — cache is only an offline fallback).
const CACHE_V = 'omni-v8';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // ONLY cache same-origin GETs. Never touch Supabase/CDN calls or POSTs
  // (the old sw crashed on Cache.put with POST requests).
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_V).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // offline fallback only
  );
});
