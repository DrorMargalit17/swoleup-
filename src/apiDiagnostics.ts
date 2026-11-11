// Deliberately contains no request URLs, keys, bodies, raw errors or user text.
export type ApiReason = 'request'|'success'|'status'|'csp'|'timeout'|'offline'|'network'|'response';
type ApiEvent = { reason:ApiReason; time:string; attempt:number; elapsedMs:number; online:boolean; httpStatus?:number };
const recent:ApiEvent[]=[];
let cspAt=0;
window.addEventListener('securitypolicyviolation', (event:SecurityPolicyViolationEvent)=>{
    if(event.effectiveDirective==='connect-src' && event.blockedURI.startsWith('https://generativelanguage.googleapis.com'))cspAt=Date.now();
});
export function apiCspSince(start:number){return cspAt>=start;}
export function recordApi(reason:ApiReason,attempt:number,start:number,httpStatus?:number){
    recent.push({reason,time:new Date().toISOString().slice(11,19),attempt,elapsedMs:Math.max(0,Date.now()-start),online:navigator.onLine,...(httpStatus===undefined?{}:{httpStatus})});
    if(recent.length>8)recent.shift();
}
export function apiDiagnostics(){return recent.map(e=>({...e}));}
