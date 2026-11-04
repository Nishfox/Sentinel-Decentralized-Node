#Requires -Version 5.1
#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [ValidatePattern('^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$|^[a-z0-9]$')][string]$ProjectName,
    [ValidatePattern('^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$|^[a-z0-9]$')][string]$NodeName,
    [string]$TargetDir,
    [string]$InstallDir = "$env:LOCALAPPDATA\SentinelSuite",
    [ValidateRange(1024,65535)][int]$WebPort = 8080,
    [ValidateRange(1024,65535)][int]$DashboardPort = 4310,
    [string]$AdminUsername,
    [Security.SecureString]$AdminPassword,
    [switch]$SkipFunnel
)
$ErrorActionPreference = 'Stop'
$SkipFunnel = $true # Each project now owns its embedded node; the installer never publishes the PC node.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if (!$ProjectName) { $ProjectName = Read-Host 'Nome progetto (sentinel)' ; if (!$ProjectName) { $ProjectName = 'sentinel' } }
if (!$NodeName) { $NodeName = Read-Host 'Nome nodo (guard)' ; if (!$NodeName) { $NodeName = 'guard' } }
if (!$TargetDir) { $TargetDir = Read-Host "Cartella sito ($env:USERPROFILE\Sentinel\Website)"; if (!$TargetDir) { $TargetDir = "$env:USERPROFILE\Sentinel\Website" } }
foreach ($name in @($ProjectName,$NodeName)) { if ($name -notmatch '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$') { throw 'Nomi non validi: usare lettere minuscole, numeri e trattini, massimo 63 caratteri.' } }
if (!$AdminUsername) { $AdminUsername=Read-Host 'Username amministratore (3-32 lettere, numeri, punto o trattino)' }
if ($AdminUsername -notmatch '^[a-zA-Z0-9._-]{3,32}$') { throw 'Username amministratore non valido.' }
if (!$AdminPassword) {
    $AdminPassword=Read-Host 'Password amministratore (almeno 12 caratteri)' -AsSecureString
    $confirmation=Read-Host 'Conferma password amministratore' -AsSecureString
    $first=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPassword)
    $second=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmation)
    try { if ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($first) -cne [Runtime.InteropServices.Marshal]::PtrToStringBSTR($second)) { throw 'Le password non coincidono.' } }
    finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($first);[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($second);$confirmation.Dispose()}
}
if ($AdminPassword.Length -lt 12 -or $AdminPassword.Length -gt 128) { throw 'Password da 12 a 128 caratteri.' }
if ($WebPort -eq $DashboardPort) { throw 'Le porte devono essere differenti.' }
$InstallDir = [IO.Path]::GetFullPath($InstallDir)
$TargetDir = [IO.Path]::GetFullPath($TargetDir)
if ($TargetDir.Equals($InstallDir,[StringComparison]::OrdinalIgnoreCase) -or $TargetDir.StartsWith($InstallDir.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase) -or $InstallDir.StartsWith($TargetDir.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'La cartella pubblica e la cartella applicazione devono essere separate.' }
if (Test-Path -LiteralPath (Join-Path $InstallDir 'config.json')) { throw 'Installazione esistente. Conservata: arrestarla e scegliere una cartella nuova per reinstallare.' }
foreach ($port in @($WebPort,$DashboardPort)) { $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,$port); try { $listener.Start() } finally { $listener.Stop() } }
$work = Join-Path $env:TEMP ('Sentinel-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work -Force | Out-Null
$taskName = 'Sentinel-' + $ProjectName
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Esiste già una attività pianificata con questo nome progetto.' }
$taskCreated = $false
$configCreated = $false
$accountCreated = $false
$funnelCreated = $false
$previousHostname = $null
$ts = $null
function Invoke-Tailscale([string[]]$Arguments) {
    $result = & $script:ts @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($result | Out-String) }
    return ($result | Out-String)
}
try {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    $node = if ($nodeCommand) { $nodeCommand.Source } else { $null }
    if ($node) { $major = [int]((& $node --version).TrimStart('v').Split('.')[0]); if ($major -lt 20) { $node = $null } }
    if (!$node) {
        Write-Host 'Installazione runtime Node.js 22 (download ufficiale e verifica SHA256)...'
        $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
        $base = 'https://nodejs.org/dist/latest-v22.x/'
        $sums = (Invoke-WebRequest -UseBasicParsing -Uri ($base+'SHASUMS256.txt')).Content
        $line = ($sums -split "`n" | Where-Object { $_ -match " node-v22\.[0-9]+\.[0-9]+-win-$arch\.zip\s*$" } | Select-Object -First 1)
        if (!$line) { throw 'Checksum Node.js non trovato.' }
        $parts = $line.Trim() -split '\s+'
        $zip = Join-Path $work 'node.zip'
        Invoke-WebRequest -UseBasicParsing -Uri ($base+$parts[1]) -OutFile $zip
        if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne $parts[0]) { throw 'Checksum Node.js non valido.' }
        Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $work 'node')
        $runtime = Join-Path $InstallDir 'node-runtime'
        New-Item -ItemType Directory -Path $runtime -Force | Out-Null
        Copy-Item -Path (Join-Path $work 'node\*\*') -Destination $runtime -Recurse -Force
        $node = Join-Path $runtime 'node.exe'
    }
    $tsCommand = Get-Command tailscale.exe -ErrorAction SilentlyContinue
    $ts = if ($tsCommand) { $tsCommand.Source } else { Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe' }
    if (!(Test-Path -LiteralPath $ts)) {
        Write-Host 'Installazione Tailscale ufficiale...'
        $setup = Join-Path $work 'tailscale-setup.exe'
        Invoke-WebRequest -UseBasicParsing -Uri 'https://pkgs.tailscale.com/stable/tailscale-setup-latest.exe' -OutFile $setup
        $signature = Get-AuthenticodeSignature -LiteralPath $setup
        if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Tailscale Inc\.') { throw 'Firma digitale Tailscale non valida.' }
        $process = Start-Process -FilePath $setup -ArgumentList '/install','/quiet','/norestart' -PassThru -Wait -WindowStyle Hidden
        if ($process.ExitCode -notin @(0,3010)) { throw "Installazione Tailscale fallita: $($process.ExitCode)" }
        $ts = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
    }
    Start-Service Tailscale
    $status = Invoke-Tailscale @('status','--json') | ConvertFrom-Json
    if ($status.BackendState -ne 'Running') {
        Write-Host 'Completa il login ufficiale Tailscale. Può essere richiesta autorizzazione nel browser.'
        & $ts up --timeout=5m
        if ($LASTEXITCODE -ne 0) { throw 'Login Tailscale non completato. Eseguire tailscale up e riprovare.' }
        $status = Invoke-Tailscale @('status','--json') | ConvertFrom-Json
        if ($status.BackendState -ne 'Running') { throw 'Tailscale non connesso.' }
    }
    # Refuse to overwrite any pre-existing Serve/Funnel HTTPS listener.
    $serve = Invoke-Tailscale @('serve','status','--json') | ConvertFrom-Json
    if (!$SkipFunnel -and $serve.TCP.'443') { throw 'Tailscale HTTPS 443 già in uso. Nessuna configurazione esistente è stata modificata.' }
    foreach ($folder in @('src','dashboard','scripts','templates','bin')) { $destination=Join-Path $InstallDir $folder; New-Item -ItemType Directory -Path $destination -Force | Out-Null; Copy-Item -Path (Join-Path $PSScriptRoot ($folder+'\*')) -Destination $destination -Recurse -Force }
    foreach ($file in @('package.json','config.example.json','uninstall.ps1','Avvia-Sentinel.bat')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination $InstallDir -Force }
    $initialSiteDir=Join-Path $TargetDir $ProjectName
    New-Item -ItemType Directory -Path $initialSiteDir -Force | Out-Null
    $index=Join-Path $initialSiteDir 'index.html'
    if (!(Test-Path -LiteralPath $index)) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'templates\site.html') -Destination $index }
    $initialProject=@{id=[guid]::NewGuid().ToString();name=$ProjectName;slug=$NodeName;websiteDir=$initialSiteDir;published=$false}
    @{projectName=$ProjectName;nodeName=$NodeName;websiteDir=$TargetDir;webPort=$WebPort;dashboardPort=$DashboardPort;autoStart=$false;tailscalePath=$ts;taskName=$taskName;projects=@($initialProject);publicationMode='dedicated-nodes-v1'} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $InstallDir 'config.json') -Encoding UTF8
    $configCreated = $true
    & (Join-Path $InstallDir 'scripts\setup-local-https.ps1') -InstallDir $InstallDir
    & (Join-Path $InstallDir 'scripts\provision-admin.ps1') -InstallDir $InstallDir -Node $node -AdminUsername $AdminUsername -AdminPassword $AdminPassword
    $accountCreated=$true
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $action = New-ScheduledTaskAction -Execute $node -Argument ('"'+(Join-Path $InstallDir 'src\server.js')+'"') -WorkingDirectory $InstallDir
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
    $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
    $taskCreated = $true
    Start-ScheduledTask -TaskName $taskName
    $ready = $false
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        try { $health = Invoke-RestMethod -Uri "http://127.0.0.1:$DashboardPort/api/health" -TimeoutSec 2; if ($health.app -eq 'sentinel-suite') { $ready=$true; break } } catch { }
        Start-Sleep -Seconds 1
    }
    if (!$ready) { throw 'Il server non è partito. Verificare porte e attività pianificata.' }
    if (!$SkipFunnel) {
        Write-Host 'Attivazione Funnel. Se richiesto, autorizzare Funnel/HTTPS nella console Tailscale.'
        Invoke-Tailscale @('funnel','--bg','--https=443',"http://127.0.0.1:$WebPort") | Write-Host
        $funnelCreated = $true
        $status = Invoke-Tailscale @('status','--json') | ConvertFrom-Json
        $url = 'https://' + $status.Self.DNSName.TrimEnd('.')
        try { $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 30; Write-Host "HTTPS verificato: $url ($($response.StatusCode))" } catch { Write-Warning "Funnel configurato, verifica HTTPS non riuscita: $($_.Exception.Message)" }
    }
    & (Join-Path $InstallDir 'scripts\verify-installation.ps1') -InstallDir $InstallDir
    if ($LASTEXITCODE -eq 1) { Write-Warning 'Alcuni controlli post-installazione richiedono attenzione. Consulta Installazione e diagnostica.' }
    Write-Host "Installazione completata. Dashboard: http://127.0.0.1:$DashboardPort"
    Start-Process "http://127.0.0.1:$DashboardPort"
} catch {
    Write-Warning 'Installazione interrotta: rollback delle attività e della configurazione Sentinel. File del sito e software condiviso conservati.'
    if ($funnelCreated) { try { Invoke-Tailscale @('funnel','--https=443','off') | Out-Null } catch { Write-Warning $_ } }
    if ($null -ne $previousHostname) { try { Invoke-Tailscale @('set',"--hostname=$previousHostname") | Out-Null } catch { Write-Warning $_ } }
    if ($taskCreated) { Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
    if ($accountCreated) { Remove-Item -LiteralPath (Join-Path $InstallDir 'runtime\auth\account.json') -Force -ErrorAction SilentlyContinue }
    if ($configCreated) { Remove-Item -LiteralPath (Join-Path $InstallDir 'config.json') -Force }
    throw
} finally {
    # Only remove the unique temporary directory created by this invocation.
    $resolvedWork = [IO.Path]::GetFullPath($work)
    if ($resolvedWork.StartsWith([IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')+'\Sentinel-',[StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $resolvedWork -Recurse -Force -ErrorAction SilentlyContinue }
}
