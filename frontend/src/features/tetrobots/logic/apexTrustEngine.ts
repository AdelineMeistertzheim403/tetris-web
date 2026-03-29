import {
  getApexTrustState,
} from "../../achievements/lib/tetrobotAchievementLogic";
import type { AchievementStats } from "../../achievements/types/achievementStats";
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

type ApexChallengeStatsSnapshot = Pick<
  AchievementStats,
  | "playerBehaviorByMode"
  | "roguelikeVersusMatches"
  | "roguelikeVersusWins"
  | "versusMatches"
  | "versusWins"
>;

export function getApexTrackedModeSessions(
  mode: PlayerBehaviorMode | null | undefined,
  stats: ApexChallengeStatsSnapshot
) {
  if (!mode) return 0;
  const behaviorSessions = stats.playerBehaviorByMode[mode]?.sessions ?? 0;
  const legacySessions =
    mode === "VERSUS"
      ? stats.versusMatches
      : mode === "ROGUELIKE_VERSUS"
        ? stats.roguelikeVersusMatches
        : 0;
  return Math.max(behaviorSessions, legacySessions);
}

export function getApexTrackedModeWins(
  mode: PlayerBehaviorMode | null | undefined,
  stats: ApexChallengeStatsSnapshot
) {
  if (!mode) return 0;
  const behaviorWins = stats.playerBehaviorByMode[mode]?.wins ?? 0;
  const legacyWins =
    mode === "VERSUS"
      ? stats.versusWins
      : mode === "ROGUELIKE_VERSUS"
        ? stats.roguelikeVersusWins
        : 0;
  return Math.max(behaviorWins, legacyWins);
}

export function getApexChallengeProgress(
  challenge: TetrobotChallengeState | null | undefined,
  stats: ApexChallengeStatsSnapshot
) {
  const activeChallenge = getActiveApexChallenge(challenge);
  if (!activeChallenge) return 0;
  if (activeChallenge.status === "completed") return activeChallenge.targetCount;
  if (!activeChallenge.targetMode) return Math.min(activeChallenge.progress, activeChallenge.targetCount);
  const trackedSessions = getApexTrackedModeSessions(activeChallenge.targetMode, stats);
  const liveProgress = Math.max(0, trackedSessions - activeChallenge.startSessions);
  return Math.min(
    activeChallenge.targetCount,
    Math.max(activeChallenge.progress, liveProgress)
  );
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
