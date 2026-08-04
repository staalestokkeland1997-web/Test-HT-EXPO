# Hatteland Technology Messekonkurranse

Dette er en lokal kiosk-app for messebruk. Den kjorer paa en PC med Node.js, uten eksterne npm-pakker og uten internettkrav under drift.

## Innhold

- Harbor Rush Challenge: standalone single-player score challenge med lokal leaderboard.
- Bridge Duel 1v1: to spillere paa venstre og hoyre side av en flat touchskjerm.
- Skjult spillvelger: `/select.html`.
- Admin hub: `/admin.html`.
- Harbor Rush admin: `/admin-rush.html`.
- Bridge Duel admin: `/admin-duel.html`.
- Lokal lagring av deltakere i `data/entries.json`.
- CSV-eksport fra admin.
- Konfigurasjon for spill, branding, adminpassord, port og kioskstart.

## Start

Anbefalt paa messe-PC (starter spillvelger i kiosk/fullskjerm):

```text
START_HT_GAME_KIOSK.bat
```

Vanlig terminalstart:

```bash
npm start          # bare server (bruker config/kiosk-config.json)
npm run launch     # server + nettleser med spillvelger
npm run rush       # start rett i Harbor Rush
npm run duel       # start rett i Bridge Duel 1v1
npm run airhockey  # start rett i HT Air Hockey
npm run kiosk      # spillvelger i kiosk/fullskjerm
```

Standard URL er:

```text
http://127.0.0.1:3000
```

## Viktige sider

```text
http://127.0.0.1:3000/select.html
http://127.0.0.1:3000/admin.html
http://127.0.0.1:3000/admin-rush.html
http://127.0.0.1:3000/admin-duel.html
http://127.0.0.1:3000/harbor-rush-standalone.html
http://127.0.0.1:3000/bridge-duel-standalone.html
```

## Konfigurasjon

Server og kioskstart styres av:

```text
config/kiosk-config.json
```

Eksempel:

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 3000
  },
  "kiosk": {
    "defaultGame": "selector",
    "browser": "edge",
    "openBrowserOnStart": true,
    "kioskMode": false
  }
}
```

Vanlige endringer:

- Endre port: sett `server.port`, for eksempel `3001`.
- Gjore siden tilgjengelig paa lokalnett: sett `server.host` til `0.0.0.0`.
- Starte rett i Harbor Rush: sett `kiosk.defaultGame` til `harborRush`.
- Starte rett i Bridge Duel: sett `kiosk.defaultGame` til `bridgeDuel`.
- Starte med skjult velger: sett `kiosk.defaultGame` til `selector`.
- Starte Edge i kiosk/fullskjerm: sett `kiosk.kioskMode` til `true`.

Spill, poeng, branding, premie, personvern og adminpassord styres av:

```text
config/contest-config.json
```

Viktige seksjoner i `contest-config.json`:

- `game`: Harbor Rush settings.
- `duelGame`: Bridge Duel 1v1 settings.
- `brand`: navn, logo, premie og lenker.
- `admin.password`: passord for adminsidene.

Standard adminpassord ligger i denne filen. Passordet sendes ikke til vanlig frontend, men alle med filtilgang til minnepennen kan lese det. Bytt passord foer messen.

## Data

Deltakere lagres lokalt her:

```text
data/entries.json
```

Admin kan eksportere CSV og nullstille leaderboard. Ta kopi av `data/entries.json` etter messen hvis du vil arkivere resultatene.

## USB-leveranse

Mappen `Hatteland_Challenge_USB_OPPDATERT` er den komplette, offline-klare leveransen som kopieres til minnepenn. Den inneholder startskript, server, public-filer, config, tom datafil og portabel Node.js.

### Offline / uten nett (Windows IoT 2019, x64)

Mappen `Hatteland_Challenge_USB_OPPDATERT` krever **ingen internett-tilgang og ingen installasjon**:

- Portabel Node.js ligger ferdig i `node/node.exe` (Node v20, Windows x64) og kjores rett fra mappen.
- Startfilene bruker denne automatisk. Hvis `node/node.exe` mangler, faller de tilbake til Node.js som eventuelt er installert paa maskinen (PATH).

Slik gjor du:

1. Kopier hele mappen `Hatteland_Challenge_USB_OPPDATERT` til minnepennen.
2. Paa messe-PC-en: kopier mappen til harddisk, for eksempel `C:\HattelandChallenge`.
3. Dobbeltklikk en startfil:
   - `START_HT_GAME_KIOSK.bat` (spillvelger, kiosk/fullskjerm)
   - `START_HARBOR_RUSH.bat`
   - `START_1V1.bat`
   - `START_AIR_HOCKEY.bat`

Vil du bruke en annen arkitektur (x86/ARM64), bytt ut `node/node.exe` med riktig `node.exe` fra https://nodejs.org/dist/.

Krav paa maskinen som skal kjore appen:

- Ingen, naar portabel Node.js i `node/` brukes (anbefalt). Ellers Node.js 18 eller nyere.
- En Chromium-basert nettleser for kioskmodus: Edge eller Chrome som er installert, ELLER portabel Chromium (se under).

### Valgfritt: portabel Chromium (egen nettleser i mappen)

Launcheren bruker nettleser i denne rekkefolgen:

1. Buntet portabel Chromium i `chrome/chrome.exe` (hvis den finnes) - har forrang.
2. Installert Edge (standardstier + `%LOCALAPPDATA%`), eller Chrome hvis `kiosk.browser` er `chrome`.
3. Fallback: standard nettleser, med URL skrevet i konsollen.

Portabel Chromium er ~300 MB og kan derfor ikke ligge i git (GitHub-grense 100 MB per fil). Hent den slik:

1. Paa en PC med internett: kjor `LAST_NED_CHROME.bat` i `Hatteland_Challenge_USB_OPPDATERT`. Den laster ned og pakker ut Chromium til `chrome/`.
2. Kopier sa hele mappen til minnepennen.

Egendefinert sti kan settes med miljovariablene `CHROME_PATH` eller `EDGE_PATH`.

## Prosjektstruktur

```text
config/
  contest-config.json
  kiosk-config.json
data/
  entries.json
public/
  index.html
  harbor-rush-standalone.html
  bridge-duel-standalone.html
  select.html
  admin.html
  admin-rush.html
  admin-duel.html
  app.js
  admin-rush.js
  admin-duel.js
  styles.css
node/
  node.exe                (portabel Node.js, kun i USB_OPPDATERT)
  LICENSE
launcher.js
server.js
START_HT_GAME_KIOSK.bat   (spillvelger, kiosk)
START_HARBOR_RUSH.bat
START_1V1.bat
START_AIR_HOCKEY.bat
```

## Driftstips

- Bruk `Ctrl+F5` i nettleseren etter endringer.
- Kjor appen lokalt paa messe-PC-en, ikke fra `C:\Windows\System32`.
- Hvis `npm start` feiler med manglende `package.json`, staar terminalen i feil mappe.
- Hvis porten er opptatt, endre `server.port` i `config/kiosk-config.json`.
