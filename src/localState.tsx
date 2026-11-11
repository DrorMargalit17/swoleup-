// Device-local shared store. Legacy key names are preserved for existing users.
import React, { useSyncExternalStore } from 'react';
type Saved = { ready: boolean; message?: string };
const values = new Map<string, unknown>();
const listeners = new Set<() => void>();
const dirty = new Set<string>();
let status: Saved = { ready: false };
let localOK = true;
let db: IDBDatabase | null = null;
const emit = () => listeners.forEach(fn => fn());
function setStatus(next: Saved) { status = next; emit(); }
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
function persistBackup(key: string, value: unknown, preferBackup = false): Promise<void> {
    if (key === "coachsettings.v1") return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error('backup unavailable'));
        try {
            const tx = db.transaction('state', 'readwrite');
            tx.objectStore('state').put({format:'swoleup-state-v1',value,preferBackup}, key);
            tx.oncomplete = () => resolve();
            tx.onerror = tx.onabort = () => reject(tx.error);
        } catch (e) { reject(e); }
    });
}
function fromLocal(key: string): unknown {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
}
const init = (async () => {
    try { localStorage.setItem('__swoleup_probe', '1'); localStorage.removeItem('__swoleup_probe'); }
    catch { localOK = false; }
    try {
        db = await new Promise<IDBDatabase>((resolve,reject) => {
            const r = indexedDB.open('swoleup-local', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('state');
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
            r.onblocked = () => reject(new Error('blocked'));
            setTimeout(() => reject(new Error('timeout')), 2000);
        });
        await new Promise<void>((resolve,reject) => {
            const tx = db!.transaction('state','readonly');
            const cursor = tx.objectStore('state').openCursor();
            cursor.onsuccess = () => {
                const c=cursor.result;
                if (!c) return;
                const key=String(c.key);
                if (!dirty.has(key)) {
                    let local; try { local=fromLocal(key); } catch {}
                    const record=c.value;
                    const wrapped=record?.format==='swoleup-state-v1';
                    const recover=local === undefined || (wrapped && record.preferBackup);
                    const value=recover ? (wrapped ? record.value : record) : local;
                    values.set(key,value);
                    if (recover && localOK) { try { localStorage.setItem(key,JSON.stringify(value)); } catch {} }
                }
                c.continue();
            };
            tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
        });
        // Migrate any old recovery key back to local storage before removing it.
        if (localOK && localStorage.getItem('coachsettings.v1') !== null) { const tx=db.transaction('state','readwrite'); tx.objectStore('state').delete('coachsettings.v1'); }
        // Seed a recovery copy of existing data, without deleting or renaming keys.
        if (localOK) for (const key of Object.keys(localStorage).filter(k=>k.endsWith('.v1') && k !== 'coachsettings.v1')) {
            try { await persistBackup(key, fromLocal(key)); } catch {}
        }
    } catch {}
    setStatus({ready:true, ...(!localOK && !db ? {message:'השמירה במכשיר חסומה. הנתונים יישארו רק עד סגירת האפליקציה. אפשר לייצא גיבוי בהגדרות.'} : {})});
})();
function read<T>(key: string, initial: T): T {
    if (!values.has(key)) {
        let value=initial;
        try { const stored=fromLocal(key); if(stored!==undefined) value=stored as T; } catch {}
        values.set(key,value);
    }
    return values.get(key) as T;
}
function write<T>(key:string,value:T) {
    dirty.add(key); values.set(key,value);
    let savedLocal=false;
    try { const raw=JSON.stringify(value);localStorage.setItem(key,raw);savedLocal=localStorage.getItem(key)===raw; } catch {}
    emit();
    void init.then(async()=>{
        let savedBackup=false;
        try { if(key !== "coachsettings.v1") { await persistBackup(key,value,!savedLocal); savedBackup=true; } } catch {}
        if (!savedLocal && !savedBackup) setStatus({ready:true,message:key === 'coachsettings.v1' ? 'המפתח לא נשמר במכשיר. הוא יעבוד רק עד סגירת האפליקציה, ואינו נכלל בגיבוי.' : 'לא הצלחנו לשמור את השינוי במכשיר. לפני הסגירה, ייצא גיבוי דרך ההגדרות.'});
        else if (status.message) setStatus({ready:true});
    });
}
window.addEventListener('storage',e=>{
    if(!e.key || !e.key.endsWith('.v1')) return;
    try { values.set(e.key,e.newValue===null?undefined:JSON.parse(e.newValue));emit(); } catch {}
});
export function useStorageStatus() { return useSyncExternalStore(subscribe,()=>status); }
export function useLocalState<T>(key:string,initial:T): [T,(v:T|((p:T)=>T))=>void,Saved] {
    const value=useSyncExternalStore(subscribe,()=>read(key,initial));
    const saved=useStorageStatus();
    return [value,v=>write(key,typeof v==='function'?(v as (p:T)=>T)(read(key,initial)):v),saved];
}
export function FileRouter({children}:{children?:React.ReactNode}) { return <>{children}</>; }
