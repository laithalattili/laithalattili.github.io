// Hawking Boarding Mini-App — Service Worker v4
const CACHE = 'hawking-boarding-v25';
const ASSETS = ['./', './index.html'];
// Self-hosted Supabase library: cached best-effort so a missing file can never break install
const OPTIONAL = ['./supabase.min.js'];
// Icons cached separately — missing icons won't break install

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })));
      await Promise.allSettled(OPTIONAL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co') || e.request.url.includes('cdn.jsdelivr')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status:503})));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
