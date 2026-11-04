// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const fs=require('node:fs'),path=require('node:path');const file=path.join(__dirname,'..','runtime','uptime-kuma','package.json');const p=JSON.parse(fs.readFileSync(file,'utf8'));
p.dependencies={...p.dependencies,protobufjs:'7.6.6',tar:'7.5.22','@grpc/grpc-js':'1.14.7',ws:'8.22.1',liquidjs:'10.30.1',mysql2:'3.24.6'};p.overrides={...p.overrides,tar:'$tar'};fs.writeFileSync(file,JSON.stringify(p,null,4)+'\n');
