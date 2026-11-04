#Requires -Version 5.1
param([string]$PortList)
$ErrorActionPreference='Stop'
try {
    $ports=@($PortList -split ',' | ForEach-Object {if($_ -notmatch '^\d{1,5}$'){throw 'Porta non valida'};$n=[int]$_;if($n -lt 1 -or $n -gt 65535){throw 'Porta non valida'};$n})
    $listeners=@(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object {$_.LocalPort -in $ports} | ForEach-Object {@{address=$_.LocalAddress;port=$_.LocalPort;pid=$_.OwningProcess}})
    @{known=$true;listeners=$listeners;scope='Solo porte TCP gestite da Sentinel, non scansione completa della rete'}|ConvertTo-Json -Depth 4 -Compress
} catch {@{known=$false;listeners=@();error='Rilevamento porte non disponibile';scope='Non verificato'}|ConvertTo-Json -Compress}
