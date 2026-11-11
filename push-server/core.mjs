import { buildPushPayload } from '@block65/webcrypto-web-push';

export const ORIGIN='https://drormargalit17.github.io';
export const APP=ORIGIN+'/swoleup-/';
const MAX_DEVICES=16, MAX_AGE=30*864e5;
export function localDate(ms,tz){return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(ms)}
function parts(ms,tz){const p=new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(ms);return Object.fromEntries(p.map(x=>[x.type,x.value]));}
export function nextReminder(now,tz,times){
 const p=parts(now,tz), day=Date.UTC(+p.year,+p.month-1,+p.day);let best=Infinity;
 for(let d=0;d<3;d++)for(const t of times){const [h,m]=t.split(':').map(Number);const target=day+d*864e5+h*36e5+m*6e4;let candidate=target;
  for(let i=0;i<3;i++){const q=parts(candidate,tz);const wall=Date.UTC(+q.year,+q.month-1,+q.day,+q.hour,+q.minute,+q.second);candidate+=target-wall;}
  const actual=parts(candidate,tz); // Skip nonexistent DST times rather than send at a different hour.
  if(+actual.hour!==h||+actual.minute!==m)continue;
  if(candidate>now+500&&candidate<best)best=candidate;
 }
 return Number.isFinite(best)?best:null;
}
function decode(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0))}
export async function validateSubscription(s){
 if(!s||typeof s.endpoint!=='string'||s.endpoint.length>2048)throw Error('subscription');
 const u=new URL(s.endpoint);const h=u.hostname;
 if(u.protocol!=='https:'||u.port||u.username||u.password||!(h==='web.push.apple.com'||h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h.endsWith('.notify.windows.com')))throw Error('endpoint');
 if(typeof s.keys?.p256dh!=='string'||typeof s.keys?.auth!=='string'||s.keys.p256dh.length>100||s.keys.auth.length>30)throw Error('keys');
 const p=decode(s.keys.p256dh),a=decode(s.keys.auth);if(p.length!==65||a.length!==16)throw Error('keys');
 await crypto.subtle.importKey('raw',p,{name:'ECDH',namedCurve:'P-256'},false,[]);
 return {endpoint:s.endpoint,expirationTime:null,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}};
}
export function cleanState(body,now){
 const tz=typeof body.timezone==='string'&&body.timezone.length<80?body.timezone:'UTC';parts(now,tz);
 if(!Array.isArray(body.times)||body.times.length>3||!body.times.every(t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Error('times');
 const today=localDate(now,tz);
 return {timezone:tz,times:[...new Set(body.times)].sort(),completedDay:body.completedDay===today?today:null,activeUntil:body.active===true?now+6*36e5:0,restAt:body.active===true&&Number.isFinite(body.restAt)&&body.restAt>now&&body.restAt<now+36e5?Math.round(body.restAt):null,updated:now,revision:Number.isSafeInteger(body.revision)?body.revision:0};
}
export class PushSchedule {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){return this.ctx.blockConcurrencyWhile(()=>this.handle(request));}
 async handle(request){
  const id=request.headers.get('x-device-id');if(!id)return Response.json({error:'unauthorized'},{status:401});
  const data=await this.ctx.storage.get('devices')||{};const now=Date.now();for(const[k,v]of Object.entries(data))if(now-v.updated>=MAX_AGE)delete data[k];
  const old=data[id];const path=new URL(request.url).pathname;
  if(request.method==='DELETE'){delete data[id];await this.save(data);return Response.json({ok:true});}
  if(path==='/test'){
   if(!old)return Response.json({error:'not_registered'},{status:404});
   if(now-(old.testAt||0)<60000)return Response.json({error:'wait_one_minute'},{status:429});
   old.testAt=now;await this.save(data);
   const result=await this.send(old,{title:'ההתראות פעילות ✅',body:'הכול מוכן. נתראה באימון הבא.',tag:'swoleup-test'},60);
   old.lastPush={...old.lastPush,time:new Date().toISOString()};await this.save(data);
   if(result==='expired'){delete data[id];await this.save(data);return Response.json({error:'subscription_expired'},{status:410});}
   return Response.json({ok:result==='sent',code:old.lastPush?.code||result,pushStatus:old.lastPush?.status||0,phase:old.lastPush?.phase||'send'},{status:result==='sent'?200:502});
  }
  if(request.method!=='PUT'||path!=='/state')return Response.json({error:'not_found'},{status:404});
  let body;try{body=await request.json()}catch{return Response.json({error:'invalid_json'},{status:400})}
  try{
   if(!old&&Object.keys(data).length>=MAX_DEVICES)return Response.json({error:'device_limit'},{status:429});
   if(!old){const recent=await this.ctx.storage.get('registrationAt')||0;if(now-recent<60000)return Response.json({error:'wait_one_minute'},{status:429});}
   const state=cleanState(body,now);
   if(old&&state.revision<old.revision)return Response.json({ok:true,stale:true});
   const subscription=body.subscription?await validateSubscription(body.subscription):old?.subscription;if(!subscription)throw Error('subscription');
   data[id]={...old,...state,subscription,nextAt:nextReminder(now,state.timezone,state.times)};
   if(!old)await this.ctx.storage.put('registrationAt',now);
   await this.save(data);return Response.json({ok:true,updated:now});
  }catch{return Response.json({error:'invalid_state'},{status:400});}
 }
 async save(data){
  await this.ctx.storage.put('devices',data);
  let at=Infinity;for(const r of Object.values(data)){for(const t of [r.restAt,r.nextAt,r.updated+MAX_AGE])if(t&&t<at)at=t;}
  if(Number.isFinite(at))await this.ctx.storage.setAlarm(Math.max(Date.now()+100,at));else await this.ctx.storage.deleteAlarm();
 }
 async send(record,message,ttl){
  let phase='encrypt';
  try{
   const payload=await buildPushPayload({data:message,options:{ttl,urgency:'high',topic:message.tag} },record.subscription,{subject:APP,publicKey:this.env.VAPID_PUBLIC_KEY,privateKey:this.env.VAPID_PRIVATE_KEY});
   phase='provider';
   const sendHeaders=new Headers(payload.headers);sendHeaders.delete('content-length');
   const res=await fetch(record.subscription.endpoint,{...payload,headers:sendHeaders,redirect:'manual',signal:AbortSignal.timeout(4000)});
   let reason='';if(!res.ok){try{const j=await res.json();const allowed=['VapidPkHashMismatch','BadVapidPublicKey','BadPath','MethodNotAllowed','TooManyRequests','InternalServerError','ServiceUnavailable','Shutdown','IdleTimeout','BadJwtToken','BadTtl','BadUrgency','BadWebPushTopic','BadWebPushRequest','BadAuthorizationHeader','BadCryptoKey','BadEncryption','BadRegistration','BadTopic','DeviceTokenNotForTopic','ExpiredProviderToken','Forbidden','InvalidProviderToken','MissingProviderToken','PayloadTooLarge','Unregistered'];if(allowed.includes(j.reason))reason=j.reason;}catch{}}
   record.lastPush={phase,status:res.status,code:res.ok?'accepted':reason||'provider_rejected'};
   console.log(JSON.stringify({push:record.lastPush}));
   if(res.status===404||res.status===410)return 'expired';return res.ok?'sent':'failed';
  }catch(e){record.lastPush={phase,status:0,code:e?.name==='TimeoutError'||e?.name==='AbortError'?'send_timeout':phase==='encrypt'?'encryption_failed':/TLS|SSL|handshake/i.test(String(e?.message))?'provider_tls':/Content-Length|length/i.test(String(e?.message))?'provider_length':/DNS|resolve/i.test(String(e?.message))?'provider_dns':/reset|lost|closed/i.test(String(e?.message))?'provider_connection':'provider_network'};console.log(JSON.stringify({push:record.lastPush}));return 'failed';}
 }
 async alarm(){return this.ctx.blockConcurrencyWhile(async()=>{
  const data=await this.ctx.storage.get('devices')||{};const now=Date.now(),work=[];
  for(const[id,r]of Object.entries(data)){
   if(now-r.updated>=MAX_AGE){delete data[id];continue;}
   if(r.restAt&&r.restAt<=now){const due=r.restAt;r.restAt=null;if(now-due<60000&&r.activeUntil>now)work.push([id,{title:'הגיע הזמן לסט הבא 💪',body:'המנוחה הסתיימה. חוזרים בקצב שלך.',tag:'swoleup-rest'},45]);}
   if(r.nextAt&&r.nextAt<=now){const due=r.nextAt,day=localDate(now,r.timezone);r.nextAt=nextReminder(now,r.timezone,r.times);
    if(now-due<5*60000&&r.completedDay!==day&&r.activeUntil<=now)work.push([id,{title:'זמן להתאמן 🔥',body:'קצת זמן לעצמך, עוד צעד קדימה. מתחילים?',tag:'swoleup-workout'},120]);}
  }
  // Persist removal first: alarm retries cannot repeatedly send the same due notification.
  // Transport failure can lose this reminder; this deliberately prefers no duplicate/stale alerts.
  await this.save(data);
  await Promise.all(work.map(async([id,message,ttl])=>{const result=await this.send(data[id],message,ttl);if(result==='expired')delete data[id];}));
  await this.save(data);
 });}
}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin');const headers={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET,PUT,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Cache-Control':'no-store','Vary':'Origin'};
 const wrap=r=>new Response(r.body,{status:r.status,headers:{...Object.fromEntries(r.headers),...headers}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const path=new URL(request.url).pathname;
 if(path==='/health')return wrap(Response.json({ok:true,version:1}));
 if(origin!==ORIGIN)return wrap(Response.json({error:'origin'},{status:403}));
 if(path==='/config'&&request.method==='GET')return wrap(Response.json({publicKey:env.VAPID_PUBLIC_KEY},{status:env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY?200:503}));
 const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];if(!token)return wrap(Response.json({error:'unauthorized'},{status:401}));
 if(!['/state','/test'].includes(path)||!['PUT','POST','DELETE'].includes(request.method))return wrap(Response.json({error:'not_found'},{status:404}));
 if(+(request.headers.get('Content-Length')||0)>8192)return wrap(Response.json({error:'too_large'},{status:413}));
 let body='';if(request.body){const reader=request.body.getReader(),chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return wrap(Response.json({error:'too_large'},{status:413}));}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}body=new TextDecoder().decode(bytes);}
 const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 const stub=env.SCHEDULE.get(env.SCHEDULE.idFromName('swoleup-personal-v1'));
 const proxied=new Request('https://internal'+path,{method:request.method,headers:{'x-device-id':id,'Content-Type':'application/json'},body:body||undefined});
 return wrap(await stub.fetch(proxied));
}};
