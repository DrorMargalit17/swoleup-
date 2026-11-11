import React from 'react';
import { createRoot } from 'react-dom/client';
import { FileRouter } from './localState';
import './tw.css';
import { App } from './App';
import icon180 from './photos/app-icon-180.png';
import icon192 from './photos/app-icon-192.png';
import icon512 from './photos/app-icon-512.png';

// PWA head injection: the hosted shell is platform-generated, so we install
// title/icons/standalone metas at runtime. Harmless inside the viewer iframe;
// makes SwoleUp installable in any direct-content context.
function setMeta(name: string, content: string) {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
    el.setAttribute('content', content);
}
function addLink(rel: string, href: string) {
    if (document.head.querySelector(`link[rel="${rel}"]`)) return;
    const el = document.createElement('link'); el.rel = rel; el.href = href; document.head.appendChild(el);
}
(function installPwaHead() {
    document.title = 'SwoleUp';
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('apple-mobile-web-app-title', 'SwoleUp');
    setMeta('application-name', 'SwoleUp');
    setMeta('theme-color', '#0E1018');
    addLink('apple-touch-icon', icon180);
    const manifest = {
        name: 'SwoleUp',
        short_name: 'SwoleUp',
        display: 'standalone',
        background_color: '#0E1018',
        theme_color: '#0E1018',
        icons: [
            { src: icon192, sizes: '192x192', type: 'image/png' },
            { src: icon512, sizes: '512x512', type: 'image/png' },
        ],
    };
    addLink('manifest', 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest)));
})();

createRoot(document.getElementById('root')!).render(<FileRouter><App /></FileRouter>);
