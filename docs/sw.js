const CACHE = 'swoleup-v13';
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

self.addEventListener('push', e => {
  let data={};try{data=e.data?.json()||{}}catch{}
  const title=typeof data.title==='string'?data.title.slice(0,80):'SwoleUp';
  const body=typeof data.body==='string'?data.body.slice(0,240):'עדכון חדש מ-SwoleUp';
  // iOS requires every push to be user-visible, even if the app is open.
  e.waitUntil(self.registration.showNotification(title,{body,tag:typeof data.tag==='string'?data.tag:'swoleup',icon:'./icon-192.png',badge:'./icon-192.png',dir:'rtl',lang:'he'}));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();const url=new URL('./',self.location.href).href;
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const found=windows.find(w=>w.url.startsWith(url));if(found)return found.focus();return clients.openWindow(url)}));
});
