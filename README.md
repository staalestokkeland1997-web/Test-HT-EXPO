# Hatteland Technology Messekonkurranse

Dette er en lokal kiosk-app for messebruk. Den kjorer paa en PC med Node.js, uten eksterne npm-pakker og uten internettkrav under drift.

## Innhold

Sju touchspill med maritimt preg, alle med egen highscoreliste:

| Spill | Type | Fil |
| --- | --- | --- |
| Container Stacker | Presisjon, 1 spiller | `/container-stacker-standalone.html` |
| Fjord Runner | Endless runner, 1 spiller | `/fjord-runner-standalone.html` |
| Deep Dive | One-touch, 1 spiller | `/deep-dive-standalone.html` |
| Harbor Rush | Refleks, 1 spiller | `/harbor-rush-standalone.html` |
| Bridge Duel | 1 mot 1 | `/bridge-duel-standalone.html` |
| HT Air Hockey | 1 mot 1 | `/air-hockey-standalone.html` |
| Sonar Sequence | Hukommelse, 1 spiller | `/sonar-sequence-standalone.html` |
| HT ECDIS | Sjokart-demo (ikke spill) | `/ecdis/index.html?kiosk=1` |

I tillegg:

- Spillvelger (kioskens forside): `/select.html`.
- Admin hub: `/admin.html`.
- Spillinnstillinger og highscore per spill: `/admin-games.html`.
- Harbor Rush detaljadmin: `/admin-rush.html`.
- Bridge Duel detaljadmin: `/admin-duel.html`.
- HT ECDIS er en innebygd sjokart-demonstrator (fra HT-S100-Demo): ekte norske
  sjokart, vaer og ruteplanlegging. Krever internett for kartfliser; UI-et selv
  starter offline. Serveren har en `/proxy` (streng allowlist) som appen bruker
  for MET/yr og Kartverket tidevann. "Main kiosk"-knappen nede til venstre gaar
  tilbake til spillvelgeren. DEMO - ikke for navigasjon.
- Lokal lagring av deltakere i `data/entries.json` (hver oppforing merkes med spill).
- CSV-eksport per spill eller samlet.
- Konfigurasjon for spill, branding, adminpassord, port og kioskstart.

## Innstillinger og highscore per spill

Alt som gjelder det enkelte spillet ligger paa en side:

```text
http://127.0.0.1:3000/admin-games.html
```

Der kan du per spill:

- velge vanskelighetsgrad (Easy / Normal / Hard) eller finjustere hvert felt,
- sette rundetid (`Time limit`, `Match time`, `Round time`, `Answer time`),
- se topplisten for akkurat det spillet,
- eksportere deltakerne for det spillet til CSV,
- nullstille bare det spillets resultater (det tas automatisk sikkerhetskopi
  av `data/entries.json` til `data/backups/` for sletting).

Endringer trer i kraft ved neste runde. Et spill som allerede er i gang
beholder reglene runden startet med.

## Lyd

Lyd er slaatt av som standard i hele kiosken fordi den uansett drukner i
stoyen paa en messe. Harbor Rush har en lydknapp for den som vil ha den paa,
styrt av `game.soundDefaultEnabled` i `config/contest-config.json`.
De andre spillene har ingen lyd i det hele tatt.

## Start

Anbefalt paa messe-PC (starter spillvelger i kiosk/fullskjerm):

```text
START_HT_GAME_KIOSK.bat
```

Vanlig terminalstart:

