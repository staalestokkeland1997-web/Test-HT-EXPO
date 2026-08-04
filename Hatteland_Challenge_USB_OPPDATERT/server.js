const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const CONFIG_PATH = path.join(ROOT_DIR, "config", "contest-config.json");
const KIOSK_CONFIG_PATH = path.join(ROOT_DIR, "config", "kiosk-config.json");
const DATA_PATH = path.join(ROOT_DIR, "data", "entries.json");
const BACKUP_DIR = path.join(ROOT_DIR, "data", "backups");
const DEFAULT_KIOSK_CONFIG = {
  server: {
    host: "127.0.0.1",
    port: 3000
  },
  kiosk: {
    defaultGame: "selector",
    browser: "edge",
    openBrowserOnStart: true,
    kioskMode: false,
    paths: {
      selector: "/select.html",
      harborRush: "/harbor-rush-standalone.html",
      bridgeDuel: "/bridge-duel-standalone.html",
      airHockey: "/air-hockey-standalone.html",
      containerStacker: "/container-stacker-standalone.html",
      fjordRunner: "/fjord-runner-standalone.html",
      sonarSequence: "/sonar-sequence-standalone.html",
      admin: "/admin.html",
      adminRush: "/admin-rush.html",
      adminDuel: "/admin-duel.html",
      adminGames: "/admin-games.html"
    }
  }
};

function mergeKioskConfig(config) {
  return {
    ...DEFAULT_KIOSK_CONFIG,
    ...config,
    server: {
      ...DEFAULT_KIOSK_CONFIG.server,
      ...(config.server || {})
    },
    kiosk: {
      ...DEFAULT_KIOSK_CONFIG.kiosk,
      ...(config.kiosk || {}),
      paths: {
        ...DEFAULT_KIOSK_CONFIG.kiosk.paths,
        ...((config.kiosk && config.kiosk.paths) || {})
      }
    }
  };
}

function loadKioskConfig() {
  if (!fs.existsSync(KIOSK_CONFIG_PATH)) {
    return DEFAULT_KIOSK_CONFIG;
  }

  try {
    return mergeKioskConfig(JSON.parse(fs.readFileSync(KIOSK_CONFIG_PATH, "utf8")));
  } catch (error) {
    console.warn(`Could not read ${KIOSK_CONFIG_PATH}. Using default kiosk config.`);
    return DEFAULT_KIOSK_CONFIG;
  }
}

function normalizeRoute(route, fallback) {
  if (!route || typeof route !== "string") {
    return fallback;
  }

  return route.startsWith("/") ? route : `/${route}`;
}

const KIOSK_CONFIG = loadKioskConfig();
const HOST = String(process.env.HOST || KIOSK_CONFIG.server.host || "127.0.0.1");
const PORT = Number(process.env.PORT || KIOSK_CONFIG.server.port || 3000);

const activeSessions = new Map();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });

  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, "[]\n", "utf8");
  }
}

function loadConfig() {
  const file = fs.readFileSync(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(file);

  if (!parsed.admin || !parsed.admin.password) {
    throw new Error("Missing admin.password in config/contest-config.json");
  }

  return parsed;
}

// Skriv via midlertidig fil + rename slik at et stromkutt midt i skrivingen
// aldri etterlater en halvskrevet config- eller datafil.
function writeFileAtomic(filePath, contents) {
  const tempPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, contents, "utf8");
  fs.renameSync(tempPath, filePath);
}

