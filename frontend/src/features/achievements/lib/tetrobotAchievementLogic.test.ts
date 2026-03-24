import { describe, expect, it } from "vitest";
import {
  getApexTrustState,
  getDerivedCounterValue,
  getDerivedCustomAchievementValue,
  type AchievementDerivedStats,
} from "./tetrobotAchievementLogic";

function createStats(): AchievementDerivedStats {
  return {
    counters: {},
    hardDropCount: 0,
    lastPlayedMode: null,
    level10Modes: {
      CLASSIQUE: false,
      SPRINT: false,
      VERSUS: false,
      BRICKFALL_SOLO: false,
      ROGUELIKE: false,
      ROGUELIKE_VERSUS: false,
      PUZZLE: false,
      TETROMAZE: false,
    },
    lowestWinrateMode: null,
    modesVisited: {
      CLASSIQUE: false,
      SPRINT: false,
      VERSUS: false,
      BRICKFALL_SOLO: false,
      ROGUELIKE: false,
      ROGUELIKE_VERSUS: false,
      PUZZLE: false,
      TETROMAZE: false,
    },
    noHoldRuns: 0,
    playerBehaviorByMode: {
      CLASSIQUE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0 },
      SPRINT: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0 },
      VERSUS: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0 },
      BRICKFALL_SOLO: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0 },
      ROGUELIKE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0 },
      ROGUELIKE_VERSUS: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0 },
      PUZZLE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0 },
      TETROMAZE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0 },
      PIXEL_PROTOCOL: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0 },
    },
    playerLongTermMemory: {
      recurringMistakes: [],
      avoidedModes: {},
      strongestModes: {},
      weakestModes: {},
      rageQuitCount: 0,
      comebackCount: 0,
      consistencyScore: 0,
      courageScore: 0,
      disciplineScore: 0,
      regularityScore: 0,
      strategyScore: 0,
      weakestModeFocus: null,
      strongestModeFocus: null,
      lingeringResentment: {
        rookie: 0,
        pulse: 0,
        apex: 0,
      },
      activeRecommendations: {
        rookie: null,
        pulse: null,
        apex: null,
      },
      activeConflict: null,
      activeExclusiveAlignment: null,
      recentRunsByMode: {
        CLASSIQUE: [],
        SPRINT: [],
        VERSUS: [],
        BRICKFALL_SOLO: [],
        ROGUELIKE: [],
        ROGUELIKE_VERSUS: [],
        PUZZLE: [],
        TETROMAZE: [],
        PIXEL_INVASION: [],
        PIXEL_PROTOCOL: [],
      },
      modeProfiles: {
        CLASSIQUE: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
        SPRINT: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
        VERSUS: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
        BRICKFALL_SOLO: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
        ROGUELIKE: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
        ROGUELIKE_VERSUS: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
        PUZZLE: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
        TETROMAZE: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
        PIXEL_INVASION: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
        PIXEL_PROTOCOL: { recentRuns: 0, recentWinRate: 0, recentMistakeRate: 0, averageDurationMs: 0, resilienceScore: 0, pressureIndex: 0, averagePressureScore: 0, averageBoardHeight: 0, resourceStability: 0, executionPeak: 0, averageStageIndex: 0, volatilityIndex: 0, recoveryScore: 0, improvementTrend: "stable", dominantMistakes: [] },
      },
      contextualMistakePatterns: {
        CLASSIQUE: [],
        SPRINT: [],
        VERSUS: [],
        BRICKFALL_SOLO: [],
        ROGUELIKE: [],
        ROGUELIKE_VERSUS: [],
        PUZZLE: [],
        TETROMAZE: [],
        PIXEL_INVASION: [],
        PIXEL_PROTOCOL: [],
      },
    },
    playerMistakesByMode: {
      CLASSIQUE: {
        holes: 0,
        top_out: 0,
        slow: 0,
        unsafe_stack: 0,
        damage_taken: 0,
        misread: 0,
        panic_stack: 0,
        slow_decision: 0,
        greedy_play: 0,
        mode_avoidance: 0,
        inconsistent_precision: 0,
      },
    },
    scoredModes: {
      CLASSIQUE: false,
      SPRINT: false,
      VERSUS: false,
      BRICKFALL_SOLO: false,
      ROGUELIKE: false,
      ROGUELIKE_VERSUS: false,
      PUZZLE: false,
      TETROMAZE: false,
    },
    tetrobotAffinityLedger: {
      play_regularly: 0,
      rage_quit: 0,
      improve_stat: 0,
      repeat_mistake: 0,
      challenge_yourself: 0,
      avoid_weakness: 0,
    },
    tetrobotMemories: {
      rookie: [],
      pulse: [],
      apex: [],
    },
    tetrobotProgression: {
      rookie: { level: 1, xp: 0, affinity: 0, mood: "neutral" },
      pulse: { level: 1, xp: 0, affinity: 0, mood: "neutral" },
      apex: { level: 1, xp: 0, affinity: 0, mood: "neutral" },
    },
  };
}

