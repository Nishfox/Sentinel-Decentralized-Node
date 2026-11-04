// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const os=require('node:os'),fs=require('node:fs'),path=require('node:path');
function cpuTicks(){return os.cpus().reduce((s,c)=>({idle:s.idle+c.times.idle,total:s.total+Object.values(c.times).reduce((a,b)=>a+b,0)}),{idle:0,total:0});}
function createMonitoring({root,infrastructure,tools}){
 const file=path.join(root,'runtime','monitor-history.json');let history={};try{history=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}let previous=cpuTicks(),cpu=0;const samples=[],alerts=[];
 function sample(){const ticks=cpuTicks(),delta=ticks.total-previous.total;cpu=delta>0?Math.max(0,Math.min(100,100*(1-(ticks.idle-previous.idle)/delta))):0;previous=ticks;const time=new Date().toISOString(),data=infrastructure.snapshot();const ids=new Set(data.rows.map(r=>r.id));for(const id of Object.keys(history))if(!ids.has(id))delete history[id];
  for(const row of data.rows){let h=history[row.id]||(history[row.id]=[]);const status=!row.running?'stopped':row.local.stale||row.local.stage==='pending'?'unknown':row.local.ok?'up':'down';const last=h.at(-1);if(last&&last.status!==status&&['up','down'].includes(status)){alerts.unshift({time,projectId:row.id,name:row.name,status,message:row.name+(status==='up'?' è tornato raggiungibile':' non risponde al controllo locale')});if(alerts.length>100)alerts.pop();}h.push({time,status,latencyMs:row.local.latencyMs??null});if(h.length>5760)h.splice(0,h.length-5760);}
  samples.push({time,cpu:Math.round(cpu*10)/10,memoryUsed:os.totalmem()-os.freemem()});if(samples.length>120)samples.shift();try{fs.writeFileSync(file+'.tmp',JSON.stringify(history));fs.renameSync(file+'.tmp',file);}catch{} }
 const timer=setInterval(sample,15000);timer.unref();sample();
 function snapshot(){const data=infrastructure.snapshot();return {checkedAt:new Date().toISOString(),host:{cpuPercent:Math.round(cpu*10)/10,memoryTotal:os.totalmem(),memoryUsed:os.totalmem()-os.freemem(),uptimeSeconds:os.uptime(),processMemory:process.memoryUsage().rss,logicalCPUs:os.cpus().length},samples:[...samples],alerts:[...alerts],tools:tools.snapshot(),sites:data.rows.map(r=>{const h=history[r.id]||[],valid=h.filter(x=>['up','down'].includes(x.status));return {id:r.id,name:r.name,running:r.running,public:r.node.public,local:r.local,traffic:r.shield,history:h.slice(-60),uptimePercent:valid.length?Math.round(valid.filter(x=>x.status==='up').length/valid.length*10000)/100:null,checks:valid.length};}),scope:'Disponibilità locale campionata ogni 15 s, massimo 24 h. Le pause volontarie e i campioni sconosciuti sono esclusi. Un periodo senza Sentinel attivo non è misurato.'};}
 return {snapshot,sample,close(){clearInterval(timer);}};
}
module.exports={createMonitoring};
