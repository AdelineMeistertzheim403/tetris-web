export const MIN_GRAVITY_MULTIPLIER = 0.05;
export const MAX_GRAVITY_MULTIPLIER = 100;
export const MAX_EFFECTIVE_GRAVITY_MULTIPLIER = 4;
export const MIN_EFFECTIVE_GRAVITY_MULTIPLIER = 2;
export const EFFECTIVE_GRAVITY_DECAY_PER_LEVEL = 0.1;

export type StatusBadge = {
  label: string;
  value: string;
  tone?: "good" | "info" | "warning" | "muted" | "chaos" | "gold";
};

export function clampGravityMultiplier(value: number) {
  return Math.min(MAX_GRAVITY_MULTIPLIER, Math.max(MIN_GRAVITY_MULTIPLIER, value));
}

export function getEffectiveGravityMultiplier({
  gravityMultiplier,
  lineSlowActive,
  currentLevel,
}: {
  gravityMultiplier: number;
  lineSlowActive: boolean;
  currentLevel: number;
}) {
  const rawGravityMultiplier = gravityMultiplier * (lineSlowActive ? 1.5 : 1);
  const gravityMultiplierCap = Math.max(
    MIN_EFFECTIVE_GRAVITY_MULTIPLIER,
    MAX_EFFECTIVE_GRAVITY_MULTIPLIER -
      (currentLevel - 1) * EFFECTIVE_GRAVITY_DECAY_PER_LEVEL
  );
  return Math.min(rawGravityMultiplier, gravityMultiplierCap);
}

export function getEffectiveScoreMultiplier({
  scoreMultiplier,
  zeroBombBoost,
  bombs,
}: {
  scoreMultiplier: number;
  zeroBombBoost: boolean;
  bombs: number;
}) {
  return scoreMultiplier * (zeroBombBoost && bombs === 0 ? 2 : 1);
}

export function buildStatusBadges({
  effectiveScoreMultiplier,
  effectiveGravityMultiplier,
  bombs,
  timeFreezeCharges,
  chaosMode,
  zeroBombBoost,
  noBombBonus,
  bombsUsed,
  chainExplosions,
  lineSlowEnabled,
  lineSlowActive,
  secondChance,
  secondChanceRechargeEvery,
  rotationDelayMs,
  timeFreezeEcho,
}: {
  effectiveScoreMultiplier: number;
  effectiveGravityMultiplier: number;
  bombs: number;
  timeFreezeCharges: number;
  chaosMode: boolean;
  zeroBombBoost: boolean;
  noBombBonus: boolean;
  bombsUsed: number;
  chainExplosions: boolean;
  lineSlowEnabled: boolean;
  lineSlowActive: boolean;
  secondChance: boolean;
  secondChanceRechargeEvery: number | null;
  rotationDelayMs: number;
  timeFreezeEcho: boolean;
}): StatusBadge[] {
  const badges: StatusBadge[] = [];

  badges.push({ label: "Score", value: `x${effectiveScoreMultiplier.toFixed(2)}`, tone: "gold" });
  badges.push({ label: "Gravité", value: `x${effectiveGravityMultiplier.toFixed(2)}`, tone: "info" });
  badges.push({ label: "Bombes", value: `${bombs}`, tone: bombs > 0 ? "good" : "muted" });
  badges.push({
    label: "Time Freeze",
    value: `${timeFreezeCharges}`,
    tone: timeFreezeCharges > 0 ? "info" : "muted",
  });
  badges.push({ label: "Chaos", value: chaosMode ? "ON" : "OFF", tone: chaosMode ? "chaos" : "muted" });

  if (zeroBombBoost) {
    badges.push({
      label: "Zero Bomb Boost",
      value: bombs === 0 ? "x2 actif" : "x2 à 0",
      tone: bombs === 0 ? "good" : "info",
    });
  }

  if (noBombBonus) {
    badges.push({
      label: "No Bomb Bonus",
      value: bombsUsed === 0 ? "prêt" : "si 0 bombe",
      tone: bombsUsed === 0 ? "good" : "info",
    });
  }

  if (chainExplosions) {
    badges.push({ label: "Chain", value: "35%", tone: "info" });
  }

  if (lineSlowEnabled) {
    badges.push({
      label: "Gravité lente",
      value: lineSlowActive ? "actif" : "prêt",
      tone: lineSlowActive ? "good" : "muted",
    });
  }

  if (secondChance || secondChanceRechargeEvery) {
    badges.push({
      label: "Second Chance",
      value: secondChance ? "dispo" : `tous ${secondChanceRechargeEvery} niv.`,
      tone: secondChance ? "good" : "info",
    });
  }

  if (rotationDelayMs > 0) {
    badges.push({ label: "Rotation", value: `+${rotationDelayMs}ms`, tone: "muted" });
  }

  if (timeFreezeEcho) {
    badges.push({ label: "Écho TF", value: "+1 charge", tone: "info" });
  }

  return badges;
}
