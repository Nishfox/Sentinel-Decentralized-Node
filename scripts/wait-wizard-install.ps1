#Requires -Version 5.1
param([string]$ResultFile)
$ErrorActionPreference='Stop'
$deadline=[DateTime]::UtcNow.AddMinutes(30)
while([DateTime]::UtcNow -lt $deadline){
    if(Test-Path -LiteralPath $ResultFile){$result=[IO.File]::ReadAllText($ResultFile);if($result -eq '0'){exit 0};exit 1}
    Start-Sleep -Milliseconds 250
}
exit 2
