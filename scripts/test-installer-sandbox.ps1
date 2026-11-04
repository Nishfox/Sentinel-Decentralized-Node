#Requires -Version 5.1
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$sandbox=Get-Command WindowsSandbox.exe -ErrorAction SilentlyContinue
if(!$sandbox){throw 'Windows Sandbox non disponibile. Usa una VM Windows 10/11 x64 pulita e segui la sezione Installazione e diagnostica.'}
if(!(Test-Path -LiteralPath (Join-Path $root 'dist\SentinelSuite-Setup.exe'))){throw 'Installer non trovato in dist.'}
$hostPath=[Security.SecurityElement]::Escape($root)
$content=@"
<Configuration>
 <Networking>Enable</Networking>
 <MappedFolders><MappedFolder><HostFolder>$hostPath</HostFolder><SandboxFolder>C:\SentinelSource</SandboxFolder><ReadOnly>true</ReadOnly></MappedFolder></MappedFolders>
 <LogonCommand><Command>explorer.exe C:\SentinelSource\dist</Command></LogonCommand>
</Configuration>
"@
$file=Join-Path $root 'runtime\Sentinel-Installer-Test.wsb'
$content | Set-Content -LiteralPath $file -Encoding UTF8
Start-Process -FilePath $sandbox.Source -ArgumentList ('"'+$file+'"') -WindowStyle Hidden
