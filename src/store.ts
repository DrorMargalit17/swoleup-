import { useLocalState } from './localState';
export interface SavedState { ready: boolean; message?: string }

const KEY_LIMIT = 15000; // chars, stays under the 16 KiB per-value cap

function fit<T>(value: T, trim: (v: T) => T): T {
    let v = value;
    let guard = 0;
    while (JSON.stringify(v).length > KEY_LIMIT && guard++ < 500) v = trim(v);
    return v;
}

// The standalone store owns synchronization, persistence and recovery.
export function useStore<T>(key: string, fallback: T): [T, (v: T) => void, SavedState] {
    return useLocalState(key, fallback);
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
