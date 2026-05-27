@echo off
cd /d "%~dp0"
title HT Game Kiosk
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 eller nyere mangler.
  echo Installer Node.js fra https://nodejs.org og prov igjen.
  pause
  exit /b 1
)
node launcher.js --selector --kiosk
pause
