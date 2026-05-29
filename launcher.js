const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const ROOT_DIR = __dirname;
const KIOSK_CONFIG_PATH = path.join(ROOT_DIR, "config", "kiosk-config.json");
const CONTEST_CONFIG_PATH = path.join(ROOT_DIR, "config", "contest-config.json");
const DATA_DIR = path.join(ROOT_DIR, "data");
const ENTRIES_PATH = path.join(DATA_DIR, "entries.json");
const CACHE_BUSTER = Date.now();
const DEFAULT_CONFIG = {
  server: { host: "127.0.0.1", port: 3100 },
  kiosk: { browser: "edge", openBrowserOnStart: true, kioskMode: false }
};
const MODES = {
  selector: {
    label: "HT Game Kiosk",
    path: "/select.html",
    adminPath: "/status.html",
    preferredPort: 3100
  },
  rush: {
    label: "Harbor Rush",
    path: "/harbor-rush-standalone.html",
    adminPath: "/admin-rush.html",
    preferredPort: 3101
  },
  duel: {
    label: "Bridge Duel 1v1",
    path: "/bridge-duel-standalone.html",
    adminPath: "/admin-duel.html",
    preferredPort: 3102
  },
  airhockey: {
    label: "HT Air Hockey",
    path: "/air-hockey-standalone.html",
    adminPath: "/status.html",
    preferredPort: 3103
  }
};

function loadConfig() {
  if (!fs.existsSync(KIOSK_CONFIG_PATH)) return DEFAULT_CONFIG;
  const config = JSON.parse(fs.readFileSync(KIOSK_CONFIG_PATH, "utf8"));
  return {
    ...DEFAULT_CONFIG,
    ...config,
    server: { ...DEFAULT_CONFIG.server, ...(config.server || {}) },
    kiosk: { ...DEFAULT_CONFIG.kiosk, ...(config.kiosk || {}) }
  };
}

function isPortAvailable(host, port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.close(() => resolve(true)));
    tester.listen(port, host);
  });
}

async function findAvailablePort(host, preferredPort) {
  for (let offset = 0; offset <= 40; offset += 1) {
    const port = preferredPort + offset;
    if (await isPortAvailable(host, port)) return port;
  }
  throw new Error(`No free port found from ${preferredPort} to ${preferredPort + 40}.`);
}

const PORTABLE_CHROME = path.join(ROOT_DIR, "chrome", "chrome.exe");
const CHROME_DATA_DIR = path.join(ROOT_DIR, "chrome-user-data");

const EDGE_PATHS = [
  process.env.EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe")
];

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
];

function firstExisting(paths) {
  for (const candidate of paths) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// Velg nettleser. Buntet portabel Chromium (chrome\chrome.exe) har forrang
// fordi den er mest forutsigbar for kiosk. Ellers brukes installert
// Edge/Chrome, styrt av config.kiosk.browser.
function pickBrowser(preferred) {
  if (fs.existsSync(PORTABLE_CHROME)) return { exe: PORTABLE_CHROME, portable: true };
  if (preferred === "chrome") {
    const exe = firstExisting(CHROME_PATHS) || firstExisting(EDGE_PATHS);
    if (exe) return { exe, portable: false };
  } else {
    const exe = firstExisting(EDGE_PATHS) || firstExisting(CHROME_PATHS);
    if (exe) return { exe, portable: false };
  }
  return null;
}

function openUrl(url, config) {
  if (!config.kiosk.openBrowserOnStart) return;
  const browser = String(config.kiosk.browser || "default").toLowerCase();
  const useKiosk = Boolean(config.kiosk.kioskMode || process.argv.includes("--kiosk"));

  if (browser !== "default") {
    const choice = pickBrowser(browser);
    if (choice) {
      const isEdge = /msedge\.exe$/i.test(choice.exe);
      const args = [];
      if (useKiosk) {
        args.push(url, "--kiosk", "--no-first-run");
        if (isEdge) args.push("--edge-kiosk-type=fullscreen");
      } else {
        args.push("--new-window", url);
      }
      // Portabel Chromium trenger en skrivbar profilmappe (kan ligge pa USB/last ned-mappe)
      if (choice.portable) args.push(`--user-data-dir=${CHROME_DATA_DIR}`);
      spawn(choice.exe, args, { detached: true, stdio: "ignore" }).unref();
      return;
    }
    console.log("");
    console.log("Fant ingen Edge eller Chrome. Apner standard nettleser i stedet.");
    console.log(`Apne denne adressen manuelt om ingenting skjer: ${url}`);
    console.log("Trykk F11 for fullskjerm.");
    console.log("");
  }

  // Fallback: standard nettleser / protokoll-handler
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
}

function ensureKioskFiles() {
  const requiredFiles = [
    CONTEST_CONFIG_PATH,
    path.join(ROOT_DIR, "server.js"),
    path.join(ROOT_DIR, "public", "select.html"),
    path.join(ROOT_DIR, "public", "harbor-rush-standalone.html"),
    path.join(ROOT_DIR, "public", "bridge-duel-standalone.html"),
    path.join(ROOT_DIR, "public", "air-hockey-standalone.html")
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing required kiosk file: ${path.relative(ROOT_DIR, file)}`);
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ENTRIES_PATH)) {
    fs.writeFileSync(ENTRIES_PATH, "[]\n", "utf8");
  }
}

function logKioskCheck(mode, host, port, adminUrl) {
  console.log("Kiosk check:");
  console.log(`- Mode: ${mode}`);
  console.log(`- Host: ${host}`);
  console.log(`- Port: ${port}`);
  console.log(`- Data: ${path.relative(ROOT_DIR, ENTRIES_PATH)}`);
  console.log(`- Screen: ${process.env.SCREEN_WIDTH || "auto"} x ${process.env.SCREEN_HEIGHT || "auto"}`);
  console.log(`- Status: ${adminUrl.replace(/admin-(rush|duel)\.html.*/, "status.html")}`);
}

function getMode() {
  if (process.argv.includes("--duel")) return "duel";
  if (process.argv.includes("--rush")) return "rush";
  if (process.argv.includes("--airhockey") || process.argv.includes("--air-hockey")) return "airhockey";
  return "selector";
}

async function main() {
  ensureKioskFiles();
  const config = loadConfig();
  const mode = getMode();
  const modeConfig = MODES[mode];
  const host = String(process.env.HOST || config.server.host || "127.0.0.1");
  const preferredPort = Number(process.env.PORT || config.server.port || modeConfig.preferredPort);
  const port = await findAvailablePort(host, preferredPort);
  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  const gamePath = modeConfig.path;
  const adminPath = modeConfig.adminPath;
  const gameUrl = `http://${displayHost}:${port}${gamePath}?v=${CACHE_BUSTER}`;
  const adminUrl = `http://${displayHost}:${port}${adminPath}?v=${CACHE_BUSTER}`;

  console.log(`Starting ${modeConfig.label}...`);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy. Using ${port}.`);
  console.log(`Game: ${gameUrl}`);
  console.log(`Settings: ${adminUrl}`);
  logKioskCheck(mode, host, port, adminUrl);

  const server = spawn(process.execPath, ["server.js"], {
    cwd: ROOT_DIR,
    env: { ...process.env, HOST: host, PORT: String(port) },
    stdio: "inherit"
  });

  setTimeout(() => openUrl(gameUrl, config), 900);
  server.on("exit", (code) => process.exit(code || 0));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
