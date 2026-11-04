#Requires -Version 5.1
[CmdletBinding()]
param([switch]$KeepTls)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$runtime=Join-Path $root 'runtime'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
function Download($Url,$File){& curl.exe -fsSL --max-time 180 $Url -o $File;if($LASTEXITCODE -ne 0){throw "Download non riuscito: $Url"}}
$python=Get-Command python.exe -ErrorAction SilentlyContinue
if(!$python){throw 'Installa Python 3.10 o successivo dal sito ufficiale e ripeti.'}
$tools=Join-Path $runtime 'tools';New-Item -ItemType Directory -Force -Path $tools | Out-Null
if (!$KeepTls) {
Download 'https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe' (Join-Path $tools 'mkcert.exe')
$env:CAROOT=Join-Path $runtime 'tls\ca';$env:TRUST_STORES='system';New-Item -ItemType Directory -Force -Path (Join-Path $runtime 'tls') | Out-Null
& (Join-Path $tools 'mkcert.exe') -install
if($LASTEXITCODE -ne 0){throw 'Installazione CA locale non riuscita'}
& (Join-Path $tools 'mkcert.exe') -cert-file (Join-Path $runtime 'tls\localhost.pem') -key-file (Join-Path $runtime 'tls\localhost-key.pem') localhost 127.0.0.1 ::1
if($LASTEXITCODE -ne 0){throw 'Generazione certificati non riuscita'}
$identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$tls=Join-Path $runtime 'tls';icacls $tls /inheritance:r /grant:r "${identity}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
Get-ChildItem -LiteralPath $tls -File -Recurse | ForEach-Object {icacls $_.FullName /inheritance:r /grant:r "${identity}:F" '*S-1-5-18:F' | Out-Null}
}
$venv=Join-Path $runtime 'monitoring-python';if(!(Test-Path (Join-Path $venv 'Scripts\python.exe'))){& $python.Source -m venv $venv}
& (Join-Path $venv 'Scripts\python.exe') -m pip install 'glances[web]==4.5.8'
if($LASTEXITCODE -ne 0){throw 'Installazione Glances non riuscita'}
$kuma=Join-Path $runtime 'uptime-kuma';if(!(Test-Path $kuma)){git clone --depth 1 --branch 2.5.9 https://github.com/louislam/uptime-kuma.git $kuma;if($LASTEXITCODE -ne 0){throw 'Download Uptime Kuma non riuscito'}}
$certPath=Join-Path $runtime 'windows-roots.pem'
$certs=@(Get-ChildItem Cert:\CurrentUser\Root)+@(Get-ChildItem Cert:\LocalMachine\Root)
$pem=($certs|ForEach-Object {'-----BEGIN CERTIFICATE-----'+[Environment]::NewLine+[Convert]::ToBase64String($_.RawData,[Base64FormattingOptions]::InsertLineBreaks)+[Environment]::NewLine+'-----END CERTIFICATE-----'}) -join [Environment]::NewLine
[IO.File]::WriteAllText($certPath,$pem);$env:NODE_EXTRA_CA_CERTS=$certPath;$env:npm_config_cafile=$certPath
Push-Location $kuma
try{npm ci --omit=dev;if($LASTEXITCODE -ne 0){throw 'Dipendenze Kuma non installate'};npm run download-dist;if($LASTEXITCODE -ne 0){throw 'Interfaccia Kuma non installata'};& node.exe (Join-Path $root 'src\harden-kuma.js');npm install --omit=dev --ignore-scripts;npm audit --omit=dev --json | Set-Content -LiteralPath (Join-Path $runtime 'uptime-kuma-audit.json') -Encoding UTF8}finally{Pop-Location}
$package=Join-Path $tools 'crowdsec.nupkg';Download 'https://github.com/crowdsecurity/crowdsec/releases/download/v1.8.2/crowdsec.1.8.2.nupkg' $package
$extract=Join-Path $runtime 'crowdsec-extract';New-Item -ItemType Directory -Force -Path $extract | Out-Null
tar -xf $package -C $extract
$destination=Join-Path $runtime 'crowdsec-portable'
$p=Start-Process msiexec.exe -ArgumentList '/a',('"'+(Join-Path $extract 'tools\crowdsec.msi')+'"'),'/qn',('TARGETDIR="'+$destination+'"') -WindowStyle Hidden -Wait -PassThru
if($p.ExitCode -ne 0){throw 'Estrazione CrowdSec non riuscita'}
& node.exe (Join-Path $root 'src\prepare-local-tools.js')
$crowd=Join-Path $destination 'CrowdSec';$cfg=Join-Path $crowd 'config\config.yaml';$creds=Join-Path $crowd 'config\local_api_credentials.yaml'
& (Join-Path $crowd 'cscli.exe') -c $cfg machines add sentinel --auto --force -f $creds --url http://127.0.0.1:8300
& (Join-Path $crowd 'cscli.exe') -c $cfg hub update
& (Join-Path $crowd 'crowdsec.exe') -c $cfg -no-capi -t
if($LASTEXITCODE -ne 0){throw 'Configurazione CrowdSec non valida'}
Write-Host 'Strumenti installati. Arresta Sentinel dalla dashboard e riaprilo dal BAT. Configura personalmente gli account di Sentinel e Uptime Kuma.'
