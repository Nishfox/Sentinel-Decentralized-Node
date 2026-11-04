#Requires -Version 5.1
[CmdletBinding()]
param([string]$InstallDir)
if (!$InstallDir) { $InstallDir=Split-Path -Parent $PSScriptRoot }
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($InstallDir)
$config=Get-Content -LiteralPath (Join-Path $root 'config.json') -Raw | ConvertFrom-Json
$url="http://127.0.0.1:$($config.dashboardPort)"
$checks=@()
function Add-Check($Name,$Ok,$Detail){$script:checks+=@{label=$Name;ok=[bool]$Ok;detail=[string]$Detail}}
try{$health=Invoke-RestMethod "$url/api/health" -TimeoutSec 5;Add-Check 'Dashboard' ($health.app -eq 'sentinel-suite' -and $health.instance -eq $root.TrimEnd('\').ToLowerInvariant()) $url}catch{Add-Check 'Dashboard' $false $_.Exception.Message}
foreach($file in @('Avvia-Sentinel.bat','src\server.js','src\backups.js','dashboard\management.js','bin\sentinel-node.exe','scripts\start-sentinel.ps1','uninstall.ps1')){Add-Check $file (Test-Path -LiteralPath (Join-Path $root $file)) 'File installato'}
try{$output=& (Join-Path $root 'bin\sentinel-node.exe') --check;Add-Check 'Helper nodi' ($LASTEXITCODE -eq 0) $output}catch{Add-Check 'Helper nodi' $false $_.Exception.Message}
if($health){try{& (Join-Path $root 'scripts\start-sentinel.ps1') -NoBrowser | Out-Null;$again=Invoke-RestMethod "$url/api/health" -TimeoutSec 5;Add-Check 'Avvio duplicato' ($again.pid -eq $health.pid) 'Il launcher riutilizza lo stesso processo'}catch{Add-Check 'Avvio duplicato' $false $_.Exception.Message}}
if($config.taskName){try{$task=Get-ScheduledTask -TaskName $config.taskName -ErrorAction Stop;Add-Check 'Avvio automatico' ($task.State -ne 'Disabled') $task.State}catch{Add-Check 'Avvio automatico' $false $_.Exception.Message}}
$runtime=Join-Path $root 'runtime';New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$reportPath=Join-Path $runtime 'installation-check.json'
$boot=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o')
$previous=$null;if(Test-Path -LiteralPath $reportPath){try{$previous=Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json}catch{}}
$report=@{checkedAt=[DateTime]::UtcNow.ToString('o');checks=$checks;passed=(@($checks|Where-Object {!$_.ok}).Count -eq 0);bootTime=$boot;rebootObserved=([bool]$previous -and ($previous.rebootObserved -or $previous.bootTime -ne $boot));cleanWindowsTest='not-performed';note='Questo report verifica solo questa macchina. Login Tailscale, accesso da rete mobile e disinstallazione richiedono il collaudo guidato.'}
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8
$report | ConvertTo-Json -Depth 6
if(!$report.passed){exit 1}
