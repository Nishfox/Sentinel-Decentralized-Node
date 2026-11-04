// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
(function(root){
 function rowStates(row,now=Date.now()){
  const node=row.node||{},fresh=node.checkedAt&&now-Date.parse(node.checkedAt)<15000;
  const local=!row.running?'bad':row.local.stale?'warn':row.local.ok?'ok':row.local.stage==='pending'?'unknown':row.local.code&&row.local.code<500?'warn':'bad';
  const blockedRecently=row.shield.lastBlockedAt&&now-Date.parse(row.shield.lastBlockedAt)<60000;
  const shield=!row.running?'bad':row.shield.config.enabled?(blockedRecently?'warn':'ok'):'warn';
  const tail=!node.active||node.error?'bad':node.connected?(fresh?'ok':'warn'):node.loginUrl?'warn':'unknown';
  // The listener state and the optional end-to-end probe are separate evidence.
  // A newly published Funnel is active without requiring a manual HEAD probe.
  let internet=!row.running||!node.public||!node.connected||!node.active||node.error?'bad':fresh?'ok':'warn';
  if(internet==='ok'&&row.publication?.status==='waiting')internet='warn';
  if(internet==='ok'&&row.internet&&!row.internet.stale&&!row.internet.ok)internet='bad';
  return {local,shield,tail,internet};
 }
 const api={rowStates};if(typeof module==='object'&&module.exports)module.exports=api;else root.SentinelTopology=api;
})(typeof window==='object'?window:globalThis);
