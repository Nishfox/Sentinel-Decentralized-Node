const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('settings persist folder and project without restarting the web server',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-settings-'));
  const config=path.join(dir,'config.json'), dashboardPort=await port(),webPort=await port();
  fs.writeFileSync(config,JSON.stringify({projectName:'test',nodeName:'test',websiteDir:path.join(dir,'before'),webPort,dashboardPort,autoStart:true,tailscalePath:path.join(dir,'missing.exe')}));
  const child=spawn(process.execPath,[path.resolve(__dirname,'../src/server.js')],{env:{...process.env,SENTINEL_CONFIG:config},stdio:'ignore'});
  const base=`http://127.0.0.1:${dashboardPort}`;
  try {
    let state;
    for(let i=0;i<50;i++){try{state=await(await fetch(base+'/api/status')).json();break;}catch{}await new Promise(r=>setTimeout(r,100));}
    assert.ok(state);
    const save=data=>fetch(base+'/api/action/settings',{method:'POST',headers:{Origin:base,'X-Sentinel-Token':state.token,'Content-Type':'application/json'},body:JSON.stringify(data)});
    assert.equal((await save({projectName:'bad name',nodeName:'test',websiteDir:dir})).status,400);
    assert.equal((await save({projectName:'new-project',nodeName:'test',websiteDir:path.resolve(__dirname,'..')})).status,400);
    const site=path.join(dir,'after');
    const r=await save({projectName:'new-project',nodeName:'test',websiteDir:site});assert.equal(r.status,200,await r.text());
    assert.equal(JSON.parse(fs.readFileSync(config,'utf8')).websiteDir,site);
    assert.ok(fs.existsSync(path.join(site,'index.html')));
    fs.writeFileSync(path.join(site,'index.html'),'my new website');
    assert.equal(await(await fetch(`http://127.0.0.1:${webPort}`)).text(),'my new website');
    assert.equal((await(await fetch(base+'/api/status')).json()).configured,true);
  } finally {child.kill();await new Promise(r=>child.once('exit',r));fs.rmSync(dir,{recursive:true,force:true});}
});