function writeConfig(config) {
  writeFileAtomic(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
}

function toBoundedNumber(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalizeGameSettings(payload, currentGame) {
  const game = payload.game || payload;
  const brandIntensity = ["Low", "Medium", "High"].includes(game.brandIntensity)
    ? game.brandIntensity
    : currentGame.brandIntensity || "Medium";

  return {
    ...currentGame,
    difficultyName: String(game.difficultyName || currentGame.difficultyName || "Custom").slice(0, 40),
    soundDefaultEnabled:
      typeof game.soundDefaultEnabled === "boolean"
        ? game.soundDefaultEnabled
        : Boolean(currentGame.soundDefaultEnabled ?? true),
    durationSeconds: toBoundedNumber(game.durationSeconds, currentGame.durationSeconds, 15, 90),
    countdownSeconds: toBoundedNumber(game.countdownSeconds, currentGame.countdownSeconds, 1, 5),
    goodTargetBasePoints: toBoundedNumber(
      game.goodTargetBasePoints,
      currentGame.goodTargetBasePoints,
      0,
      250
    ),
    bonusTargetPoints: toBoundedNumber(game.bonusTargetPoints, currentGame.bonusTargetPoints, 0, 500),
    multiTargetPoints: toBoundedNumber(game.multiTargetPoints, currentGame.multiTargetPoints, 0, 750),
    badTargetPenalty: toBoundedNumber(game.badTargetPenalty, currentGame.badTargetPenalty, 0, 100),
    enableNearMissWarnings:
      typeof game.enableNearMissWarnings === "boolean"
        ? game.enableNearMissWarnings
        : Boolean(currentGame.enableNearMissWarnings ?? true),
    enableProgressiveDifficulty:
      typeof game.enableProgressiveDifficulty === "boolean"
        ? game.enableProgressiveDifficulty
        : Boolean(currentGame.enableProgressiveDifficulty ?? true),
    enablePowerUps:
      typeof game.enablePowerUps === "boolean" ? game.enablePowerUps : Boolean(currentGame.enablePowerUps ?? true),
    enableStreakVisuals:
      typeof game.enableStreakVisuals === "boolean"
        ? game.enableStreakVisuals
        : Boolean(currentGame.enableStreakVisuals ?? true),
    enableFinalCountdownAlarm:
      typeof game.enableFinalCountdownAlarm === "boolean"
        ? game.enableFinalCountdownAlarm
        : Boolean(currentGame.enableFinalCountdownAlarm ?? true),
    enableRankReveal:
      typeof game.enableRankReveal === "boolean" ? game.enableRankReveal : Boolean(currentGame.enableRankReveal ?? true),
    useHattelandLabels:
      typeof game.useHattelandLabels === "boolean"
        ? game.useHattelandLabels
        : Boolean(currentGame.useHattelandLabels ?? true),
    powerUpDurationSeconds: toBoundedNumber(
      game.powerUpDurationSeconds,
      currentGame.powerUpDurationSeconds,
      2,
      15
    ),
    powerUpSpawnChancePercent: toBoundedNumber(
      game.powerUpSpawnChancePercent,
      currentGame.powerUpSpawnChancePercent,
      0,
      25
    ),
    timeBonusSeconds: toBoundedNumber(game.timeBonusSeconds, currentGame.timeBonusSeconds, 1, 15),
    maxTimeBonusSeconds: toBoundedNumber(
      game.maxTimeBonusSeconds,
      currentGame.maxTimeBonusSeconds ?? 6,
      0,
      60
    ),
    timeBonusSpawnChancePercent: toBoundedNumber(
      game.timeBonusSpawnChancePercent,
      currentGame.timeBonusSpawnChancePercent,
      0,
      20
    ),
    brandIntensity,
    multiTouchWindowMs: toBoundedNumber(game.multiTouchWindowMs, currentGame.multiTouchWindowMs, 160, 800),
    maxVisibleTargets: toBoundedNumber(game.maxVisibleTargets, currentGame.maxVisibleTargets, 2, 8),
    spawnIntervalMs: toBoundedNumber(game.spawnIntervalMs, currentGame.spawnIntervalMs, 180, 1000),
    targetLifetimeMs: toBoundedNumber(game.targetLifetimeMs, currentGame.targetLifetimeMs, 650, 3000),
    minTargetSize: toBoundedNumber(game.minTargetSize, currentGame.minTargetSize, 48, 180),
    maxTargetSize: toBoundedNumber(game.maxTargetSize, currentGame.maxTargetSize, 64, 220),
    scoreHighlightThreshold: toBoundedNumber(
      game.scoreHighlightThreshold,
      currentGame.scoreHighlightThreshold,
      0,
      2000
    )
  };
}

function toBoundedFloat(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(number * 100) / 100));
}

