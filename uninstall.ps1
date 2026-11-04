#Requires -Version 5.1
#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json
$base="http://127.0.0.1:$($config.dashboardPort)"
try {
    $health=Invoke-RestMethod "$base/api/health" -TimeoutSec 3
    $expected=[IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\').ToLowerInvariant()
    if($health.app -ne 'sentinel-suite' -or $health.instance -ne $expected){throw 'La porta appartiene a un altro processo: nessun servizio arrestato.'}
    $state=Invoke-RestMethod "$base/api/status" -TimeoutSec 5
    $null=Invoke-RestMethod "$base/api/action/shutdown" -Method Post -Headers @{'X-Sentinel-Token'=$state.token;Origin=$base}
    Start-Sleep -Seconds 4
    try {$remaining=Invoke-RestMethod "$base/api/health" -TimeoutSec 2} catch {$remaining=$null}
    if($remaining -and $remaining.pid -eq $health.pid){throw 'Sentinel non si è arrestato: annullare la disinstallazione e riprovare.'}
} catch [System.Net.WebException] {
    if($_.Exception.Response){throw}
    # Nessun pannello in ascolto: prosegui con la rimozione del solo avvio automatico.
}
if($config.taskName){
    if($config.taskName -notmatch '^Sentinel-[a-z0-9-]+$'){throw 'Nome attività non valido.'}
    Stop-ScheduledTask -TaskName $config.taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $config.taskName -Confirm:$false -ErrorAction SilentlyContinue
}
Write-Host 'Sentinel arrestato e avvio automatico rimosso. Siti, configurazione, backup, identità dei nodi e client Tailscale conservati. Il wizard rimuove soltanto i file applicazione registrati.'
