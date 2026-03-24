import type {
  ApexTrustState,
  BotMemoryEntry,
  BotMemoryType,
  BotMood,
  PlayerLongTermMemory,
  PlayerMistakeKey,
  TetrobotId,
} from "../types/tetrobots";

export type {
  ApexTrustState,
  BotMemoryEntry,
  BotMemoryType,
  BotMood,
  PlayerLongTermMemory,
  PlayerMistakeKey,
  TetrobotId,
};

export type TetrobotProgressionSnapshot = Record<
  TetrobotId,
  {
    level: number;
    xp: number;
    affinity: number;
    mood: BotMood;
    lastTip?: string;
  }
>;

export type BehaviorSnapshot = Record<
  string,
  {
    sessions: number;
    wins: number;
    losses: number;
    totalDurationMs?: number;
  }
>;

export type MistakeSnapshot = Record<string, Record<PlayerMistakeKey, number>>;

export type TetrobotAffinityLedgerSnapshot = {
  play_regularly: number;
  rage_quit: number;
  improve_stat: number;
  repeat_mistake: number;
  challenge_yourself: number;
  avoid_weakness: number;
};

export type AchievementDerivedStats = {
  counters: Record<string, number>;
  hardDropCount: number;
  lastPlayedMode: string | null;
  level10Modes: Record<string, boolean>;
  lowestWinrateMode: string | null;
  modesVisited: Record<string, boolean>;
  noHoldRuns: number;
  playerBehaviorByMode: BehaviorSnapshot;
  playerLongTermMemory: PlayerLongTermMemory;
  playerMistakesByMode: MistakeSnapshot;
  scoredModes: Record<string, boolean>;
  tetrobotAffinityLedger: TetrobotAffinityLedgerSnapshot;
  tetrobotMemories: Record<TetrobotId, BotMemoryEntry[]>;
  tetrobotProgression: TetrobotProgressionSnapshot;
};

export type AchievementDerivedContext = {
  custom?: Record<string, boolean | number>;
};

export const TETROBOT_IDS: TetrobotId[] = ["rookie", "pulse", "apex"];

export function getApexTrustState(
  memory: PlayerLongTermMemory,
  affinity: number
): ApexTrustState {
  if (affinity < -60) return "refusing";
  if ((memory.avoidedModes.ROGUELIKE ?? 0) >= 5 || (memory.avoidedModes.PUZZLE ?? 0) >= 5) {
    return "cold";
  }
  if (memory.rageQuitCount >= 3) return "warning";
  return "open";
}

const getTotalWins = (stats: AchievementDerivedStats) =>
  Object.values(stats.playerBehaviorByMode).reduce((sum, mode) => sum + mode.wins, 0);

const getTotalLosses = (stats: AchievementDerivedStats) =>
  Object.values(stats.playerBehaviorByMode).reduce((sum, mode) => sum + mode.losses, 0);

const getTotalSessions = (stats: AchievementDerivedStats) =>
  Object.values(stats.playerBehaviorByMode).reduce((sum, mode) => sum + mode.sessions, 0);

const getTotalPlaytimeMs = (stats: AchievementDerivedStats) =>
  Object.values(stats.playerBehaviorByMode).reduce(
    (sum, mode) => sum + Math.max(0, mode.totalDurationMs ?? 0),
    0
  );

const countEnabled = (values: Record<string, boolean>) =>
  Object.values(values).filter(Boolean).length;

const getKnownBotCount = (stats: AchievementDerivedStats) =>
  TETROBOT_IDS.filter((bot) => {
    const state = stats.tetrobotProgression[bot];
    return state.xp > 0 || Boolean(state.lastTip);
  }).length;

const getDetectedStyleCount = (stats: AchievementDerivedStats) =>
  Object.values(stats.playerLongTermMemory.weakestModes ?? {}).filter(
    (value) => typeof value === "number" && value > 0
  ).length;

const getMemoryDialogueCount = (stats: AchievementDerivedStats) =>
  Object.values(stats.tetrobotMemories).filter((entries) => entries.length > 0).length;

const getAggregatedMistakeCount = (
  stats: AchievementDerivedStats,
  keys: PlayerMistakeKey[]
) =>
  Object.values(stats.playerMistakesByMode).reduce(
    (sum, modeMistakes) =>
      sum + keys.reduce((mistakeSum, key) => mistakeSum + (modeMistakes[key] ?? 0), 0),
    0
  );

const hasBotMemory = (
  stats: AchievementDerivedStats,
  bot: TetrobotId,
  type: BotMemoryType
) => stats.tetrobotMemories[bot]?.some((entry) => entry.type === type) ?? false;

export function getDerivedCounterValue(stats: AchievementDerivedStats, key: string) {
  switch (key) {
    case "rookie_tips_followed":
      return Math.max(
        stats.counters.rookie_tips_followed ?? 0,
        stats.tetrobotAffinityLedger.play_regularly
      );
    default:
      return stats.counters[key] ?? 0;
  }
}

