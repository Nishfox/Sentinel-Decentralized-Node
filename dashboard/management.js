// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const managementStyle=document.createElement('link');managementStyle.rel='stylesheet';managementStyle.href='/management.css';document.head.append(managementStyle);
const management=document.createElement('section');management.className='management';management.hidden=true;management.innerHTML='<div id="backup-view"><h2>Backup e ripristino</h2><p class="muted">ZIP locali con file dei siti e configurazione dei progetti. Non includono chiavi o identità private Tailscale: i nodi ripristinati richiedono una nuova autorizzazione.</p><div class="setup-controls"><button id="backup-all">Crea backup di tutti i siti</button><button id="backup-refresh" class="secondary">Aggiorna elenco</button></div><article><h3>Importa un backup Sentinel</h3><p class="muted">Massimo 64 MB ZIP / 128 MB estratti. Il ripristino crea progetti spenti in cartelle nuove e non sovrascrive i siti esistenti. Porte e impostazioni globali sono conservate nel manifest per consultazione; non vengono applicate automaticamente.</p><input id="backup-upload" type="file" accept=".zip,application/zip"><button id="backup-import" class="secondary">Importa ZIP</button></article><div id="backup-list"></div></div><div id="diagnostics-view"><h2>Installazione e diagnostica</h2><p class="muted">Verifiche reali di questa installazione e istruzioni per il collaudo finale.</p><button id="diagnostics-refresh">Esegui controllo</button><article><p id="diagnostics-status" role="status"></p><ul id="diagnostics-result"></ul></article><article><h3>Collaudo su Windows pulito</h3><p class="warning">Non ancora eseguito su una macchina pulita. I test locali non certificano installazione, UAC e riavvio su un altro PC.</p><ol><li>Esegui l’installer su Windows 10/11 x64 pulito e completa il wizard.</li><li>Apri Sentinel dal BAT e verifica che un secondo clic non crei duplicati.</li><li>Crea un sito, autorizza il suo nodo e pubblicalo. Apri l’URL dal telefono in rete mobile.</li><li>Riavvia Windows e verifica dashboard, siti salvati e avvio dal BAT.</li><li>Esporta un backup, ripristinalo, poi esegui la disinstallazione e verifica che siti, backup e identità siano conservati.</li></ol><p class="muted">Lo script scripts/verify-installation.ps1 salva un report locale; scripts/Test-Sentinel.wsb apre un ambiente Windows Sandbox quando disponibile.</p></article></div><p id="management-notice" role="status"></p>';document.querySelector('.heading').after(management);
function managementMessage(text){$('management-notice').textContent=text;}
async function listBackups(){try{const r=await fetch('/api/backups');if(!r.ok)throw Error('Elenco backup non disponibile');const data=await r.json();const target=$('backup-list');target.replaceChildren();if(!data.backups.length)target.textContent='Nessun backup. Crea il primo prima di modificare i siti.';for(const b of data.backups){const card=document.createElement('article'),title=document.createElement('h3'),detail=document.createElement('p'),actions=document.createElement('div');title.textContent=b.projects.join(', ')||'Configurazione';detail.className='muted';detail.textContent=new Date(b.createdAt).toLocaleString('it-IT')+' · '+b.reason+' · '+(b.bytes/1048576).toFixed(2)+' MB';actions.className='actions';const download=document.createElement('button');download.className='secondary';download.textContent='Scarica ZIP';download.onclick=async()=>{try{const r=await fetch('/api/backups/download?id='+encodeURIComponent(b.id),{headers:{'X-Sentinel-Token':state.token}});if(!r.ok)throw Error('Download non riuscito');const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='sentinel-'+b.id+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){managementMessage(e.message);}};const restore=document.createElement('button');restore.textContent='Ripristina come nuovi progetti';restore.onclick=async()=>{if(!confirm('Ripristinare questo ZIP in nuovi progetti spenti, senza sovrascrivere quelli esistenti?'))return;restore.disabled=true;try{const r=await projectAction('backup-restore',{id:b.id,confirm:b.id});managementMessage(r.message);}catch(e){managementMessage(e.message);}finally{restore.disabled=false;}};actions.append(download,restore);card.append(title,detail,actions);target.append(card);}}catch(e){managementMessage(e.message);}}
$('backup-all').onclick=async()=>{const b=$('backup-all');b.disabled=true;try{await projectAction('backup-create',{});managementMessage('Backup completo creato. Ora puoi scaricare lo ZIP.');await listBackups();}catch(e){managementMessage(e.message);}finally{b.disabled=false;}};$('backup-refresh').onclick=listBackups;
$('backup-import').onclick=async()=>{const file=$('backup-upload').files[0];if(!file){managementMessage('Seleziona un file ZIP Sentinel.');return;}if(file.size>64*1048576){managementMessage('Il limite ZIP è 64 MB.');return;}const button=$('backup-import');button.disabled=true;try{const r=await fetch('/api/backups/import',{method:'POST',headers:{'X-Sentinel-Token':state.token,'Content-Type':'application/zip'},body:file});const data=await r.json();if(!r.ok)throw Error(data.error);managementMessage('ZIP validato e importato. Scegli Ripristina per creare i nuovi progetti.');await listBackups();}catch(e){managementMessage(e.message);}finally{button.disabled=false;}};
async function diagnostics(){
  const button=$('diagnostics-refresh'), result=$('diagnostics-result'), status=$('diagnostics-status');
  if(button.disabled)return;
  const row=(state,label,detail)=>{
    const item=document.createElement('li');
    item.dataset.state=state;
    const badge=document.createElement('strong');
    badge.textContent=({ok:'OK',warning:'Da verificare',error:'Errore'})[state];
    item.append(badge,document.createTextNode(' '+label+(detail?' — '+detail:'')));
    result.append(item);
    return item;
  };
  button.disabled=true;
  button.textContent='Controllo in corso…';
  for(const item of result.children){item.dataset.state='pending';item.querySelector('strong').textContent='In attesa';}
  status.textContent='Verifica dei componenti locali in corso…';
  try{
    const response=await fetch('/api/diagnostics',{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Diagnostica non disponibile (HTTP '+response.status+')');
    const {checks,installation}=await response.json();
    result.replaceChildren();
    for(const check of checks)row(check.ok?'ok':'error',check.label,check.ok?check.detail:'Mancante o non compatibile · '+check.detail);
    row('warning','Collaudo su Windows pulito','Ancora da eseguire');
    if(installation){
      row(installation.passed?'ok':'warning','Report installer salvato',new Date(installation.checkedAt).toLocaleString());
      row(installation.rebootObserved?'ok':'warning','Riavvio Windows',installation.rebootObserved?'Verificato nel report':'Ancora da verificare');
      for(const check of installation.checks)row(check.ok?'ok':'error',check.label,'Esito del report salvato');
    }else{
      row('warning','Report installer','Nessun report salvato');
    }
    const rows=Array.from(result.children,item=>({item,state:item.dataset.state,badge:item.querySelector('strong'),label:item.querySelector('strong').textContent}));
    for(const {item,badge} of rows){
      item.dataset.state='pending';
      badge.textContent='In attesa';
    }
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(const [index,{item,state,badge,label}] of rows.entries()){
      status.textContent='Esiti '+(index+1)+' di '+rows.length+'…';
      if(!reduced)await new Promise(resolve=>setTimeout(resolve,120));
      item.dataset.state=state;
      badge.textContent=label;
    }
    status.textContent='Controllo completato alle '+new Date().toLocaleTimeString()+'.';
  }catch(error){
    result.replaceChildren();
    status.textContent='Controllo non riuscito.';
    row('error','Diagnostica',error.message);
  }finally{
    button.disabled=false;
    button.textContent='Esegui controllo';
  }
}
$('diagnostics-refresh').onclick=diagnostics;
function showShareQR(url){const dialog=document.createElement('dialog');dialog.className='setup-dialog';const title=document.createElement('h2');title.textContent='Apri il sito dal telefono';const box=document.createElement('div');box.className='share-qr';const qr=qrcode(0,'M');qr.addData(url);qr.make();box.innerHTML=qr.createSvgTag({cellSize:5,margin:4,scalable:true});const link=document.createElement('p');link.className='share-url';link.textContent=url;const note=document.createElement('p');note.className='muted';note.textContent='Usa questo indirizzo esatto, senza www. Il sito deve essere pubblicato e il PC acceso.';const close=document.createElement('button');close.textContent='Chiudi';close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.append(title,box,link,note,close);document.body.append(dialog);dialog.showModal();}
function navigateManagement(){const hash=location.hash;document.querySelector('.heading .muted').textContent=({'#security':'Eventi, protezioni HTTP e integrità dei file dei tuoi siti.','#monitoring':'Disponibilità, risorse del PC e strumenti di osservabilità.','#ai':'Analisi delle evidenze e difesa periodica controllata.','#ai-chat':'Parla con Qwen della tua applicazione e della rete.','#access':'Credenziali e sessioni per la dashboard e le API di controllo.','#backups':'Conserva e ripristina i tuoi progetti senza sovrascriverli.','#diagnostics':'Verifiche locali e stato dell’installazione Sentinel.'}[hash])||'Un sito, una cartella, un nodo Tailscale dedicato. Tutto dalla sua scheda.';management.hidden=!['#backups','#diagnostics','#security','#monitoring','#access','#ai','#ai-chat'].includes(hash);$('backup-view').hidden=hash!=='#backups';$('diagnostics-view').hidden=hash!=='#diagnostics';const projects=document.querySelector('.project-section');if(projects)projects.hidden=hash!=='#sites'&&hash!=='';for(const a of document.querySelectorAll('aside nav a'))a.classList.toggle('selected',a.hash===(hash||'#sites'));document.body.classList.toggle('management-mode',!management.hidden);if(!management.hidden){document.querySelector('.heading').scrollIntoView({block:'start'});document.querySelector('h1').textContent=({'#backups':'I tuoi dati, al sicuro.','#diagnostics':'Sentinel, pronto all’uso.','#security':'Protezione, sotto controllo.','#monitoring':'La salute della tua infrastruttura.','#ai':'Il tuo assistente di sicurezza locale.','#ai-chat':'Una chat per capire e diagnosticare.','#access':'Accessi amministrativi, sotto controllo.'}[hash]);if(hash==='#backups')void listBackups();else if(hash==='#diagnostics')void diagnostics();if(typeof renderOperations==='function')void renderOperations();}}
const managementMount=setInterval(()=>{if(!infraMounted)return;clearInterval(managementMount);const nav=document.querySelector('aside nav');nav.replaceChildren();for(const [label,items]of [['PUBBLICAZIONE',[['Siti e nodi','#sites'],['Infrastruttura','#local-infrastructure']]],['SICUREZZA',[['Centro sicurezza','#security'],['Accessi e IAM','#access'],['Analisi AI','#ai'],['AI Chat','#ai-chat']]],['MONITORAGGIO',[['Risorse e disponibilità','#monitoring']]],['DATI',[['Backup e ripristino','#backups']]],['SISTEMA',[['Installazione e diagnostica','#diagnostics']]]]){const category=document.createElement('span');category.className='nav-category';category.textContent=label;nav.append(category);for(const [text,href]of items){const link=document.createElement('a');link.href=href;link.textContent=text;link.setAttribute('aria-label',text);link.dataset.icon=({'#sites':'▦','#local-infrastructure':'◎','#security':'◇','#access':'⌘','#ai':'✦','#ai-chat':'◉','#monitoring':'◴','#backups':'▣','#diagnostics':'⚙'}[href]);nav.append(link);}}const guide=document.createElement('a');guide.href='/guida/manuale.html#p3';guide.target='sentinel-manual';guide.addEventListener('click',event=>{
  event.preventDefault();
  const manual=window.open(guide.href,guide.target,'popup,width=1100,height=800,resizable=yes,scrollbars=yes');
  if(manual){manual.focus();return;}
  alert('Il browser ha bloccato la finestra. Consenti i popup per Sentinel e riprova.');
});guide.className='installation-guide';guide.textContent='Istruzioni';nav.append(guide);window.addEventListener('hashchange',navigateManagement);navigateManagement();},100);
