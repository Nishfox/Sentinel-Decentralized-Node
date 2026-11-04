#Requires -Version 5.1
param([string]$AdminPipe,[string]$ResultFile,[string]$ProjectName,[string]$NodeName,[string]$TargetDir,[string]$InstallDir)
$ErrorActionPreference='Stop'
$credentials=$null;$code=1
try {
    . (Join-Path $PSScriptRoot 'read-admin-pipe.ps1')
    $credentials=Read-SentinelAdminPipe $AdminPipe
    & (Join-Path (Split-Path -Parent $PSScriptRoot) 'install.ps1') -ProjectName $ProjectName -NodeName $NodeName -TargetDir $TargetDir -InstallDir $InstallDir -AdminUsername $credentials.Username -AdminPassword $credentials.Password
    $code=0
} catch {
    Write-Error -Message ('Installazione non completata: '+$_.Exception.Message) -ErrorAction Continue
} finally {
    if($credentials -and $credentials.Password){$credentials.Password.Dispose()}
    $credentials=$null
    $completed=$ResultFile+'.done'
    [IO.File]::WriteAllText($completed,[string]$code)
    Move-Item -LiteralPath $completed -Destination $ResultFile -Force
}
exit $code
