function getStreakMultiplier(streak) {
  if (streak >= 12) return 2;
  if (streak >= 6) return 1.5;
  if (streak >= 3) return 1.25;
  return 1;
}

function points(basePoints, streak) {
  return Math.round(basePoints * getStreakMultiplier(streak));
}

function calculate(events, game) {
  let score = 0;
  let streak = 0;
  let shield = 0;
  let doubleHits = 0;

  for (const event of events) {
    if (event === "power-double") {
      doubleHits += 6;
      continue;
    }
    if (event === "power-shield") {
      shield = Math.min(2, shield + 1);
      continue;
    }
    if (event === "power-slow" || event === "time") {
      continue;
    }
    if (event === "bad") {
      streak = 0;
      if (shield > 0) shield -= 1;
      else score -= game.badTargetPenalty;
      continue;
    }

    let base = 0;
    if (event === "good") {
      streak += 1;
      base = game.goodTargetBasePoints;
    } else if (event === "bonus") {
      streak += 1;
      base = game.bonusTargetPoints;
    } else if (event === "multi") {
      streak += 2;
      base = game.multiTargetPoints;
    }

    let delta = points(base, streak);
    if (doubleHits > 0) {
      delta *= 2;
      doubleHits -= 1;
    }
    score += delta;
  }

  return Math.max(0, Math.round(score));
}

const game = {
  goodTargetBasePoints: 10,
  bonusTargetPoints: 30,
  multiTargetPoints: 40,
  badTargetPenalty: 18
};

const cases = [
  { name: "simple", events: ["good", "good", "good"], expected: 33 },
  { name: "streak tiers", events: ["good", "good", "good", "good", "good", "good"], expected: 74 },
  { name: "hazard reset", events: ["good", "good", "good", "bad", "good"], expected: 25 },
  { name: "shield", events: ["power-shield", "good", "bad", "good"], expected: 20 },
  { name: "double", events: ["power-double", "good", "good", "good"], expected: 66 },
  { name: "multi", events: ["good", "multi"], expected: 60 }
];

for (const testCase of cases) {
  const actual = calculate(testCase.events, game);
  if (actual !== testCase.expected) {
    throw new Error(`${testCase.name}: expected ${testCase.expected}, got ${actual}`);
  }
}

console.log("Scoring checks passed");
