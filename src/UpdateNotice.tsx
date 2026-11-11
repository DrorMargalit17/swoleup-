import React, { useEffect, useState } from 'react';
export function UpdateNotice() {
    const [newVersion, setNewVersion] = useState(false);
    useEffect(() => {
        let busy=false, stopped=false;
        const check=async()=>{
            if(busy||document.visibilityState==='hidden'||!navigator.onLine)return;
            busy=true;
            try {
                const registration=await navigator.serviceWorker?.getRegistration();
                await registration?.update().catch(()=>{});
                const res=await fetch(new URL('./index.html',location.href),{cache:'no-store'});
                if(!res.ok)return;
                const html=await res.text();
                const latest=new DOMParser().parseFromString(html,'text/html').querySelector('meta[name="swoleup-version"]')?.getAttribute('content');
                const current=document.querySelector('meta[name="swoleup-version"]')?.getAttribute('content');
                if(!stopped&&latest&&current&&latest!==current)setNewVersion(true);
            }catch{}finally{busy=false;}
        };
        void check();
        const visible=()=>{if(document.visibilityState==='visible')void check()};
        document.addEventListener('visibilitychange',visible);
        window.addEventListener('online',check);
        window.addEventListener('pageshow',check);
        return()=>{stopped=true;document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',check);window.removeEventListener('pageshow',check)};
    },[]);
    if(!newVersion)return null;
    return <div className="update-notice" role="status"><span>יש גרסה חדשה. הרענון יסגור מסכים פתוחים.</span><button onClick={()=>location.reload()}>רענן לגרסה החדשה</button></div>;
}