function normalizeDuelGameSettings(payload, currentDuelGame = {}) {
  const game = payload.duelGame || payload.game || payload;

  return {
    ...currentDuelGame,
    difficultyName: String(game.difficultyName || currentDuelGame.difficultyName || "Custom").slice(0, 40),
    durationSeconds: toBoundedNumber(game.durationSeconds, currentDuelGame.durationSeconds || 90, 45, 300),
    initialShipsPerPlayer: toBoundedNumber(
      game.initialShipsPerPlayer,
      currentDuelGame.initialShipsPerPlayer || 3,
      1,
      8
    ),
    spawnIntervalSeconds: toBoundedFloat(
      game.spawnIntervalSeconds,
      currentDuelGame.spawnIntervalSeconds || 1.55,
      0.6,
      4
    ),
    finalSurgeSeconds: toBoundedNumber(game.finalSurgeSeconds, currentDuelGame.finalSurgeSeconds || 15, 5, 60),
    finalSurgeSpawnFactorPercent: toBoundedNumber(
      game.finalSurgeSpawnFactorPercent,
      currentDuelGame.finalSurgeSpawnFactorPercent || 82,
      45,
      120
    ),
    attackDurationSeconds: toBoundedNumber(
      game.attackDurationSeconds,
      currentDuelGame.attackDurationSeconds || 5,
      2,
      15
    ),
    attackMaxEnergy: toBoundedNumber(game.attackMaxEnergy, currentDuelGame.attackMaxEnergy || 100, 40, 200),
    correctDockPoints: toBoundedNumber(game.correctDockPoints, currentDuelGame.correctDockPoints || 30, 0, 250),
    comboBonusPerDock: toBoundedNumber(game.comboBonusPerDock, currentDuelGame.comboBonusPerDock || 8, 0, 80),
    maxComboBonus: toBoundedNumber(game.maxComboBonus, currentDuelGame.maxComboBonus || 80, 0, 300),
    streakEvery: toBoundedNumber(game.streakEvery, currentDuelGame.streakEvery || 5, 2, 20),
    streakBonusPoints: toBoundedNumber(game.streakBonusPoints, currentDuelGame.streakBonusPoints || 60, 0, 500),
    priorityBonusPoints: toBoundedNumber(game.priorityBonusPoints, currentDuelGame.priorityBonusPoints || 85, 0, 500),
    wrongDockPenalty: toBoundedNumber(game.wrongDockPenalty, currentDuelGame.wrongDockPenalty || 20, 0, 200),
    collisionPenalty: toBoundedNumber(game.collisionPenalty, currentDuelGame.collisionPenalty || 25, 0, 200),
    trafficPenalty: toBoundedNumber(game.trafficPenalty, currentDuelGame.trafficPenalty || 10, 0, 200),
    attackEnergyBase: toBoundedNumber(game.attackEnergyBase, currentDuelGame.attackEnergyBase || 13, 0, 100),
    attackEnergyComboFactorPercent: toBoundedNumber(
      game.attackEnergyComboFactorPercent,
      currentDuelGame.attackEnergyComboFactorPercent || 34,
      0,
      200
    ),
    attackEnergyStreakFactorPercent: toBoundedNumber(
      game.attackEnergyStreakFactorPercent,
      currentDuelGame.attackEnergyStreakFactorPercent || 18,
      0,
      200
    ),
    priorityAttackEnergy: toBoundedNumber(
      game.priorityAttackEnergy,
      currentDuelGame.priorityAttackEnergy || 28,
      0,
      150
    ),
    beaconAttackEnergy: toBoundedNumber(
      game.beaconAttackEnergy,
      currentDuelGame.beaconAttackEnergy || 32,
      0,
      150
    ),
    beaconScorePoints: toBoundedNumber(
      game.beaconScorePoints,
      currentDuelGame.beaconScorePoints || 120,
      0,
      500
    ),
    beaconSpawnMinSeconds: toBoundedNumber(
      game.beaconSpawnMinSeconds,
      currentDuelGame.beaconSpawnMinSeconds || 9,
      3,
      60
    ),
    beaconSpawnMaxSeconds: toBoundedNumber(
      game.beaconSpawnMaxSeconds,
      currentDuelGame.beaconSpawnMaxSeconds || 13,
      3,
      90
    ),
    trafficVessels: toBoundedNumber(game.trafficVessels, currentDuelGame.trafficVessels || 2, 1, 6),
    stormSpeedMultiplierPercent: toBoundedNumber(
      game.stormSpeedMultiplierPercent,
      currentDuelGame.stormSpeedMultiplierPercent || 175,
      100,
      350
    ),
    stormExistingShipBoostPercent: toBoundedNumber(
      game.stormExistingShipBoostPercent,
      currentDuelGame.stormExistingShipBoostPercent || 118,
      100,
      250
    ),
    fogOpacityPercent: toBoundedNumber(game.fogOpacityPercent, currentDuelGame.fogOpacityPercent || 24, 0, 85),
    glitchIntensityPercent: toBoundedNumber(
      game.glitchIntensityPercent,
      currentDuelGame.glitchIntensityPercent || 40,
      0,
      100
    ),
    trafficDockHeight: toBoundedNumber(game.trafficDockHeight, currentDuelGame.trafficDockHeight || 60, 40, 90),
    normalDockHeight: toBoundedNumber(game.normalDockHeight, currentDuelGame.normalDockHeight || 64, 46, 100),
    enablePriorityShips:
      typeof game.enablePriorityShips === "boolean"
        ? game.enablePriorityShips
        : Boolean(currentDuelGame.enablePriorityShips ?? true),
    priorityShipChancePercent: toBoundedNumber(
      game.priorityShipChancePercent,
      currentDuelGame.priorityShipChancePercent || 22,
      0,
      80
    ),
    enableBeacons:
      typeof game.enableBeacons === "boolean" ? game.enableBeacons : Boolean(currentDuelGame.enableBeacons ?? true),
    enableFinalSurge:
      typeof game.enableFinalSurge === "boolean"
        ? game.enableFinalSurge
        : Boolean(currentDuelGame.enableFinalSurge ?? true),
    enableStormAttack:
      typeof game.enableStormAttack === "boolean"
        ? game.enableStormAttack
        : Boolean(currentDuelGame.enableStormAttack ?? true),
    enableFogAttack:
      typeof game.enableFogAttack === "boolean" ? game.enableFogAttack : Boolean(currentDuelGame.enableFogAttack ?? true),
    enableTrafficAttack:
      typeof game.enableTrafficAttack === "boolean"
        ? game.enableTrafficAttack
        : Boolean(currentDuelGame.enableTrafficAttack ?? true),
    enableGlitchAttack:
      typeof game.enableGlitchAttack === "boolean"
        ? game.enableGlitchAttack
        : Boolean(currentDuelGame.enableGlitchAttack ?? true)
  };
}

