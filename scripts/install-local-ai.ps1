#Requires -Version 5.1
[CmdletBinding()]
param([string]$OllamaPath)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot;$dir=Join-Path $root 'runtime\ai'
New-Item -ItemType Directory -Force -Path (Join-Path $dir 'models') | Out-Null
if(!$OllamaPath){$command=Get-Command ollama.exe -ErrorAction SilentlyContinue;if($command){$OllamaPath=$command.Source}}
if(!$OllamaPath -or !(Test-Path -LiteralPath $OllamaPath)){throw 'Installa Ollama per Windows dal sito ufficiale, poi ripeti questo script.'}
$python=Join-Path $root 'runtime\monitoring-python\Scripts\python.exe'
if(!(Test-Path -LiteralPath $python)){$py=Get-Command python.exe -ErrorAction Stop;& $py.Source -m venv (Join-Path $root 'runtime\monitoring-python');if($LASTEXITCODE -ne 0){throw 'Ambiente Python non creato'}}
@{binary=[IO.Path]::GetFullPath($OllamaPath);port=11435;model='qwen2.5:1.5b'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $dir 'settings.json') -Encoding UTF8
$variables=@('OLLAMA_HOST','OLLAMA_MODELS','OLLAMA_NO_CLOUD','OLLAMA_KEEP_ALIVE','OLLAMA_MAX_LOADED_MODELS','OLLAMA_NUM_PARALLEL','OLLAMA_MAX_QUEUE','OLLAMA_CONTEXT_LENGTH');$previous=@{};foreach($key in $variables){$previous[$key]=[Environment]::GetEnvironmentVariable($key,'Process')}
$owned=$null
try {
    $env:OLLAMA_HOST='127.0.0.1:11435';$env:OLLAMA_MODELS=Join-Path $dir 'models';$env:OLLAMA_NO_CLOUD='1';$env:OLLAMA_KEEP_ALIVE='0';$env:OLLAMA_MAX_LOADED_MODELS='1';$env:OLLAMA_NUM_PARALLEL='1';$env:OLLAMA_MAX_QUEUE='1';$env:OLLAMA_CONTEXT_LENGTH='4096'
    $existing=Get-NetTCPConnection -LocalPort 11435 -State Listen -ErrorAction SilentlyContinue
    if($existing){throw 'Porta AI 11435 già in uso. Arresta prima il motore Ollama gestito da Sentinel.'}
    $owned=Start-Process -FilePath $OllamaPath -ArgumentList 'serve' -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $dir 'setup-out.log') -RedirectStandardError (Join-Path $dir 'setup-error.log')
    $ready=$false;for($i=0;$i -lt 40;$i++){try{$null=Invoke-RestMethod http://127.0.0.1:11435/api/version -TimeoutSec 1;$ready=$true;break}catch{Start-Sleep -Milliseconds 250}}
    if(!$ready){throw 'Il motore locale non si è avviato'}
    & $OllamaPath pull qwen2.5:1.5b
    if($LASTEXITCODE -ne 0){throw 'Download modello non completato'}
    Write-Host 'Modello locale pronto. Arresta e riapri Sentinel dal BAT per attivare Analisi AI. Non vengono scaricati altri modelli.'
} finally {if($owned -and !$owned.HasExited){Stop-Process -Id $owned.Id -ErrorAction SilentlyContinue};foreach($key in $variables){[Environment]::SetEnvironmentVariable($key,$previous[$key],'Process')}}
