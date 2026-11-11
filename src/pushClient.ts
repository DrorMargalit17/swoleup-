// Push integration contains no AI key, profile, chat or exercise detail.
// Only a per-device capability is kept locally, outside backups and IndexedDB.
import {pushEvent,pushTransportCode} from './pushDiagnostics';
import {PUSH_ENDPOINT} from './pushConfig';
const TOKEN='swoleup.push.token',ENABLED='swoleup.push.enabled',REV='swoleup.push.revision';
let running=false,rest=0,queue=Promise.resolve();
let message='';
const emit=()=>window.dispatchEvent(new Event('swoleup-push-status'));
export const pushStatus=()=>({enabled:localStorage.getItem(ENABLED)==='yes',message,configured:!!PUSH_ENDPOINT});
export function setPushWorkout(active:boolean,restAt=0){running=active;rest=restAt;void syncPush();}
function read(key:string,fallback:any){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function token(){let value=localStorage.getItem(TOKEN);if(!value){value=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');localStorage.setItem(TOKEN,value)}return value}
function snapshot(){
 const now=new Date(),day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const prefs=read('reminders.v1',{times:[]}),logs=read('logs.v1',[]),session=read('session.v1',null);
 const active=running||!!(session?.savedAt&&Date.now()-new Date(session.savedAt).getTime()<6*36e5);
 const previous=Number(localStorage.getItem(REV)||0),revision=Math.max(Date.now(),previous+1);localStorage.setItem(REV,String(revision));
 return {times:prefs.times||[],timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,completedDay:logs.some((l:any)=>l.date===day)?day:null,active,restAt:running&&document.visibilityState==='hidden'&&rest>Date.now()?rest:null,revision};
}
let cspAt=0;
window.addEventListener('securitypolicyviolation',(e:SecurityPolicyViolationEvent)=>{if(e.effectiveDirective==='connect-src'&&e.blockedURI.startsWith(PUSH_ENDPOINT))cspAt=Date.now()});
async function request(path:string,method:string,body?:any){
 const phase=path==='/test'?'test':method==='DELETE'?'delete':'sync',start=Date.now();pushEvent(phase,'request');
 let response:Response;
 try{response=await fetch(PUSH_ENDPOINT+path,{method,headers:{Authorization:'Bearer '+token(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,keepalive:true,signal:AbortSignal.timeout(10000)});}
 catch(e){await new Promise(r=>setTimeout(r,0));const code=cspAt>=start?'csp':pushTransportCode(e);pushEvent(phase,code);throw Error('לא הצלחנו להשלים את הפעולה. קוד בדיקה: push-'+phase+'-'+code+'.');}
 let data:any={};try{data=await response.clone().json()}catch{}
 const allowed=['accepted','provider_rejected','BadJwtToken','BadTtl','BadUrgency','BadWebPushTopic','BadWebPushRequest','BadAuthorizationHeader','BadCryptoKey','BadEncryption','BadRegistration','BadTopic','DeviceTokenNotForTopic','ExpiredProviderToken','Forbidden','InvalidProviderToken','MissingProviderToken','PayloadTooLarge','Unregistered','send_timeout','encryption_failed','provider_network','not_registered','subscription_expired','wait_one_minute','device_limit','invalid_state','unauthorized','origin'];
 const code=allowed.includes(data.code||data.error)?data.code||data.error:response.ok?'success':'status';
 pushEvent(phase,code,response.status,Number.isInteger(data.pushStatus)?data.pushStatus:undefined);
 if(!response.ok)throw Error((response.status===429?'צריך להמתין דקה בין בדיקות. ':response.status===410?'רישום ההתראות פג. לחץ על חדש רישום במכשיר. ':'שליחת ההתראה לא הושלמה. ')+'קוד בדיקה: push-'+phase+'-'+code+'-'+response.status+(data.pushStatus?'-'+data.pushStatus:'')+'.');return response;
}

export async function syncPush(subscription?:PushSubscriptionJSON){
 if(!PUSH_ENDPOINT||localStorage.getItem(ENABLED)!=='yes')return;
 const state={...snapshot(),...(subscription?{subscription}:{})};
 queue=queue.catch(()=>{}).then(async()=>{
  if(localStorage.getItem(ENABLED)!=='yes')return;
  try{await request('/state','PUT',state);message='סונכרן עם שירות ההתראות.';}catch(e){message=(e as Error).message==='limit'?'שירות ההתראות הגיע למגבלה זמנית. נסה שוב מאוחר יותר.':'הסנכרון לא הושלם. ייתכן שתזכורות לא יישלחו או שלא יבוטלו עד לחיבור מחדש.';}
  emit();
 });
 await queue;
}
export async function enablePush(){
 if(!PUSH_ENDPOINT)throw Error('שירות ההתראות עדיין לא הוגדר.');
 if(!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator))throw Error('התראות אינן זמינות כאן. ב-iPhone יש לפתוח את SwoleUp מהאייקון במסך הבית.');
 // Ask immediately in the click gesture, before any network request.
 const permission=await Notification.requestPermission();pushEvent('permission',permission);if(permission!=='granted')throw Error('ההרשאה לא ניתנה. אפשר לאפשר התראות בהגדרות המכשיר.');
 let response:Response;try{response=await fetch(PUSH_ENDPOINT+'/config',{signal:AbortSignal.timeout(10000)});pushEvent('config',response.ok?'success':'status',response.status)}catch(e){const code=pushTransportCode(e);pushEvent('config',code);throw Error('לא הצלחנו לטעון את שירות ההתראות. קוד בדיקה: push-config-'+code+'.')}if(!response.ok)throw Error('שירות ההתראות לא זמין כרגע. קוד בדיקה: push-config-status-'+response.status+'.');
 const {publicKey}=await response.json();if(typeof publicKey!=='string')throw Error('הגדרת ההתראות חסרה.');
 const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const reg=await navigator.serviceWorker.ready;let subscription:PushSubscription;try{subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});pushEvent('subscribe','success')}catch(e){pushEvent('subscribe',pushTransportCode(e));throw Error('הרישום לשירות ההתראות לא הושלם. קוד בדיקה: push-subscribe-'+pushTransportCode(e)+'.')}
 await request('/state','PUT',{...snapshot(),subscription:subscription.toJSON()});localStorage.setItem(ENABLED,'yes');message='סונכרן עם שירות ההתראות.';emit();
}
export async function disablePush(){
 // Delete server schedule first. If offline, keep an honest enabled state so retry is available.
 if(PUSH_ENDPOINT&&localStorage.getItem(ENABLED)==='yes')try{await request('/state','DELETE')}catch{throw Error('ההתראות עדיין לא כובו: אין אישור מחיקה מהשרת. התחבר לאינטרנט ונסה שוב.')} 
 const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();await sub?.unsubscribe();
 localStorage.removeItem(ENABLED);localStorage.removeItem(TOKEN);localStorage.removeItem(REV);message='ההתראות כובו והמועדים נמחקו מהשרת.';emit();
}
export async function testPush(){await request('/test','POST');message='הודעת בדיקה נשלחה לשירות Push. הופעתה במכשיר תלויה בהרשאות ובמצב המכשיר.';emit();}
export function installPushListeners(){
 const sync=()=>{void syncPush()};
 window.addEventListener('online',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',sync);
 if(localStorage.getItem(ENABLED)==='yes'&&'serviceWorker'in navigator)void navigator.serviceWorker.ready.then(r=>r.pushManager.getSubscription()).then(s=>{if(s)void syncPush(s.toJSON());else{message='הרישום להתראות פג. הפעל התראות מחדש.';emit()}}).catch(()=>{});
 return()=>{window.removeEventListener('online',sync);document.removeEventListener('visibilitychange',sync);window.removeEventListener('pagehide',sync)};
}
