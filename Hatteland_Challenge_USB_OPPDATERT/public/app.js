// Central app state keeps the kiosk flow simple without adding a framework.
const state = {
  config: null,
  leaderboard: [],
  selectedGame: "rush",
  currentScreen: "start",
  soundEnabled: true,
  activeSessionId: null,
  countdownTimer: null,
  gameLoopTimer: null,
  spawnTimer: null,
  attractTimer: null,
  techLineTimer: null,
  confirmationTimer: null,
  inactivityTimer: null,
  holdExitTimer: null,
  holdExitProgressTimer: null,
  isPaused: false,
  pauseStartedAt: 0,
  finalAlarmPlayed: false,
  gameStartTime: 0,
  timeLeftMs: 0,
  extraTimeMs: 0,
  doubleScoreUntil: 0,
  doubleScoreHitsLeft: 0,
  slowMotionUntil: 0,
  shieldCharges: 0,
  activeTargets: new Map(),
  spawnDeck: [],
  powerDeck: [],
  nextTargetId: 1,
  score: 0,
  streak: 0,
  stats: {
    goodHits: 0,
    bonusHits: 0,
    badHits: 0,
    multiHits: 0,
    streakBonusAwarded: 0,
    comboBonusAwarded: 0,
    powerBonusAwarded: 0,
  shieldBlocks: 0,
  timeBonusSeconds: 0,
  bestStreak: 0,
  fastestHitMs: null,
  totalReactionMs: 0,
  reactionSamples: 0,
  events: []
  },
  lastFinishResult: null,
  duel: null,
  soundPreferenceTouched: false
};

const screens = {
  start: document.getElementById("startScreen"),
  countdown: document.getElementById("countdownScreen"),
  game: document.getElementById("gameScreen"),
  duel: document.getElementById("duelScreen"),
  result: document.getElementById("resultScreen"),
  duelResult: document.getElementById("duelResultScreen"),
  form: document.getElementById("formScreen"),
  confirmation: document.getElementById("confirmationScreen")
};

const elements = {
  companyName: document.getElementById("companyName"),
  contestName: document.getElementById("contestName"),
  tagline: document.getElementById("tagline"),
  prizeName: document.getElementById("prizeName"),
  durationBadge: document.getElementById("durationBadge"),
  brandSlogan: document.getElementById("brandSlogan"),
  attractTechLine: document.getElementById("attractTechLine"),
  goodPointsText: document.getElementById("goodPointsText"),
  bonusPointsText: document.getElementById("bonusPointsText"),
  multiPointsText: document.getElementById("multiPointsText"),
  badPointsText: document.getElementById("badPointsText"),
  brandLogo: document.getElementById("brandLogo"),
  startButton: document.getElementById("startButton"),
  muteButton: document.getElementById("muteButton"),
  leaderboardToggle: document.getElementById("leaderboardToggle"),
  closeLeaderboardButton: document.getElementById("closeLeaderboardButton"),
  leaderboardModal: document.getElementById("leaderboardModal"),
  leaderboardList: document.getElementById("leaderboardList"),
  attractLeaderboard: document.getElementById("attractLeaderboard"),
  countdownValue: document.getElementById("countdownValue"),
  scoreValue: document.getElementById("scoreValue"),
  timerValue: document.getElementById("timerValue"),
  streakValue: document.getElementById("streakValue"),
  multiplierValue: document.getElementById("multiplierValue"),
  gameArena: document.getElementById("gameArena"),
  targetLayer: document.getElementById("targetLayer"),
  holdExitButton: document.getElementById("holdExitButton"),
  holdExitFill: document.getElementById("holdExitFill"),
  duelHoldExitButton: document.getElementById("duelHoldExitButton"),
  duelHoldExitFill: document.getElementById("duelHoldExitFill"),
  comboBurst: document.getElementById("comboBurst"),
  resultScore: document.getElementById("resultScore"),
  resultMessage: document.getElementById("resultMessage"),
  resultBestStreak: document.getElementById("resultBestStreak"),
  resultFastestHit: document.getElementById("resultFastestHit"),
  resultHits: document.getElementById("resultHits"),
  resultHazards: document.getElementById("resultHazards"),
  resultTimeBonus: document.getElementById("resultTimeBonus"),
  resultRecord: document.getElementById("resultRecord"),
  resultQrLink: document.getElementById("resultQrLink"),
  resultQrImage: document.getElementById("resultQrImage"),
  registerButton: document.getElementById("registerButton"),
  playAgainButton: document.getElementById("playAgainButton"),
  resultHomeButton: document.getElementById("resultHomeButton"),
  entryForm: document.getElementById("entryForm"),
  nameInput: document.getElementById("nameInput"),
  emailInput: document.getElementById("emailInput"),
  phoneInput: document.getElementById("phoneInput"),
  consentInput: document.getElementById("consentInput"),
  consentTitle: document.getElementById("consentTitle"),
  privacyNotice: document.getElementById("privacyNotice"),
  consentLabel: document.getElementById("consentLabel"),
  formError: document.getElementById("formError"),
  cancelRegistrationButton: document.getElementById("cancelRegistrationButton"),
  confirmationMessage: document.getElementById("confirmationMessage"),
  autoResetText: document.getElementById("autoResetText"),
  newPlayerButton: document.getElementById("newPlayerButton"),
  confirmationHomeButton: document.getElementById("confirmationHomeButton"),
  attractLayer: document.getElementById("attractLayer"),
  confettiTemplate: document.getElementById("confettiTemplate")
};

Object.assign(elements, {
  duelScoreBlue: document.getElementById("duelScoreBlue"),
  duelScoreGold: document.getElementById("duelScoreGold"),
  duelTimer: document.getElementById("duelTimer"),
  duelChargeBlue: document.getElementById("duelChargeBlue"),
  duelChargeGold: document.getElementById("duelChargeGold"),
  duelEffectBlue: document.getElementById("duelEffectBlue"),
  duelEffectGold: document.getElementById("duelEffectGold"),
  duelStatus: document.getElementById("duelStatus"),
  duelZoneBlue: document.getElementById("duelZoneBlue"),
  duelZoneGold: document.getElementById("duelZoneGold"),
  duelWinnerTitle: document.getElementById("duelWinnerTitle"),
  duelFinalBlue: document.getElementById("duelFinalBlue"),
  duelFinalGold: document.getElementById("duelFinalGold"),
  duelResultMessage: document.getElementById("duelResultMessage"),
  duelAgainButton: document.getElementById("duelAgainButton"),
  duelHomeButton: document.getElementById("duelHomeButton"),
  pauseButtons: document.querySelectorAll("[data-pause-game]"),
  resumeButtons: document.querySelectorAll("[data-resume-game]"),
  pauseOverlays: document.querySelectorAll("[data-pause-overlay]")
});

const HOLD_EXIT_MS = 1200;
const PERSONAL_RECORD_KEY = "harborRushPersonalRecord";
const TECH_LINES = [
  "Rugged maritime displays.",
  "Marine panel computers.",
  "SeaHawk camera awareness.",
  "Reliable industrial networking.",
  "Bridge-ready technology systems.",
  "Designed for demanding operations."
];

const BRAND_SLOGANS = [
  "Technology for demanding operations.",
  "Clear information. Confident decisions.",
  "Reliable systems for critical environments.",
  "Built for the bridge. Ready for the system.",
  "Your technology partner at sea and onshore."
];

const GAME_MODES = {
  rush: {
    title: "Harbor Rush Challenge",
    kicker: "Hatteland Technology stand challenge",
    tagline: null,
    lede: "A fast reflex challenge inspired by maritime control rooms, rugged displays and precision under pressure.",
    button: "Start challenge",
    badge: "Live precision test",
    rightTitle: "Precision under pressure",
    rightText: "Fast reactions. Clean scoring. Beat the record."
  },
  duel: {
    title: "Bridge Duel Harbor Control",
    kicker: "Hidden 1v1 multitouch mode",
    tagline: "Guide ships. Disrupt the rival harbor.",
    lede: "Two operators stand on opposite short sides. Drag ships to matching docks, avoid collisions, build combos and launch attacks.",
    button: "Start harbor duel",
    badge: "1v1 path control",
    rightTitle: "Fast harbor control",
    rightText: "Draw paths, dock ships, send storm, fog, traffic and control glitch attacks."
  }
};

class SoundManager {
  constructor() {
    this.context = null;
  }

  ensureContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }
  }

  beep(frequency, durationMs, type = "sine", gainValue = 0.04) {
    if (!state.soundEnabled) {
      return;
    }

    try {
      this.ensureContext();
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = gainValue;

      oscillator.connect(gain);
      gain.connect(this.context.destination);

      const now = this.context.currentTime;
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

      oscillator.start(now);
      oscillator.stop(now + durationMs / 1000);
    } catch (error) {
      console.warn("Could not play sound:", error);
    }
  }
}

const sound = new SoundManager();


function applyViewportProfile() {
  const width = window.innerWidth || document.documentElement.clientWidth || 1280;
  const height = window.innerHeight || document.documentElement.clientHeight || 720;
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  const aspect = width / Math.max(1, height);
  const compact = shortest < 720 || height < 760;
  const largeTouch = shortest >= 1000 && longest >= 1600;
  const ultrawide = aspect >= 2.05;
  const portrait = aspect < 0.9;
  const uiScale = largeTouch ? 1.08 : compact ? 0.88 : ultrawide ? 0.96 : 1;
  const targetScale = Math.max(0.78, Math.min(1.18, shortest / 900));

  document.documentElement.style.setProperty("--ui-scale", uiScale.toFixed(2));
  document.documentElement.style.setProperty("--target-scale", targetScale.toFixed(2));
  document.body.dataset.viewport = portrait ? "portrait" : ultrawide ? "ultrawide" : compact ? "compact" : largeTouch ? "large" : "standard";
}

function getResponsiveTargetBounds() {
  const game = state.config.game;
  const rect = elements.targetLayer.getBoundingClientRect();
  const shortest = Math.max(320, Math.min(rect.width || window.innerWidth, rect.height || window.innerHeight));
  const scale = Math.max(0.78, Math.min(1.18, shortest / 900));
  return {
    min: Math.max(54, Math.round(Number(game.minTargetSize || 92) * scale)),
    max: Math.max(70, Math.round(Number(game.maxTargetSize || 148) * scale))
  };
}

function featureEnabled(name) {
  return Boolean(state.config?.game?.[name]);
}

function shuffleList(items) {
  const list = [...items];

  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }

  return list;
}

function getRoundProgress() {
  if (!state.config || !state.gameStartTime) {
    return 0;
  }

  const durationMs = state.config.game.durationSeconds * 1000;
  return Math.min(1, Math.max(0, (performance.now() - state.gameStartTime) / durationMs));
}

function getDifficultyFactor() {
  if (!featureEnabled("enableProgressiveDifficulty")) {
    return 1;
  }

  return 1 + getRoundProgress() * 0.78;
}

function getMaxTimeBonusSeconds() {
  return Number(state.config.game.maxTimeBonusSeconds ?? 6);
}

function getPowerUpDurationMs() {
  return (state.config.game.powerUpDurationSeconds || 6) * 1000;
}

function hasDoubleScore() {
  return state.doubleScoreHitsLeft > 0;
}

function hasSlowMotion() {
  return performance.now() < state.slowMotionUntil;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Something went wrong.");
  }

  return payload;
}

function setCssVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function getStoredGameMode() {
  return localStorage.getItem("selectedGame") === "duel" ? "duel" : "rush";
}

function applySelectedGameContent(config) {
  state.selectedGame = getStoredGameMode();
  const mode = GAME_MODES[state.selectedGame] || GAME_MODES.rush;
  elements.contestName.textContent = mode.title;
  document.title = `${mode.title} | ${config.brand.companyName}`;
  document.querySelector("#startScreen .kicker").textContent = mode.kicker;
  elements.tagline.textContent = mode.tagline || config.brand.tagline;
  document.querySelector("#startScreen .lede").textContent = mode.lede;
  document.querySelector(".stand-callout span:first-child").textContent = mode.badge;
  document.querySelector(".showcase-copy strong").textContent = mode.rightTitle;
  document.querySelector(".showcase-copy small").textContent = mode.rightText;
  elements.startButton.textContent = mode.button;
  elements.leaderboardToggle.style.display = state.selectedGame === "duel" ? "none" : "";
  document.body.classList.toggle("game-mode-duel", state.selectedGame === "duel");

  if (state.selectedGame === "duel") {
    document.querySelector(".instruction-card--good strong").textContent = "Active controls";
    elements.goodPointsText.textContent = "4 hits sends disruption";
    elements.durationBadge.textContent = `${config.duelGame?.durationSeconds || config.game.durationSeconds} sec`;
  }
}