// Alle spill i kiosken. configKey peker paa seksjonen i contest-config.json,
// og gameId er det spillene sender inn sammen med score.
const GAMES = {
  stacker: { label: "Container Stacker", configKey: "stackerGame" },
  runner: { label: "Fjord Runner", configKey: "runnerGame" },
  rush: { label: "Harbor Rush", configKey: "game" },
  duel: { label: "Bridge Duel", configKey: "duelGame" },
  airhockey: { label: "HT Air Hockey", configKey: "airHockeyGame" },
  sonar: { label: "Sonar Sequence", configKey: "sonarGame" }
};

const DEFAULT_GAME_ID = "rush";

// Enkle grenser per felt slik at nye spill ikke trenger hver sin normalizer.
const GAME_SCHEMAS = {
  airhockey: {
    numbers: {
      matchSeconds: { min: 20, max: 300, fallback: 60 },
      winScore: { min: 3, max: 50, fallback: 25 },
      puckSpeedPercent: { min: 60, max: 180, fallback: 100 },
      paddleSizePercent: { min: 60, max: 160, fallback: 100 },
      powerUpDurationSeconds: { min: 3, max: 20, fallback: 7 }
    },
    booleans: { enablePowerUps: true }
  },
  stacker: {
    numbers: {
      startSpeedPercent: { min: 40, max: 200, fallback: 100 },
      speedRampPercent: { min: 0, max: 200, fallback: 100 },
      startWidthPercent: { min: 50, max: 160, fallback: 100 },
      perfectTolerancePercent: { min: 1, max: 15, fallback: 5 },
      perfectRegainPercent: { min: 0, max: 100, fallback: 35 },
      swayStartLevel: { min: 0, max: 60, fallback: 8 },
      swayStrengthPercent: { min: 0, max: 200, fallback: 100 },
      basePoints: { min: 1, max: 200, fallback: 10 },
      perfectBonusPoints: { min: 0, max: 300, fallback: 25 },
      maxComboBonus: { min: 0, max: 500, fallback: 120 },
      timeLimitSeconds: { min: 20, max: 300, fallback: 90 }
    },
    booleans: { enableSway: true, enableTimeLimit: false }
  },
  runner: {
    numbers: {
      startSpeedPercent: { min: 50, max: 180, fallback: 100 },
      speedRampPercent: { min: 0, max: 250, fallback: 100 },
      maxSpeedPercent: { min: 110, max: 320, fallback: 220 },
      obstacleDensityPercent: { min: 40, max: 180, fallback: 100 },
      cargoDensityPercent: { min: 0, max: 200, fallback: 100 },
      lives: { min: 1, max: 6, fallback: 3 },
      cargoPoints: { min: 1, max: 200, fallback: 25 },
      distancePointsPer100m: { min: 0, max: 100, fallback: 10 },
      streakBonusPercent: { min: 0, max: 300, fallback: 100 },
      shieldSeconds: { min: 0, max: 6, fallback: 2 }
    },
    booleans: { enableJump: true, enableWeather: true }
  },
  sonar: {
    numbers: {
      nodeCount: { min: 4, max: 9, fallback: 6 },
      pingMs: { min: 180, max: 1200, fallback: 520 },
      gapMs: { min: 60, max: 600, fallback: 180 },
      inputTimeoutSeconds: { min: 2, max: 20, fallback: 6 },
      startLength: { min: 1, max: 6, fallback: 1 },
      pointsPerStep: { min: 1, max: 100, fallback: 10 },
      speedUpPercent: { min: 0, max: 20, fallback: 4 }
    },
    booleans: { enableSound: true, enableTimeout: true }
  }
};

function normalizeBySchema(payload, current, schema) {
  const next = { ...current };
  next.difficultyName = String(payload.difficultyName || current.difficultyName || "Custom").slice(0, 40);

  Object.entries(schema.numbers || {}).forEach(([field, range]) => {
    const fallback = current[field] ?? range.fallback;
    next[field] = toBoundedNumber(payload[field], fallback, range.min, range.max);
  });

  Object.entries(schema.booleans || {}).forEach(([field, fallback]) => {
    next[field] =
      typeof payload[field] === "boolean" ? payload[field] : Boolean(current[field] ?? fallback);
  });

  return next;
}

function normalizeGameId(value) {
  const id = String(value || "").trim();
  return Object.prototype.hasOwnProperty.call(GAMES, id) ? id : null;
}

function publicConfig(config) {
  return {
    brand: config.brand,
    booth: config.booth,
    game: config.game,
    duelGame: config.duelGame,
    airHockeyGame: config.airHockeyGame || {},
    stackerGame: config.stackerGame || {},
    runnerGame: config.runnerGame || {},
    sonarGame: config.sonarGame || {},
    privacy: config.privacy,
    theme: config.theme
  };
}

function readEntries() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Eldre oppforinger ble lagret for spillene fikk egne lister.
    return parsed.map((entry) => ({
      ...entry,
      game: normalizeGameId(entry.game) || DEFAULT_GAME_ID
    }));
  } catch (error) {
    // Korrupt datafil skal ikke stoppe kiosken midt i messen: ta vare paa
    // originalen for feilsoking og fortsett med tom liste.
    const corruptPath = `${DATA_PATH}.corrupt-${Date.now()}`;
    fs.copyFileSync(DATA_PATH, corruptPath);
    console.error(`Could not parse ${DATA_PATH}. Saved a copy at ${corruptPath} and continuing with an empty list.`);
    writeEntries([]);
    return [];
  }
}

