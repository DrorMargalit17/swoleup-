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
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>SwoleUp</title>
<meta name="description" content="המאמן האישי של דרור - אימונים, תזונה ומעקב">
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
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
</script>
</body>
</html>
`);
writeFileSync(D + '/manifest.webmanifest', JSON.stringify({
  name: 'SwoleUp',
  short_name: 'SwoleUp',
  description: 'המאמן האישי של דרור - אימונים, תזונה ומעקב',
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
writeFileSync(D + '/sw.js', `const CACHE = 'swoleup-v1';
const ASSETS = ['./', './index.html', './app.js', './app.css', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, clone)); }
    return res;
  }).catch(() => caches.match(e.request)));
});
`);
writeFileSync(D + '/.nojekyll', '');
console.log('Built docs/');
