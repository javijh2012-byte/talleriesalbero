// Service worker mínimo: permite instalar la app y abrirla aunque no haya conexión.
// Los datos (listas, socios, horarios...) siguen viniendo de Firebase.
const CACHE = 'albero-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  // Primero red (así siempre ves la última versión); si no hay conexión, la copia guardada.
  e.respondWith(fetch(r).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(r, copy));
    return res;
  }).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
});
