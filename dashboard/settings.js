// Sentinel Community Edition | Copyright (c) 2026 Nishfox
'use strict';
const settingsStyle=document.createElement('link');settingsStyle.rel='stylesheet';settingsStyle.href='/settings.css';document.head.append(settingsStyle);
const controls=document.createElement('section');controls.className='setup-controls';
const help=document.createElement('span');help.className='muted';help.textContent='Server, cartella e nodo Tailscale si gestiscono dalla scheda di ciascun sito.';
const quit=document.createElement('button');quit.className='secondary';quit.textContent='Arresta Sentinel';quit.onclick=()=>{if(confirm('Arrestare tutti i siti e i loro nodi? Le identità restano salvate. Per riavviare apri Avvia-Sentinel.bat.'))action('shutdown');};controls.append(help,quit);$('notice').before(controls);
