const {test}=require('node:test');const assert=require('node:assert/strict');const {createPublication}=require('../src/publication');
async function until(fn){for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Timeout test');}
test('publication retries DNS activation, reports success, failure and cancellation independently',async()=>{
 let count=0;const jobs=createPublication({node:()=>({active:true,public:true}),log:()=>{},delays:[0,1,1],verify:async id=>({message:'probe',diagnostic:{ok:id==='good'&&++count>=2}})});
 try{jobs.start('good');await until(()=>jobs.snapshot('good').status==='reachable');assert.equal(jobs.snapshot('good').attempt,2);jobs.start('bad');await until(()=>jobs.snapshot('bad').status==='failed');assert.equal(jobs.snapshot('bad').attempt,3);jobs.start('cancel');jobs.cancel('cancel');await new Promise(r=>setTimeout(r,10));assert.equal(jobs.snapshot('cancel'),null);}finally{jobs.close();}
});
