#Requires -Version 5.1
param([switch]$AI,[switch]$Monitoring)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Install-Package([string]$Id) {
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (!$winget) { throw "WinGet non disponibile. Installa $Id e riprova." }
    & $winget.Source install --id $Id --exact --source winget
    if ($LASTEXITCODE -ne 0) { throw "Installazione di $Id non riuscita ($LASTEXITCODE)." }
}
function Find-Executable([string]$Name, [string[]]$Paths) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    $candidates = @($command.Source) + $Paths
    $candidates | Where-Object { $_ -and $_ -notmatch '\\WindowsApps\\' -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
}
$pythonPaths = @("$env:LOCALAPPDATA\Programs\Python\Python312\python.exe", "$env:ProgramFiles\Python312\python.exe")
$python = Find-Executable python.exe $pythonPaths
if (!$python) {
    Install-Package Python.Python.3.12
    $python = Find-Executable python.exe $pythonPaths
}
if (!$python) { throw 'Python non trovato dopo la configurazione.' }
& $python -c 'import sys; sys.exit(sys.version_info < (3, 10))'
if ($LASTEXITCODE -ne 0) { throw 'Serve Python 3.10 o successivo.' }
$env:Path = "$(Split-Path -Parent $python);$(Join-Path $root 'node-runtime');$env:Path"
if ($AI) {
    $ollamaPaths = @("$env:LOCALAPPDATA\Programs\Ollama\ollama.exe", "$env:ProgramFiles\Ollama\ollama.exe")
    $ollama = Find-Executable ollama.exe $ollamaPaths
    if (!$ollama) {
        Install-Package Ollama.Ollama
        $ollama = Find-Executable ollama.exe $ollamaPaths
    }
    if (!$ollama) { throw 'Ollama non trovato dopo la configurazione.' }
    & (Join-Path $PSScriptRoot 'install-local-ai.ps1') -OllamaPath $ollama
}
if ($Monitoring) {
    $gitPaths = @("$env:ProgramFiles\Git\cmd\git.exe", "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe")
    $git = Find-Executable git.exe $gitPaths
    if (!$git) {
        Install-Package Git.Git
        $git = Find-Executable git.exe $gitPaths
    }
    if (!$git) { throw 'Git non trovato dopo la configurazione.' }
    $env:Path = "$(Split-Path -Parent $git);$env:Path"
    & (Join-Path $PSScriptRoot 'install-local-tools.ps1') -KeepTls
}
