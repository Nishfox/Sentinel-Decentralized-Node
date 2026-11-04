param([string]$PipeName,[string]$InstallDir,[string]$SourceRoot,[string]$Node)
$ErrorActionPreference='Stop'
. (Join-Path $SourceRoot 'scripts\read-admin-pipe.ps1')
try {$credentials=Read-SentinelAdminPipe $PipeName} catch {[IO.File]::WriteAllText((Join-Path $InstallDir 'pipe-error.txt'),$_.Exception.Message);throw}
try{& (Join-Path $SourceRoot 'scripts\provision-admin.ps1') -InstallDir $InstallDir -SourceRoot $SourceRoot -Node $Node -AdminUsername $credentials.Username -AdminPassword $credentials.Password}finally{$credentials.Password.Dispose();$credentials=$null}
