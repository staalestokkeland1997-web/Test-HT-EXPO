"use strict";

// Laster ned kartflisene kiosken trenger, slik at ECDIS og radaren virker
// uten nett paa messa.
//
// Kjor den EN gang der du har nett - paa kontoret, for minnepennen pakkes:
//
//   node tools/download_tiles.js --dry-run     (hvor mange fliser, hvor stort)
//   node tools/download_tiles.js               (last ned)
//   node tools/download_tiles.js --area "Haugesund/Karmsund"
//
// Omraadene staar i config/tiles-config.json. Flisene havner i data/tiles/ og
// serveres av /tiles/... - de ligger utenfor git fordi de er for store, saa de
// blir med paa minnepennen naar mappen kopieres, ikke naar repoet klones.
//
// Verktoyet kan kjores igjen: fliser som allerede ligger der hoppes over, saa
// en avbrutt nedlasting fortsetter der den slapp.

const fs = require("fs");
const path = require("path");
const tiles = require("../lib/tiles");

const ROOT_DIR = path.join(__dirname, "..");
const TILE_DIR = path.join(ROOT_DIR, "data", "tiles");
const CONFIG_PATH = path.join(ROOT_DIR, "config", "tiles-config.json");
const USER_AGENT = "HT-ECDIS-Demo/1.0 (github.com/staalestokkeland1997-web/Test-HT-EXPO)";

// Kildene er offentlige, men de er ikke vaare. Et tak paa samtidige
// forespoersler og en pause mellom rundene holder nedlastingen hoeflig - en
// kiosk som henter noen tusen fliser en gang skal ikke se ut som et angrep.
const CONCURRENCY = 6;
const TIMEOUT_MS = 20000;
const RETRIES = 3;

function parseArgs(argv) {
  const args = { dryRun: false, areas: null, layers: null, force: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run" || arg === "-n") args.dryRun = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--area") (args.areas || (args.areas = [])).push(argv[++i]);
    else if (arg === "--layer") (args.layers || (args.layers = [])).push(argv[++i]);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else {
      console.error(`Unknown argument: ${arg}`);
      args.help = true;
    }
  }

  return args;
}

function usage() {
  console.log(`
Last ned kartfliser for offline kiosk.

  node tools/download_tiles.js [valg]

  --dry-run, -n        Vis antall fliser og anslatt storrelse uten aa laste ned
  --area <navn>        Bare dette omraadet fra config/tiles-config.json
  --layer <navn>       Bare dette laget (${Object.keys(tiles.LAYERS).join(", ")})
  --force              Hent flisene paa nytt selv om de ligger der fra for
  --help, -h           Denne teksten
`);
}

function loadConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const layers = (config.layers || []).filter((layer) => {
    if (tiles.isLayer(layer)) return true;
    console.error(`Skipping unknown layer in tiles-config.json: ${layer}`);
    return false;
  });

  const areas = (config.areas || []).filter((area) => {
    if (!area || !tiles.isValidBbox(area.bbox)) {
      console.error(`Skipping area with an invalid bbox: ${(area && area.name) || "(no name)"}`);
      return false;
    }
    return true;
  });

  return { layers, areas };
}

function humanBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${Math.round(bytes / 1024)} kB`;
}

// Bygger listen over det som mangler. Store jobber telles opp uten aa holde
// hele listen i minnet foer den er filtrert mot disken.
function plan(config, args) {
  const jobs = [];
  let skipped = 0;

  for (const area of config.areas) {
    if (args.areas && !args.areas.includes(area.name)) continue;

    for (const layer of config.layers) {
      if (args.layers && !args.layers.includes(layer)) continue;

      const maxZoom = Math.min(area.maxZoom, tiles.LAYERS[layer].max);

      for (const t of tiles.eachTile(area.bbox, area.minZoom, maxZoom)) {
        const filePath = tiles.tilePath(TILE_DIR, layer, t.z, t.x, t.y);
        if (!args.force && fs.existsSync(filePath)) {
          skipped++;
          continue;
        }
        jobs.push({ layer, ...t, filePath });
      }
    }
  }

  return { jobs, skipped };
}

async function fetchTile(job) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch(tiles.tileUrl(job.layer, job.z, job.x, job.y), {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });

      // 404 er normalt: OpenSeaMap har ikke en flis for hver rute i sjoen.
      // Den skal ikke provess igjen, og den skal ikke telles som feil.
      if (response.status === 404) return { missing: true };
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const body = Buffer.from(await response.arrayBuffer());
      if (!body.length) throw new Error("empty response");

      fs.mkdirSync(path.dirname(job.filePath), { recursive: true });
      const tempPath = `${job.filePath}.tmp-${process.pid}`;
      fs.writeFileSync(tempPath, body);
      fs.renameSync(tempPath, job.filePath);
      return { bytes: body.length };
    } catch (error) {
      if (attempt === RETRIES) return { error: error.message };
      await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt - 1)));
    }
  }

  return { error: "unreachable" };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  const config = loadConfig();

  if (!config.layers.length || !config.areas.length) {
    console.error("Nothing to do: config/tiles-config.json has no usable layers or areas.");
    process.exitCode = 1;
    return;
  }

  console.log("Omraader i config/tiles-config.json:\n");
  for (const area of config.areas) {
    const perLayer = config.layers.map((layer) => {
      const maxZoom = Math.min(area.maxZoom, tiles.LAYERS[layer].max);
      let count = 0;
      for (let z = area.minZoom; z <= maxZoom; z++) count += tiles.countTiles(area.bbox, z);
      return count;
    });
    const total = perLayer.reduce((sum, n) => sum + n, 0);
    console.log(
      `  ${area.name}  z${area.minZoom}-${area.maxZoom}  ` +
      `${total.toLocaleString("no")} fliser  ~${humanBytes(total * 18 * 1024)}`
    );
  }

  const { jobs, skipped } = plan(config, args);

  console.log(
    `\n${jobs.length.toLocaleString("no")} fliser aa hente` +
    (skipped ? `, ${skipped.toLocaleString("no")} ligger der fra for` : "") +
    ` (~${humanBytes(jobs.length * 18 * 1024)})`
  );

  if (args.dryRun) {
    console.log("\n--dry-run: ingenting lastet ned.");
    return;
  }

  if (!jobs.length) {
    console.log("\nKartlageret er komplett.");
    return;
  }

  let done = 0;
  let bytes = 0;
  let missing = 0;
  const errors = [];
  const started = Date.now();
  let next = 0;

  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      const result = await fetchTile(job);

      if (result.error) errors.push(`${job.layer}/${job.z}/${job.x}/${job.y}: ${result.error}`);
      else if (result.missing) missing++;
      else bytes += result.bytes;

      done++;
      if (done % 50 === 0 || done === jobs.length) {
        const seconds = (Date.now() - started) / 1000;
        const rate = done / Math.max(1, seconds);
        const left = Math.round((jobs.length - done) / Math.max(0.1, rate));
        process.stdout.write(
          `\r  ${done.toLocaleString("no")}/${jobs.length.toLocaleString("no")}  ` +
          `${humanBytes(bytes)}  ${rate.toFixed(0)}/s  ~${Math.floor(left / 60)}m ${left % 60}s igjen   `
        );
      }
    }
  };

  console.log("");
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("\n");

  console.log(`Lastet ned ${humanBytes(bytes)} til data/tiles/`);
  if (missing) console.log(`${missing.toLocaleString("no")} fliser finnes ikke hos kilden (normalt for seamark).`);

  if (errors.length) {
    console.error(`\n${errors.length} fliser feilet. Kjor kommandoen igjen for aa prove dem paa nytt.`);
    for (const line of errors.slice(0, 10)) console.error(`  ${line}`);
    if (errors.length > 10) console.error(`  ... og ${errors.length - 10} til`);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