function writeEntries(entries) {
  writeFileAtomic(DATA_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

function backupEntries(reason = "manual") {
  ensureDataFile();
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeReason = String(reason).replace(/[^a-z0-9_-]/gi, "-").slice(0, 32) || "manual";
  const backupPath = path.join(BACKUP_DIR, `entries-${timestamp}-${safeReason}.json`);
  fs.copyFileSync(DATA_PATH, backupPath);
  return path.relative(ROOT_DIR, backupPath);
}

function latestBackupInfo() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return null;
  }

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const fullPath = path.join(BACKUP_DIR, name);
      const stat = fs.statSync(fullPath);
      return {
        name,
        path: path.relative(ROOT_DIR, fullPath),
        createdAt: stat.mtime.toISOString(),
        bytes: stat.size
      };
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return backups[0] || null;
}

function cleanupExpiredSessions(config) {
  const now = Date.now();
  const expiryMs = config.game.registrationTimeoutSeconds * 1000;

  for (const [sessionId, session] of activeSessions.entries()) {
    const age = now - session.startedAt;
    const pendingAge = session.finishedAt ? now - session.finishedAt : age;

    if (age > config.game.maxSessionAgeSeconds * 1000 || pendingAge > expiryMs) {
      activeSessions.delete(sessionId);
    }
  }
}

function getLeaderboard(entries, limit = 10, game = null) {
  const scoped = game ? entries.filter((entry) => entry.game === game) : entries;

  return [...scoped]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return new Date(left.playedAt).getTime() - new Date(right.playedAt).getTime();
    })
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      score: entry.score,
      game: entry.game,
      playedAt: entry.playedAt
    }));
}

function getAllLeaderboards(entries, limit = 10) {
  return Object.fromEntries(
    Object.keys(GAMES).map((gameId) => [gameId, getLeaderboard(entries, limit, gameId)])
  );
}

function getStreakMultiplier(streak) {
  if (streak >= 12) {
    return 2;
  }

  if (streak >= 6) {
    return 1.5;
  }

  if (streak >= 3) {
    return 1.25;
  }

  return 1;
}

function getScoredHitPoints(basePoints, streak) {
  return Math.round(basePoints * getStreakMultiplier(streak));
}

function calculateExpectedScoreFromStats(stats, gameConfig) {
  let score = 0;
  let streak = 0;
  let shieldCharges = 0;
  let doubleActiveHits = Number(stats.doubleActiveHits || 0);

  const events = Array.isArray(stats.events) ? stats.events : [];

  events.forEach((event) => {
    if (event === "power-double") {
      doubleActiveHits += 6;
      return;
    }

    if (event === "power-shield") {
      shieldCharges = Math.min(2, shieldCharges + 1);
      return;
    }

    if (event === "power-slow" || event === "time") {
      return;
    }

    if (event === "bad") {
      streak = 0;

      if (shieldCharges > 0) {
        shieldCharges -= 1;
      } else {
        score -= gameConfig.badTargetPenalty;
      }

      return;
    }

    let basePoints = 0;

    if (event === "good") {
      streak += 1;
      basePoints = gameConfig.goodTargetBasePoints;
    } else if (event === "bonus") {
      streak += 1;
      basePoints = gameConfig.bonusTargetPoints;
    } else if (event === "multi") {
      streak += 2;
      basePoints = gameConfig.multiTargetPoints;
    } else {
      return;
    }

    let delta = getScoredHitPoints(basePoints, streak);

    if (doubleActiveHits > 0) {
      delta *= 2;
      doubleActiveHits -= 1;
    }

    score += delta;
  });

  return Math.max(0, Math.round(score));
}

function buildCsv(entries) {
  const header = ["id", "game", "name", "email", "phone", "score", "playedAt", "createdAt"];
  const rows = entries.map((entry) => [
    entry.id,
    entry.game || DEFAULT_GAME_ID,
    entry.name,
    entry.email,
    entry.phone || "",
    entry.score,
    entry.playedAt,
    entry.createdAt
  ]);

  const escape = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

function getDefaultRoute() {
  const paths = KIOSK_CONFIG.kiosk.paths || DEFAULT_KIOSK_CONFIG.kiosk.paths;

  if (KIOSK_CONFIG.kiosk.defaultPath) {
    return normalizeRoute(KIOSK_CONFIG.kiosk.defaultPath, "/index.html");
  }

  if (KIOSK_CONFIG.kiosk.defaultGame === "selector") {
    return normalizeRoute(paths.selector, "/select.html");
  }

  if (KIOSK_CONFIG.kiosk.defaultGame === "bridgeDuel") {
    return normalizeRoute(paths.bridgeDuel, "/bridge-duel-standalone.html");
  }

  return "/index.html";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, payload, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  response.end(payload);
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    request.on("error", reject);
  });
}