function applyConfig(config) {
  state.config = config;

  if (!state.soundPreferenceTouched) {
    state.soundEnabled = Boolean(config.game.soundDefaultEnabled ?? true);
    elements.muteButton.textContent = `Sound: ${state.soundEnabled ? "On" : "Off"}`;
    elements.muteButton.setAttribute("aria-pressed", String(!state.soundEnabled));
  }

  elements.companyName.textContent = config.brand.companyName;
  elements.contestName.textContent = config.brand.contestName;
  document.title = config.brand.contestName;
  elements.tagline.textContent = config.brand.tagline;
  elements.prizeName.textContent = config.brand.prizeName;
  elements.durationBadge.textContent = `${config.game.durationSeconds} sec`;
  elements.goodPointsText.textContent = `+${config.game.goodTargetBasePoints} base points`;
  elements.bonusPointsText.textContent = `+${config.game.bonusTargetPoints} points`;
  elements.multiPointsText.textContent = `+${config.game.multiTargetPoints} points`;
  elements.badPointsText.textContent = `-${config.game.badTargetPenalty} and streak reset`;
  document.body.classList.toggle("brand-low", config.game.brandIntensity === "Low");
  document.body.classList.toggle("brand-high", config.game.brandIntensity === "High");
  document.body.classList.toggle(
    "brand-medium",
    !config.game.brandIntensity || config.game.brandIntensity === "Medium"
  );
  const qrUrl = config.brand.promoUrl || "https://www.hattelandtechnology.com";
  elements.resultQrLink.href = qrUrl;
  elements.resultQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(qrUrl)}`;
  elements.brandLogo.src = config.brand.logoPath;
  elements.startButton.textContent = config.brand.startButtonLabel;
  elements.leaderboardToggle.textContent = config.brand.leaderboardButtonLabel;
  const privacy = config.privacy || {};
  elements.consentTitle.textContent = privacy.consentTitle || "Consent for game participation";
  elements.privacyNotice.textContent =
    privacy.notice ||
    "We store your name, email and phone number only for this game and to contact you about a prize if you win.";
  elements.consentLabel.textContent =
    privacy.consentLabel ||
    "I consent to Hatteland Technology storing my name, email and phone number only for this game and prize contact.";

  setCssVar("--accent", config.theme.accent);
  setCssVar("--accent-strong", config.theme.accentStrong);
  setCssVar("--secondary", config.theme.secondary);
  setCssVar("--danger", config.theme.danger);
  setCssVar("--surface", config.theme.surface);
  setCssVar("--surface-alt", config.theme.surfaceAlt);
  setCssVar("--text", config.theme.text);
  setCssVar("--muted", config.theme.muted);
  applySelectedGameContent(config);
}

async function refreshConfig() {
  const configPayload = await api("/api/config");
  applyConfig(configPayload);
  return configPayload;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("no-NO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));
}

function showScreen(screenName) {
  state.isPaused = false;
  state.pauseStartedAt = 0;
  document.body.classList.remove("screen-paused");
  elements.pauseOverlays.forEach((overlay) => overlay.classList.remove("pause-overlay--active"));
  Object.entries(screens).forEach(([name, screen]) => {
    screen.classList.toggle("screen--active", name === screenName);
  });

  state.currentScreen = screenName;
  document.body.classList.toggle("screen-game", screenName === "game" || screenName === "duel");
  elements.leaderboardToggle.disabled = screenName === "countdown" || screenName === "game" || screenName === "duel";
  resetInactivityTimer();
}

function renderLeaderboard(entries = state.leaderboard) {
  elements.leaderboardList.innerHTML = "";
  elements.attractLeaderboard.innerHTML = "";

  if (!entries.length) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const score = document.createElement("strong");
    label.textContent = "No registered scores yet";
    score.textContent = "0";
    item.append(label, score);
    elements.leaderboardList.appendChild(item);
    const attractItem = document.createElement("li");
    const attractLabel = document.createElement("span");
    const attractScore = document.createElement("strong");
    attractLabel.textContent = "First score wins the board";
    attractScore.textContent = "0";
    attractItem.append(attractLabel, attractScore);
    elements.attractLeaderboard.appendChild(attractItem);
    return;
  }

  entries.forEach((entry, index) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const score = document.createElement("strong");
    label.textContent = `${entry.rank}. ${entry.name}`;
    score.textContent = String(entry.score);
    item.append(label, score);
    elements.leaderboardList.appendChild(item);

    if (index < 5) {
      const attractItem = document.createElement("li");
      const attractLabel = document.createElement("span");
      const attractScore = document.createElement("strong");
      attractLabel.textContent = `${index + 1}. ${entry.name}`;
      attractScore.textContent = String(entry.score);
      attractItem.append(attractLabel, attractScore);
      elements.attractLeaderboard.appendChild(attractItem);
    }
  });
}

async function refreshLeaderboard() {
  const payload = await api("/api/leaderboard");
  state.leaderboard = payload.entries;
  renderLeaderboard();
}

function openLeaderboard() {
  renderLeaderboard();
  if (!elements.leaderboardModal.open) {
    elements.leaderboardModal.showModal();
  }
}

function closeLeaderboard() {
  if (elements.leaderboardModal.open) {
    elements.leaderboardModal.close();
  }
}

function resetInactivityTimer() {
  clearTimeout(state.inactivityTimer);

  if (!state.config) {
    return;
  }

  if (state.currentScreen === "game" || state.currentScreen === "duel" || state.currentScreen === "countdown") {
    return;
  }

  state.inactivityTimer = window.setTimeout(() => {
    returnToStart();
  }, state.config.booth.inactivityResetSeconds * 1000);
}

function clearGameTimers() {
  clearInterval(state.gameLoopTimer);
  clearTimeout(state.spawnTimer);
  clearInterval(state.countdownTimer);
  clearInterval(state.techLineTimer);
}

function clearHoldExit() {
  clearTimeout(state.holdExitTimer);
  clearInterval(state.holdExitProgressTimer);
  state.holdExitTimer = null;
  state.holdExitProgressTimer = null;
  [elements.holdExitButton, elements.duelHoldExitButton].forEach((button) => {
    button?.classList.remove("hold-exit-button--arming");
  });
  [elements.holdExitFill, elements.duelHoldExitFill].forEach((fill) => {
    if (fill) {
      fill.style.width = "0%";
    }
  });
}

function resetGameState() {
  clearGameTimers();
  state.activeTargets.forEach((target) => {
    resetMultiTarget(target);
    target.element.remove();
  });
  state.activeTargets.clear();
  elements.gameArena.innerHTML = "";
  elements.targetLayer.innerHTML = "";
  elements.gameArena.classList.remove(
    "game-arena--streak",
    "game-arena--hot",
    "game-arena--double",
    "game-arena--slow",
    "game-arena--shield",
    "game-arena--final"
  );
  clearHoldExit();
  state.activeSessionId = null;
  state.score = 0;
  state.streak = 0;
  state.extraTimeMs = 0;
  state.finalAlarmPlayed = false;
  state.isPaused = false;
  state.pauseStartedAt = 0;
  state.doubleScoreUntil = 0;
  state.doubleScoreHitsLeft = 0;
  state.slowMotionUntil = 0;
  state.shieldCharges = 0;
  state.spawnDeck = [];
  state.powerDeck = [];
  state.timeLeftMs = state.config.game.durationSeconds * 1000;
  state.stats = {
    goodHits: 0,
    bonusHits: 0,
    badHits: 0,
    multiHits: 0,
    streakBonusAwarded: 0,
    comboBonusAwarded: 0,
    powerBonusAwarded: 0,
    shieldBlocks: 0,
    timeBonusSeconds: 0,
    bestStreak: 0,
    fastestHitMs: null,
    totalReactionMs: 0,
    reactionSamples: 0,
    events: []
  };
  elements.scoreValue.textContent = "0";
  elements.streakValue.textContent = "0";
  elements.timerValue.textContent = state.config.game.durationSeconds.toFixed(1);
}

function showFloatingScore(text, x, y, modifier) {
  const floating = document.createElement("div");
  floating.className = `floating-score floating-score--${modifier}`;
  floating.textContent = text;
  floating.style.left = `${x}px`;
  floating.style.top = `${y}px`;
  elements.targetLayer.appendChild(floating);
  floating.addEventListener("animationend", () => floating.remove(), { once: true });
}

function showCombo(text) {
  elements.comboBurst.textContent = text;
  elements.comboBurst.classList.remove("combo-burst--active");
  void elements.comboBurst.offsetWidth;
  elements.comboBurst.classList.add("combo-burst--active");
}

function updateHud() {
  elements.scoreValue.textContent = String(state.score);
  elements.streakValue.textContent = String(state.streak);
  elements.timerValue.textContent = (state.timeLeftMs / 1000).toFixed(1);
  elements.multiplierValue.textContent = `x${getStreakMultiplier(state.streak)}`;

  const streakCard = elements.streakValue.closest(".hud-card");
  const multiplierCard = elements.multiplierValue.closest(".hud-card");
  if (streakCard) {
    const showStreak = featureEnabled("enableStreakVisuals");
    streakCard.classList.toggle("hud-card--streak-active", showStreak && state.streak >= 3);
    streakCard.classList.toggle("hud-card--streak-hot", showStreak && state.streak >= 8);
    multiplierCard?.classList.toggle("hud-card--streak-active", showStreak && state.streak >= 3);
    multiplierCard?.classList.toggle("hud-card--streak-hot", showStreak && state.streak >= 12);
  }

  elements.gameArena.classList.toggle("game-arena--streak", featureEnabled("enableStreakVisuals") && state.streak >= 5);
  elements.gameArena.classList.toggle("game-arena--hot", featureEnabled("enableStreakVisuals") && state.streak >= 10);
  elements.gameArena.classList.toggle("game-arena--double", hasDoubleScore());
  elements.gameArena.classList.toggle("game-arena--slow", hasSlowMotion());
  elements.gameArena.classList.toggle("game-arena--shield", state.shieldCharges > 0);
}

function calculateComboBonus(streak) {
  return 0;
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

function applyStreakMultiplier(basePoints) {
  const multiplier = getStreakMultiplier(state.streak);
  const total = Math.round(basePoints * multiplier);
  const bonus = total - basePoints;

  if (bonus > 0) {
    state.stats.streakBonusAwarded += bonus;
  }

  return total;
}

function maybeShowStreakMilestone(streak) {
  if (streak === 3) {
    showCombo("Streak x1.25");
  } else if (streak === 6) {
    showCombo("Streak x1.5");
  } else if (streak === 12) {
    showCombo(featureEnabled("useHattelandLabels") ? "Operator grade reaction x2" : "Hot streak x2");
  }
}

function applyPowerUp(effect) {
  const until = performance.now() + getPowerUpDurationMs();

  if (effect === "double") {
    state.doubleScoreUntil = until;
    state.doubleScoreHitsLeft = 6;
    state.stats.events.push("power-double");
    showCombo("Double score active");
    sound.beep(980, 180, "square", 0.04);
    return;
  }

  if (effect === "slow") {
    state.slowMotionUntil = until;
    state.stats.events.push("power-slow");
    showCombo("Slow motion active");
    sound.beep(620, 220, "triangle", 0.04);
    return;
  }

  state.shieldCharges = Math.min(2, state.shieldCharges + 1);
  state.stats.events.push("power-shield");
  showCombo("Shield armed");
  sound.beep(760, 160, "triangle", 0.04);
}

function applyTimeBonus() {
  const maxBonusSeconds = getMaxTimeBonusSeconds();
  const alreadyAwarded = state.stats.timeBonusSeconds || 0;
  const seconds = Math.min(Number(state.config.game.timeBonusSeconds || 2), Math.max(0, maxBonusSeconds - alreadyAwarded));

  if (seconds <= 0) {
    state.stats.events.push("time-cap");
    showCombo("Time bonus limit reached");
    sound.beep(420, 120, "triangle", 0.035);
    return 0;
  }

  state.extraTimeMs += seconds * 1000;
  state.stats.timeBonusSeconds += seconds;
  state.stats.events.push("time");
  showCombo(`+${seconds} seconds`);
  sound.beep(1040, 180, "square", 0.04);
  return seconds;
}

function recordReaction(target) {
  if (!target.spawnedAt || target.type === "bad") {
    return;
  }

  const reactionMs = Math.max(0, Math.round(performance.now() - target.spawnedAt));
  state.stats.fastestHitMs =
    state.stats.fastestHitMs === null ? reactionMs : Math.min(state.stats.fastestHitMs, reactionMs);
  state.stats.totalReactionMs += reactionMs;
  state.stats.reactionSamples += 1;
}

function updateBestStreak() {
  state.stats.bestStreak = Math.max(state.stats.bestStreak || 0, state.streak);
}

function removeTarget(targetId, withAnimation = false) {
  const target = state.activeTargets.get(targetId);

  if (!target) {
    return;
  }

  state.activeTargets.delete(targetId);

  if (withAnimation) {
    target.element.classList.add("target-hit");
    target.element.addEventListener("animationend", () => target.element.remove(), { once: true });
  } else {
    target.element.remove();
  }
}

function resetMultiTarget(target) {
  if (!target || target.type !== "multi") {
    return;
  }

  clearTimeout(target.armedTimeout);
  target.armedTimeout = null;
  target.pressedChildren.clear();
  target.pointerIds.clear();
  target.element.classList.remove("target-group--multi-active");

  (target.nodes || []).forEach((node) => {
    node.classList.remove("target-node--pressed");
  });
}

function handleTargetPress(targetId, event) {
  if (state.isPaused || state.currentScreen !== "game") {
    return;
  }

  const target = state.activeTargets.get(targetId);

  if (!target) {
    return;
  }

  const rect = elements.targetLayer.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  recordReaction(target);

  let delta = 0;
  let modifier = "good";

  if (target.type === "power") {
    applyPowerUp(target.effect);
    updateHud();
    showFloatingScore(target.effect.toUpperCase(), x, y, "power");
    removeTarget(targetId, true);
    return;
  }

  if (target.type === "time") {
    const seconds = applyTimeBonus();
    updateHud();
    showFloatingScore(seconds > 0 ? `+${seconds} SEC` : "LIMIT", x, y, "power");
    removeTarget(targetId, true);
    return;
  }

  if (target.type === "bad") {
    state.stats.events.push("bad");
    state.streak = 0;
    state.stats.badHits += 1;
    modifier = "bad";

    if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      state.stats.shieldBlocks += 1;
      delta = 0;
      showCombo("Shield blocked hazard");
      sound.beep(420, 150, "triangle", 0.04);
    } else {
      delta = -state.config.game.badTargetPenalty;
      sound.beep(180, 180, "sawtooth", 0.045);
    }
  } else {
    state.streak += 1;
    updateBestStreak();

    if (target.type === "bonus") {
      state.stats.events.push("bonus");
      state.stats.bonusHits += 1;
      delta = applyStreakMultiplier(state.config.game.bonusTargetPoints);
      modifier = "bonus";
      sound.beep(740, 120, "triangle", 0.045);
    } else {
      state.stats.events.push("good");
      state.stats.goodHits += 1;
      delta = applyStreakMultiplier(state.config.game.goodTargetBasePoints);
      sound.beep(420, 90, "triangle", 0.035);
    }

    maybeShowStreakMilestone(state.streak);

    if (hasDoubleScore()) {
      state.stats.powerBonusAwarded += delta;
      delta *= 2;
      state.doubleScoreHitsLeft -= 1;
    }
  }

  state.score = Math.max(0, state.score + delta);
  updateHud();
  showFloatingScore(delta > 0 ? `+${delta}` : String(delta), x, y, modifier);
  removeTarget(targetId, true);
}

function finishMultiTarget(target, x, y) {
  recordReaction(target);
  resetMultiTarget(target);
  state.stats.events.push("multi");
  state.streak += 2;
  updateBestStreak();
  state.stats.multiHits += 1;

  let delta = applyStreakMultiplier(state.config.game.multiTargetPoints);
  maybeShowStreakMilestone(state.streak);

  if (getStreakMultiplier(state.streak) > 1) {
    showCombo(`Dual input x${getStreakMultiplier(state.streak)}`);
  } else {
    showCombo("Two-finger rescue!");
  }

  if (hasDoubleScore()) {
    state.stats.powerBonusAwarded += delta;
    delta *= 2;
    state.doubleScoreHitsLeft -= 1;
  }

  state.score = Math.max(0, state.score + delta);
  updateHud();
  showFloatingScore(`+${delta}`, x, y, "bonus");
  sound.beep(840, 140, "triangle", 0.05);
  removeTarget(target.id, true);
}

function handleMultiTargetPress(targetId, childIndex, event) {
  if (state.isPaused || state.currentScreen !== "game") {
    return;
  }

  const target = state.activeTargets.get(targetId);

  if (!target || target.type !== "multi") {
    return;
  }

  const pointerKey =
    event.pointerType === "mouse" ? `mouse-${childIndex}` : `${event.pointerType}-${event.pointerId}`;

  if (target.pressedChildren.has(childIndex) || target.pointerIds.has(pointerKey)) {
    return;
  }

  target.pressedChildren.add(childIndex);
  target.pointerIds.add(pointerKey);
  target.nodes[childIndex].classList.add("target-node--pressed");
  target.element.classList.add("target-group--multi-active");
  sound.beep(520, 70, "triangle", 0.03);

  if (!target.armedTimeout) {
    target.armedTimeout = window.setTimeout(() => {
      resetMultiTarget(target);
    }, state.config.game.multiTouchWindowMs);
  }

  if (target.pressedChildren.size >= 2) {
    const rect = elements.targetLayer.getBoundingClientRect();
    finishMultiTarget(target, event.clientX - rect.left, event.clientY - rect.top);
  }
}

function createTargetElement(target) {
  const labels = featureEnabled("useHattelandLabels")
    ? { good: "RADAR", bonus: "DISPLAY", bad: "ALERT" }
    : { good: "SIGNAL", bonus: "CARGO", bad: "HAZARD" };

  if (target.type === "multi") {
    const element = document.createElement("div");
    element.className = "target-group";
    element.style.left = `${target.x}px`;
    element.style.top = `${target.y}px`;
    element.style.width = `${target.size * 1.9}px`;

    target.nodes = [0, 1].map((childIndex) => {
      const node = document.createElement("button");
      node.className = "target-node";
      node.type = "button";
      node.setAttribute("aria-label", "Dual input node");
      const label = document.createElement("span");
      label.className = "target-node-label";
      label.textContent = featureEnabled("useHattelandLabels") ? "CONTROL" : "SOS";
      node.appendChild(label);
      node.addEventListener("pointerdown", (event) =>
        handleMultiTargetPress(target.id, childIndex, event)
      );
      element.appendChild(node);
      return node;
    });

    return element;
  }

  const element = document.createElement("button");
  element.className = `target target--${target.type}`;
  element.type = "button";
  element.style.width = `${target.size}px`;
  element.style.height = `${target.size}px`;
  element.style.left = `${target.x}px`;
  element.style.top = `${target.y}px`;
  element.setAttribute("aria-label", target.type === "bad" ? "Hazard" : "Target");

  const label = document.createElement("span");
  label.className = "target-label";
  label.textContent =
    target.type === "time"
      ? `+${state.config.game.timeBonusSeconds || 2} SEC`
      : target.type === "power"
        ? featureEnabled("useHattelandLabels")
          ? "BRIDGE"
          : target.effect.toUpperCase()
        : labels[target.type];
  element.appendChild(label);
  element.addEventListener("pointerdown", (event) => handleTargetPress(target.id, event));
  return element;
}

function countByPercent(total, percent) {
  return Math.max(0, Math.round(total * (Number(percent || 0) / 100)));
}

function buildBalancedSpawnDeck() {
  const game = state.config.game;
  const baseInterval = Math.max(140, Number(game.spawnIntervalMs || 420));
  const baseDurationMs = Number(game.durationSeconds || 30) * 1000;
  const progressiveFactor = featureEnabled("enableProgressiveDifficulty") ? 1.18 : 1;
  const plannedSpawns = Math.max(
    24,
    Math.ceil((baseDurationMs / baseInterval) * progressiveFactor) + Number(game.maxVisibleTargets || 4) + 4
  );
  const powerChance = featureEnabled("enablePowerUps")
    ? Number(game.powerUpSpawnChancePercent || 0)
    : 0;
  const timeChance = featureEnabled("enablePowerUps")
    ? Number(game.timeBonusSpawnChancePercent || 0)
    : 0;
  const counts = {
    time: countByPercent(plannedSpawns, timeChance),
    power: countByPercent(plannedSpawns, powerChance),
    bad: countByPercent(plannedSpawns, 18),
    bonus: countByPercent(plannedSpawns, 10),
    multi: countByPercent(plannedSpawns, 20)
  };
  const specialCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  counts.good = Math.max(0, plannedSpawns - specialCount);
  const deck = [];

  Object.entries(counts).forEach(([type, count]) => {
    for (let index = 0; index < count; index += 1) {
      deck.push(type);
    }
  });

  return shuffleList(deck);
}

function weightedTargetType(weights) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      return type;
    }
  }

  return "good";
}

function nextTargetType() {
  if (!featureEnabled("enableProgressiveDifficulty")) {
    if (!state.spawnDeck.length) {
      state.spawnDeck = buildBalancedSpawnDeck();
    }
    return state.spawnDeck.pop() || "good";
  }

  const progress = getRoundProgress();
  const maxTimeBonusSeconds = getMaxTimeBonusSeconds();
  const timeBonusAvailable =
    featureEnabled("enablePowerUps") &&
    progress < 0.62 &&
    (state.stats.timeBonusSeconds || 0) < maxTimeBonusSeconds;
  const powerAvailable = featureEnabled("enablePowerUps") && progress < 0.88;

  return weightedTargetType({
    good: 54 - progress * 18,
    bonus: 11,
    multi: 12 + progress * 9,
    bad: 7 + progress * 27,
    power: powerAvailable ? Math.max(1, Number(state.config.game.powerUpSpawnChancePercent || 0) - progress * 2) : 0,
    time: timeBonusAvailable ? Math.max(1, Number(state.config.game.timeBonusSpawnChancePercent || 0) - progress * 3) : 0
  });
}

function getTargetPosition(size) {
  const rect = elements.targetLayer.getBoundingClientRect();
  const width = rect.width > 200 ? rect.width : window.innerWidth;
  const height = rect.height > 200 ? rect.height : window.innerHeight;
  const padding = size / 2 + 20;
  const x = padding + Math.random() * Math.max(20, width - padding * 2);
  const y = 120 + padding + Math.random() * Math.max(20, height - padding * 2 - 60);
  return { x, y };
}

function getPowerEffect() {
  if (!state.powerDeck.length) {
    state.powerDeck = shuffleList(["double", "slow", "shield"]);
  }

  return state.powerDeck.pop();
}

function spawnTarget(forced = null) {
  if (state.activeTargets.size >= state.config.game.maxVisibleTargets) {
    return;
  }

  const type = forced?.type || nextTargetType();
  const responsiveBounds = getResponsiveTargetBounds();
  const size =
    forced?.size ||
    responsiveBounds.min + Math.round(Math.random() * (responsiveBounds.max - responsiveBounds.min));
  const footprint = type === "multi" ? size * 1.9 : size;
  const position = forced?.position || getTargetPosition(footprint);
  const target = {
    id: state.nextTargetId++,
    type,
    effect: forced?.effect || (type === "power" ? getPowerEffect() : null),
    size,
    x: position.x,
    y: position.y,
    spawnedAt: performance.now(),
    expiresAt:
      performance.now() +
      Math.round(
        state.config.game.targetLifetimeMs *
          (hasSlowMotion() ? 1.55 : 1) /
          (type === "power" || type === "time" ? 0.85 : getDifficultyFactor())
      ),
    pressedChildren: new Set(),
    pointerIds: new Set(),
    armedTimeout: null,
    nodes: []
  };

  target.element = createTargetElement(target);
  state.activeTargets.set(target.id, target);
  elements.targetLayer.appendChild(target.element);
}

function expireTargets(now) {
  state.activeTargets.forEach((target, targetId) => {
    if (target.expiresAt <= now) {
      resetMultiTarget(target);
      removeTarget(targetId, false);
    }
  });
}

function triggerNearMissWarnings() {
  if (!featureEnabled("enableNearMissWarnings")) {
    return;
  }

  const now = performance.now();
  state.activeTargets.forEach((target) => {
    if (target.type !== "bad" || target.warned || target.expiresAt - now > 520) {
      return;
    }

    target.warned = true;
    target.element.classList.add("target--warning");
    showCombo("Hazard closing");
    sound.beep(260, 90, "sawtooth", 0.028);
  });
}

function scheduleNextSpawn() {
  clearTimeout(state.spawnTimer);

  if (state.currentScreen !== "game" || state.isPaused) {
    return;
  }

  const interval = state.config.game.spawnIntervalMs / getDifficultyFactor();

  state.spawnTimer = window.setTimeout(() => {
    spawnTarget();
    scheduleNextSpawn();
  }, Math.max(140, Math.round(interval)));
}

async function finishGame() {
  clearGameTimers();
  expireTargets(Number.POSITIVE_INFINITY);

  try {
    const result = await api("/api/session/finish", {
      method: "POST",
      body: JSON.stringify({
        sessionId: state.activeSessionId,
        score: state.score,
        stats: state.stats
      })
    });

    state.lastFinishResult = result;
    state.leaderboard = result.leaderboard;
    renderLeaderboard();
    renderResultScreen(result);
  } catch (error) {
    state.lastFinishResult = null;
    renderResultScreen({
      score: state.score,
      qualifies: false,
      provisionalRank: null,
      error: error.message
    });
  }

  showScreen("result");
}


function getPersonalRecord() {
  return Math.max(0, Number(localStorage.getItem(PERSONAL_RECORD_KEY) || 0));
}

function setPersonalRecord(score) {
  localStorage.setItem(PERSONAL_RECORD_KEY, String(Math.max(0, Number(score) || 0)));
}

function getBoardRecord(result) {
  const scores = [getPersonalRecord(), ...(result?.leaderboard || state.leaderboard || []).map((entry) => Number(entry.score || 0))];
  return Math.max(0, ...scores);
}

function renderResultScreen(result) {
  elements.resultScore.textContent = String(state.score);
  elements.registerButton.hidden = true;
  elements.registerButton.disabled = true;
  const totalHits = state.stats.goodHits + state.stats.bonusHits + state.stats.multiHits;
  elements.resultBestStreak.textContent = String(state.stats.bestStreak || state.streak || 0);
  elements.resultFastestHit.textContent =
    state.stats.fastestHitMs === null ? "-" : `${(state.stats.fastestHitMs / 1000).toFixed(2)}s`;
  elements.resultHits.textContent = String(totalHits);
  elements.resultHazards.textContent = String(state.stats.badHits);
  elements.resultTimeBonus.textContent = `${state.stats.timeBonusSeconds || 0}s`;
  const previousRecord = getBoardRecord(result);
  const newRecord = state.score > previousRecord;
  const displayRecord = Math.max(previousRecord, state.score);
  elements.resultRecord.textContent = String(displayRecord);
  if (newRecord) {
    setPersonalRecord(state.score);
  }

  if (result.error) {
    elements.resultMessage.textContent = newRecord
      ? `New record: ${state.score}. Play again and defend it.`
      : `Record is ${displayRecord}. Try again to beat it.`;
    return;
  }

  if (newRecord) {
    elements.resultMessage.textContent = `New record: ${state.score}. Play again and defend it.`;
    launchConfetti();
  } else {
    const gap = Math.max(0, displayRecord - state.score);
    elements.resultMessage.textContent = gap > 0
      ? `Record is ${displayRecord}. You need ${gap + 1} more points to beat it.`
      : `Record is ${displayRecord}. Try again to beat it.`;
  }
}

// The game loop keeps the timer and target lifecycle in sync without heavy libraries.
function startGameplayLoop() {
  state.gameStartTime = performance.now();
  state.timeLeftMs = state.config.game.durationSeconds * 1000;
  state.spawnDeck = buildBalancedSpawnDeck();
  state.powerDeck = shuffleList(["double", "slow", "shield"]);
  updateHud();

  const arenaRect = elements.targetLayer.getBoundingClientRect();
  const centerX = (arenaRect.width > 200 ? arenaRect.width : window.innerWidth) / 2;
  const centerY = (arenaRect.height > 200 ? arenaRect.height : window.innerHeight) / 2 + 40;

  spawnTarget({
    type: "good",
    size: Math.round(Math.min(150, getResponsiveTargetBounds().max)),
    position: { x: centerX, y: centerY }
  });
  spawnTarget();

  runRushLoop();
  scheduleNextSpawn();
}

function runRushLoop() {
  clearInterval(state.gameLoopTimer);
  state.gameLoopTimer = window.setInterval(() => {
    if (state.isPaused || state.currentScreen !== "game") {
      return;
    }

    const elapsed = performance.now() - state.gameStartTime;
    state.timeLeftMs = Math.max(
      0,
      state.config.game.durationSeconds * 1000 + state.extraTimeMs - elapsed
    );
    updateHud();
    triggerNearMissWarnings();
    expireTargets(performance.now());

    if (
      featureEnabled("enableFinalCountdownAlarm") &&
      !state.finalAlarmPlayed &&
      state.timeLeftMs <= 5000
    ) {
      state.finalAlarmPlayed = true;
      elements.gameArena.classList.add("game-arena--final");
      showCombo("Final 5 seconds");
      sound.beep(920, 220, "square", 0.05);
    }

    if (state.timeLeftMs <= 0) {
      finishGame();
    }
  }, 50);
}

function resetDuelState() {
  state.duel = {
    scores: { blue: 0, gold: 0 },
    attack: { blue: 0, gold: 0 },
    combo: { blue: 0, gold: 0 },
    effects: { blue: null, gold: null },
    effectUntil: { blue: 0, gold: 0 },
    ships: new Map(),
    drags: new Map(),
    nextShipId: 1,
    timeLeftMs: state.config.game.durationSeconds * 1000,
    nextSpawnAt: 0
  };

  document.querySelectorAll(".duel-harbor, .duel-docks").forEach((element) => {
    element.innerHTML = "";
  });

  ["blue", "gold"].forEach((player) => {
    const dockLayer = document.querySelector(`.duel-docks[data-player="${player}"]`);
    ["display", "radar", "cargo"].forEach((type) => {
      const dock = document.createElement("div");
      dock.className = `duel-dock duel-dock--${type}`;
      dock.dataset.type = type;
      dock.textContent = type.toUpperCase();
      dockLayer.appendChild(dock);
    });
  });
}

function getDuelLayer(player) {
  return document.querySelector(`.duel-harbor[data-player="${player}"]`);
}

function getDuelDock(player, type) {
  return document.querySelector(`.duel-docks[data-player="${player}"] .duel-dock[data-type="${type}"]`);
}

function getLayerPoint(layer, event) {
  const rect = layer.getBoundingClientRect();
  let x = event.clientX - rect.left;
  let y = event.clientY - rect.top;
  const player = layer.dataset.player;
  const effect = state.duel.effects[player];
  const duelConfig = state.config?.duelGame || {};

  if (effect === "glitch") {
    const intensity = Number(duelConfig.glitchIntensityPercent || 72) / 100;
    x += Math.sin(y * 0.08 + performance.now() * 0.012) * 85 * intensity;
    y += Math.cos(x * 0.07 + performance.now() * 0.009) * 52 * intensity;
  }

  if (effect === "fog") {
    const fog = Number(duelConfig.fogOpacityPercent || 62) / 100;
    x += Math.sin(y * 0.045 + performance.now() * 0.003) * 26 * fog;
    y += Math.cos(x * 0.04 + performance.now() * 0.003) * 18 * fog;
  }

  return {
    x: Math.max(20, Math.min(rect.width - 20, x)),
    y: Math.max(20, Math.min(rect.height - 20, y))
  };
}

function getDuelDockPoint(player, type) {
  const layer = getDuelLayer(player);
  const dock = getDuelDock(player, type);
  const layerRect = layer.getBoundingClientRect();
  const dockRect = dock.getBoundingClientRect();
  return {
    x: dockRect.left + dockRect.width / 2 - layerRect.left,
    y: dockRect.top + dockRect.height / 2 - layerRect.top
  };
}

function spawnDuelShip(player, forcedType = null) {
  const layer = getDuelLayer(player);
  const rect = layer.getBoundingClientRect();
  const types = ["display", "radar", "cargo"];
  const type = forcedType || types[Math.floor(Math.random() * types.length)];
  const ship = document.createElement("button");
  const id = state.duel.nextShipId++;
  const x = 36 + Math.random() * Math.max(40, rect.width - 72);
  const y = player === "blue" ? rect.height - 42 : 42;

  ship.type = "button";
  ship.className = `duel-ship duel-ship--${type}`;
  ship.dataset.id = String(id);
  ship.dataset.player = player;
  ship.dataset.type = type;
  ship.textContent = type === "display" ? "DISPLAY" : type === "radar" ? "RADAR" : "CARGO";
  ship.style.left = `${x}px`;
  ship.style.top = `${y}px`;
  ship.addEventListener("pointerdown", beginDuelShipDrag);
  layer.appendChild(ship);

  state.duel.ships.set(id, {
    id,
    player,
    type,
    element: ship,
    x,
    y,
    target: null,
    speed: 42 + getRoundProgress() * 38
  });
}

function beginDuelShipDrag(event) {
  if (state.isPaused || state.currentScreen !== "duel") {
    return;
  }

  const shipElement = event.currentTarget;
  const ship = state.duel.ships.get(Number(shipElement.dataset.id));

  if (!ship) {
    return;
  }

  event.preventDefault();
  shipElement.setPointerCapture(event.pointerId);
  state.duel.drags.set(event.pointerId, ship.id);
  shipElement.classList.add("duel-ship--dragging");
}

function moveDuelShipDrag(event) {
  const shipId = state.duel?.drags.get(event.pointerId);

  if (!shipId) {
    return;
  }

  const ship = state.duel.ships.get(shipId);
  const layer = getDuelLayer(ship.player);
  const point = getLayerPoint(layer, event);
  ship.target = point;
  drawDuelPath(ship, point);
}

function endDuelShipDrag(event) {
  const shipId = state.duel?.drags.get(event.pointerId);

  if (!shipId) {
    return;
  }

  const ship = state.duel.ships.get(shipId);
  const layer = getDuelLayer(ship.player);
  const point = getLayerPoint(layer, event);
  const dockPoint = getDuelDockPoint(ship.player, ship.type);
  const distanceToDock = Math.hypot(point.x - dockPoint.x, point.y - dockPoint.y);
  ship.target = distanceToDock < 100 ? dockPoint : point;
  ship.element.classList.remove("duel-ship--dragging");
  state.duel.drags.delete(event.pointerId);
}

function drawDuelPath(ship, point) {
  let path = ship.pathElement;

  if (!path) {
    path = document.createElement("div");
    path.className = "duel-path";
    getDuelLayer(ship.player).appendChild(path);
    ship.pathElement = path;
  }

  const dx = point.x - ship.x;
  const dy = point.y - ship.y;
  const length = Math.hypot(dx, dy);
  path.style.left = `${ship.x}px`;
  path.style.top = `${ship.y}px`;
  path.style.width = `${length}px`;
  path.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
}

function removeDuelShip(ship) {
  ship.pathElement?.remove();
  ship.element.remove();
  state.duel.ships.delete(ship.id);
}

function scoreDuelDock(ship, correct) {
  const player = ship.player;

  if (correct) {
    state.duel.combo[player] += 1;
    const comboBonus = Math.min(25, state.duel.combo[player] * 3);
    state.duel.scores[player] += 20 + comboBonus;
    state.duel.attack[player] = Math.min(100, state.duel.attack[player] + 18 + comboBonus);
    sound.beep(player === "blue" ? 540 : 700, 90, "triangle", 0.04);

    if (state.duel.attack[player] >= 100) {
      sendDuelAttack(player);
    }
  } else {
    state.duel.combo[player] = 0;
    state.duel.scores[player] = Math.max(0, state.duel.scores[player] - 15);
    sound.beep(190, 120, "sawtooth", 0.04);
  }
}

function updateDuelShips(deltaSeconds) {
  const ships = [...state.duel.ships.values()];

  ships.forEach((ship) => {
    if (ship.target) {
      const duelConfig = state.config?.duelGame || {};
      const stormFactor =
        state.duel.effects[ship.player] === "storm"
          ? Number(duelConfig.stormSpeedMultiplierPercent || 240) / 100
          : 1;
      const dx = ship.target.x - ship.x;
      const dy = ship.target.y - ship.y;
      const distance = Math.hypot(dx, dy);
      const step = ship.speed * stormFactor * deltaSeconds;
      const wind = state.duel.effects[ship.player] === "storm" ? Math.sin(performance.now() * 0.012 + ship.id) * 42 * deltaSeconds : 0;

      if (distance <= step) {
        ship.x = ship.target.x;
        ship.y = ship.target.y;
        const dockPoint = getDuelDockPoint(ship.player, ship.type);
        const dockTolerance = state.duel.effects[ship.player] === "fog" ? 16 : 24;
        const correct = Math.hypot(ship.x - dockPoint.x, ship.y - dockPoint.y) < dockTolerance;
        scoreDuelDock(ship, correct);
        removeDuelShip(ship);
        return;
      }

      ship.x += (dx / distance) * step + wind;
      ship.y += (dy / distance) * step;
    } else {
      ship.y += (ship.player === "blue" ? -1 : 1) * 14 * deltaSeconds;
    }

    ship.element.style.left = `${ship.x}px`;
    ship.element.style.top = `${ship.y}px`;
    if (ship.pathElement && ship.target) {
      drawDuelPath(ship, ship.target);
    }
  });

  for (let left = 0; left < ships.length; left += 1) {
    for (let right = left + 1; right < ships.length; right += 1) {
      if (ships[left].player !== ships[right].player) {
        continue;
      }

      if (Math.hypot(ships[left].x - ships[right].x, ships[left].y - ships[right].y) < 36) {
        state.duel.scores[ships[left].player] = Math.max(0, state.duel.scores[ships[left].player] - 10);
        state.duel.combo[ships[left].player] = 0;
        ships[left].element.classList.add("duel-ship--collision");
        ships[right].element.classList.add("duel-ship--collision");
      }
    }
  }
}

function opponentOf(player) {
  return player === "blue" ? "gold" : "blue";
}

function sendDuelAttack(fromPlayer) {
  const target = opponentOf(fromPlayer);
  const attacks = ["storm", "fog", "traffic", "glitch"];
  const attack = attacks[Math.floor(Math.random() * attacks.length)];
  const duelConfig = state.config?.duelGame || {};
  const attackDuration = Number(duelConfig.attackDurationSeconds || 7) * 1000;
  state.duel.effects[target] = attack;
  state.duel.effectUntil[target] = performance.now() + attackDuration;
  state.duel.attack[fromPlayer] = 0;
  elements.duelStatus.textContent = `${fromPlayer.toUpperCase()} sent ${attack.toUpperCase()} across the bridge`;
  if (attack === "traffic") {
    const count = Math.max(2, Math.min(6, Math.round(Number(duelConfig.trafficVessels || 4))));
    for (let index = 0; index < count; index += 1) {
      spawnDuelShip(target);
    }
  }

  if (attack === "storm") {
    const boost = Number(duelConfig.stormExistingShipBoostPercent || 145) / 100;
    [...state.duel.ships.values()]
      .filter((ship) => ship.player === target)
      .forEach((ship) => {
        ship.speed *= boost;
      });
  }
  sound.beep(880, 160, "square", 0.05);
}

function updateDuelHud() {
  const now = performance.now();

  ["blue", "gold"].forEach((player) => {
    if (state.duel.effects[player] && now > state.duel.effectUntil[player]) {
      state.duel.effects[player] = null;
    }
  });

  elements.duelScoreBlue.textContent = String(state.duel.scores.blue);
  elements.duelScoreGold.textContent = String(state.duel.scores.gold);
  elements.duelTimer.textContent = (state.duel.timeLeftMs / 1000).toFixed(1);
  elements.duelChargeBlue.textContent = `Attack ${Math.round(state.duel.attack.blue)}/100`;
  elements.duelChargeGold.textContent = `Attack ${Math.round(state.duel.attack.gold)}/100`;
  elements.duelEffectBlue.textContent = state.duel.effects.blue ? `${state.duel.effects.blue.toUpperCase()} active` : `Combo x${state.duel.combo.blue}`;
  elements.duelEffectGold.textContent = state.duel.effects.gold ? `${state.duel.effects.gold.toUpperCase()} active` : `Combo x${state.duel.combo.gold}`;
  elements.duelZoneBlue.dataset.effect = state.duel.effects.blue || "";
  elements.duelZoneGold.dataset.effect = state.duel.effects.gold || "";
}

function finishDuelGame() {
  clearGameTimers();
  const blue = state.duel.scores.blue;
  const gold = state.duel.scores.gold;
  elements.duelFinalBlue.textContent = String(blue);
  elements.duelFinalGold.textContent = String(gold);

  if (blue === gold) {
    elements.duelWinnerTitle.textContent = "Bridge contested";
    elements.duelResultMessage.textContent = "Draw. Both operators held the bridge under pressure.";
  } else {
    const winner = blue > gold ? "Blue" : "Gold";
    elements.duelWinnerTitle.textContent = `${winner} operator wins`;
    elements.duelResultMessage.textContent = `${winner} controlled the bridge with faster reactions and better disruption timing.`;
    launchConfetti();
  }

  showScreen("duelResult");
}

async function startDuelSession() {
  await refreshConfig();
  resetGameState();
  resetDuelState();
  showScreen("duel");
  state.gameStartTime = performance.now();
  state.duel.nextSpawnAt = state.gameStartTime;
  ["blue", "gold"].forEach((player) => {
    spawnDuelShip(player);
    spawnDuelShip(player);
  });
  updateDuelHud();

  runDuelLoop();
}

function runDuelLoop() {
  clearInterval(state.gameLoopTimer);
  let lastTick = performance.now();
  state.gameLoopTimer = window.setInterval(() => {
    if (state.isPaused || state.currentScreen !== "duel") {
      lastTick = performance.now();
      return;
    }

    const now = performance.now();
    const deltaSeconds = Math.min(0.08, (now - lastTick) / 1000);
    lastTick = now;
    const duelDurationSeconds = Number(state.config.duelGame?.durationSeconds || state.config.game.durationSeconds);
    state.duel.timeLeftMs = Math.max(0, duelDurationSeconds * 1000 - (now - state.gameStartTime));

    if (now >= state.duel.nextSpawnAt) {
      ["blue", "gold"].forEach((player) => spawnDuelShip(player));
      const pressure = 1 - Math.min(0.38, getRoundProgress() * 0.28);
      state.duel.nextSpawnAt = now + 1900 * pressure;
    }

    updateDuelShips(deltaSeconds);
    updateDuelHud();

    if (state.duel.timeLeftMs <= 0) {
      finishDuelGame();
    }
  }, 50);
}

async function startGameSession() {
  await refreshConfig();
  resetGameState();
  const payload = await api("/api/session/start", { method: "POST" });
  state.activeSessionId = payload.sessionId;
  showScreen("game");
  startGameplayLoop();
}

async function startCountdown() {
  closeLeaderboard();
  showScreen("countdown");

  let value = state.config.game.countdownSeconds;
  elements.countdownValue.textContent = String(value);

  clearInterval(state.countdownTimer);

  state.countdownTimer = window.setInterval(async () => {
    value -= 1;

    if (value > 0) {
      elements.countdownValue.textContent = String(value);
      sound.beep(380, 80, "triangle", 0.03);
      return;
    }

    clearInterval(state.countdownTimer);
    elements.countdownValue.textContent = "START";
    sound.beep(660, 160, "square", 0.05);

    window.setTimeout(() => {
      const startSelectedGame =
        state.selectedGame === "duel" ? startDuelSession : startGameSession;

      startSelectedGame().catch((error) => {
        elements.resultMessage.textContent = error.message;
        showScreen("result");
      });
    }, 420);
  }, 1000);
}

async function handleStartRequest() {
  if (state.currentScreen === "countdown" || state.currentScreen === "game" || state.currentScreen === "duel") {
    return;
  }

  state.selectedGame = getStoredGameMode();
  await enterFullscreen();
  sound.beep(520, 100, "triangle", 0.035);
  await startCountdown();
}

function returnToStart() {
  state.isPaused = false;
  document.body.classList.remove("screen-paused");
  clearGameTimers();
  clearTimeout(state.confirmationTimer);
  clearHoldExit();
  closeLeaderboard();
  resetGameState();
  elements.entryForm.reset();
  elements.formError.textContent = "";
  state.lastFinishResult = null;
  showScreen("start");
  startAttractMode();
}


function setPauseOverlay(active) {
  document.body.classList.toggle("screen-paused", active);
  elements.pauseOverlays.forEach((overlay) => {
    overlay.classList.toggle("pause-overlay--active", active && overlay.dataset.pauseOverlay === state.currentScreen);
  });
}

function pauseCurrentGame() {
  if (state.isPaused || !["game", "duel"].includes(state.currentScreen)) {
    return;
  }

  state.isPaused = true;
  state.pauseStartedAt = performance.now();
  clearInterval(state.gameLoopTimer);
  clearTimeout(state.spawnTimer);
  clearHoldExit();
  if (state.currentScreen === "game") {
    state.activeTargets.forEach((target) => resetMultiTarget(target));
  }
  if (state.currentScreen === "duel" && state.duel) {
    state.duel.drags.clear();
  }
  setPauseOverlay(true);
}

function resumeCurrentGame() {
  if (!state.isPaused) {
    return;
  }

  const pauseDuration = performance.now() - state.pauseStartedAt;
  state.isPaused = false;
  state.pauseStartedAt = 0;
  state.gameStartTime += pauseDuration;

  if (state.currentScreen === "game") {
    if (state.doubleScoreUntil > 0) state.doubleScoreUntil += pauseDuration;
    if (state.slowMotionUntil > 0) state.slowMotionUntil += pauseDuration;
    state.activeTargets.forEach((target) => {
      target.spawnedAt += pauseDuration;
      target.expiresAt += pauseDuration;
    });
    runRushLoop();
    scheduleNextSpawn();
  } else if (state.currentScreen === "duel" && state.duel) {
    state.duel.nextSpawnAt += pauseDuration;
    ["blue", "gold"].forEach((player) => {
      if (state.duel.effectUntil[player] > 0) {
        state.duel.effectUntil[player] += pauseDuration;
      }
    });
    runDuelLoop();
  }

  setPauseOverlay(false);
}

function scheduleConfirmationReset() {
  clearTimeout(state.confirmationTimer);
  let secondsLeft = state.config.booth.confirmationAutoResetSeconds;
  elements.autoResetText.textContent = `Returning to the start screen in ${secondsLeft} seconds.`;

  const tick = () => {
    secondsLeft -= 1;

    if (secondsLeft <= 0) {
      returnToStart();
      return;
    }

    elements.autoResetText.textContent = `Returning to the start screen in ${secondsLeft} seconds.`;
    state.confirmationTimer = window.setTimeout(tick, 1000);
  };

  state.confirmationTimer = window.setTimeout(tick, 1000);
}

async function submitRegistration(event) {
  event.preventDefault();
  elements.formError.textContent = "";

  const formData = new FormData(elements.entryForm);
  const payload = {
    sessionId: state.lastFinishResult?.sessionId,
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    consent: Boolean(formData.get("consent"))
  };

  if (!payload.name.trim() || (!payload.email.trim() && !payload.phone.trim()) || !payload.consent) {
    elements.formError.textContent = "Add name, email or phone, and tick the consent box.";
    return;
  }

  try {
    const result = await api("/api/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    elements.confirmationMessage.textContent = `Thanks ${result.entry.name}. Your score of ${result.entry.score} points was saved at ${formatDate(result.entry.createdAt)}.`;
    showScreen("confirmation");
    refreshLeaderboard().catch(() => {});
    scheduleConfirmationReset();
  } catch (error) {
    elements.formError.textContent = error.message;
  }
}

function startAttractMode() {
  clearInterval(state.attractTimer);
  clearInterval(state.techLineTimer);
  elements.attractLayer.innerHTML = "";

  renderLeaderboard();
  state.attractTimer = window.setInterval(() => {
    if (state.currentScreen === "start") {
      refreshLeaderboard().catch(() => {});
    }
  }, 15000);

  let techLineIndex = 0;
  elements.attractTechLine.textContent = TECH_LINES[techLineIndex];
  elements.brandSlogan.textContent = BRAND_SLOGANS[0];
  state.techLineTimer = window.setInterval(() => {
    techLineIndex = (techLineIndex + 1) % TECH_LINES.length;
    elements.attractTechLine.textContent = TECH_LINES[techLineIndex];
    elements.brandSlogan.textContent = BRAND_SLOGANS[techLineIndex % BRAND_SLOGANS.length];
  }, 2600);
}

function launchConfetti() {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 24; index += 1) {
    const piece = elements.confettiTemplate.content.firstElementChild.cloneNode(true);
    piece.style.left = `${20 + Math.random() * 60}%`;
    piece.style.top = "-2rem";
    piece.style.background = [state.config.theme.accent, state.config.theme.secondary, state.config.theme.danger][index % 3];
    piece.style.setProperty("--confetti-x", `${-120 + Math.random() * 240}px`);
    piece.style.setProperty("--confetti-r", `${-250 + Math.random() * 500}deg`);
    fragment.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }

  document.body.appendChild(fragment);
}

async function enterFullscreen() {
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn("Fullscreen could not be enabled:", error);
    }
  }

  if (screen.orientation?.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function attachEvents() {
  document.addEventListener("pointerdown", resetInactivityTimer, { passive: true });
  document.addEventListener("pointermove", moveDuelShipDrag);
  document.addEventListener("pointerup", endDuelShipDrag);
  document.addEventListener("pointercancel", endDuelShipDrag);
  document.addEventListener("keydown", resetInactivityTimer);
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  [elements.gameArena, elements.targetLayer, screens.game, screens.duel].forEach((element) => {
    element.addEventListener(
      "touchstart",
      (event) => {
        event.preventDefault();
      },
      { passive: false }
    );
  });

  elements.startButton.addEventListener("click", () => {
    handleStartRequest().catch((error) => {
      elements.resultMessage.textContent = error.message;
      showScreen("result");
    });
  });

  screens.start.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) {
      return;
    }

    handleStartRequest().catch((error) => {
      elements.resultMessage.textContent = error.message;
      showScreen("result");
    });
  });

  elements.muteButton.addEventListener("click", () => {
    state.soundPreferenceTouched = true;
    state.soundEnabled = !state.soundEnabled;
    elements.muteButton.textContent = `Sound: ${state.soundEnabled ? "On" : "Off"}`;
    elements.muteButton.setAttribute("aria-pressed", String(!state.soundEnabled));
  });

  elements.leaderboardToggle.addEventListener("click", () => {
    refreshLeaderboard().then(openLeaderboard).catch(() => openLeaderboard());
  });

  elements.closeLeaderboardButton.addEventListener("click", closeLeaderboard);
  elements.playAgainButton.addEventListener("click", () => {
    handleStartRequest().catch((error) => {
      elements.resultMessage.textContent = error.message;
      showScreen("result");
    });
  });
  elements.resultHomeButton.addEventListener("click", returnToStart);
  elements.duelAgainButton.addEventListener("click", () => {
    handleStartRequest().catch(() => returnToStart());
  });
  elements.duelHomeButton.addEventListener("click", returnToStart);
  elements.registerButton.addEventListener("click", () => showScreen("form"));
  elements.cancelRegistrationButton.addEventListener("click", () => showScreen("result"));
  elements.newPlayerButton.addEventListener("click", returnToStart);
  elements.confirmationHomeButton.addEventListener("click", returnToStart);
  elements.entryForm.addEventListener("submit", submitRegistration);
  elements.pauseButtons.forEach((button) => button.addEventListener("click", pauseCurrentGame));
  elements.resumeButtons.forEach((button) => button.addEventListener("click", resumeCurrentGame));

  const beginHoldExit = (event) => {
    if (state.isPaused || !["game", "duel"].includes(state.currentScreen) || state.holdExitTimer) {
      return;
    }

    const button = event.currentTarget;
    const fill = button.querySelector(".hold-exit-button__fill");
    const pointerId = event.pointerId;
    const startedAt = performance.now();
    button.setPointerCapture?.(pointerId);
    button.classList.add("hold-exit-button--arming");
    if (fill) {
      fill.style.width = "0%";
    }

    state.holdExitProgressTimer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const progress = Math.min(1, elapsed / HOLD_EXIT_MS);
      if (fill) {
        fill.style.width = `${Math.round(progress * 100)}%`;
      }
    }, 16);

    state.holdExitTimer = window.setTimeout(() => {
      button.releasePointerCapture?.(pointerId);
      clearHoldExit();
      returnToStart();
    }, HOLD_EXIT_MS);
  };

  const cancelHoldExit = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    clearHoldExit();
  };

  document.querySelectorAll("[data-hold-exit]").forEach((button) => {
    button.addEventListener("pointerdown", beginHoldExit);
    button.addEventListener("pointerup", cancelHoldExit);
    button.addEventListener("pointerleave", cancelHoldExit);
    button.addEventListener("pointercancel", cancelHoldExit);
    button.addEventListener("lostpointercapture", cancelHoldExit);
  });

  elements.leaderboardModal.addEventListener("click", (event) => {
    const rect = elements.leaderboardModal.getBoundingClientRect();
    const inside =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;

    if (!inside) {
      closeLeaderboard();
    }
  });
}

async function init() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheKeys = await caches.keys().catch(() => []);
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }

  const [configPayload] = await Promise.all([refreshConfig(), refreshLeaderboard()]);
  applyConfig(configPayload);
  resetGameState();
  attachEvents();
  startAttractMode();
}

init().catch((error) => {
  console.error(error);
  elements.resultMessage.textContent =
    "The app could not start. Check that the local server is running.";
  showScreen("result");
});