export function getDerivedCustomAchievementValue(
  stats: AchievementDerivedStats,
  key: string,
  ctx: AchievementDerivedContext
) {
  const pulse = stats.tetrobotProgression.pulse;
  const lowestMode = stats.lowestWinrateMode;
  const totalSessions = getTotalSessions(stats);
  const totalPlaytimeMs = getTotalPlaytimeMs(stats);
  const totalLosses = getTotalLosses(stats);
  const totalWins = getTotalWins(stats);
  const panicMistakes = getAggregatedMistakeCount(stats, [
    "panic_stack",
    "slow_decision",
    "unsafe_stack",
  ]);
  const riskyMistakes = getAggregatedMistakeCount(stats, ["greedy_play", "unsafe_stack"]);

  switch (key) {
    case "improved_after_pulse":
      return (stats.counters.pulse_advice_success ?? 0) > 0 ||
        (stats.tetrobotAffinityLedger.improve_stat > 0 && pulse.affinity >= 10);
    case "stable_winrate":
      return totalSessions >= 5 && stats.playerLongTermMemory.consistencyScore >= 60;
    case "modes_visited_all":
      return countEnabled(stats.modesVisited) >= Object.keys(stats.modesVisited).length;
    case "no_hold_runs_10":
      return stats.noHoldRuns >= 10;
    case "harddrop_50":
      return stats.hardDropCount >= 50;
    case "level_10_three_modes":
      return countEnabled(stats.level10Modes) >= 3;
    case "scored_all_modes":
      return countEnabled(stats.scoredModes) >= Object.keys(stats.scoredModes).length;
    case "playtime_60m":
      return totalPlaytimeMs >= 60 * 60 * 1000;
    case "playtime_300m":
      return totalPlaytimeMs >= 300 * 60 * 1000;
    case "played_weak_mode":
      return Boolean(
        lowestMode &&
          stats.lastPlayedMode === lowestMode &&
          stats.playerBehaviorByMode[lowestMode].sessions > 0
      );
    case "win_weak_mode":
      return Boolean(lowestMode && stats.playerBehaviorByMode[lowestMode].wins > 0);
    case "success_after_apex_refusal":
      return (
        (stats.counters.apex_refusal_count ?? 0) > 0 &&
        (stats.counters.apex_trust_restored_count ?? 0) > 0
      ) || (hasBotMemory(stats, "apex", "trust_break") && hasBotMemory(stats, "apex", "trust_rebuild"));
    case "met_all_bots":
      return getKnownBotCount(stats) >= TETROBOT_IDS.length;
    case "bot_memory_dialogue":
      return getMemoryDialogueCount(stats) >= 1;
    case "bot_detected_style":
      return getDetectedStyleCount(stats) >= 1;
    case "negative_bot_reaction":
      return TETROBOT_IDS.some(
        (bot) =>
          stats.tetrobotProgression[bot].affinity < 0 ||
          stats.tetrobotProgression[bot].mood === "angry"
      );
    case "all_bots_respect":
      return TETROBOT_IDS.every((bot) => stats.tetrobotProgression[bot].affinity >= 50);
    case "apex_first_refusal":
      return (stats.counters.apex_refusal_count ?? 0) > 0 || hasBotMemory(stats, "apex", "trust_break");
    case "apex_trust_restored":
      return (stats.counters.apex_trust_restored_count ?? 0) > 0 || hasBotMemory(stats, "apex", "trust_rebuild");
    case "balanced_affinity":
      return TETROBOT_IDS.every((bot) => stats.tetrobotProgression[bot].affinity >= 25);
    case "panic_sequence":
      return panicMistakes >= 3;
    case "risky_loss":
      return totalLosses > 0 && riskyMistakes > 0;
    case "critical_win":
      return (stats.counters.comeback_estimate ?? 0) > 0 ||
        (totalWins > 0 && hasBotMemory(stats, "rookie", "player_comeback"));
    case "perfect_play_duration":
      return totalSessions >= 5 && stats.playerLongTermMemory.disciplineScore >= 80;
    case "tilt_detected":
      return (stats.counters.rage_quit_estimate ?? 0) >= 3 && totalLosses >= 3;
    case "stat_improved":
      return stats.tetrobotAffinityLedger.improve_stat > 0;
    case "multiple_stats_improved":
      return stats.tetrobotAffinityLedger.improve_stat >= 3;
    case "worked_on_weakness":
      return Boolean(
        lowestMode &&
          stats.playerBehaviorByMode[lowestMode].sessions >= 3 &&
          (stats.playerLongTermMemory.avoidedModes[lowestMode] ?? 0) <= Math.max(2, totalSessions - 3)
      );
    case "bot_max_level":
    case "max_bot_level":
      return TETROBOT_IDS.some((bot) => stats.tetrobotProgression[bot].level >= 5);
    case "bot_angry":
      return TETROBOT_IDS.some((bot) => stats.tetrobotProgression[bot].mood === "angry");
    case "bot_calm":
      return TETROBOT_IDS.some((bot) => stats.tetrobotProgression[bot].affinity >= 10) &&
        (
          hasBotMemory(stats, "apex", "trust_rebuild") ||
          hasBotMemory(stats, "rookie", "player_comeback") ||
          hasBotMemory(stats, "pulse", "player_progress")
        );
    case "rookie_exclusive_line":
      return (stats.counters.tetrobot_exclusive_reward_rookie ?? 0) > 0;
    case "pulse_exclusive_line":
      return (stats.counters.tetrobot_exclusive_reward_pulse ?? 0) > 0;
    case "apex_exclusive_line":
      return (stats.counters.tetrobot_exclusive_reward_apex ?? 0) > 0;
    case "three_paths_seen":
      return (
        (stats.counters.tetrobot_exclusive_reward_rookie ?? 0) > 0 &&
        (stats.counters.tetrobot_exclusive_reward_pulse ?? 0) > 0 &&
        (stats.counters.tetrobot_exclusive_reward_apex ?? 0) > 0
      );
    default:
      return Boolean(ctx.custom?.[key]);
  }
}