function safeEquals(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ""));
  const rightBuffer = Buffer.from(String(right ?? ""));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireAdmin(request, response, config) {
  const password = request.headers["x-admin-password"];

  if (!safeEquals(password, config.admin.password)) {
    sendJson(response, 401, {
      error: "Invalid admin password."
    });
    return false;
  }

  return true;
}

function validateRegistration(payload) {
  const errors = [];
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const phone = String(payload.phone || "").trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (name.length < 2) {
    errors.push("Name must be at least 2 characters.");
  }

  if (!email && !phone) {
    errors.push("Email or phone is required.");
  }

  if (email && !emailPattern.test(email)) {
    errors.push("The email address is invalid.");
  }

  if (phone && (phone.length < 5 || phone.length > 30)) {
    errors.push("The phone number must be between 5 and 30 characters.");
  }

  if (!payload.consent) {
    errors.push("Consent must be checked.");
  }

  return errors;
}

function validateStandaloneEntry(payload = {}) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    errors.push("Invalid entry data.");
    return errors;
  }

  const email = String(payload.email || "").trim();
  const phone = String(payload.phone || "").trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!payload.name || String(payload.name).trim().length < 2) {
    errors.push("Name must be at least 2 characters.");
  }

  if (!email && !phone) {
    errors.push("Email or phone is required.");
  }

  if (email && !emailPattern.test(email)) {
    errors.push("The email address is invalid.");
  }

  if (phone && (phone.length < 5 || phone.length > 30)) {
    errors.push("The phone number must be between 5 and 30 characters.");
  }

  return errors;
}

// Serve only files under public/ so config and entry data are never exposed directly.
function serveStatic(requestPath, response) {
  let requestedPath = requestPath === "/" ? getDefaultRoute() : requestPath;

  if (requestedPath === "/favicon.ico") {
    requestedPath = "/assets/logo.svg";
  }
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      sendText(response, 404, "Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || "application/octet-stream";
    const stream = fs.createReadStream(filePath);
    const noStoreExtensions = new Set([
      ".html",
      ".js",
      ".css",
      ".json",
      ".webmanifest",
      ".svg"
    ]);

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": noStoreExtensions.has(extension) ? "no-store" : "public, max-age=3600"
    });

    stream.pipe(response);
  });
}

