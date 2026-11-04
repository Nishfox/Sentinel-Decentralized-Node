// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {zipSync,unzipSync,strToU8,strFromU8}=require('./vendor/fflate.cjs');
const MAX=128*1024*1024,MAX_ZIP=64*1024*1024;
function safePart(s){return typeof s==='string'&&s.length>0&&!/[<>:"\\|?*\x00-\x1f]/.test(s)&&!s.endsWith('.')&&!s.endsWith(' ')&&!['.','..'].includes(s)&&!s.includes('/')&&!/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(s);}
function safeEntry(name){return typeof name==='string'&&name.replace(/\/$/,'').split('/').every(safePart);}
function decode(data){
 if(data.length>MAX_ZIP)throw Error('Archivio ZIP oltre il limite di 64 MB.');let total=0,count=0;
 const files=unzipSync(data,{filter:f=>{if(++count>10000||!Number.isSafeInteger(f.originalSize)||(total+=f.originalSize)>MAX)throw Error('Archivio troppo grande: massimo 128 MB estratti e 10.000 file.');if(!safeEntry(f.name))throw Error('Percorso non valido nel backup.');return true;}});
 const manifest=JSON.parse(strFromU8(files['sentinel-backup.json']||new Uint8Array()));
 if(manifest.format!=='sentinel-backup-v1'||!Array.isArray(manifest.projects)||manifest.projects.length>100)throw Error('Formato backup Sentinel non valido.');
 const seen=new Set();for(const key of Object.keys(files)){const canonical=key.toLowerCase();if(seen.has(canonical))throw Error('Percorsi duplicati nel backup.');seen.add(canonical);if(key!=='sentinel-backup.json'&&!/^sites\/\d+\/.+/.test(key))throw Error('File estraneo al backup.');}
 for(const p of manifest.projects){if(!safePart(p.name)||p.name.length>80||!Number.isInteger(p.index)||p.index<0||!Number.isSafeInteger(p.index)||!/^([a-z0-9])(?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(p.slug))throw Error('Progetto nel backup non valido.');}
 if(new Set(manifest.projects.map(p=>p.index)).size!==manifest.projects.length)throw Error('Indici progetto duplicati.');
 for(const key of Object.keys(files))if(key!=='sentinel-backup.json'&&!manifest.projects.some(p=>key.startsWith('sites/'+p.index+'/')))throw Error('File senza progetto nel backup.');
 for(const [key,bytes]of Object.entries(files))if(key!=='sentinel-backup.json'&&(!manifest.hashes||manifest.hashes[key]!==crypto.createHash('sha256').update(bytes).digest('hex')))throw Error('Integrità del backup non valida: '+key);
 return {manifest,files};
}
function createBackups({root,config,projects,log}){
 const dir=path.join(root,'runtime','backups');fs.mkdirSync(dir,{recursive:true});
 function file(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Backup non valido.');const target=path.join(dir,id+'.zip');if(!fs.existsSync(target)||fs.lstatSync(target).isSymbolicLink())throw Error('Backup non trovato.');return target;}
 function list(){return fs.readdirSync(dir).filter(f=>/^[a-f0-9-]{36}\.json$/.test(f)).flatMap(f=>{try{return [JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))]}catch{return []}}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
 function store(data,manifest,reason){const id=crypto.randomUUID(),entry={id,createdAt:new Date().toISOString(),reason,bytes:data.length,projects:manifest.projects.map(p=>p.name)};fs.writeFileSync(path.join(dir,id+'.zip'),data,{flag:'wx'});fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify(entry,null,2));return entry;}
 function create(id,reason='manuale'){
  const selected=id?[projects.get(id)]:projects.view();const files={};let total=0,count=0;
  const manifest={format:'sentinel-backup-v1',createdAt:new Date().toISOString(),settings:{projectName:config.projectName,nodeName:config.nodeName,webPort:config.webPort,dashboardPort:config.dashboardPort},projects:[]};
  selected.forEach((p,index)=>{const base=fs.realpathSync(p.websiteDir);if(fs.lstatSync(p.websiteDir).isSymbolicLink())throw Error('Backup rifiutato: cartella collegata.');manifest.projects.push({index,name:p.name,slug:p.slug,shield:p.shield||null});
   function walk(folder,prefix){for(const item of fs.readdirSync(folder,{withFileTypes:true})){if(!safePart(item.name))throw Error('Nome file non portabile: '+item.name);const full=path.join(folder,item.name);const stat=fs.lstatSync(full);if(stat.isSymbolicLink())throw Error('Backup rifiutato: collegamento simbolico '+item.name);if(stat.isDirectory()){if(++count>10000)throw Error('Troppi file e cartelle.');files[prefix+item.name+'/']=new Uint8Array();walk(full,prefix+item.name+'/');}else if(stat.isFile()){if(++count>10000||(total+=stat.size)>MAX)throw Error('Backup oltre 128 MB o 10.000 file.');files[prefix+item.name]=new Uint8Array(fs.readFileSync(full));}}}
   walk(base,'sites/'+index+'/');
  });manifest.hashes=Object.fromEntries(Object.entries(files).map(([key,data])=>[key,crypto.createHash('sha256').update(data).digest('hex')]));files['sentinel-backup.json']=strToU8(JSON.stringify(manifest,null,2));const data=zipSync(files,{level:1});if(data.length>MAX_ZIP)throw Error('ZIP oltre 64 MB.');const entry=store(data,manifest,reason);log('Backup creato: '+entry.id);return entry;
 }
 function importZip(data){const {manifest}=decode(data);return store(data,manifest,'importato');}
 async function restore(id){
  const {manifest,files}=decode(new Uint8Array(fs.readFileSync(file(id))));const created=[];
  try{for(const p of manifest.projects){let name=p.name,slug=p.slug,n=1;while(projects.view().some(x=>x.slug===slug)||fs.existsSync(path.join(config.websiteDir,name))){const suffix='-ripristino-'+n++;slug=p.slug.slice(0,63-suffix.length)+suffix;name=p.name.slice(0,60)+' (ripristino '+(n-1)+')';}
    await projects.action('project-save',{name,slug});const project=projects.view().find(x=>x.slug===slug);created.push(project);
    const base=fs.realpathSync(project.websiteDir);if(!files['sites/'+p.index+'/index.html'])fs.unlinkSync(path.join(base,'index.html'));for(const [key,data]of Object.entries(files)){const prefix='sites/'+p.index+'/';if(!key.startsWith(prefix))continue;const relative=key.slice(prefix.length),target=path.resolve(base,...relative.split('/'));if(!target.startsWith(base+path.sep))throw Error('Percorso backup fuori dalla cartella.');if(key.endsWith('/'))fs.mkdirSync(target,{recursive:true});else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);}}
    if(p.shield)await projects.action('project-shield',{id:project.id,config:p.shield});
   }log('Backup ripristinato in '+created.length+' nuovi progetti, tutti spenti.');return created.map(p=>({id:p.id,name:p.name}));
  }catch(e){for(const p of created.reverse())await projects.action('project-delete',{id:p.id,confirmName:p.name});throw e;}
 }
 return {create,list,file,importZip,restore};
}
module.exports={createBackups,decode,MAX_ZIP};