```bash
npm start          # bare server (bruker config/kiosk-config.json)
npm run launch     # server + nettleser med spillvelger
npm run stacker    # start rett i Container Stacker
npm run runner     # start rett i Fjord Runner
npm run dive       # start rett i Deep Dive
npm run rush       # start rett i Harbor Rush
npm run duel       # start rett i Bridge Duel 1v1
npm run airhockey  # start rett i HT Air Hockey
npm run sonar      # start rett i Sonar Sequence
npm run ecdis      # start rett i HT ECDIS-demoen
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
http://127.0.0.1:3000/admin-games.html
http://127.0.0.1:3000/admin-rush.html
http://127.0.0.1:3000/admin-duel.html
http://127.0.0.1:3000/container-stacker-standalone.html
http://127.0.0.1:3000/fjord-runner-standalone.html
http://127.0.0.1:3000/deep-dive-standalone.html
http://127.0.0.1:3000/harbor-rush-standalone.html
http://127.0.0.1:3000/bridge-duel-standalone.html
http://127.0.0.1:3000/air-hockey-standalone.html
http://127.0.0.1:3000/sonar-sequence-standalone.html
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
- `airHockeyGame`: HT Air Hockey settings (rundetid, vinnerscore, fart).
- `stackerGame`: Container Stacker settings (kranfart, bredde, perfekt-vindu).
- `runnerGame`: Fjord Runner settings (fart, hindringer, last, antall skrog).
- `diveGame`: Deep Dive settings (fart, gap, loft, perler, miner).
- `sonarGame`: Sonar Sequence settings (antall kontakter, tempo, svartid).
- `brand`: navn, logo, premie og lenker.
- `admin.password`: passord for adminsidene.
- `apiKeys`: API-nokler for innebygde demoer. `apiKeys.aisstream` brukes av
  HT ECDIS som standardnokkel for live AIS (ekte skip i kartet) - appen
  kobler til automatisk ved oppstart. En nokkel lagt inn manuelt i appens
  "Live sources"-panel har forrang. `apiKeys.arcgis` (ArcGIS API key med
  Location services > Basemaps + Geocoding) laaser opp tre ting i ECDIS:
  Flyfoto-basemappet (Esri World Imagery), Ocean-basemappet (Esri World
  Ocean Base med GEBCO/NOAA-bathymetri) og stedssoket oppe til venstre
  (skriv "Bergen" eller et havnenavn og kartet flyr dit, ArcGIS Geocoding).
  Uten nokkel er Flyfoto/Ocean skjult og soket borte, siden anonym bruk paa
  messe er utenfor Esris vilkaar. Flere nokler kan legges til senere.
- Nytt datalag "Ship traffic density" (Chart -> Data layers): EMODnet
  Human Activities' skipstetthetskart (AIS-aarsgjennomsnitt, 1x1 km, fritt
  EU-datasett) tegnes over sjokartet - viser hvor trafikken faktisk gaar.
  Ocean-basemappet har i tillegg faatt Esris referanselag (sjonavn og
  dybdelabels) oppaa flisene.
- HT Radar (`/ecdis/radar.html?kiosk=1`): fullverdig radarkonsoll (demo) med
  roterende sveip og etterglod, datablokker i hjornene, peilering med kurs-
  og nordmerke, TX/STBY, pulslengde SP/MP/LP, range 0,25-48 nm, ringer av/paa,
  N-UP/H-UP/C-UP, RM/TM (med TM-reset), off-center, trails 30 s-6 min,
  relative/sanne vektorer 3/6/12 min, cursoravlesning, EBL/VRM, ARPA-
  maalfolging (ACQ TT) med CPA/TCPA, faremaal-alarm med grenser, guard zone,
  maalliste, alarmliste med ACK, gain/sea/rain + AUTO, interferens-
  undertrykking (IR), echo stretch, gronn/amber fosfor og landekko fra
  kystlinjen. Radaren folger SAMME seilas som ECDIS: den leser samme lagrede
  tilstand og dodregner likt, og naar ECDIS er aapen samtidig overtar dens
  direktesendte posisjon og AIS-maal (BroadcastChannel). Knapper kobler
  ECDIS <-> Radar <-> kiosk. `npm run radar` / START_RADAR.bat starter rett
  i radaren.
- ECDIS-dokken (Main kiosk- og Radar-knappene nede til venstre og havnesoket
  oppe ved merkevare-pillen) er stylet med appens egne palettvariabler og
  folger day/dusk/night automatisk. Havnesoket har innebygd norsk havneliste
  (virker offline; ArcGIS-sok legges oppaa naar API-nokkel finnes) og et eget
  touch-tastatur med AE/O/AA i samme glass-stil. Velg et treff for aa faa et
  destinasjonskort med "Set route to destination": appens dybdetrygge
  autoroute planlegger ruten og seilasen startes automatisk. Havner utenfor
  demo-kartomraadet vises som "view only".
- HT ECDIS husker seg selv mellom omstarter: skipets posisjon, kurs, rute,
  kartlag, palett og basemap lagres hvert 5. sekund (localStorage + server i
  `data/ecdis-state.json`). Ved neste oppstart dodregnes skipet frem langs
  ruten etter veggklokken, saa demoen ser ut som den har seilt hele tiden.
  Lasteskjermen og introduksjonen vises bare forste gang. Slett
  `data/ecdis-state.json` (og nettleserens localStorage) for aa nullstille.

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
   - `START_CONTAINER_STACKER.bat`
   - `START_FJORD_RUNNER.bat`
   - `START_DEEP_DIVE.bat`
   - `START_HARBOR_RUSH.bat`
   - `START_1V1.bat`
   - `START_AIR_HOCKEY.bat`
   - `START_SONAR.bat`

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
  select.html                       (kioskens forside)
  container-stacker-standalone.html
  fjord-runner-standalone.html
  deep-dive-standalone.html
  harbor-rush-standalone.html
  bridge-duel-standalone.html
  air-hockey-standalone.html
  sonar-sequence-standalone.html
  admin.html
  admin-games.html / admin-games.js (innstillinger + highscore per spill)
  admin-rush.html / admin-rush.js
  admin-duel.html / admin-duel.js
  status.html / status.js
  styles.css
node/
  node.exe                (portabel Node.js, kun i USB_OPPDATERT)
  LICENSE
launcher.js
server.js
START_HT_GAME_KIOSK.bat   (spillvelger, kiosk)
START_CONTAINER_STACKER.bat
START_FJORD_RUNNER.bat
START_DEEP_DIVE.bat
START_HARBOR_RUSH.bat
START_1V1.bat
START_AIR_HOCKEY.bat
START_SONAR.bat
```

## Driftstips

- Bruk `Ctrl+F5` i nettleseren etter endringer.
- Kjor appen lokalt paa messe-PC-en, ikke fra `C:\Windows\System32`.
- Hvis `npm start` feiler med manglende `package.json`, staar terminalen i feil mappe.
- Hvis porten er opptatt, endre `server.port` i `config/kiosk-config.json`.
