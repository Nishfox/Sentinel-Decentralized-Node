@echo off
setlocal
title Sentinel Suite - Avvio
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-sentinel.ps1"
if errorlevel 1 (
  echo.
  echo Avvio non riuscito. Leggi il messaggio qui sopra.
  pause
  exit /b 1
)
endlocal
