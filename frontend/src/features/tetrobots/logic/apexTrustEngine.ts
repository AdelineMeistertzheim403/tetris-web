import {
  getApexTrustState,
} from "../../achievements/lib/tetrobotAchievementLogic";
import type {
  ApexTrustState,
  PlayerBehaviorMode,
  PlayerLongTermMemory,
  TetrobotChallengeState,
} from "../../achievements/types/tetrobots";
import {
  TETROBOT_MODE_LABELS,
  TETROBOT_MODE_PLAY_ROUTE_MAP,
} from "../data/tetrobotsContent";

export { getApexTrustState };
export type { ApexTrustState, PlayerLongTermMemory };

export function getActiveApexChallenge(
  challenge: TetrobotChallengeState | null | undefined
) {
  return challenge?.bot === "apex" ? challenge : null;
}

export function getApexChallengeTargetMode(
  challenge: TetrobotChallengeState | null | undefined,
  fallbackMode: PlayerBehaviorMode | null
) {
  return getActiveApexChallenge(challenge)?.targetMode ?? fallbackMode;
}

export function getApexChallengeActionTarget(
  challenge: TetrobotChallengeState | null | undefined
) {
  const targetMode = getActiveApexChallenge(challenge)?.targetMode;
  return targetMode ? TETROBOT_MODE_PLAY_ROUTE_MAP[targetMode] ?? null : null;
}

export function getApexChallengeActionLabel(
  challenge: TetrobotChallengeState | null | undefined
) {
  const activeChallenge = getActiveApexChallenge(challenge);
  if (!activeChallenge?.targetMode || activeChallenge.status === "completed") {
    return null;
  }

  const modeLabel = TETROBOT_MODE_LABELS[activeChallenge.targetMode] ?? activeChallenge.targetMode;
  const requiresDuelChoice =
    activeChallenge.targetMode === "VERSUS" ||
    activeChallenge.targetMode === "ROGUELIKE_VERSUS";

  if (requiresDuelChoice) {
    return activeChallenge.status === "offered"
      ? `Accepter et choisir le duel ${modeLabel}`
      : `Choisir le duel ${modeLabel}`;
  }

  return activeChallenge.status === "offered"
    ? `Accepter et jouer ${modeLabel}`
    : `Continuer sur ${modeLabel}`;
}

export function getApexRequirement(
  memory: PlayerLongTermMemory,
  trustState: ApexTrustState,
  challenge?: TetrobotChallengeState | null
) {
  const activeChallenge = getActiveApexChallenge(challenge);
  if (activeChallenge && activeChallenge.status !== "completed") {
    return activeChallenge.description;
  }

  if (trustState === "refusing") {
    const avoidedRoguelike = memory.avoidedModes.ROGUELIKE ?? 0;
    if (avoidedRoguelike >= 5) {
      return "Joue 3 parties en Roguelike sans abandonner.";
    }
    if (memory.rageQuitCount >= 3) {
      return "Termine 3 sessions completes sans rage quit.";
    }
    return "Affronte ton mode faible pendant plusieurs sessions d'affilee.";
  }

  if (trustState === "cold") {
    return "Retourne travailler le mode que tu evites.";
  }

  if (trustState === "warning") {
    return "Prouve ta discipline avec une session complete et utile.";
  }

  return "Apex est pret a te juger, et parfois a t'aider.";
}
