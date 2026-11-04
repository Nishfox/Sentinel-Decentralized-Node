'use strict';
const {createAuth}=require('../src/auth');const path=require('node:path');
let body='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{body+=chunk;if(body.length>2048){body='';process.stderr.write('Credenziali non valide.');process.exit(1);}});
process.stdin.on('end',async()=>{try{const credentials=JSON.parse(body);body='';await createAuth({root:path.resolve(process.argv[2]||path.join(__dirname,'..'))}).enable(credentials.username,credentials.password);credentials.password='';process.stdout.write('Account amministratore creato.\n');}catch{process.stderr.write('Creazione account amministratore non riuscita.\n');process.exitCode=1;}});
