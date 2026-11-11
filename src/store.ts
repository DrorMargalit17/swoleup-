// Device-local persistence through the hosted viewer's useLocalState (the app
// iframe is sandboxed, so raw localStorage/IndexedDB are unavailable).
import { useEffect, useState } from 'react';
import { useLocalState } from './localState';

export interface SavedState { ready: boolean; message?: string }

const KEY_LIMIT = 15000; // chars, stays under the 16 KiB per-value cap

function fit<T>(value: T, trim: (v: T) => T): T {
    let v = value;
    let guard = 0;
    while (JSON.stringify(v).length > KEY_LIMIT && guard++ < 500) v = trim(v);
    return v;
}

// useLocalState is per-component: writes from one screen never reach another.
// This module-level mirror + subscribers make every hook on the same key live.
const mem = new Map<string, unknown>();
const subs = new Map<string, Set<() => void>>();

export function useStore<T>(key: string, fallback: T): [T, (v: T) => void, SavedState] {
    const [v, setV, saved] = useLocalState(key, fallback);
    const [, force] = useState(0);
    useEffect(() => {
        const sub = () => force((x) => x + 1);
        let set = subs.get(key);
        if (!set) { set = new Set(); subs.set(key, set); }
        set.add(sub);
        return () => { set.delete(sub); };
    }, [key]);
    const ready = (saved as SavedState | undefined)?.ready !== false;
    let val: T;
    if (mem.has(key)) {
        val = mem.get(key) as T;
    } else {
        val = (v === undefined || v === null ? fallback : v) as T;
        if (ready) mem.set(key, val);
    }
    const set = (next: T) => {
        mem.set(key, next);
        try { setV(next); } catch { /* viewer rejects oversized values */ }
        subs.get(key)?.forEach((cb) => cb());
    };
    return [val, set, saved as SavedState];
}

// Caps so values stay within viewer limits over months of use.
export function capLogs<T>(logs: T[]): T[] {
    return fit(logs.slice(0, 120), (a) => a.slice(0, Math.max(1, a.length - 10)));
}
export function capDayMap<T>(map: Record<string, T>): Record<string, T> {
    return fit(map, (m) => {
        const keys = Object.keys(m).sort();
        const out = { ...m };
        delete out[keys[0]];
        return out;
    });
}
export function capWeights<T>(w: T[]): T[] {
    return fit(w.slice(-365), (a) => a.slice(10));
}
export function capMsgs<T>(m: T[]): T[] {
    return m.slice(-40);
}

export function todayKey(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function uid(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
