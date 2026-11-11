// Standalone shim for @instinct/files: shared localStorage-backed store + passthrough router.
// All hook instances with the same key share one value (module-level cache + listeners),
// matching the platform's useLocalState semantics.
import React, { useState, useEffect } from 'react';
type Listener = () => void;
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();
function readKey<T>(key: string, initial: T): T {
    if (cache.has(key)) return cache.get(key) as T;
    let v = initial;
    try { const raw = localStorage.getItem(key); if (raw !== null) v = JSON.parse(raw); } catch {}
    cache.set(key, v);
    return v;
}
function writeKey<T>(key: string, v: T) {
    cache.set(key, v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
    (listeners.get(key) || []).forEach((fn) => fn());
}
export function useLocalState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
    const [val, setVal] = useState<T>(() => readKey(key, initial));
    useEffect(() => {
        const fn = () => setVal(readKey(key, initial));
        if (!listeners.has(key)) listeners.set(key, new Set());
        listeners.get(key)!.add(fn);
        return () => { listeners.get(key)!.delete(fn); };
    }, [key]);
    const set = (v: T | ((p: T) => T)) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(readKey(key, initial)) : v;
        writeKey(key, next);
    };
    return [val, set];
}
export function FileRouter({ children }: { children?: React.ReactNode }) { return <>{children}</>; }
export default { useLocalState, FileRouter };
