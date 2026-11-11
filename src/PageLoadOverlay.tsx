import React, { useLayoutEffect, useRef, useState } from 'react';
import logo from './photos/app-icon-180.png';

// Reports readiness of the currently visible screen's images and fonts.
// It does not invent network percentages or wait for offscreen lazy images.
// Per request: the overlay only appears when loading actually takes long
// enough to matter (images not yet visible after a grace delay); once shown
// it stays at least ~1s so it never flickers; fast loads skip it entirely.
const GRACE_MS = 350;   // don't show if content is ready within this window
const MIN_SHOW_MS = 1000; // once visible, stay at least this long
const STALL_MS = 12000; // escape hatch when an image hangs

export function PageLoadOverlay({ route }: { route: string }) {
    const host = useRef<HTMLDivElement>(null);
    const [load, setLoad] = useState({ visible: false, value: 0, stalled: false });
    useLayoutEffect(() => {
        const app = host.current?.closest('.app');
        const content = app?.querySelector('.content');
        if (!content) return;
        let generation = 0, lastTitle = '', timer = 0, slowTimer = 0, graceTimer = 0;
        const cleanups: (() => void)[] = [];
        // Hide the screen while its images load: the user must never see a
        // half-built page first and the loader afterwards. Fast loads reveal
        // the page directly with no overlay; slow loads reveal it only when
        // the overlay hides.
        const reveal = () => { content.style.visibility = ''; };
        const begin = () => {
            const token = ++generation;
            cleanups.splice(0).forEach(fn => fn());
            window.clearTimeout(timer); window.clearTimeout(slowTimer); window.clearTimeout(graceTimer);
            setLoad({ visible: false, value: 0, stalled: false });
            content.style.visibility = 'hidden';
            let shownAt = 0;
            let doneAll = false;
            requestAnimationFrame(() => {
                if (token !== generation) return;
                const box = content.getBoundingClientRect();
                const images = [...content.querySelectorAll('img')].filter(img => {
                    const r = img.getBoundingClientRect();
                    return r.width > 0 && (r.height > 0 || !img.complete) && r.bottom >= box.top && r.top < box.bottom;
                });
                let done = 0;
                const total = images.length + 1;
                const finish = () => {
                    if (doneAll) return;
                    doneAll = true;
                    window.clearTimeout(slowTimer); window.clearTimeout(graceTimer);
                    if (!shownAt) { reveal(); return; } // fast load: reveal directly, no overlay flash
                    const elapsed = Date.now() - shownAt;
                    timer = window.setTimeout(() => { if (token !== generation) return; reveal(); setLoad({ visible: false, value: 100, stalled: false }); }, Math.max(120, MIN_SHOW_MS - elapsed));
                };
                const advance = () => {
                    if (token !== generation || doneAll) return;
                    done++;
                    if (shownAt) setLoad({ visible: true, value: Math.round(done * 100 / total), stalled: false });
                    if (done >= total) finish();
                };
                // Grace window: only reveal the overlay if images/fonts are still missing.
                graceTimer = window.setTimeout(() => {
                    if (token !== generation || doneAll) return;
                    shownAt = Date.now();
                    setLoad({ visible: true, value: Math.round(done * 100 / total), stalled: false });
                }, GRACE_MS);
                slowTimer = window.setTimeout(() => {
                    if (token !== generation || doneAll) return;
                    if (!shownAt) shownAt = Date.now();
                    setLoad(v => ({ ...v, visible: true, stalled: true }));
                }, STALL_MS);
                images.forEach(img => {
                    if (img.complete) { advance(); return; }
                    const settled = () => { img.removeEventListener('load', settled); img.removeEventListener('error', settled); advance(); };
                    img.addEventListener('load', settled); img.addEventListener('error', settled);
                    cleanups.push(() => { img.removeEventListener('load', settled); img.removeEventListener('error', settled); });
                });
                Promise.resolve(document.fonts?.ready).then(advance, advance);
            });
        };
        const titleOf = () => [...content.querySelectorAll('h1')].filter(h => h.getBoundingClientRect().width > 0).map(h => h.textContent).join('|');
        lastTitle = titleOf(); begin();
        const observer = new MutationObserver(() => {
            const title = titleOf();
            if (title !== lastTitle) { lastTitle = title; begin(); }
        });
        observer.observe(content, { childList: true, subtree: true });
        return () => { generation++; observer.disconnect(); window.clearTimeout(timer); window.clearTimeout(slowTimer); window.clearTimeout(graceTimer); cleanups.splice(0).forEach(fn => fn()); content.style.visibility = ''; };
    }, [route]);
    return <div ref={host}>
        {load.visible && <div role="status" aria-label="טעינת העמוד" style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 }}>
            <img src={logo} alt="SwoleUp" width={76} height={76} style={{ borderRadius: 22 }} />
            <strong className="text-ink">SwoleUp</strong>
            <div role="progressbar" aria-valuenow={load.value} aria-valuemin={0} aria-valuemax={100} aria-label="התקדמות טעינה" style={{ width: 'min(240px,80%)', height: 6, borderRadius: 10, overflow: 'hidden', background: 'var(--card2)' }}>
                <div style={{ height: '100%', width: `${load.value}%`, background: 'var(--lime)', transition: 'width .15s linear' }} />
            </div>
            <span className="text-[13px] text-muted">{load.stalled ? 'הטעינה מתעכבת בחיבור הנוכחי' : 'טוען את העמוד…'}</span>
            {load.stalled && <button className="text-acc" onClick={() => { const c = host.current?.closest('.app')?.querySelector('.content') as HTMLElement | null; if (c) c.style.visibility = ''; setLoad(v => ({ ...v, visible: false })); }}>המשך בלי להמתין לתמונות</button>}
        </div>}
    </div>;
}
