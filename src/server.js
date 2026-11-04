// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const http = require('node:http');
const https = require('node:https');
const {createAuth}=require('./auth');
const {createAI}=require('./ai-security');
const {createAssistant}=require('./ai-assistant');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const run = promisify(execFile);
const root = path.resolve(__dirname, '..');
const {createProjects}=require('./projects');
const {createNodeAgents}=require('./node-agents');
const {createInfrastructure}=require('./infrastructure');
const {createSecurity}=require('./security');
const {createLocalTools}=require('./local-tools');
const {createMonitoring}=require('./monitoring');
const {createBackups,MAX_ZIP}=require('./backups');
const {createPublication}=require('./publication');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.txt':'text/plain','.woff2':'font/woff2'};
function resolveFile(base, url) {
  let name; try { name = decodeURIComponent(new URL(url, 'http://localhost').pathname); } catch { return null; }
  if (name.includes('\0') || name.includes('\\')) return null;
  const file = path.resolve(base, '.' + name, name.endsWith('/') ? 'index.html' : '.');
  const relative = path.relative(base, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  try { const real = fs.realpathSync(file); const rel = path.relative(fs.realpathSync(base), real); return rel.startsWith('..') || path.isAbsolute(rel) ? null : real; } catch { return null; }
}
function serve(base, req, res) {
  const file = resolveFile(base, req.url);
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  let regular = false;
  try { regular = !!file && fs.statSync(file).isFile(); } catch { /* File may have been removed during an update. */ }
  if (!regular) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if (req.method === 'HEAD') return res.end();
  const stream = fs.createReadStream(file); stream.on('error', () => res.destroy()); stream.pipe(res);
}
async function main() {
  const configPath = process.env.SENTINEL_CONFIG || path.join(root, 'config.json');
  let configured = fs.existsSync(configPath);
  const c = JSON.parse(fs.readFileSync(configured ? configPath : path.join(root,'config.example.json'),'utf8').replace(/^\uFEFF/,''));
  if(c.publicationMode!=='dedicated-nodes-v1'||(c.projects||[]).some(p=>p.published)){
    c.publicationMode='dedicated-nodes-v1';
    c.projects=(c.projects||[]).map(p=>({...p,published:false}));
    fs.writeFileSync(configPath+'.tmp',JSON.stringify(c,null,2));fs.renameSync(configPath+'.tmp',configPath);
  }
  for (const key of ['webPort','dashboardPort']) if (!Number.isInteger(c[key]) || c[key]<1024 || c[key]>65535) throw Error('Invalid '+key);
  if (c.webPort === c.dashboardPort) throw Error('Ports must differ');
  c.websiteDir = path.resolve(path.dirname(configPath), c.websiteDir);
  fs.mkdirSync(c.websiteDir,{recursive:true});
  const dataRoot=process.env.SENTINEL_DATA_ROOT?path.resolve(process.env.SENTINEL_DATA_ROOT):root;
  const auth=createAuth({root:dataRoot});
  const tlsPort=c.dashboardTlsPort||(c.dashboardPort<65535?c.dashboardPort+1:65534);
  const tlsCert=path.join(root,'runtime','tls','localhost.pem'),tlsKey=path.join(root,'runtime','tls','localhost-key.pem');
  const tlsReady=process.env.SENTINEL_DISABLE_TLS!=='1'&&fs.existsSync(tlsCert)&&fs.existsSync(tlsKey);
  let secureDashboard=null;
  const token = crypto.randomBytes(32).toString('hex');
  const clients = new Set(), logs = [];
  let web = null, busy = false;
  function log(message, level='info',projectId=null) { const entry={time:new Date().toISOString(),level,message,projectId}; logs.push(entry); if(logs.length>250) logs.shift(); for(const res of clients) res.write('data: '+JSON.stringify(entry)+'\n\n'); console.log(`[${entry.time}] ${message}`); }
  let projects;const security=createSecurity({root:dataRoot,projects:()=>projects?projects.view():[]});
  projects=createProjects({config:c,configPath,root,serve,log,security});
  const agents=createNodeAgents({root,log,onIdentity:(id,e)=>projects.identity(id,e)});
  const infrastructure=createInfrastructure({root,projects,agents});
  const tools=createLocalTools({root:dataRoot,log,security});
  const monitoring=createMonitoring({root:dataRoot,infrastructure,tools});
  const ai=createAI({root:dataRoot,appRoot:root,infrastructure,projects,security,auth,tools,monitoring});
  const assistant=createAssistant({root:dataRoot,appRoot:root,ai,projects,security,auth,tools,diagnosePublication,configuration:()=>({dashboardPort:c.dashboardPort,dashboardTlsPort:tlsReady?tlsPort:null,legacyWebPort:c.webPort,bindAddress:'127.0.0.1',publicHTTPS:443})});
  const backups=createBackups({root:dataRoot,config:c,projects,log});
  const publication=createPublication({verify:id=>infrastructure.verify(id),node:id=>agents.snapshot(id),reset:id=>infrastructure.reset(id),log});
  async function diagnosePublication(message){
    const reply=(answer,options=[])=>({answer,clarification:options.length>0,options});
    const sites=projects.view().map(project=>({project,node:agents.snapshot(project.id)}));
    const input=message.toLowerCase();
    const named=sites.filter(({project,node})=>[project.name,project.slug,node.url].some(value=>value&&input.includes(value.toLowerCase())));
    const published=sites.filter(({project,node})=>project.running&&node.connected&&node.public&&node.url);
    const candidates=named.length?named:published;
    if(candidates.length>1)return reply('Quale sito vuoi controllare?',candidates.slice(0,3).map(({project})=>'Verifica HTTPS del sito '+project.name));
    const target=candidates[0];
    if(!target)return reply('Non vedo un sito pubblicato da controllare. Indicami il nome del progetto.');
    const {project,node}=target;
    if(!project.running||!node.connected||!node.public||!node.url)return reply(project.name+' · Controlla nella scheda che il server sia avviato, il nodo collegato e Funnel attivo.');
    if(publication.snapshot(project.id)?.status==='waiting')return reply('Verifica pubblica già in corso per '+project.name+'. Segui gli esiti nella scheda del sito.');
    let result;
    try{result=await infrastructure.verify(project.id);}catch(error){return reply(project.name+' · '+error.message);}
    if(result.diagnostic.ok)return reply(project.name+' · '+node.url+' risponde con HTTP '+result.diagnostic.code+'. DNS e HTTPS verificati dal PC.');
    const current=agents.snapshot(project.id);
    if(current.public&&current.connected&&current.url===node.url){
      publication.start(project.id);
      return reply(project.name+' · '+result.message+'\nHo avviato nuovi tentativi DNS e HTTPS. La scheda mostrerà il risultato.');
    }
    return reply(project.name+' · Lo stato del nodo è cambiato durante il controllo. Controlla la scheda del sito.');
  }
  const cli = c.tailscalePath || (process.platform==='win32' ? path.join(process.env.ProgramFiles || 'C:\\Program Files','Tailscale','tailscale.exe') : 'tailscale');
  let authorizationUrl = null;
  async function ts(args) { try { return (await run(cli,args,{timeout:20000,maxBuffer:1024*1024,windowsHide:true})).stdout; } catch(e) {
    const output = [e.stdout,e.stderr].filter(Boolean).join('\n');
    const link = output.match(/https:\/\/login\.tailscale\.com\/f\/funnel\?[^\s]+/);
    if(link) authorizationUrl = link[0];
    throw Error((output || e.message).slice(0,3000));
  } }
  async function network() {
    try { const s=JSON.parse(await ts(['status','--json'])); const f=JSON.parse(await ts(['funnel','status','--json'])); const dns=(s.Self?.DNSName || '').replace(/\.$/,'');
      const active=!!f.AllowFunnel?.[dns+':443'];
      const proxy=f.Web?.[dns+':443']?.Handlers?.['/']?.Proxy;
      return {connected:s.BackendState==='Running',state:s.BackendState,nodeName:dns.split('.')[0] || (s.Self?.HostName || '').toLowerCase(),authorizationUrl:authorizationUrl || (s.Self?.ID ? 'https://login.tailscale.com/f/funnel?node='+encodeURIComponent(s.Self.ID) : null),url:dns?'https://'+dns:null,funnel:active,managed:active && proxy===`http://127.0.0.1:${c.webPort}`};
    } catch(e) { return {connected:false,funnel:false,error:e.message}; }
  }
  async function start() { if(web) return; const candidate=http.createServer((req,res)=>{if(projects.route(req,res))return;if(projects.protectedFile(resolveFile(c.websiteDir,req.url))){res.writeHead(404);res.end('Usa il percorso pubblico del progetto');return;}res.on('finish',()=>log(`${req.method} ${req.url.split('?')[0].slice(0,300)} → ${res.statusCode}`)); serve(c.websiteDir,req,res);}); await new Promise((resolve,reject)=>{candidate.once('error',reject);candidate.listen(c.webPort,'127.0.0.1',resolve);}); candidate.on('error',e=>log(e.message,'error'));web=candidate;log('Web server avviato su porta '+c.webPort); }
  async function stop() { if(!web)return; const old=web; web=null; old.closeAllConnections(); await new Promise(r=>old.close(r));log('Web server arrestato'); }
  async function action(name, data={}) {
    if(busy) throw Error('Operazione già in corso'); busy=true;
    try {
      if(name==='ai-chat')return await assistant.chat(data);
      if(name==='ai-chat-cancel'){await assistant.cancel();return {message:'Risposta annullata.'};}
      if(name==='ai-chat-clear')return assistant.clear();
      if(name==='ai-autopilot')return assistant.configure(data);
      if(name==='ai-autopilot-undo')return await assistant.undo(data);
      if(name==='ai-autopilot-now'){void assistant.cycle();return {message:'Controllo Autopilot richiesto.'};}
      if(name==='ai-analyze'){if(assistant.busy())throw Error('Attendi la fine della chat o del controllo Autopilot.');return await ai.analyze();}
      if(name==='ai-cancel'){await ai.cancel();return {message:'Analisi annullata.'};}
      if(name==='tool-start'){tools.start(data.tool);return {message:'Strumento avviato.'};}
      if(name==='tool-stop'){await tools.stop(data.tool);return {message:'Strumento arrestato.'};}
      if(name==='auth-enable'){const cookie=await auth.enable(data.username,data.password);security.event('access','Protezione della dashboard attivata');return {message:'Accesso protetto attivato per dashboard e API.',authCookie:cookie};}
      if(name==='security-ban'){projects.get(data.id);security.ban(data.id,data.ip,Number(data.minutes));return {message:'Quarantena HTTP applicata.'};}
      if(name==='security-unban'){security.unban(data.id,data.ip);return {message:'Quarantena rimossa.'};}
      if(name==='security-integrity')return {message:'Controllo integrità completato.',integrity:security.integrity(data.baseline===true)};
      if(name==='backup-create')return {message:'Backup creato.',backup:backups.create(data.id)};
      if(name==='backup-restore'){if(data.confirm!==data.id)throw Error('Conferma ripristino non valida.');const restored=await backups.restore(data.id);return {message:'Ripristinati '+restored.length+' progetti in cartelle nuove. Avviali e autorizza i nuovi nodi prima di pubblicare.',restored};}
      if(['project-unpublish','project-stop','project-delete'].includes(name))publication.cancel(data.id);
      if(name==='project-recheck'){const n=agents.snapshot(data.id);projects.get(data.id);if(!n.public||!n.connected)throw Error('Pubblica prima il sito.');publication.start(data.id);return {message:'Verifica automatica riavviata.'};}
      if(name==='project-verify')return await infrastructure.verify(data.id);
      if(name==='project-publish') {
        const p=projects.get(data.id);
        if(!agents.snapshot(p.id).active)agents.connect(p);
        if(!agents.snapshot(p.id).connected)return {message:'Nodo dedicato in avvio. Premi Autorizza nodo sulla scheda quando compare, completa il login Tailscale e poi premi Pubblica.'};
        await projects.action('project-start',data);const local=projects.view().find(x=>x.id===p.id);
        const result=await agents.command(p.id,'publish',local.localUrl,projects.publisher(p.id).secret);
        await projects.action(name,data);publication.start(p.id);return {message:'Funnel dedicato attivo: '+result.url+'. DNS e certificato possono richiedere alcuni minuti.'};
      }
      if(name==='project-start'){await projects.action(name,data);agents.connect(projects.get(data.id));return {message:'Server avviato e nodo dedicato in collegamento. Il sito resta privato finché premi Pubblica; al primo avvio autorizza il nodo Tailscale.'};}
      if(name==='project-connect'){agents.connect(projects.get(data.id));return {message:'Avvio del nodo dedicato. Completa l’autorizzazione nella sua scheda.'};}
      if(name==='project-stop'){await agents.stop(data.id);await projects.action('project-unpublish',data);}
      if(name==='project-unpublish'&&agents.snapshot(data.id).active)await agents.command(data.id,'unpublish');
      if(name==='project-delete'){const p=projects.get(data.id);if(data.confirmName!==p.name)throw Error('Conferma digitando il nome esatto del sito.');backups.create(p.id,'prima eliminazione');await agents.forget(p.id);}
      if(name.startsWith('project-')) return await projects.action(name,data);
      if(name==='settings') {
        const projectName=String(data.projectName || '').trim(), nodeName=String(data.nodeName || '').trim();
        if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(projectName) || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(nodeName)) throw Error('Nomi: 1–63 lettere minuscole, numeri e trattini.');
        if(!path.isAbsolute(data.websiteDir || '')) throw Error('Inserisci un percorso assoluto per la cartella sito.');
        if(c.projects.length && path.resolve(data.websiteDir)!==c.websiteDir)throw Error('La cartella principale resta fissa mentre sono presenti progetti.');
        const dir=path.resolve(data.websiteDir);
        const rel=path.relative(dir,root), inside=path.relative(root,dir);
        if(!rel || !inside || (!rel.startsWith('..') && !path.isAbsolute(rel)) || (!inside.startsWith('..') && !path.isAbsolute(inside) && dir!==path.join(root,'website'))) throw Error('Usa una cartella separata dai file applicazione.');
        fs.mkdirSync(dir,{recursive:true});
        fs.accessSync(dir,fs.constants.R_OK | fs.constants.W_OK);
        const n=await network();
        if(nodeName!==(n.nodeName || c.nodeName)) {
          if(!n.connected) throw Error('Collega prima Tailscale per modificare il nome nodo.');
          if(n.funnel) throw Error('Disattiva prima Funnel: il cambio nome modifica anche il dominio pubblico.');
          await ts(['set','--hostname='+nodeName]);
        }
        const next={...c,projectName,nodeName,websiteDir:dir};
        fs.writeFileSync(configPath+'.tmp',JSON.stringify(next,null,2));
        fs.renameSync(configPath+'.tmp',configPath);
        Object.assign(c,next); configured=true;
        if(!fs.existsSync(path.join(dir,'index.html'))) fs.copyFileSync(path.join(root,'templates','site.html'),path.join(dir,'index.html'));
        log('Configurazione salvata. Cartella pubblica: '+dir);
      }
      else if(name==='open-folder') {
        if(process.platform!=='win32') throw Error('Disponibile su Windows');
        const directory=fs.realpathSync(data.id?projects.get(data.id).websiteDir:c.websiteDir);
        if(!fs.statSync(directory).isDirectory()) throw Error('Cartella sito non disponibile');
        try {
          await run(path.join(process.env.WINDIR || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts','open-website-folder.ps1'),'-Directory',directory],{windowsHide:true,timeout:15000,maxBuffer:128*1024});
        } catch(e) { throw Error((e.stderr || e.message).slice(0,1500)); }
        log('Cartella sito aperta in Esplora file: '+directory);
        return {message:'Cartella locale aperta in Esplora file: '+directory};
      }
      else if(name==='shutdown') { log('Arresto Sentinel richiesto'); setTimeout(shutdown,1000); }
      else if(name==='start') await start();
      else if(name==='stop') await stop();
      else if(name==='sync') { const n=await network(); if(!n.connected) throw Error('Apri Tailscale e completa il login; poi sincronizza.'); log('Stato rete sincronizzato'); }
      else if(name==='funnel-on') { if(!web) throw Error('Avvia prima il server web'); const n=await network(); if(!n.connected) throw Error(n.error || 'Tailscale non connesso'); const existing=JSON.parse(await ts(['serve','status','--json'])); if(existing.TCP?.['443'] && !n.managed) throw Error('Porta Tailscale 443 già configurata: risolvi il conflitto dal client Tailscale.'); log(await ts(['funnel','--bg','--https=443',`http://127.0.0.1:${c.webPort}`])); }
      else if(name==='funnel-off') { const n=await network(); if(!n.managed) throw Error('Nessun Funnel Sentinel da arrestare'); log(await ts(['funnel','--https=443','off'])); }
      else throw Error('Azione sconosciuta');
    } finally {busy=false;}
  }
  function json(res,code,data){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
  const handleDashboard=async(req,res)=>{
    const allowed=new Set([`127.0.0.1:${c.dashboardPort}`,`localhost:${c.dashboardPort}`,`127.0.0.1:${tlsPort}`,`localhost:${tlsPort}`]);
    if(!allowed.has(req.headers.host)) return json(res,403,{error:'Host non consentito'});
    const frameAncestors=req.url.split('?')[0]==='/guida/manuale.html'?"'self'":"'none'";
    res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors "+frameAncestors+"; base-uri 'none'");
    try {
      const sameOrigin=req.headers.origin===`${req.socket.encrypted?'https':'http'}://${req.headers.host}`;
      if(tlsReady&&!req.socket.encrypted&&req.method==='GET'&&['/','/login.html'].includes(req.url.split('?')[0])){res.writeHead(302,{Location:`https://127.0.0.1:${tlsPort}${req.url}`});return res.end();}
      if(req.url==='/api/auth/status'&&req.method==='GET')return json(res,200,{...auth.snapshot(),https:!!req.socket.encrypted,tlsReady,tlsPort});
      if(req.url==='/api/auth/login'&&req.method==='POST'){
        if(!sameOrigin||!req.socket.encrypted)return json(res,403,{error:'Usa il collegamento HTTPS locale.'});let body='';for await(const chunk of req){body+=chunk;if(body.length>2048)throw Error('Richiesta troppo grande');}try{const data=JSON.parse(body);res.setHeader('Set-Cookie',await auth.login(data.username,data.password,req.socket.remoteAddress));return json(res,200,{ok:true});}catch(e){security.event('access','Accesso alla dashboard rifiutato');return json(res,401,{error:e.message});}
      }
      if(req.url==='/api/auth/logout'&&req.method==='POST'){if(!sameOrigin)return json(res,403,{error:'Origine non valida'});res.setHeader('Set-Cookie',auth.logout(req));return json(res,200,{ok:true});}
      const publicAuthFiles=['/login.html','/login.css','/login.js'];
      if(req.url!=='/api/health'&&!publicAuthFiles.includes(req.url.split('?')[0])&&!auth.authorized(req)){if(req.url.startsWith('/api/'))return json(res,401,{error:'Accedi alla dashboard.'});res.writeHead(302,{Location:'/login.html'});return res.end();}
      if(req.url==='/api/health' && req.method==='GET') return json(res,200,{app:'sentinel-suite',instance:root.replace(/[\\/]+$/,'').toLowerCase(),pid:process.pid,tlsPort:tlsReady?tlsPort:null});
      if(req.url==='/api/infrastructure' && req.method==='GET'){const value=infrastructure.snapshot();value.rows=value.rows.map(p=>({...p,publication:publication.snapshot(p.id)}));return json(res,200,value);}
      if(req.url==='/api/ai/status'&&req.method==='GET')return json(res,200,await ai.status());
      if(req.url==='/api/ai/assistant'&&req.method==='GET')return json(res,200,assistant.snapshot());
      if(req.url==='/api/monitoring'&&req.method==='GET')return json(res,200,monitoring.snapshot());
      if(req.url==='/api/tools'&&req.method==='GET')return json(res,200,tools.snapshot());
      if(req.url==='/api/security'&&req.method==='GET')return json(res,200,security.snapshot());
      if(req.url==='/api/diagnostics'&&req.method==='GET'){
        let installation=null;try{installation=JSON.parse(fs.readFileSync(path.join(root,'runtime','installation-check.json'),'utf8').replace(/^\uFEFF/,''));}catch{}
        const checks=[{label:'Dashboard',ok:true,detail:'Loopback '+c.dashboardPort},{label:'Runtime Node.js',ok:Number(process.versions.node.split('.')[0])>=20,detail:process.version},...['Avvia-Sentinel.bat','bin/sentinel-node.exe','scripts/verify-installation.ps1','uninstall.ps1'].map(file=>({label:file,ok:fs.existsSync(path.join(root,file)),detail:'File locale'})),{label:'Backup locali',ok:true,detail:backups.list().length+' archivi in runtime/backups'}];
        return json(res,200,{checks,installation});
      }
      if(req.url==='/api/backups'&&req.method==='GET')return json(res,200,{backups:backups.list()});
      if(req.url.startsWith('/api/backups/download?')&&req.method==='GET'){
        if(req.headers['x-sentinel-token']!==token)return json(res,403,{error:'Sessione non valida'});
        const id=new URL(req.url,'http://localhost').searchParams.get('id');const file=backups.file(id);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="sentinel-'+id+'.zip"','Cache-Control':'no-store'});fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);return;
      }
      if(req.url==='/api/backups/import'&&req.method==='POST'){
        if(req.headers['x-sentinel-token']!==token||!sameOrigin)return json(res,403,{error:'Sessione non valida'});
        if(busy)throw Error('Operazione già in corso');busy=true;try{const chunks=[];let size=0;for await(const chunk of req){if((size+=chunk.length)>MAX_ZIP)throw Error('ZIP oltre 64 MB.');chunks.push(chunk);}return json(res,200,{backup:backups.importZip(Buffer.concat(chunks))});}finally{busy=false;}
      }
      if(req.url.startsWith('/api/project-logs?') && req.method==='GET') { const id=new URL(req.url,'http://localhost').searchParams.get('id');projects.get(id);return json(res,200,logs.filter(l=>l.projectId===id)); }
      if(req.url==='/api/status' && req.method==='GET') return json(res,200,{configured,projectName:c.projectName,nodeName:c.nodeName,websiteDir:c.websiteDir,webPort:c.webPort,web:!!web,busy,projects:projects.view().map(p=>({...p,node:agents.snapshot(p.id),publication:publication.snapshot(p.id)})),network:await network(),token});
      if(req.url==='/api/logs' && req.method==='GET') { res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});for(const l of logs)res.write('data: '+JSON.stringify(l)+'\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return; }
      if(req.url.startsWith('/api/action/') && req.method==='POST') {
        if(req.headers['x-sentinel-token']!==token || !sameOrigin) return json(res,403,{error:'Sessione non valida'});
        let body=''; for await(const chunk of req) { body+=chunk; if(body.length>8192) throw Error('Richiesta troppo grande'); }
        if(req.url==='/api/action/auth-enable'&&!req.socket.encrypted)throw Error('Configura l’accesso dal collegamento HTTPS locale.');const result=await action(req.url.slice('/api/action/'.length),body?JSON.parse(body):{});if(result?.authCookie){res.setHeader('Set-Cookie',result.authCookie);delete result.authCookie;}return json(res,200,{ok:true,...result});
      }
      serve(path.join(root,'dashboard'),req,res);
    } catch(e) {log(e.message,'error');json(res,400,{error:e.message});}
  };
  const dashboard=http.createServer(handleDashboard);
  if(tlsReady){if(!Number.isInteger(tlsPort)||tlsPort===c.dashboardPort||tlsPort===c.webPort)throw Error('Porta HTTPS dashboard non valida');secureDashboard=https.createServer({cert:fs.readFileSync(tlsCert),key:fs.readFileSync(tlsKey),minVersion:'TLSv1.2'},handleDashboard);await new Promise((resolve,reject)=>{secureDashboard.once('error',reject);secureDashboard.listen(tlsPort,'127.0.0.1',resolve);});}
  await new Promise((resolve,reject)=>{dashboard.once('error',reject);dashboard.listen(c.dashboardPort,'127.0.0.1',resolve);});
  const heartbeat=setInterval(()=>{for(const res of clients)res.write(': heartbeat\n\n');},15000);
  if(c.autoStart && process.env.SENTINEL_CONTROL_ONLY!=='1') await start().catch(e=>log(e.message,'error'));
  log(`Dashboard: http://127.0.0.1:${c.dashboardPort}`);
  async function shutdown(){clearInterval(heartbeat);publication.close();await assistant.close();await ai.close();security.close();monitoring.close();await tools.close();infrastructure.close();for(const res of clients)res.end();await agents.shutdown();await projects.shutdown();await stop();secureDashboard?.close();dashboard.close();}
  process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={resolveFile,serve};

