@echo off
cd /d "%~dp0"
title HT Game Kiosk

rem === Velg Node.js: bruk portabel node fra USB hvis den finnes, ellers systemets node ===
set "NODE_EXE=%~dp0node\node.exe"
if not exist "%NODE_EXE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo.
    echo Fant ikke Node.js.
    echo Portabel Node skal ligge her: %~dp0node\node.exe
    echo Kopier hele mappen til PC-en og prov igjen.
    echo.
    pause
    exit /b 1
  )
  set "NODE_EXE=node"
)

"%NODE_EXE%" launcher.js --selector --kiosk
pause
