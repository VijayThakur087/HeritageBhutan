/* Heritage Bhutan ERP - offline service worker.
   Bump VERSION whenever you upload a new index.html so phones/computers pick it up. */
const VERSION = 'hb-erp-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const OPTIONAL = ['./supabase.js', './sync.js'];   /* cached only if they exist */

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    await Promise.all(OPTIONAL.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   /* never touch Supabase / other sites */
  if (req.mode === 'navigate') {                                        /* app shell: network first, cache fallback */
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return r;
  })));
});
