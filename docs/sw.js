const CACHE = 'swoleup-v6';
const ASSETS = ['./', './index.html', './app.js', './app.css', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map(p => new Request(p, {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('swoleup-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || !ASSETS.some(p => new URL(p, self.location.href).pathname === url.pathname) || url.search) return;
  e.respondWith(fetch(e.request, {cache:'no-cache'}).then((res) => {
    if (res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, clone)); }
    return res;
  }).catch(() => caches.match(e.request)));
});