describe("tetrobotAchievementLogic", () => {
  it("detects Apex refusal and trust restore from memory", () => {
    const stats = createStats();
    stats.tetrobotMemories.apex = [
      {
        id: "break",
        bot: "apex",
        type: "trust_break",
        text: "Apex refuse.",
        importance: 5,
        createdAt: 1,
      },
      {
        id: "rebuild",
        bot: "apex",
        type: "trust_rebuild",
        text: "Apex revient.",
        importance: 5,
        createdAt: 2,
      },
    ];

    expect(getDerivedCustomAchievementValue(stats, "apex_first_refusal", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "apex_trust_restored", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "success_after_apex_refusal", {})).toBe(true);
  });

  it("uses affinity ledger as fallback for rookie tips followed", () => {
    const stats = createStats();
    stats.tetrobotAffinityLedger.play_regularly = 3;

    expect(getDerivedCounterValue(stats, "rookie_tips_followed")).toBe(3);
  });

  it("prefers explicit rookie counter when it is higher than fallback", () => {
    const stats = createStats();
    stats.counters.rookie_tips_followed = 5;
    stats.tetrobotAffinityLedger.play_regularly = 3;

    expect(getDerivedCounterValue(stats, "rookie_tips_followed")).toBe(5);
  });

  it("unlocks Pulse achievement from explicit advice-success counter", () => {
    const stats = createStats();
    stats.counters.pulse_advice_success = 1;

    expect(getDerivedCustomAchievementValue(stats, "improved_after_pulse", {})).toBe(true);
  });

  it("unlocks Apex refusal and restore from explicit counters", () => {
    const stats = createStats();
    stats.counters.apex_refusal_count = 1;
    stats.counters.apex_trust_restored_count = 1;

    expect(getDerivedCustomAchievementValue(stats, "apex_first_refusal", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "apex_trust_restored", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "success_after_apex_refusal", {})).toBe(true);
  });

  it("detects all bots respect and max bot level", () => {
    const stats = createStats();
    stats.tetrobotProgression.rookie = {
      level: 5,
      xp: 620,
      affinity: 55,
      mood: "respect",
      lastTip: "Continue.",
    };
    stats.tetrobotProgression.pulse = {
      level: 3,
      xp: 220,
      affinity: 60,
      mood: "respect",
      lastTip: "Mesure ta progression.",
    };
    stats.tetrobotProgression.apex = {
      level: 4,
      xp: 410,
      affinity: 80,
      mood: "respect",
      lastTip: "Affronte ton point faible.",
    };

    expect(getDerivedCustomAchievementValue(stats, "all_bots_respect", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "bot_max_level", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "max_bot_level", {})).toBe(true);
  });

  it("unlocks adaptive bot memory and style-detection achievements from derived stats", () => {
    const stats = createStats();
    stats.tetrobotProgression.rookie.lastTip = "Je t'ai observe.";
    stats.tetrobotMemories.pulse = [
      {
        id: "memory-1",
        bot: "pulse",
        type: "player_progress",
        text: "Pulse note ta progression.",
        importance: 3,
        createdAt: 10,
      },
    ];
    stats.playerLongTermMemory.weakestModes.VERSUS = 2;

    expect(getDerivedCustomAchievementValue(stats, "met_all_bots", {})).toBe(false);
    expect(getDerivedCustomAchievementValue(stats, "bot_memory_dialogue", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "bot_detected_style", {})).toBe(true);

    stats.tetrobotProgression.pulse.lastTip = "Je connais ton rythme.";
    stats.tetrobotProgression.apex.lastTip = "Je vois ton point faible.";

    expect(getDerivedCustomAchievementValue(stats, "met_all_bots", {})).toBe(true);
  });

  it("derives exclusive tetrobot achievements from exclusive reward counters", () => {
    const stats = createStats();
    stats.counters.tetrobot_exclusive_reward_rookie = 1;
    stats.counters.tetrobot_exclusive_reward_pulse = 1;
    stats.counters.tetrobot_exclusive_reward_apex = 1;

    expect(getDerivedCustomAchievementValue(stats, "rookie_exclusive_line", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "pulse_exclusive_line", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "apex_exclusive_line", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "three_paths_seen", {})).toBe(true);
  });

  it("detects weak mode play and weak mode win", () => {
    const stats = createStats();
    stats.lowestWinrateMode = "PUZZLE";
    stats.lastPlayedMode = "PUZZLE";
    stats.playerBehaviorByMode.PUZZLE = { sessions: 4, wins: 1, losses: 3 };

    expect(getDerivedCustomAchievementValue(stats, "played_weak_mode", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "win_weak_mode", {})).toBe(true);
  });

  it("computes Apex trust state thresholds", () => {
    const stats = createStats();

    expect(getApexTrustState(stats.playerLongTermMemory, -70)).toBe("refusing");

    stats.playerLongTermMemory.avoidedModes.ROGUELIKE = 5;
    expect(getApexTrustState(stats.playerLongTermMemory, 0)).toBe("cold");

    stats.playerLongTermMemory.avoidedModes.ROGUELIKE = 0;
    stats.playerLongTermMemory.rageQuitCount = 3;
    expect(getApexTrustState(stats.playerLongTermMemory, 0)).toBe("warning");
  });

  it("detects tilt and critical win from explicit counters", () => {
    const stats = createStats();
    stats.counters.rage_quit_estimate = 3;
    stats.counters.comeback_estimate = 1;
    stats.playerBehaviorByMode.CLASSIQUE = { sessions: 5, wins: 2, losses: 3 };

    expect(getDerivedCustomAchievementValue(stats, "tilt_detected", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "critical_win", {})).toBe(true);
  });

  it("derives transversal playtime achievements from aggregated behavior duration", () => {
    const stats = createStats();
    stats.playerBehaviorByMode.PUZZLE.totalDurationMs = 120 * 60 * 1000;
    stats.playerBehaviorByMode.BRICKFALL_SOLO.totalDurationMs = 190 * 60 * 1000;

    expect(getDerivedCustomAchievementValue(stats, "playtime_60m", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "playtime_300m", {})).toBe(true);
  });

  it("derives transversal cumulative achievements from global stats", () => {
    const stats = createStats();
    stats.noHoldRuns = 10;
    stats.hardDropCount = 50;
    stats.level10Modes.CLASSIQUE = true;
    stats.level10Modes.VERSUS = true;
    stats.level10Modes.ROGUELIKE = true;
    stats.modesVisited = Object.fromEntries(
      Object.keys(stats.modesVisited).map((mode) => [mode, true])
    ) as typeof stats.modesVisited;
    stats.scoredModes = Object.fromEntries(
      Object.keys(stats.scoredModes).map((mode) => [mode, true])
    ) as typeof stats.scoredModes;

    expect(getDerivedCustomAchievementValue(stats, "no_hold_runs_10", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "harddrop_50", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "level_10_three_modes", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "modes_visited_all", {})).toBe(true);
    expect(getDerivedCustomAchievementValue(stats, "scored_all_modes", {})).toBe(true);
  });
});
