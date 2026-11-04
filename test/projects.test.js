const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const http=require('node:http');
const {createProjects}=require('../src/projects');const {serve,resolveFile}=require('../src/server');
test('automatic folders, independent servers, persistence and removal without leaking private files',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-projects-')),base=path.join(dir,'website'),configPath=path.join(dir,'config.json');fs.mkdirSync(base);fs.writeFileSync(path.join(base,'index.html'),'main');
 const config={websiteDir:base,projects:[]};const options={config,configPath,root:path.resolve(__dirname,'..'),serve,log:()=>{}};let projects=createProjects(options);
 const gateway=http.createServer((req,res)=>{if(projects.route(req,res))return;if(projects.protectedFile(resolveFile(base,req.url))){res.writeHead(404);return res.end();}serve(base,req,res);});await new Promise(r=>gateway.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${gateway.address().port}`;
 try{
  await projects.action('project-save',{name:'Alpha',slug:'alpha'});await projects.action('project-save',{name:'Beta',slug:'beta'});
  const [a,b]=projects.view();assert.equal(a.websiteDir,path.join(base,'Alpha'));assert.equal(b.websiteDir,path.join(base,'Beta'));
  fs.writeFileSync(path.join(a.websiteDir,'index.html'),'alpha site');fs.writeFileSync(path.join(b.websiteDir,'index.html'),'beta site');
  await assert.rejects(projects.action('project-save',{name:'Duplicate',slug:'alpha'}));
  assert.equal((await fetch(url+'/alpha/')).status,404);assert.equal((await fetch(url+'/sites/alpha/')).status,404);
  await projects.action('project-start',{id:a.id});await projects.action('project-start',{id:b.id});
  assert.equal(await(await fetch(projects.view()[0].localUrl)).text(),'alpha site');assert.equal(await(await fetch(projects.view()[1].localUrl)).text(),'beta site');
  await projects.action('project-publish',{id:a.id});assert.equal(await(await fetch(url+'/sites/alpha/')).text(),'alpha site');assert.equal((await fetch(url+'/sites/beta/')).status,404);
  await projects.action('project-stop',{id:a.id});assert.equal((await fetch(url+'/sites/alpha/')).status,404);assert.equal(await(await fetch(projects.view()[1].localUrl)).text(),'beta site');
  await projects.shutdown();const saved=JSON.parse(fs.readFileSync(configPath,'utf8'));projects=createProjects({...options,config:saved});assert.equal(projects.view().length,2);assert.equal(projects.view()[0].running,false);assert.equal(projects.view()[0].published,true);
  await projects.action('project-start',{id:a.id});assert.equal(await(await fetch(url+'/sites/alpha/')).text(),'alpha site');
  await projects.action('project-unpublish',{id:a.id});assert.equal((await fetch(url+'/sites/alpha/')).status,404);
  await assert.rejects(projects.action('project-delete',{id:a.id,confirmName:'wrong'}));assert.ok(fs.existsSync(a.websiteDir));
  await projects.action('project-delete',{id:a.id,confirmName:a.name});assert.equal(fs.existsSync(a.websiteDir),false);assert.equal((await fetch(url+'/Alpha/')).status,404);assert.equal((await fetch(url+'/sites/alpha/')).status,404);
  assert.equal(JSON.parse(fs.readFileSync(configPath,'utf8')).projects.length,1);
 }finally{await projects.shutdown();gateway.closeAllConnections();await new Promise(r=>gateway.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
test('existing folders are imported without changing files; names with spaces create matching folders',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-import-'));const base=path.join(dir,'website');fs.mkdirSync(base);
 for(const name of ['Mish','Test']){fs.mkdirSync(path.join(base,name));fs.writeFileSync(path.join(base,name,'index.html'),name);}
 const config={websiteDir:base};const options={config,configPath:path.join(dir,'config.json'),root:path.resolve(__dirname,'..'),serve,log:()=>{}};const projects=createProjects(options);
 try{
  assert.deepEqual(projects.view().map(p=>p.name),['Mish','Test']);assert.equal(fs.readFileSync(path.join(base,'Mish','index.html'),'utf8'),'Mish');
  await projects.action('project-save',{name:'Ciao Mondo',slug:'ciao-mondo'});const p=projects.view().find(p=>p.name==='Ciao Mondo');assert.equal(p.websiteDir,path.join(base,'Ciao Mondo'));assert.ok(fs.existsSync(path.join(p.websiteDir,'index.html')));
  const outside=path.join(dir,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'keep.txt'),'keep');const stored=config.projects.find(x=>x.id===p.id);stored.websiteDir=outside;
  await assert.rejects(projects.action('project-delete',{id:p.id,confirmName:p.name}));assert.ok(fs.existsSync(path.join(outside,'keep.txt')));stored.websiteDir=p.websiteDir;
  await projects.action('project-delete',{id:p.id,confirmName:p.name});assert.equal(fs.existsSync(path.join(base,'Ciao Mondo')),false);assert.ok(fs.existsSync(path.join(base,'Test','index.html')));
 }finally{await projects.shutdown();fs.rmSync(dir,{recursive:true,force:true});}
});
