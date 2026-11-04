#Requires -Version 5.1
param([string]$OutputFile)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Path (Join-Path $projectRoot 'bin') -Force | Out-Null
Push-Location (Join-Path $projectRoot 'node-agent')
try {
    & go mod tidy
    if ($LASTEXITCODE -ne 0) { throw 'Download dipendenze tsnet non riuscito.' }
    if (!$OutputFile) { $OutputFile=Join-Path $projectRoot 'bin\sentinel-node.exe' }
    & go build -trimpath -ldflags '-s -w' -o $OutputFile .
    if ($LASTEXITCODE -ne 0) { throw 'Compilazione nodo non riuscita.' }
} finally { Pop-Location }