async function handleApi(request, response, url) {
  const pathname = url.pathname;
  const config = loadConfig();
  cleanupExpiredSessions(config);

  if (request.method === "GET" && pathname === "/api/config") {
    sendJson(response, 200, publicConfig(config));
    return;
  }

  if (request.method === "GET" && pathname === "/api/leaderboard") {
    const entries = readEntries();
    const game = normalizeGameId(url.searchParams.get("game"));

    sendJson(response, 200, {
      game,
      entries: getLeaderboard(entries, 10, game),
      boards: getAllLeaderboards(entries, 10)
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/games") {
    sendJson(response, 200, {
      games: Object.entries(GAMES).map(([id, meta]) => ({
        id,
        label: meta.label,
        settings: config[meta.configKey] || {}
      }))
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/session/start") {
    const sessionId = crypto.randomUUID();
    const startedAt = Date.now();

    activeSessions.set(sessionId, {
      id: sessionId,
      startedAt,
      finishedAt: null,
      usedAt: null,
      score: 0,
      stats: null,
      gameConfig: { ...config.game }
    });

    sendJson(response, 201, {
      sessionId,
      startedAt,
      expiresAt: startedAt + config.game.maxSessionAgeSeconds * 1000
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/session/finish") {
    const payload = await parseJsonBody(request);
    const session = activeSessions.get(payload.sessionId);

    if (!session) {
      sendJson(response, 400, {
        error: "The game session does not exist or has expired."
      });
      return;
    }

    if (session.finishedAt) {
      sendJson(response, 409, {
        error: "The game session has already been finished."
      });
      return;
    }

    const score = Number(payload.score);
    const stats = payload.stats || {};
    const gameConfig = session.gameConfig || config.game;
    const elapsedMs = Date.now() - session.startedAt;
    const timeBonusSeconds = Number(stats.timeBonusSeconds || 0);
    const minAllowed = Math.max(10000, gameConfig.durationSeconds * 1000 - 2500);
    const maxAllowed = (gameConfig.durationSeconds + timeBonusSeconds) * 1000 + 20000;

    if (!Number.isInteger(score) || score < 0 || score > config.game.maxAcceptedScore) {
      sendJson(response, 400, {
        error: "The score was rejected."
      });
      return;
    }

    if (elapsedMs < minAllowed || elapsedMs > maxAllowed) {
      sendJson(response, 400, {
        error: "The game session was rejected because of an invalid duration."
      });
      return;
    }

    const goodHits = Number(stats.goodHits || 0);
    const bonusHits = Number(stats.bonusHits || 0);
    const badHits = Number(stats.badHits || 0);
    const multiHits = Number(stats.multiHits || 0);
    const comboBonusAwarded = Number(stats.comboBonusAwarded || 0);
    const streakBonusAwarded = Number(stats.streakBonusAwarded || 0);
    const powerBonusAwarded = Number(stats.powerBonusAwarded || 0);
    const shieldBlocks = Number(stats.shieldBlocks || 0);
    const bestStreak = Number(stats.bestStreak || 0);
    const fastestHitMs = stats.fastestHitMs === null ? null : Number(stats.fastestHitMs || 0);
    const totalReactionMs = Number(stats.totalReactionMs || 0);
    const reactionSamples = Number(stats.reactionSamples || 0);
    const events = Array.isArray(stats.events) ? stats.events.slice(0, 500) : [];
    const expectedScore = Array.isArray(stats.events)
      ? calculateExpectedScoreFromStats(stats, gameConfig)
      : goodHits * gameConfig.goodTargetBasePoints +
        bonusHits * gameConfig.bonusTargetPoints +
        multiHits * gameConfig.multiTargetPoints +
        streakBonusAwarded +
        powerBonusAwarded +
        comboBonusAwarded -
        Math.max(0, badHits - shieldBlocks) * gameConfig.badTargetPenalty;

    const scoringEvents = events.filter((event) => ["good", "bonus", "multi", "bad"].includes(event)).length;
    const reportedHits = goodHits + bonusHits + multiHits + badHits;

    if (
      events.length > 500 ||
      scoringEvents !== reportedHits ||
      bestStreak > (goodHits + bonusHits + multiHits * 2) ||
      reactionSamples > goodHits + bonusHits + multiHits + Number(stats.timeBonusSeconds || 0) + 20 ||
      (fastestHitMs !== null && fastestHitMs < 35)
    ) {
      sendJson(response, 400, {
        error: "The game statistics were rejected."
      });
      return;
    }

    if (score !== Math.max(0, Math.round(expectedScore))) {
      sendJson(response, 400, {
        error: "The score and game statistics do not match."
      });
      return;
    }

    session.finishedAt = Date.now();
    session.score = score;
    session.stats = {
      goodHits,
      bonusHits,
      badHits,
      multiHits,
      streakBonusAwarded,
      comboBonusAwarded,
      powerBonusAwarded,
      shieldBlocks,
      timeBonusSeconds,
      bestStreak,
      fastestHitMs,
      totalReactionMs,
      reactionSamples,
      events,
      elapsedMs
    };

    const leaderboard = getLeaderboard(readEntries(), 10);
    const provisionalRank =
      [...leaderboard, { score }]
        .sort((left, right) => right.score - left.score)
        .findIndex((entry) => entry.score === score) + 1;
    const qualifies =
      score >= config.game.scoreHighlightThreshold ||
      provisionalRank <= 10 ||
      leaderboard.length < 10;

    sendJson(response, 200, {
      sessionId: session.id,
      score,
      qualifies,
      provisionalRank,
      leaderboard
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/register") {
    const payload = await parseJsonBody(request);
    const session = activeSessions.get(payload.sessionId);

    if (!session || !session.finishedAt) {
      sendJson(response, 400, {
        error: "No valid game session is linked to this registration."
      });
      return;
    }

    if (session.usedAt) {
      sendJson(response, 409, {
        error: "This game session has already been registered."
      });
      return;
    }

    const errors = validateRegistration(payload);

    if (errors.length > 0) {
      sendJson(response, 400, {
        error: errors.join(" ")
      });
      return;
    }

    const now = new Date().toISOString();
    const entry = {
      id: crypto.randomUUID(),
      name: String(payload.name || "").trim(),
      email: String(payload.email || "").trim().toLowerCase(),
      phone: String(payload.phone || "").trim(),
      score: session.score,
      game: DEFAULT_GAME_ID,
      playedAt: new Date(session.finishedAt).toISOString(),
      createdAt: now
    };

    const entries = readEntries();
    entries.push(entry);
    writeEntries(entries);

    session.usedAt = Date.now();

    sendJson(response, 201, {
      entry
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/standalone-entry") {
    const payload = await parseJsonBody(request);
    const entryPayload = payload && typeof payload === "object" ? payload : {};
    const errors = validateStandaloneEntry(entryPayload);
    const score = Number(entryPayload.score);

    if (!Number.isInteger(score) || score < 0 || score > config.game.maxAcceptedScore) {
      errors.push("The score was rejected.");
    }

    if (errors.length > 0) {
      sendJson(response, 400, {
        error: errors.join(" ")
      });
      return;
    }

    const now = new Date().toISOString();
    const game = normalizeGameId(entryPayload.game) || DEFAULT_GAME_ID;
    const entry = {
      id: crypto.randomUUID(),
      name: String(entryPayload.name).trim().slice(0, 40),
      email: String(entryPayload.email || "").trim().toLowerCase(),
      phone: String(entryPayload.phone || "").trim(),
      score,
      game,
      playedAt: entryPayload.playedAt || now,
      createdAt: now
    };

    const entries = readEntries();
    entries.push(entry);
    writeEntries(entries);

    sendJson(response, 201, {
      entry,
      leaderboard: getLeaderboard(entries, 10, game)
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/admin/entries") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    const allEntries = readEntries().sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
    const game = normalizeGameId(url.searchParams.get("game"));
    const entries = game ? allEntries.filter((entry) => entry.game === game) : allEntries;

    sendJson(response, 200, {
      game,
      entries,
      leaderboard: getLeaderboard(allEntries, 10, game),
      boards: getAllLeaderboards(allEntries, 10)
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/admin/settings") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    sendJson(response, 200, {
      game: config.game,
      booth: config.booth,
      brand: config.brand
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/admin/duel-settings") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    sendJson(response, 200, {
      duelGame: config.duelGame || {}
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin/settings") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    const payload = await parseJsonBody(request);
    const nextConfig = {
      ...config,
      game: normalizeGameSettings(payload, config.game)
    };

    if (nextConfig.game.maxTargetSize < nextConfig.game.minTargetSize) {
      nextConfig.game.maxTargetSize = nextConfig.game.minTargetSize;
    }

    writeConfig(nextConfig);
    sendJson(response, 200, {
      game: nextConfig.game
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin/duel-settings") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    const payload = await parseJsonBody(request);
    const duelGame = normalizeDuelGameSettings(payload, config.duelGame || {});

    if (duelGame.beaconSpawnMaxSeconds < duelGame.beaconSpawnMinSeconds) {
      duelGame.beaconSpawnMaxSeconds = duelGame.beaconSpawnMinSeconds;
    }

    if (duelGame.trafficDockHeight > duelGame.normalDockHeight) {
      duelGame.trafficDockHeight = duelGame.normalDockHeight;
    }

    const nextConfig = {
      ...config,
      duelGame
    };

    writeConfig(nextConfig);
    sendJson(response, 200, {
      duelGame
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/admin/export") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    const exportGame = normalizeGameId(url.searchParams.get("game"));
    const csv = buildCsv(
      exportGame ? readEntries().filter((entry) => entry.game === exportGame) : readEntries()
    );
    response.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="messekonkurranse-export.csv"',
      "Cache-Control": "no-store"
    });
    response.end(csv);
    return;
  }

  if (request.method === "GET" && pathname === "/api/admin/status") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    const entries = readEntries();
    const stat = fs.statSync(DATA_PATH);
    sendJson(response, 200, {
      ok: true,
      time: new Date().toISOString(),
      host: HOST,
      port: PORT,
      defaultRoute: getDefaultRoute(),
      data: {
        entries: entries.length,
        dataPath: path.relative(ROOT_DIR, DATA_PATH),
        dataBytes: stat.size,
        latestEntry: entries[entries.length - 1] || null,
        latestBackup: latestBackupInfo()
      },
      games: {
        harborRush: config.game,
        bridgeDuel: config.duelGame || {}
      },
      perGame: Object.entries(GAMES).map(([id, meta]) => ({
        id,
        label: meta.label,
        entries: entries.filter((entry) => entry.game === id).length,
        difficultyName: (config[meta.configKey] || {}).difficultyName || "Custom",
        best: getLeaderboard(entries, 1, id)[0] || null
      }))
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/admin/game-settings") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    const entries = readEntries();
    sendJson(response, 200, {
      games: Object.entries(GAMES).map(([id, meta]) => ({
        id,
        label: meta.label,
        configurable: Boolean(GAME_SCHEMAS[id]),
        settings: config[meta.configKey] || {},
        entryCount: entries.filter((entry) => entry.game === id).length,
        leaderboard: getLeaderboard(entries, 10, id)
      }))
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin/game-settings") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    const payload = await parseJsonBody(request);
    const gameId = normalizeGameId(payload.game);
    const schema = gameId && GAME_SCHEMAS[gameId];

    if (!schema) {
      sendJson(response, 400, {
        error: "Unknown game, or the game has its own settings page."
      });
      return;
    }

    const configKey = GAMES[gameId].configKey;
    const settings = normalizeBySchema(payload.settings || {}, config[configKey] || {}, schema);
    writeConfig({ ...config, [configKey]: settings });

    sendJson(response, 200, {
      game: gameId,
      settings
    });
    return;
  }

  if (request.method === "POST" && pathname === "/api/admin/reset") {
    if (!requireAdmin(request, response, config)) {
      return;
    }

    const payload = await parseJsonBody(request);
    const gameId = normalizeGameId(payload.game);
    const backupPath = backupEntries(gameId ? `before-reset-${gameId}` : "before-reset");
    const entries = readEntries();
    // Uten game nullstilles alt, ellers bare det ene spillets resultater.
    const remaining = gameId ? entries.filter((entry) => entry.game !== gameId) : [];

    writeEntries(remaining);
    sendJson(response, 200, {
      success: true,
      game: gameId,
      removed: entries.length - remaining.length,
      backupPath
    });
    return;
  }

  sendJson(response, 404, {
    error: "Unknown endpoint."
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, {
      error: "Internal server error."
    });
  }
});

ensureDataFile();

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} on ${HOST} is already in use.`);
    console.error("Close the other kiosk window, or change server.port in config/kiosk-config.json.");
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`Expo challenge is running on http://${displayHost}:${PORT}`);
  console.log(`Default screen: ${getDefaultRoute()}`);
});
