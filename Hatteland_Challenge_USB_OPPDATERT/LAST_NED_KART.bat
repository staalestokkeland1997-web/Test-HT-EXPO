@echo off
cd /d "%~dp0"
title Last ned kart for offline bruk

echo ============================================================
echo  Laster ned sjokartet inn i mappen "data\tiles".
echo  Kjor dette EN gang paa en PC med internett.
echo  Etterpa virker ECDIS og radar uten nett paa omraadene
echo  som staar i config\tiles-config.json.
echo.
echo  Kan avbrytes med Ctrl+C og startes igjen - den fortsetter
echo  der den slapp.
echo ============================================================
echo.

rem === Velg Node.js: portabel node hvis den finnes, ellers systemets node ===
set "NODE_EXE=%~dp0node\node.exe"
if not exist "%NODE_EXE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Node.js mangler.
    echo Bruk USB-mappen Hatteland_Challenge_USB_OPPDATERT med portabel Node,
    echo eller installer Node.js 18+ fra https://nodejs.org og prov igjen.
    pause
    exit /b 1
  )
  set "NODE_EXE=node"
)

echo Regner ut hvor mye som skal hentes...
echo.
"%NODE_EXE%" tools\download_tiles.js --dry-run
echo.
echo Trykk en tast for aa starte nedlastingen, eller lukk vinduet for aa avbryte.
pause >nul
echo.

"%NODE_EXE%" tools\download_tiles.js

echo.
echo Ferdig. Start kiosken med START_HT_GAME_KIOSK.bat
pause
