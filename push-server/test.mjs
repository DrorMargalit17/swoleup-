import assert from 'node:assert/strict';
import {PushSchedule,nextReminder,localDate,validateSubscription,cleanState,default as worker,ORIGIN} from './core.mjs';
import {buildPushPayload} from '@block65/webcrypto-web-push';
const b64=a=>Buffer.from(a).toString('base64url');
const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
const subscription={endpoint:'https://web.push.apple.com/test-only-no-send',keys:{p256dh:b64(await crypto.subtle.exportKey('raw',pair.publicKey)),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}};
await validateSubscription(subscription);
for(const endpoint of ['http://web.push.apple.com/x','https://localhost/x','https://example.com/x','https://fcm.googleapis.com.attacker.test/x','https://web.push.apple.com:8080/x'])await assert.rejects(()=>validateSubscription({...subscription,endpoint}));
const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',vapid.privateKey),pub=b64(await crypto.subtle.exportKey('raw',vapid.publicKey));
const encrypted=await buildPushPayload({data:{title:'Test'},options:{ttl:45,urgency:'high',topic:'swoleup-rest'}},subscription,{subject:ORIGIN+'/swoleup-/',publicKey:pub,privateKey:jwk.d});
const headers=new Headers(encrypted.headers);assert.equal(headers.get('Content-Encoding'),'aes128gcm');assert.match(headers.get('Authorization'),/^vapid t=/);assert.equal(headers.get('TTL'),'45');assert.equal(new Uint8Array(encrypted.body).byteLength,4096);
console.log('crypto: aes128gcm / RFC8292 VAPID /4096-byte payload /45s TTL pass; no push transmitted');
assert.equal(localDate(Date.parse('2026-11-11T22:30:00Z'),'Asia/Jerusalem'),'2026-11-12');
assert.equal(nextReminder(Date.parse('2026-11-11T15:00:00Z'),'Asia/Jerusalem',['18:00']),Date.parse('2026-11-11T16:00:00Z'));
assert.equal(nextReminder(Date.parse('2026-11-11T17:00:00Z'),'Asia/Jerusalem',['18:00']),Date.parse('2026-11-12T16:00:00Z'));
assert.equal(nextReminder(Date.parse('2027-03-13T20:00:00Z'),'America/New_York',['09:00']),Date.parse('2027-03-14T13:00:00Z'));
assert.equal(nextReminder(Date.parse('2027-03-13T20:00:00Z'),'America/New_York',['02:30']),Date.parse('2027-03-15T06:30:00Z'));
console.log('timezone: Jerusalem midnight, next day, NY DST transition and missing-hour skip pass');
let now=Date.parse('2026-11-11T16:00:00Z');const realNow=Date.now;Date.now=()=>now;
const db=new Map();let alarmAt=null;
const storage={get:async k=>structuredClone(db.get(k)),put:async(k,v)=>db.set(k,structuredClone(v)),setAlarm:async n=>alarmAt=n,deleteAlarm:async()=>alarmAt=null};
const schedule=new PushSchedule({storage,blockConcurrencyWhile:fn=>fn()},{});const sent=[];schedule.send=async(r,m,ttl)=>{sent.push({m,ttl});return'sent'};
const req=(id,body,method='PUT',path='/state')=>schedule.fetch(new Request('https://internal'+path,{method,headers:{'x-device-id':id},body:body?JSON.stringify(body):undefined}));
let r=await req('deviceA',{subscription,times:['18:01'],timezone:'Asia/Jerusalem',revision:1,active:false});assert.equal(r.status,200);assert.equal(alarmAt,now+60000);
now+=60001;await schedule.alarm();assert.equal(sent.length,1);assert.equal(sent[0].m.tag,'swoleup-workout');await schedule.alarm();assert.equal(sent.length,1);
r=await req('deviceA',{times:['18:02'],timezone:'Asia/Jerusalem',revision:2,active:true,restAt:now+30000});assert.equal(r.status,200);now+=30001;await schedule.alarm();assert.equal(sent.length,2);assert.equal(sent[1].m.tag,'swoleup-rest');await schedule.alarm();assert.equal(sent.length,2);
now+=30000;await schedule.alarm();assert.equal(sent.length,2); // active daily reminder suppressed
await req('deviceA',{times:['18:03'],timezone:'Asia/Jerusalem',revision:3,completedDay:'2026-11-11',active:false});now+=60000;await schedule.alarm();assert.equal(sent.length,2); // already-trained suppressed
await req('deviceA',{times:[],timezone:'Asia/Jerusalem',revision:4,active:true,restAt:now+2000});await req('deviceA',{times:[],timezone:'Asia/Jerusalem',revision:5,active:true,restAt:null});now+=3000;await schedule.alarm();assert.equal(sent.length,2); // cancellation
await req('deviceA',{times:[],timezone:'Asia/Jerusalem',revision:6,active:true,restAt:now+2000});await req('deviceA',{times:[],timezone:'Asia/Jerusalem',revision:7,active:true,restAt:now+10000});now+=3000;await schedule.alarm();assert.equal(sent.length,2);now+=7001;await schedule.alarm();assert.equal(sent.length,3); // adjustment
r=await req('deviceA',{times:['23:00'],timezone:'UTC',revision:1,active:true});assert.equal((await r.json()).stale,true);assert.equal(db.get('devices').deviceA.revision,7);
await req('deviceA',{times:[],timezone:'Asia/Jerusalem',revision:8,active:true,restAt:now+2000});now+=62001;await schedule.alarm();assert.equal(sent.length,3); // stale rest intentionally dropped
await req('deviceA',null,'DELETE');assert.equal(Object.keys(db.get('devices')).length,0);assert.equal(alarmAt,null);
r=await req('deviceA',{subscription,times:['99:00'],timezone:'UTC',revision:9});assert.equal(r.status,400);
r=await req('deviceA',{subscription,times:[],timezone:'bad-zone',revision:9});assert.equal(r.status,400);
assert.equal(cleanState({times:[],active:true,restAt:now+1e8},now).restAt,null);
let called=0;const env={VAPID_PUBLIC_KEY:pub,SCHEDULE:{idFromName:()=>'',get:()=>({fetch:async()=>{called++;return Response.json({ok:true})}})}};
r=await worker.fetch(new Request('https://worker/state',{method:'PUT',headers:{Origin:ORIGIN,'Content-Type':'application/json'},body:'{}'}),env);assert.equal(r.status,401);assert.equal(called,0);
r=await worker.fetch(new Request('https://worker/state',{method:'PUT',headers:{Origin:'https://evil.test',Authorization:'Bearer '+'A'.repeat(43)},body:'{}'}),env);assert.equal(r.status,403);assert.equal(called,0);
r=await worker.fetch(new Request('https://worker/state',{method:'PUT',headers:{Origin:ORIGIN,Authorization:'Bearer '+'A'.repeat(43)},body:'{}'}),env);assert.equal(r.status,200);assert.equal(called,1);
Date.now=realNow;
console.log('state: daily / suppression active+complete / rest single-fire / cancel / adjust / stale revision+late timer / delete / input validation / per-device authorization pass');

const originalFetch=globalThis.fetch;let transportOptions;globalThis.fetch=async(url,options)=>{transportOptions=options;return Response.json({reason:'BadPath'},{status:400})};
try{const realSender=new PushSchedule({}, {VAPID_PUBLIC_KEY:pub,VAPID_PRIVATE_KEY:jwk.d});const record={subscription};assert.equal(await realSender.send(record,{title:'test',tag:'swoleup-test'},60),'failed');assert.equal(transportOptions.redirect,'manual');assert.equal(new Headers(transportOptions.headers).has('content-length'),false);assert.deepEqual(record.lastPush,{phase:'provider',status:400,code:'BadPath'});console.log('Transport regression PASS: Workers-supported manual redirect, no explicit length, Apple status/reason preserved.');}finally{globalThis.fetch=originalFetch;}
