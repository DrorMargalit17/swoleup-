import { build } from 'esbuild';
import { fileURLToPath } from 'url';
const ROOT = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs';
const D = ROOT + '/docs';
mkdirSync(D, { recursive: true });
await build({
    entryPoints: [ROOT + '/src/main.tsx'],
    bundle: true, format: 'esm', jsx: 'automatic', minify: true,
    outfile: D + '/app.js',
    loader: { '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl', '.mjs': 'js', '.woff2': 'dataurl', '.woff': 'dataurl', '.ttf': 'dataurl' },
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'error',
});
copyFileSync(ROOT + '/src/photos/app-icon-192.png', D + '/icon-192.png');
copyFileSync(ROOT + '/src/photos/app-icon-512.png', D + '/icon-512.png');
copyFileSync(ROOT + '/src/photos/app-icon-180.png', D + '/icon-180.png');
writeFileSync(D + '/index.html', `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com https://swoleup-push.swoleup-dror17.workers.dev; worker-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>SwoleUp</title>
<meta name="swoleup-version" content="2026-11-11.14">
<meta name="description" content="SwoleUp - אימונים, תזונה ומעקב">
<meta property="og:title" content="SwoleUp">
<meta property="og:description" content="אימונים, תזונה ומעקב במקום אחד">
<meta property="og:type" content="website">
<meta name="theme-color" content="#0e1018">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="./icon-192.png">
<link rel="apple-touch-icon" href="./icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SwoleUp">
<link rel="stylesheet" href="./app.css">
</head>
<body>
<div id="root"></div>
<script type="module" src="./app.js"></script>

</body>
</html>
`);
writeFileSync(D + '/manifest.webmanifest', JSON.stringify({
  name: 'SwoleUp',
  short_name: 'SwoleUp',
  description: 'SwoleUp - אימונים, תזונה ומעקב',
  lang: 'he',
  dir: 'rtl',
  display: 'standalone',
  orientation: 'portrait',
  start_url: './',
  scope: './',
  theme_color: '#0e1018',
  background_color: '#0e1018',
  icons: [
    { src: './icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: './icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
  ]
}, null, 2));
writeFileSync(D + '/sw.js', `const CACHE = 'swoleup-v14';
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
`);
// Push handlers are appended without changing offline caching behavior.
writeFileSync(D + '/sw.js', readFileSync(D + '/sw.js','utf8')+"\nself.addEventListener('push', e => {\n  let data={};try{data=e.data?.json()||{}}catch{}\n  const title=typeof data.title==='string'?data.title.slice(0,80):'SwoleUp';\n  const body=typeof data.body==='string'?data.body.slice(0,240):'\u05e2\u05d3\u05db\u05d5\u05df \u05d7\u05d3\u05e9 \u05de-SwoleUp';\n  // iOS requires every push to be user-visible, even if the app is open.\n  e.waitUntil(self.registration.showNotification(title,{body,tag:typeof data.tag==='string'?data.tag:'swoleup',icon:'./icon-192.png',badge:'./icon-192.png',dir:'rtl',lang:'he'}));\n});\nself.addEventListener('notificationclick',e=>{\n e.notification.close();const url=new URL('./',self.location.href).href;\n e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const found=windows.find(w=>w.url.startsWith(url));if(found)return found.focus();return clients.openWindow(url)}));\n});\n");
writeFileSync(D + '/.nojekyll', '');
console.log('Built docs/');
