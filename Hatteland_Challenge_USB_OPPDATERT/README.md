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

Anbefalt paa messe-PC:

```text
START_HER.bat
```

Andre startvalg:

```text
START_SELECTOR.bat      Aapner skjult spillvelger
START_ADMIN.bat         Aapner adminside
START_SERVER_ONLY.bat   Starter bare lokal server
```

Vanlig terminalstart:

```bash
npm start
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

Mappen `Hatteland_Challenge_USB` er laget for aa kopieres til minnepenn. Den inneholder startskript, server, public-filer, config og tom datafil.

Krav paa maskinen som skal kjore appen:

- Node.js 18 eller nyere
- Microsoft Edge anbefales for kioskmodus

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
launcher.js
server.js
START_HER.bat
START_ADMIN.bat
START_SELECTOR.bat
START_SERVER_ONLY.bat
```

## Driftstips

- Bruk `Ctrl+F5` i nettleseren etter endringer.
- Kjor appen lokalt paa messe-PC-en, ikke fra `C:\Windows\System32`.
- Hvis `npm start` feiler med manglende `package.json`, staar terminalen i feil mappe.
- Hvis porten er opptatt, endre `server.port` i `config/kiosk-config.json`.
