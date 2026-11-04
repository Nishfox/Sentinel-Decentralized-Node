// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const http=require('node:http');const https=require('node:https');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createShield,normalize}=require('./http-shield');
function createProjects({config,configPath,root,serve,log,security=null}) {
  const running=new Map();
  const shields=new Map();
  if(!Array.isArray(config.projects))config.projects=[];
  function persist(next,folders=config.projectFolders||[]){const value={...config,projects:next,projectFolders:folders};fs.writeFileSync(configPath+'.tmp',JSON.stringify(value,null,2));fs.renameSync(configPath+'.tmp',configPath);config.projects=next;config.projectFolders=folders;}
  const base=fs.realpathSync(config.websiteDir);
  function ownedDirectory(directory){const full=path.resolve(directory);if(path.dirname(full).toLowerCase()!==base.toLowerCase()||fs.lstatSync(full).isSymbolicLink()||fs.realpathSync(full).toLowerCase()!==full.toLowerCase())throw Error('Operazione rifiutata: la cartella deve essere una sottocartella diretta e reale di website.');return full;}
  if(!config.projectsInitialized){
    const imported=[...config.projects];
    for(const entry of fs.readdirSync(base,{withFileTypes:true})){
      if(!entry.isDirectory()||entry.isSymbolicLink()||entry.name.startsWith('.'))continue;
      const dir=path.join(base,entry.name);if(imported.some(p=>path.resolve(p.websiteDir).toLowerCase()===dir.toLowerCase()))continue;
      let slug=entry.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'sito';const stem=slug;let n=2;while(imported.some(p=>p.slug===slug))slug=stem+'-'+n++;
      imported.push({id:crypto.randomUUID(),name:entry.name,slug,websiteDir:dir,published:false});
    }
    config.projectsInitialized=true;persist(imported,[...new Set([...(config.projectFolders||[]),...imported.map(p=>p.websiteDir)])]);
  }
  function get(id){const p=config.projects.find(p=>p.id===id);if(!p)throw Error('Progetto non trovato');return p;}
  function shield(id){if(!shields.has(id))shields.set(id,createShield(get(id).shield,()=>Date.now(),security,id));return shields.get(id);}
  function metrics(id){return shield(id).view();}
  function publisher(id){get(id);const s=running.get(id);if(!s)throw Error('Server locale spento');return {url:`http://127.0.0.1:${s.address().port}/`,secret:shield(id).secret};}
  function identity(id,e){const p=config.projects.find(p=>p.id===id);if(!p)return;if(p.nodeUrl===e.url&&p.nodeId===e.nodeId)return;persist(config.projects.map(x=>x.id===id?{...x,nodeUrl:e.url,nodeId:e.nodeId}:x));}
  function view(){return config.projects.map(p=>({...p,running:running.has(p.id),localUrl:running.has(p.id)?`http://127.0.0.1:${running.get(p.id).address().port}/`:null,previewUrl:running.get(p.id)?.preview?`https://127.0.0.1:${running.get(p.id).preview.address().port}/`:null,publicPath:`/sites/${p.slug}/`}));}
  async function stop(id){const s=running.get(id);if(!s)return;running.delete(id);if(s.preview){s.preview.closeAllConnections();await new Promise(r=>s.preview.close(r));}s.closeAllConnections();await new Promise(r=>s.close(r));log('Progetto arrestato: '+get(id).name,'info',id);}
  async function start(id){const p=get(id);if(running.has(id))return;const s=http.createServer({maxHeaderSize:16384},shield(id).wrap((req,res)=>{res.on('finish',()=>{if(req.headers['x-sentinel-probe']!==shield(id).secret)log(`[${p.name}] ${req.method} ${req.url.split('?')[0].slice(0,200)} → ${res.statusCode}`,'info',id);});serve(p.websiteDir,req,res);}));s.headersTimeout=10000;s.requestTimeout=15000;s.keepAliveTimeout=5000;s.maxRequestsPerSocket=100;await new Promise((r,j)=>{s.once('error',j);s.listen(0,'127.0.0.1',r);});s.on('error',e=>log(e.message,'error',id));const cert=path.join(root,'runtime','tls','localhost.pem'),key=path.join(root,'runtime','tls','localhost-key.pem');if(fs.existsSync(cert)&&fs.existsSync(key)){try{s.preview=https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key),minVersion:'TLSv1.2'},s.listeners('request')[0]);s.preview.headersTimeout=10000;s.preview.requestTimeout=15000;await new Promise((r,j)=>{s.preview.once('error',j);s.preview.listen(0,'127.0.0.1',r);});}catch(e){s.closeAllConnections();await new Promise(r=>s.close(r));throw e;}}running.set(id,s);log('Progetto avviato: '+p.name,'info',id);}
  async function action(name,data){
    if(name==='project-save'){
      const old=data.id?get(data.id):null;
      if(old && (running.has(old.id)||old.published))throw Error('Arresta il progetto e rimuovi la pubblicazione prima di modificarlo.');
      const title=String(data.name||'').trim(),slug=String(data.slug||'').trim();
      if(!title || title.length>80)throw Error('Inserisci un nome, massimo 80 caratteri.');
      if(/[<>:"/\\|?*\x00-\x1f]/.test(title)||/[. ]$/.test(title)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(title)||title==='.'||title==='..')throw Error('Nome cartella non valido su Windows. Usa lettere, numeri e spazi, senza caratteri speciali o punto finale.');
      if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug))throw Error('Indirizzo: usa lettere minuscole, numeri e trattini, massimo 63 caratteri.');
      if(old&&old.slug!==slug)throw Error('Il nome della cartella e dell’indirizzo resta fisso. Puoi modificare il titolo del sito.');
      if(config.projects.some(p=>p.slug===slug && p.id!==old?.id))throw Error('Questo indirizzo progetto esiste già.');
      const chosen=path.join(base,title);
      if(!path.isAbsolute(chosen))throw Error('Cartella principale non valida.');
      if(!old&&fs.existsSync(chosen))throw Error('Esiste già una cartella con questo nome. Scegli un altro nome.');
      if(old&&path.resolve(old.websiteDir).toLowerCase()!==chosen.toLowerCase()){ownedDirectory(old.websiteDir);if(fs.existsSync(chosen))throw Error('La cartella di destinazione esiste già.');fs.renameSync(old.websiteDir,chosen);}
      fs.mkdirSync(chosen,{recursive:true});const dir=fs.realpathSync(chosen),app=fs.realpathSync(root);
      function overlaps(a,b){const r=path.relative(a,b),s=path.relative(b,a);return !r||!s||(!r.startsWith('..')&&!path.isAbsolute(r))||(!s.startsWith('..')&&!path.isAbsolute(s));}
      if(config.projects.some(p=>p.id!==old?.id&&overlaps(dir,p.websiteDir)))throw Error('Cartella già utilizzata da un altro progetto.');
      const inside=path.relative(app,dir),ancestor=path.relative(dir,app);
      if(!inside || !ancestor || (!ancestor.startsWith('..')&&!path.isAbsolute(ancestor)) || (!inside.startsWith('..')&&!path.isAbsolute(inside)&&inside.split(path.sep)[0]!=='website'))throw Error('Scegli una cartella separata dai file applicazione, oppure una sottocartella di website.');
      fs.accessSync(dir,fs.constants.R_OK|fs.constants.W_OK);
      if(!fs.existsSync(path.join(dir,'index.html')))fs.copyFileSync(path.join(root,'templates','site.html'),path.join(dir,'index.html'));
      const p={...old,id:old?.id||crypto.randomUUID(),name:title,slug,websiteDir:dir,published:false};
      persist(old?config.projects.map(x=>x.id===old.id?p:x):[...config.projects,p],[...new Set([...(config.projectFolders||[]),dir])]);log('Progetto salvato: '+title,'info',p.id);return {message:'Server e cartella creati. Avvia per l’anteprima oppure premi Pubblica.'};
    }
    const p=get(data.id);
    if(name==='project-shield'){const next=normalize(data.config);persist(config.projects.map(x=>x.id===p.id?{...x,shield:next}:x));shield(p.id).configure(next);return {message:'Protezioni HTTP salvate per '+p.name};}
    else if(name==='project-start')await start(p.id);
    else if(name==='project-stop')await stop(p.id);
    else if(name==='project-publish'){
      if(!running.has(p.id))throw Error('Avvia prima il progetto.');
      persist(config.projects.map(x=>x.id===p.id?{...x,published:true}:x));log('Progetto disponibile sul gateway: '+p.name,'info',p.id);
      return {message:'Pubblicazione predisposta. Il gateway web e Funnel devono essere attivi per l’accesso da Internet.'};
    }
    else if(name==='project-unpublish')persist(config.projects.map(x=>x.id===p.id?{...x,published:false}:x));
    else if(name==='project-delete'){
      if(data.confirmName!==p.name)throw Error('Conferma la cancellazione digitando il nome esatto del sito.');
      const target=ownedDirectory(p.websiteDir);
      await stop(p.id);
      // Delete exactly the checked direct child. Node removes child links themselves, not their targets.
      fs.rmSync(target,{recursive:true,force:false});
      persist(config.projects.filter(x=>x.id!==p.id));log('Server, progetto e cartella eliminati: '+p.name,'info',p.id);
      shields.delete(p.id);
      return {message:'Sito eliminato insieme alla sua cartella locale: '+target};
    }
    else throw Error('Azione progetto sconosciuta');
    return {message:'Operazione progetto completata.'};
  }
  function route(req,res){
    const match=/^\/sites\/([a-z0-9-]+)(\/|\?|$)/.exec(req.url);
    if(!req.url.startsWith('/sites/'))return false;
    const p=match&&config.projects.find(p=>p.slug===match[1]);
    if(!p||!p.published||!running.has(p.id)){res.writeHead(404);res.end('Progetto non pubblicato o arrestato');return true;}
    const prefix='/sites/'+p.slug;
    if(req.url[prefix.length]!=='/'){res.writeHead(308,{Location:prefix+'/'+req.url.slice(prefix.length)});res.end();return true;}
    const localReq={url:req.url.slice(prefix.length),method:req.method};
    res.on('finish',()=>log(`[${p.name}] ${req.method} ${localReq.url.split('?')[0].slice(0,200)} → ${res.statusCode}`,'info',p.id));serve(p.websiteDir,localReq,res);return true;
  }
  function protectedFile(file){return !!file && [...(config.projectFolders||[]),...config.projects.map(p=>p.websiteDir)].some(dir=>{const rel=path.relative(dir,file);return !rel||(!rel.startsWith('..')&&!path.isAbsolute(rel));});}
  async function shutdown(){for(const id of [...running.keys()])await stop(id);}
  return {view,action,route,shutdown,get,protectedFile,identity,metrics,publisher};
}
module.exports={createProjects};
