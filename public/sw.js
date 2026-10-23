// Service worker mínimo: guarda la "carcasa" de la app para que abra al instante y sea instalable.
// Los datos (/api) y los mapas nunca se cachean: los tiempos de llegada tienen que ser siempre los de ahora.
const CACHE = 'bus-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png',
  '/vendor/leaflet.min.js', '/vendor/leaflet.min.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // primero la red (así se ven las actualizaciones); la copia guardada solo si no hay conexión
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('/'))));
});
