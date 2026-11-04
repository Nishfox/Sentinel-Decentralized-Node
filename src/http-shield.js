// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const crypto=require('node:crypto');
const defaults={enabled:true,requestsPerMinute:600,maxConcurrent:32,maxBodyBytes:65536};
function normalize(input={}){const c={...defaults,...input};if(typeof c.enabled!=='boolean')throw Error('Stato protezione non valido');for(const [key,min,max]of [['requestsPerMinute',1,10000],['maxConcurrent',1,256],['maxBodyBytes',0,1048576]])if(!Number.isInteger(c[key])||c[key]<min||c[key]>max)throw Error('Limite non valido: '+key);return c;}
function createShield(input={},now=()=>Date.now(),security=null,projectId=null){
 let config=normalize(input);const secret=crypto.randomBytes(32).toString('hex'),buckets=new Map();
 const stats={requests:0,blocked:0,bytesIn:0,bytesOut:0,inFlight:0,errors:0,totalMs:0,completed:0,lastRequestAt:null,lastAllowedAt:null,lastBlockedAt:null,reasons:{}};
 function wrap(handler){return(req,res)=>{
  if(req.headers['x-sentinel-probe']===secret){return handler(req,res);}
  const source=req.headers['x-sentinel-source-key']===secret?String(req.headers['x-sentinel-source']||req.socket.remoteAddress):req.socket.remoteAddress;
  const started=now();stats.requests++;stats.inFlight++;stats.lastRequestAt=new Date(started).toISOString();
  const originalWrite=res.write.bind(res),originalEnd=res.end.bind(res);let responseBytes=0;
  function count(chunk,encoding){if(chunk!=null&&typeof chunk!=='function')responseBytes+=Buffer.isBuffer(chunk)?chunk.length:Buffer.byteLength(String(chunk),typeof encoding==='string'?encoding:undefined);}
  res.write=(chunk,...args)=>{count(chunk,args[0]);return originalWrite(chunk,...args);};
  res.end=(chunk,...args)=>{count(chunk,args[0]);return originalEnd(chunk,...args);};
  req.on('data',chunk=>{stats.bytesIn+=chunk.length;});
  let finished=false;function finish(){if(finished)return;finished=true;stats.inFlight=Math.max(0,stats.inFlight-1);stats.bytesOut+=responseBytes;stats.completed++;stats.totalMs+=Math.max(0,now()-started);if(res.statusCode>=500)stats.errors++;if(security&&res.statusCode!==423)security.observe(projectId,source,res.statusCode);}
  res.once('finish',finish);res.once('close',finish);
  function block(code,reason){stats.blocked++;stats.lastBlockedAt=new Date(now()).toISOString();stats.reasons[reason]=(stats.reasons[reason]||0)+1;res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Connection':'close',...(code===429?{'Retry-After':'60'}:{})});res.end('Sentinel: '+reason);}
  if(security?.isBanned(projectId,source))return block(423,'Origine in quarantena temporanea');
  if(config.enabled){
   const ip=req.headers['x-sentinel-source-key']===secret?String(req.headers['x-sentinel-source']||req.socket.remoteAddress):req.socket.remoteAddress;
   const time=now();let bucket=buckets.get(ip);if(!bucket||time-bucket.since>=60000){bucket={since:time,count:0};buckets.set(ip,bucket);}bucket.count++;
   if(buckets.size>4096){for(const [key,value]of buckets)if(time-value.since>=60000)buckets.delete(key);if(buckets.size>4096)buckets.delete(buckets.keys().next().value);}
   if(bucket.count>config.requestsPerMinute)return block(429,'Limite richieste');
   if(stats.inFlight>config.maxConcurrent)return block(503,'Limite richieste simultanee');
   if(!['GET','HEAD'].includes(req.method))return block(405,'Metodo non consentito');
   if(req.url.length>4096)return block(414,'URL troppo lungo');
   const length=Number(req.headers['content-length']||0);
   if(!Number.isFinite(length)||length>config.maxBodyBytes||req.headers['transfer-encoding'])return block(413,'Corpo richiesta non consentito');
   let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return block(400,'Percorso non valido');}
   if(pathname.split('/').some(p=>p.startsWith('.')&&p!=='.well-known'))return block(403,'File nascosti protetti');
  }
  stats.lastAllowedAt=new Date(now()).toISOString();handler(req,res);
 };}
 function view(){return {...stats,reasons:{...stats.reasons},averageMs:stats.completed?Math.round(stats.totalMs/stats.completed):0,config:{...config},scope:'HTTP: corpi delle richieste e risposte, senza TLS/intestazioni; non pacchetti di rete'};}
 return {secret,wrap,view,configure(input){config=normalize(input);return view();}};
}
module.exports={createShield,normalize,defaults};
