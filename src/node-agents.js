// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');const readline=require('node:readline');const crypto=require('node:crypto');
function createNodeAgents({root,log,onIdentity=()=>{},spawnProcess=spawn}){
 const nodes=new Map(),history=new Map();
 function snapshot(id){const n=nodes.get(id);return n?{...n.state,active:true}:{...history.get(id),active:false,connected:false,public:false};}
 function connect(project){if(nodes.has(project.id))return snapshot(project.id);
  const binary=path.join(root,'bin','sentinel-node.exe');if(!fs.existsSync(binary))throw Error('Componente nodi non compilato: esegui scripts/build-node-agent.ps1.');
  const privateDir=path.join(root,'runtime','nodes',project.id);fs.mkdirSync(privateDir,{recursive:true});
  const env={...process.env};for(const key of ['TS_AUTHKEY','TS_AUTH_KEY','TS_CLIENT_SECRET','TSNET_FORCE_LOGIN'])delete env[key];
  history.delete(project.id);
  const child=spawnProcess(binary,['--hostname',project.slug,'--state-dir',privateDir],{stdio:['pipe','pipe','pipe'],windowsHide:true,env});
  const n={child,state:{connected:false,public:false,state:'Avvio nodo'},pending:new Map()};nodes.set(project.id,n);
  readline.createInterface({input:child.stdout}).on('line',line=>{let e;try{e=JSON.parse(line)}catch{return}
   if(e.type==='state'){n.state={...n.state,...e,checkedAt:new Date().toISOString()};if(e.url)onIdentity(project.id,e);}
   else if(e.type==='result'){const request=n.pending.get(e.id);if(request){clearTimeout(request.timer);n.pending.delete(e.id);if(e.ok){if(request.action==='publish'||request.action==='unpublish'){n.state={...n.state,public:request.action==='publish',checkedAt:new Date().toISOString()};if(e.url)n.state.url=e.url;}request.resolve(e);}else request.reject(Error(e.error));}}
   else {log(`[${project.name}] ${e.message||e.error}`,'info',project.id);if(e.type==='fatal')n.state.error=e.error;}
  });
  child.stderr.on('data',d=>log(`[${project.name}] ${d.toString().slice(0,1000)}`,'info',project.id));
  const failed=message=>{for(const request of n.pending.values()){clearTimeout(request.timer);request.reject(Error(message));}n.pending.clear();history.set(project.id,{...n.state,loginUrl:'',public:false,connected:false});if(nodes.get(project.id)===n)nodes.delete(project.id);};
  child.on('error',e=>{log(e.message,'error',project.id);failed(e.message)});child.on('exit',()=>failed('Nodo arrestato'));return snapshot(project.id);
 }
 async function command(id,action,target,secret){const n=nodes.get(id);if(!n)throw Error('Collega prima il nodo di questo sito.');return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{n.pending.delete(id);reject(Error('Il nodo non ha completato l’operazione. Verifica login e autorizzazioni Tailscale.'));},30000);n.pending.set(id,{resolve,reject,timer,action});n.child.stdin.write(JSON.stringify({id,action,target,secret})+'\n',e=>{if(e){clearTimeout(timer);n.pending.delete(id);reject(e)}});});}
 async function stop(id){const n=nodes.get(id);if(!n)return;try{await command(id,'stop')}finally{if(n.child.exitCode===null){await Promise.race([new Promise(r=>n.child.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);if(n.child.exitCode===null)n.child.kill();}nodes.delete(id);}}
 async function forget(id){if(nodes.has(id)){await command(id,'logout');await stop(id);}/* Identity is retained outside website for recovery; remote record removal requires admin console. */}
 async function shutdown(){await Promise.all([...nodes.keys()].map(stop));}
 return {snapshot,connect,command,stop,forget,shutdown};
}
module.exports={createNodeAgents};
