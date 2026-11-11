type PushEvent={phase:string;code:string;status?:number;pushStatus?:number;permission:string;time:string;online:boolean;visibility:string};
const events:PushEvent[]=[];
export function pushEvent(phase:string,code:string,status?:number,pushStatus?:number){events.push({phase,code,...(status===undefined?{}:{status}),...(pushStatus===undefined?{}:{pushStatus}),permission:'Notification'in window?Notification.permission:'unsupported',time:new Date().toISOString().slice(11,19),online:navigator.onLine,visibility:document.visibilityState});if(events.length>10)events.shift();}
export function pushDiagnostics(){return events.map(e=>({...e}));}
export function pushTransportCode(error:any){return error?.name==='TimeoutError'||error?.name==='AbortError'?'timeout':!navigator.onLine?'offline':'network';}
