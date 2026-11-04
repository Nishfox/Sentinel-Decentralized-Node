#Requires -Version 5.1
[CmdletBinding()]
param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectRoot 'config.json'
if (!(Test-Path -LiteralPath $configPath)) { $configPath = Join-Path $projectRoot 'config.example.json' }
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$port = [int]$config.dashboardPort
if ($port -lt 1024 -or $port -gt 65535) { throw 'Porta dashboard non valida.' }
$url = "http://127.0.0.1:$port"
$expectedInstance = [IO.Path]::GetFullPath($projectRoot).TrimEnd('\').ToLowerInvariant()
function Get-SentinelHealth {
    try {
        $health = Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 2
        if ($health.app -ne 'sentinel-suite' -or $health.instance -ne $script:expectedInstance) { throw 'Porta occupata da un altro servizio o da un''altra installazione Sentinel.' }
        return $health
    } catch {
        if ($_.Exception.Response) { throw 'La porta dashboard risponde, ma non appartiene a questa versione di Sentinel. Arresta la vecchia istanza prima di riprovare.' }
        # Windows PowerShell uses WebException; PowerShell 7 uses HttpRequestException
        # and TaskCanceledException for a stopped dashboard or a health-check timeout.
        $networkError = $_.Exception
        while ($networkError) {
            if ($networkError.GetType().FullName -in @('System.Net.WebException', 'System.Net.Http.HttpRequestException', 'System.Threading.Tasks.TaskCanceledException')) { return $null }
            $networkError = $networkError.InnerException
        }
        throw
    }
}
# Avoid duplicate launches when the BAT is double-clicked repeatedly.
$mutex = New-Object Threading.Mutex($false, "Local\Sentinel-Launcher-$port")
$locked = $false
try {
    $locked = $mutex.WaitOne(30000)
    if (!$locked) { throw 'Un altro avvio Sentinel e ancora in corso.' }
    $health = Get-SentinelHealth
    if (!$health) {
        $bundledNode = Join-Path $projectRoot 'node-runtime\node.exe'
        if (Test-Path -LiteralPath $bundledNode) { $node = $bundledNode }
        else {
            $command = Get-Command node.exe -ErrorAction SilentlyContinue
            if (!$command) { throw 'Node.js non trovato. Esegui prima l''installer Sentinel.' }
            $node = $command.Source
        }
        $version = & $node --version
        if ([int]($version.TrimStart('v').Split('.')[0]) -lt 20) { throw 'E richiesto Node.js 20 o successivo.' }
        $logs = Join-Path $projectRoot 'runtime'
        New-Item -ItemType Directory -Path $logs -Force | Out-Null
        $server = Join-Path $projectRoot 'src\server.js'
        # Only the control interface starts. The user starts the website from its switch.
        $previousControl = $env:SENTINEL_CONTROL_ONLY
        $previousConfig = $env:SENTINEL_CONFIG
        try {
            $env:SENTINEL_CONTROL_ONLY = '1'
            $env:SENTINEL_CONFIG = Join-Path $projectRoot 'config.json'
            $process = Start-Process -FilePath $node -ArgumentList ('"'+$server+'"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'server.log') -RedirectStandardError (Join-Path $logs 'server-error.log') -PassThru
        } finally {
            $env:SENTINEL_CONTROL_ONLY = $previousControl
            $env:SENTINEL_CONFIG = $previousConfig
        }
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            Start-Sleep -Milliseconds 250
            $health = Get-SentinelHealth
            if ($health) { break }
            if ($process.HasExited) { throw "Sentinel si e arrestato. Controlla $logs\server-error.log" }
        }
        if (!$health) { throw "Dashboard non disponibile. Controlla $logs\server-error.log" }
    }
    Write-Host "Sentinel pronto: $url"
    if (!$NoBrowser) {
        # Edge app mode gives the dashboard its own window without an address bar.
        $edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe", "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if ($edge) { Start-Process -FilePath $edge -ArgumentList "--app=$url" }
        else { Start-Process $url }
    }
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
