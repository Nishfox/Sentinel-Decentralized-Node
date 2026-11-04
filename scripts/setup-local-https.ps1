#Requires -Version 5.1
param([string]$InstallDir)
$ErrorActionPreference='Stop'
if(!$InstallDir){$InstallDir=Split-Path -Parent $PSScriptRoot}
$runtime=Join-Path $InstallDir 'runtime';$tools=Join-Path $runtime 'tools';$tls=Join-Path $runtime 'tls'
New-Item -ItemType Directory -Force -Path $tools,$tls | Out-Null
$mkcert=Join-Path $tools 'mkcert.exe'
if(!(Test-Path -LiteralPath $mkcert)){
    & curl.exe -fsSL --max-time 120 'https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe' -o $mkcert
    if($LASTEXITCODE -ne 0){throw 'Download del componente HTTPS non riuscito.'}
}
$oldCA=$env:CAROOT;$oldStores=$env:TRUST_STORES
try {
    $env:CAROOT=Join-Path $tls 'ca';$env:TRUST_STORES='system'
    & $mkcert -install
    if($LASTEXITCODE -ne 0){throw 'Attivazione CA locale non riuscita.'}
    & $mkcert -cert-file (Join-Path $tls 'localhost.pem') -key-file (Join-Path $tls 'localhost-key.pem') localhost 127.0.0.1 ::1
    if($LASTEXITCODE -ne 0){throw 'Creazione certificato HTTPS non riuscita.'}
    $identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
    icacls $tls /inheritance:r /grant:r "${identity}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
    Get-ChildItem -LiteralPath $tls -File -Recurse | ForEach-Object {icacls $_.FullName /inheritance:r /grant:r "${identity}:F" '*S-1-5-18:F' | Out-Null}
} finally {$env:CAROOT=$oldCA;$env:TRUST_STORES=$oldStores}
