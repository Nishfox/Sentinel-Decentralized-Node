#Requires -Version 5.1
param([string]$InstallDir,[string]$Node,[string]$AdminUsername,[Security.SecureString]$AdminPassword,[string]$SourceRoot)
$ErrorActionPreference='Stop'
if(!$SourceRoot){$SourceRoot=$InstallDir}
$start=New-Object Diagnostics.ProcessStartInfo
$start.FileName=$node
$start.Arguments='"'+(Join-Path $SourceRoot 'scripts\create-admin.js')+'" "'+$InstallDir+'"'
$start.UseShellExecute=$false;$start.CreateNoWindow=$true
$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
$process=New-Object Diagnostics.Process
$process.StartInfo=$start
$secret=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPassword)
try {
    $null=$process.Start()
    $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($secret)
    $payload=@{username=$AdminUsername;password=$plain} | ConvertTo-Json -Compress
    $bytes=[Text.Encoding]::UTF8.GetBytes($payload)
    $process.StandardInput.BaseStream.Write($bytes,0,$bytes.Length);$process.StandardInput.BaseStream.Flush();$process.StandardInput.Close()
    [Array]::Clear($bytes,0,$bytes.Length);$bytes=$null
    $plain=$null;$payload=$null
    $result=$process.StandardOutput.ReadToEnd();$failure=$process.StandardError.ReadToEnd();$process.WaitForExit()
    if($process.ExitCode -ne 0){throw 'Creazione account amministratore non riuscita.'}
        Write-Host 'Account amministratore creato. La 2FA potrà essere configurata successivamente.'
} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secret);$plain=$null;$payload=$null;$process.Dispose()}
