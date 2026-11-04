const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const {createShield}=require('../src/http-shield');
async function server(shield,handler){const s=http.createServer(shield.wrap(handler));await new Promise(r=>s.listen(0,'127.0.0.1',r));return {s,url:`http://127.0.0.1:${s.address().port}`};}
async function close(s){s.closeAllConnections();await new Promise(r=>s.close(r));}
test('HTTP protection blocks hidden files and methods, enforces rate limits and records body bytes',async()=>{
 let now=Date.now();const shield=createShield({requestsPerMinute:3},()=>now);const {s,url}=await server(shield,(req,res)=>res.end('hello'));
 try{assert.equal(await(await fetch(url)).text(),'hello');assert.equal((await fetch(url+'/.env')).status,403);assert.equal((await fetch(url,{method:'POST',body:'x'})).status,405);assert.equal((await fetch(url,{headers:{'X-Sentinel-Source':'forged','X-Sentinel-Source-Key':'wrong'}})).status,429);let view=shield.view();assert.equal(view.requests,4);assert.equal(view.blocked,3);assert.ok(view.bytesOut>=5);now+=60001;assert.equal((await fetch(url)).status,200);
  const before=shield.view().requests;assert.equal((await fetch(url,{headers:{'X-Sentinel-Probe':shield.secret}})).status,200);assert.equal(shield.view().requests,before);
 }finally{await close(s);}
});
test('trusted public origins are isolated and a concurrent request limit rejects excess work',async()=>{
 const shield=createShield({requestsPerMinute:1});const {s,url}=await server(shield,(req,res)=>res.end('ok'));
 try{const headers=source=>({'X-Sentinel-Source-Key':shield.secret,'X-Sentinel-Source':source});assert.equal((await fetch(url,{headers:headers('client-a')})).status,200);assert.equal((await fetch(url,{headers:headers('client-a')})).status,429);assert.equal((await fetch(url,{headers:headers('client-b')})).status,200);assert.throws(()=>shield.configure({maxConcurrent:0}));}finally{await close(s);}
 const guard=createShield({maxConcurrent:1});let release,entered;const waiting=new Promise(r=>entered=r);const second=await server(guard,(req,res)=>{release=()=>res.end('done');entered();});
 try{const first=fetch(second.url);await waiting;assert.equal((await fetch(second.url)).status,503);release();assert.equal((await first).status,200);}finally{await close(second.s);}
});
