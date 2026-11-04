// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const http=require('node:http');const https=require('node:https');const os=require('node:os');const net=require('node:net');const path=require('node:path');const {execFile}=require('node:child_process');const {promisify}=require('node:util');const run=promisify(execFile);
// Windows curl uses the Windows certificate store (including installed enterprise
// and antivirus roots). Node 20's bundled roots can reject that same valid chain.
// Keep certificate verification enabled; never use --insecure or rejectUnauthorized:false.
async function windowsCurl(args){return run(path.join(process.env.WINDIR||'C:\\Windows','System32','curl.exe'),['--disable','--silent','--show-error','--proto','=https','--noproxy','*',...args],{windowsHide:true,timeout:25000,maxBuffer:128*1024});}
async function resolvePublic(hostname){
 const url='https://dns.google/resolve?type=A&name='+encodeURIComponent(hostname);
 if(process.platform==='win32'){const r=await windowsCurl(['--fail','--max-time','6','--max-filesize','65536',url]);return JSON.parse(r.stdout);}
 const r=await fetch(url,{signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Resolver HTTP '+r.status);return r.json();
}
async function publicHead(hostname,address){
 if(process.platform!=='win32')return head({hostname,path:'/',port:443,family:4,servername:hostname,lookup:(host,opts,cb)=>{if(typeof opts==='function')cb=opts;cb(null,address,4);}},https);
 const begin=Date.now();try{
  const r=await windowsCurl(['--head','--connect-timeout','5','--max-time','20','--resolve',hostname+':443:'+address,'--output','NUL','--write-out','%{http_code}','https://'+hostname+'/']);
  const code=Number(r.stdout.trim());return {ok:code>=200&&code<400,code,stage:'http',message:'HTTP '+code,latencyMs:Date.now()-begin,checkedAt:new Date().toISOString()};
 }catch(e){return {ok:false,stage:[35,51,58,60,77,83,90,91].includes(e.code)?'tls':'connection',message:(e.stderr||e.message).trim().slice(0,1200),latencyMs:Date.now()-begin,checkedAt:new Date().toISOString()};}
}
function head(options,transport){return new Promise(resolve=>{const begin=Date.now();let done=false;const finish=data=>{if(done)return;done=true;resolve({...data,latencyMs:Date.now()-begin,checkedAt:new Date().toISOString()});};const req=transport.request({...options,method:'HEAD',agent:false,timeout:5000,signal:AbortSignal.timeout(6000)},res=>{res.resume();finish({ok:res.statusCode>=200&&res.statusCode<400,code:res.statusCode,stage:'http',message:'HTTP '+res.statusCode});});req.on('timeout',()=>req.destroy(Object.assign(Error('Timeout connessione'),{code:'ETIMEDOUT'})));req.on('error',e=>finish({ok:false,stage:/CERT|TLS|SSL/.test(e.code||'')?'tls':'connection',message:e.message,code:e.code}));req.end();});}
function publicIPv4(ip){if(net.isIP(ip)!==4)return false;const [a,b]=ip.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===198&&(b===18||b===19)));}
async function publicProbe(url){
 const u=new URL(url);if(u.protocol!=='https:'||!/^([a-z0-9-]+\.)+ts\.net$/.test(u.hostname)||u.port||u.username||u.password)throw Error('Dominio nodo non valido');
 const checkedAt=new Date().toISOString();let data;
 try {data=await resolvePublic(u.hostname);}catch(e){return {ok:false,stage:'resolver',message:(e.stderr||e.cause?.message||e.message).trim().slice(0,1200),checkedAt};}
 const addresses=(data.Answer||[]).filter(x=>x.type===1&&publicIPv4(x.data)).map(x=>x.data);
 if(data.Status===3)return {ok:false,stage:'dns',message:'NXDOMAIN nel DNS pubblico. Verifica il nome del nodo e attendi la pubblicazione DNS di Funnel.',checkedAt};
 if(data.Status!==0)return {ok:false,stage:'resolver',message:'Il resolver pubblico ha risposto con codice DNS '+data.Status,checkedAt};
 if(!addresses.length)return {ok:false,stage:'dns',message:'DNS pubblico senza indirizzi relay pubblici',checkedAt};
 let result;
 try{
  result=await Promise.any([...new Set(addresses)].slice(0,4).map(async address=>{
   const probe=await publicHead(u.hostname,address);
   if(!probe.ok)throw probe;
   return probe;
  }));
 }catch(error){
  result=error.errors.find(probe=>probe.stage==='http')||error.errors.find(probe=>probe.stage==='tls')||error.errors[0];
 }
 return {...result,addresses,dns:true,tls:result.stage==='http',vantage:'Dal PC al relay pubblico, non da una sonda esterna o asiatica'};
}
function createInfrastructure({root,projects,agents}){
 let host={vpn:{state:'unknown',names:[],nodeRouting:'unknown'},windowsFirewall:{known:false,profiles:[]}},hostPending=false,lastHost=0,localPending=false;
 const local=new Map(),external=new Map(),checking=new Set();
 async function scanHost(){if(hostPending||Date.now()-lastHost<30000)return;hostPending=true;lastHost=Date.now();try{if(process.platform==='win32'){const r=await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts','network-status.ps1')],{timeout:10000,windowsHide:true});host=JSON.parse(r.stdout.replace(/^\uFEFF/,''));}else host={...host,checkedAt:new Date().toISOString(),errors:['Rilevamento VPN implementato per Windows']};}catch(e){host={...host,error:e.message,checkedAt:new Date().toISOString()};}finally{hostPending=false;}}
 async function scanLocal(){if(localPending)return;localPending=true;try{const list=projects.view();const ids=new Set(list.map(p=>p.id));for(const key of local.keys())if(!ids.has(key))local.delete(key);for(const key of external.keys())if(!ids.has(key))external.delete(key);await Promise.all(list.filter(p=>p.running).map(async p=>{try{const target=projects.publisher(p.id);const u=new URL(target.url);const result=await head({hostname:'127.0.0.1',port:u.port,path:'/',headers:{'X-Sentinel-Probe':target.secret}},http);local.set(p.id,{...result,localUrl:target.url});}catch(e){local.set(p.id,{ok:false,stage:'connection',message:e.message,localUrl:p.localUrl,checkedAt:new Date().toISOString()});}}));}finally{localPending=false;}}
 function snapshot(){void scanHost();return {checkedAt:new Date().toISOString(),pc:{hostname:os.hostname(),onlineInterfaces:Object.values(os.networkInterfaces()).flat().filter(i=>i&&!i.internal).length,uptimeSeconds:Math.floor(process.uptime())},host,rows:projects.view().map(p=>{const node=agents.snapshot(p.id);const last=local.get(p.id);const localResult=p.running?(last?.localUrl===p.localUrl?{...last,stale:Date.now()-Date.parse(last.checkedAt)>15000}:{stage:'pending',message:'Controllo locale in attesa'}):{stage:'stopped',message:'Server spento'};const latest=external.get(p.id);return {id:p.id,name:p.name,slug:p.slug,running:p.running,folder:p.websiteDir,node,shield:projects.metrics(p.id),local:localResult,internet:latest?{...latest,stale:Date.now()-Date.parse(latest.checkedAt)>60000}:null,checking:checking.has(p.id)};})};}
 async function verify(id){projects.get(id);if(checking.has(id))throw Error('Verifica già in corso');const node=agents.snapshot(id);if(!node.connected||!node.public||!node.url)throw Error('Il nodo e il suo Funnel devono essere attivi prima della verifica pubblica.');checking.add(id);try{const result=await publicProbe(node.url);external.set(id,result);return {message:result.ok?'DNS pubblico, TLS e HTTP verificati dal PC.':result.message,diagnostic:result};}finally{checking.delete(id);}}
 const timer=setInterval(()=>{void scanLocal();void scanHost();},5000);timer.unref();void scanLocal();return {snapshot,verify,reset:id=>external.delete(id),refreshLocal:scanLocal,close(){clearInterval(timer)}};
}
module.exports={createInfrastructure,publicProbe,publicIPv4};
