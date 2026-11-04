// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
document.getElementById('login').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});const data=await r.json();if(!r.ok)throw Error(data.error);location.href='/#sites';}catch(err){document.getElementById('error').textContent=err.message;}finally{button.disabled=false;}};
