$ErrorActionPreference = 'Stop'

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $root = Split-Path -Parent $PSScriptRoot
    $base = 'https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win_x64'

    Write-Host 'Henter siste revisjonsnummer ...'
    $rev = (Invoke-WebRequest -UseBasicParsing "$base/LAST_CHANGE").Content.Trim()
    Write-Host "Revisjon: $rev"

    $zip  = Join-Path $env:TEMP 'chrome-win.zip'
    $tmp  = Join-Path $env:TEMP 'chrome-win-extract'
    $dest = Join-Path $root 'chrome'

    Write-Host 'Laster ned portabel Chromium (~330 MB). Dette kan ta noen minutter ...'
    Invoke-WebRequest -UseBasicParsing "$base/$rev/chrome-win.zip" -OutFile $zip

    Write-Host 'Pakker ut ...'
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
    Expand-Archive -Path $zip -DestinationPath $tmp -Force

    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    Move-Item (Join-Path $tmp 'chrome-win') $dest

    # Fjern store test-binaerer som ikke trengs for aa kjore nettleseren
    Get-ChildItem $dest -Filter '*test*.exe' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
    Remove-Item $zip -Force -ErrorAction SilentlyContinue

    if (Test-Path (Join-Path $dest 'chrome.exe')) {
        Write-Host ''
        Write-Host 'OK! Portabel Chromium ligger na i mappen chrome\.'
        Write-Host 'Du kan na kopiere hele denne mappen til minnepennen.'
    } else {
        throw 'chrome.exe ble ikke funnet etter utpakking.'
    }
}
catch {
    Write-Host ''
    Write-Host ('FEIL: ' + $_.Exception.Message)
    Write-Host 'Sjekk internett-tilkoblingen og prov igjen.'
    exit 1
}
