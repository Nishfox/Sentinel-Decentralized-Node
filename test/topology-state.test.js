const {test}=require('node:test');const assert=require('node:assert/strict');
const {rowStates}=require('../dashboard/infrastructure-state');
test('topology separates a connected private node from an active Funnel and public probe failures',()=>{
 const now=Date.now(),row={running:true,local:{ok:true},shield:{config:{enabled:true}},node:{active:true,connected:true,public:false,checkedAt:new Date(now).toISOString()},internet:null};
 assert.deepEqual(rowStates(row,now),{local:'ok',shield:'ok',tail:'ok',internet:'bad'});
 row.node.public=true;assert.equal(rowStates(row,now).internet,'ok');
 row.internet={ok:false,stale:false};assert.equal(rowStates(row,now).internet,'bad');
 row.internet.stale=true;assert.equal(rowStates(row,now).internet,'ok');
 row.node.public=false;assert.equal(rowStates(row,now).internet,'bad');assert.equal(rowStates(row,now).tail,'ok');
 row.node.connected=false;row.node.loginUrl='https://login.tailscale.com';assert.equal(rowStates(row,now).tail,'warn');
 row.node.public=true;assert.equal(rowStates(row,now).internet,'bad');
 row.running=false;assert.equal(rowStates(row,now).local,'bad');
});
