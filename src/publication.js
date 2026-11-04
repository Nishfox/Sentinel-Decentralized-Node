// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
function createPublication({verify,node,reset=()=>{},log,delays=[0,2500,5000,10000,20000,30000]}){
 const jobs=new Map();
 function cancel(id){const job=jobs.get(id);if(job){job.cancelled=true;clearTimeout(job.timer);}jobs.delete(id);reset(id);}
 function snapshot(id){const j=jobs.get(id);return j?{status:j.status,attempt:j.attempt,message:j.message,checkedAt:j.checkedAt}:null;}
 function start(id){cancel(id);const job={status:'waiting',attempt:0,message:'Attivazione DNS e HTTPS in corso',cancelled:false};jobs.set(id,job);
  async function attempt(){if(job.cancelled)return;job.attempt++;const n=node(id);if(!n.active||!n.public){job.status='failed';job.message='Funnel non attivo';return;}
   try{const r=await verify(id);if(job.cancelled)return;job.checkedAt=new Date().toISOString();job.message=r.message;if(r.diagnostic.ok){job.status='reachable';log('Sito raggiungibile tramite relay pubblico', 'info',id);return;}}catch(e){if(job.cancelled)return;job.message=e.message;}
   if(job.attempt>=delays.length){job.status='failed';log('Verifica pubblica non riuscita: '+job.message,'error',id);return;}
   job.status='waiting';job.timer=setTimeout(attempt,delays[job.attempt]);job.timer.unref?.();
  }job.timer=setTimeout(attempt,delays[0]);job.timer.unref?.();return snapshot(id);
 }
 function close(){for(const id of [...jobs.keys()])cancel(id);}
 return {start,cancel,snapshot,close};
}
module.exports={createPublication};
