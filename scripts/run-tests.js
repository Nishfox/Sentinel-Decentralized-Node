'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');const files=fs.readdirSync(path.join(root,'test')).filter(x=>x.endsWith('.test.js')).map(x=>path.join(root,'test',x));
process.exitCode=spawnSync(process.execPath,['--test',...files],{stdio:'inherit',env:{...process.env,SENTINEL_DISABLE_TOOLS:'1',SENTINEL_DISABLE_TLS:'1'}}).status??1;
