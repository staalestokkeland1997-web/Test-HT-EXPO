@echo off
cd /d "%~dp0"
title HT Game Kiosk

rem === Velg Node.js: portabel node hvis den finnes, ellers systemets node ===
set "NODE_EXE=%~dp0node\node.exe"
if not exist "%NODE_EXE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Node.js mangler i denne mappen.
    echo Bruk den komplette offline-mappen Hatteland_Challenge_USB_OPPDATERT
    echo (den inneholder portabel Node), eller installer Node.js 18+.
    pause
    exit /b 1
  )
  set "NODE_EXE=node"
)

"%NODE_EXE%" launcher.js --selector --kiosk
pause
