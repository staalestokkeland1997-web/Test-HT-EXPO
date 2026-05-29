@echo off
cd /d "%~dp0"
title Last ned portabel Chromium

echo ============================================================
echo  Laster ned portabel Chromium inn i mappen "chrome".
echo  Kjor dette EN gang paa en PC med internett.
echo  Etterpa kan du kopiere hele mappen til minnepenn (uten nett).
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\download_chrome.ps1"

echo.
if exist "%~dp0chrome\chrome.exe" (
  echo Ferdig. Start spillet med START_HT_GAME_KIOSK.bat
) else (
  echo Noe gikk galt - chrome\chrome.exe finnes ikke enda.
)
pause
