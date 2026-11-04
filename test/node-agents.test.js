const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {EventEmitter}=require('node:events');const {PassThrough,Writable}=require('node:stream');const {createNodeAgents}=require('../src/node-agents');
test('independent node names, persistent identities and isolated commands without joining a real tailnet',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-agents-'));fs.mkdirSync(path.join(root,'bin'));fs.writeFileSync(path.join(root,'bin','sentinel-node.exe'),'mock');const children=[],identities=[];
 function spawnProcess(binary,args){const child=new EventEmitter();child.args=args;child.stdout=new PassThrough();child.stderr=new PassThrough();child.exitCode=null;child.commands=[];child.kill=()=>{child.exitCode=0;child.emit('exit',0)};child.stdin=new Writable({write(chunk,enc,done){const cmd=JSON.parse(chunk.toString());child.commands.push(cmd);setImmediate(()=>{child.stdout.write(JSON.stringify({type:'result',id:cmd.id,ok:true})+'\n');if(cmd.action==='stop')setTimeout(()=>child.kill(),5);});done();}});children.push(child);return child;}
 const manager=createNodeAgents({root,log:()=>{},onIdentity:(id,e)=>identities.push([id,e.url]),spawnProcess});
 const a={id:'site-a',slug:'nish',name:'Nish'},b={id:'site-b',slug:'progetto-test',name:'Progetto Test'};
 try{
  manager.connect(a);manager.connect(b);assert.equal(children.length,2);assert.equal(children[0].args[1],'nish');assert.equal(children[1].args[1],'progetto-test');assert.notEqual(children[0].args[3],children[1].args[3]);
  children[0].stdout.write(JSON.stringify({type:'state',connected:true,nodeId:'one',url:'https://nish.tail.test.ts.net',public:false})+'\n');await new Promise(r=>setImmediate(r));assert.equal(manager.snapshot(a.id).connected,true);assert.equal(manager.snapshot(b.id).connected,false);assert.equal(identities[0][1],'https://nish.tail.test.ts.net');
  await manager.command(a.id,'publish','http://127.0.0.1:43210/');assert.equal(children[0].commands[0].action,'publish');assert.equal(children[1].commands.length,0);assert.equal(manager.snapshot(a.id).public,true);await manager.command(a.id,'unpublish');assert.equal(manager.snapshot(a.id).public,false);
  const stateDir=children[0].args[3];fs.writeFileSync(path.join(stateDir,'identity'),'saved');await manager.stop(a.id);assert.equal(manager.snapshot(a.id).active,false);assert.equal(manager.snapshot(b.id).active,true);
  manager.connect(a);assert.equal(children[2].args[3],stateDir);assert.equal(fs.readFileSync(path.join(stateDir,'identity'),'utf8'),'saved');
 }finally{await manager.shutdown();fs.rmSync(root,{recursive:true,force:true});}
});
