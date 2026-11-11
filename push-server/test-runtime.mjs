import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const child=spawn('./node_modules/.bin/wrangler',['dev','--local','--port','8933','--persist-to','/tmp/swoleup-push-runtime-test-'+process.pid,'--var','VAPID_PUBLIC_KEY:TEST-NOT-REAL','--var','VAPID_PRIVATE_KEY:TEST-NOT-REAL'],{cwd:'/downloads/drorfit-standalone/push-server',env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
try{
 let ready=false;for(let i=0;i<100;i++){try{const r=await fetch('http://localhost:8933/health');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert.ok(ready,logs);
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);const b64=a=>Buffer.from(a).toString('base64url');const headers={Origin:'https://drormargalit17.github.io',Authorization:'Bearer '+b64(crypto.getRandomValues(new Uint8Array(32))),'Content-Type':'application/json'};
 const body={subscription:{endpoint:'https://web.push.apple.com/synthetic-no-send',keys:{p256dh:b64(await crypto.subtle.exportKey('raw',pair.publicKey)),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}},times:[],timezone:'Asia/Jerusalem',active:false,revision:1};
 let r=await fetch('http://localhost:8933/state',{method:'PUT',headers,body:JSON.stringify(body)});assert.equal(r.status,200,await r.text());
 r=await fetch('http://localhost:8933/state',{method:'PUT',headers,body:JSON.stringify({...body,revision:2,times:['18:30']})});assert.equal(r.status,200,await r.text());
 r=await fetch('http://localhost:8933/state',{method:'DELETE',headers});assert.equal(r.status,200,await r.text());
 r=await fetch('http://localhost:8933/state',{method:'PUT',headers:{...headers,Authorization:''},body:'{}'});assert.equal(r.status,401);
 r=await fetch('http://localhost:8933/state',{method:'PUT',headers,body:'x'.repeat(9000)});assert.equal(r.status,413);
 console.log('Miniflare real SQLite DO runtime PASS: health, registration, schedule update, delete, auth,8192-byte bound. No push transmitted.');
}catch(e){console.log('runtime error',e.message,logs);throw e}finally{if(child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await ended;}}
const handlers={},shown=[],opened=[];let focused=0;const promises=[];
const self={location:{href:'https://drormargalit17.github.io/swoleup-/sw.js',origin:'https://drormargalit17.github.io'},addEventListener:(name,fn)=>handlers[name]=fn,registration:{showNotification:async(...args)=>shown.push(args)}};
vm.runInNewContext(readFileSync('/downloads/drorfit-standalone/docs/sw.js','utf8'),{self,URL,clients:{matchAll:async()=>[],openWindow:async u=>opened.push(u)}});
handlers.push({data:{json:()=>({title:'הגיע הזמן לסט הבא',body:'המנוחה הסתיימה',tag:'swoleup-rest',url:'https://evil.test'})},waitUntil:p=>promises.push(p)});await Promise.all(promises);assert.equal(shown.length,1);assert.equal(shown[0][1].dir,'rtl');handlers.notificationclick({notification:{close(){}},waitUntil:p=>promises.push(p)});await Promise.all(promises);assert.deepEqual(opened,['https://drormargalit17.github.io/swoleup-/']);
handlers.push({data:{json:()=>{throw Error()}},waitUntil:p=>promises.push(p)});await Promise.all(promises);assert.equal(shown.length,2);
console.log('Service worker PASS: every push shows a visible RTL notification; malformed data fallback; click uses own app URL only.');
