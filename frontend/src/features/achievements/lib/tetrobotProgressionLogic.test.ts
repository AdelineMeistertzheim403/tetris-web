import { describe, expect, it, vi, afterEach } from "vitest";
import { syncTetrobotProgressionState, type TetrobotSyncStats } from "./tetrobotProgressionLogic";

afterEach(() => {
  vi.useRealTimers();
});

function createBaseStats(): TetrobotSyncStats {
  return {
    botApexWins: 0,
    counters: {},
    level10Modes: {
      CLASSIQUE: false,
      SPRINT: false,
      VERSUS: false,
      BRICKFALL_SOLO: false,
      ROGUELIKE: false,
      ROGUELIKE_VERSUS: false,
      PUZZLE: false,
      TETROMAZE: false,
      PIXEL_INVASION: false,
    },
    lowestWinrateMode: "ROGUELIKE" as const,
    modesVisited: {
      CLASSIQUE: true,
      SPRINT: false,
      VERSUS: false,
      BRICKFALL_SOLO: false,
      ROGUELIKE: false,
      ROGUELIKE_VERSUS: false,
      PUZZLE: false,
      TETROMAZE: false,
      PIXEL_INVASION: false,
    },
    playerBehaviorByMode: {
      CLASSIQUE: { sessions: 4, wins: 1, losses: 3, totalDurationMs: 0, lastPlayedAt: null },
      SPRINT: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
      VERSUS: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
      BRICKFALL_SOLO: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
      ROGUELIKE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
      ROGUELIKE_VERSUS: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
      PUZZLE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
      TETROMAZE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
      PIXEL_INVASION: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
      PIXEL_PROTOCOL: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
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
        holes: 1,
        top_out: 1,
        slow: 0,
        unsafe_stack: 1,
        damage_taken: 0,
        misread: 0,
        panic_stack: 0,
        slow_decision: 0,
        greedy_play: 0,
        mode_avoidance: 0,
        inconsistent_precision: 0,
      },
      SPRINT: {
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
      VERSUS: {
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
      BRICKFALL_SOLO: {
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
      ROGUELIKE: {
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
      ROGUELIKE_VERSUS: {
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
      PUZZLE: {
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
      TETROMAZE: {
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
      PIXEL_INVASION: {
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
      PIXEL_PROTOCOL: {
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
    playerMistakeLastSeenByMode: {
      CLASSIQUE: {
        holes: 1,
        top_out: 2,
        slow: null,
        unsafe_stack: 3,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
      SPRINT: {
        holes: null,
        top_out: null,
        slow: null,
        unsafe_stack: null,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
      VERSUS: {
        holes: null,
        top_out: null,
        slow: null,
        unsafe_stack: null,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
      BRICKFALL_SOLO: {
        holes: null,
        top_out: null,
        slow: null,
        unsafe_stack: null,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
      ROGUELIKE: {
        holes: null,
        top_out: null,
        slow: null,
        unsafe_stack: null,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
      ROGUELIKE_VERSUS: {
        holes: null,
        top_out: null,
        slow: null,
        unsafe_stack: null,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
      PUZZLE: {
        holes: null,
        top_out: null,
        slow: null,
        unsafe_stack: null,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
      TETROMAZE: {
        holes: null,
        top_out: null,
        slow: null,
        unsafe_stack: null,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
      PIXEL_INVASION: {
        holes: null,
        top_out: null,
        slow: null,
        unsafe_stack: null,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
      PIXEL_PROTOCOL: {
        holes: null,
        top_out: null,
        slow: null,
        unsafe_stack: null,
        damage_taken: null,
        misread: null,
        panic_stack: null,
        slow_decision: null,
        greedy_play: null,
        mode_avoidance: null,
        inconsistent_precision: null,
      },
    },
    scoredModes: {
      CLASSIQUE: true,
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
      rookie: { level: 1 as const, xp: 0, affinity: 0, mood: "neutral" as const, unlockedTraits: [] },
      pulse: { level: 1 as const, xp: 0, affinity: 0, mood: "neutral" as const, unlockedTraits: [] },
      apex: { level: 1 as const, xp: 0, affinity: -70, mood: "angry" as const, unlockedTraits: [] },
    },
    tetrobotXpLedger: {
      play_game: 0,
      win_game: 0,
      try_new_mode: 0,
      fail_repeated: 0,
      improve_stat: 0,
    },
    tetromazeEscapesTotal: 0,
    activeTetrobotChallenge: null,
    lastTetrobotLevelUp: null,
  };
}

describe("tetrobotProgressionLogic", () => {
  it("creates Apex trust-break memory and challenge when trust is refusing", () => {
    const result = syncTetrobotProgressionState(createBaseStats());

    expect(result.changed).toBe(true);
    expect(result.tetrobotMemories.apex.some((entry) => entry.type === "trust_break")).toBe(true);
    expect(result.activeTetrobotChallenge?.bot).toBe("apex");
    expect(result.activeTetrobotChallenge?.status).toBe("offered");
    expect(result.counterDeltas.apex_refusal_count).toBe(1);
  });

  it("auto-accepts an offered Apex challenge when the player starts the target mode", () => {
    const stats = createBaseStats();
    stats.activeTetrobotChallenge = {
      id: "apex-reconciliation-versus-offered",
      bot: "apex",
      kind: "apex_reconciliation",
      status: "offered",
      title: "Defi d'Apex",
      description: "Joue 3 sessions utiles sur VERSUS sans rage quit pour rouvrir completement le canal.",
      targetMode: "VERSUS",
      targetCount: 3,
      progress: 0,
      rewardAffinity: 24,
      rewardXp: 30,
      startSessions: 1,
      startRageQuitCount: 0,
      createdAt: 10,
      acceptedAt: null,
      resolvedAt: null,
    };
    stats.playerBehaviorByMode.VERSUS.sessions = 4;
    stats.playerBehaviorByMode.VERSUS.wins = 2;

    const result = syncTetrobotProgressionState(stats);

    expect(result.activeTetrobotChallenge?.status).toBe("completed");
    expect(result.activeTetrobotChallenge?.acceptedAt).not.toBeNull();
    expect(result.counterDeltas.apex_challenge_accepted_count).toBe(1);
    expect(result.counterDeltas.apex_trust_restored_count).toBe(1);
  });

  it("completes an accepted Apex reconciliation challenge on the tracked mode", () => {
    const stats = createBaseStats();
    stats.activeTetrobotChallenge = {
      id: "apex-reconciliation-versus",
      bot: "apex",
      kind: "apex_reconciliation",
      status: "active",
      title: "Defi d'Apex",
      description: "Joue 3 sessions utiles sur VERSUS sans rage quit pour rouvrir completement le canal.",
      targetMode: "VERSUS",
      targetCount: 3,
      progress: 0,
      rewardAffinity: 24,
      rewardXp: 30,
      startSessions: 1,
      startRageQuitCount: 0,
      createdAt: 10,
      acceptedAt: 20,
      resolvedAt: null,
    };
    stats.playerBehaviorByMode.VERSUS.sessions = 4;
    stats.playerBehaviorByMode.VERSUS.wins = 1;

    const result = syncTetrobotProgressionState(stats);

    expect(result.activeTetrobotChallenge?.targetMode).toBe("VERSUS");
    expect(result.activeTetrobotChallenge?.progress).toBe(3);
    expect(result.activeTetrobotChallenge?.status).toBe("completed");
    expect(result.tetrobotProgression.apex.affinity).toBe(-46);
    expect(result.counterDeltas.apex_trust_restored_count).toBe(1);
    expect(result.tetrobotMemories.apex.some((entry) => entry.type === "trust_rebuild")).toBe(
      true
    );
  });

  it("emits Pulse advice-success counter when improvement signals grow", () => {
    const stats = createBaseStats();
    stats.level10Modes.CLASSIQUE = true;
    stats.scoredModes.CLASSIQUE = true;
    stats.tetrobotXpLedger.improve_stat = 0;
    stats.tetrobotAffinityLedger.improve_stat = 0;

    const result = syncTetrobotProgressionState(stats);

    expect(result.counterDeltas.pulse_advice_success).toBe(1);
    expect(result.tetrobotMemories.pulse.some((entry) => entry.type === "player_progress")).toBe(
      true
    );
  });

  it("creates a persistent Apex focus on the weakest mode and penalizes avoidance", () => {
    const stats = createBaseStats();
    stats.playerBehaviorByMode.CLASSIQUE.sessions = 6;
    stats.playerBehaviorByMode.CLASSIQUE.losses = 5;
    stats.playerBehaviorByMode.SPRINT.sessions = 4;
    stats.playerBehaviorByMode.SPRINT.wins = 3;

    const first = syncTetrobotProgressionState(stats);
    expect(first.playerLongTermMemory.activeRecommendations.apex?.targetMode).toBe("CLASSIQUE");

    const avoided = {
      ...stats,
      playerLongTermMemory: first.playerLongTermMemory,
      tetrobotProgression: first.tetrobotProgression,
      tetrobotXpLedger: first.tetrobotXpLedger,
      tetrobotAffinityLedger: first.tetrobotAffinityLedger,
      tetrobotMemories: first.tetrobotMemories,
      counters: { ...stats.counters, ...first.counterDeltas },
      playerBehaviorByMode: {
        ...stats.playerBehaviorByMode,
        SPRINT: { ...stats.playerBehaviorByMode.SPRINT, sessions: 6, wins: 5 },
      },
    };

    const second = syncTetrobotProgressionState(avoided);
    expect(second.tetrobotProgression.apex.affinity).toBeLessThan(
      first.tetrobotProgression.apex.affinity
    );
    expect(second.tetrobotMemories.apex.some((entry) => entry.type === "player_avoidance")).toBe(
      true
    );
  });

  it("does not create an Apex challenge while Apex exclusive challenges are locked", () => {
    const stats = createBaseStats();
    stats.tetrobotProgression.apex.affinity = -70;
    stats.tetrobotXpLedger.play_game = 4;
    stats.tetrobotXpLedger.fail_repeated = 3;
    stats.tetrobotXpLedger.win_game = 1;
    stats.tetrobotXpLedger.try_new_mode = 1;
    stats.playerLongTermMemory.activeExclusiveAlignment = {
      favoredBot: "rookie",
      blockedBot: "apex",
      issuedAt: 10,
      expiresAt: Date.now() + 60_000,
      sessionsRemaining: 6,
      reason: "Rookie garde la main.",
      favoredLine: "Rookie tient la ligne.",
      blockedLine: "Apex reste a l'ecart.",
      lockedAdvice: ["punishing_challenges"],
      objectiveLabel: "Rookie veut 2 sessions propres sur CLASSIQUE",
      objectiveMode: "CLASSIQUE",
      objectiveStartSessions: 4,
      objectiveTargetSessions: 2,
      objectiveProgress: 0,
      rewardAffinity: 8,
      rewardXp: 12,
      rewardClaimed: false,
    };

    const result = syncTetrobotProgressionState(stats);

    expect(result.activeTetrobotChallenge).toBeNull();
  });

  it("grants the exclusive alignment reward once the objective is completed", () => {
    const stats = createBaseStats();
    stats.playerLongTermMemory.activeExclusiveAlignment = {
      favoredBot: "pulse",
      blockedBot: "rookie",
      issuedAt: 10,
      expiresAt: Date.now() + 60_000,
      sessionsRemaining: 5,
      reason: "Pulse garde la main.",
      favoredLine: "Pulse conduit la correction.",
      blockedLine: "Rookie reste en retrait.",
      lockedAdvice: ["comforting_routes"],
      objectiveLabel: "Pulse veut 2 sessions mesurees sur CLASSIQUE",
      objectiveMode: "CLASSIQUE",
      objectiveStartSessions: 4,
      objectiveTargetSessions: 2,
      objectiveProgress: 0,
      rewardAffinity: 10,
      rewardXp: 14,
      rewardClaimed: false,
    };
    stats.playerBehaviorByMode.CLASSIQUE.sessions = 6;
    stats.playerBehaviorByMode.CLASSIQUE.losses = 5;
    stats.tetrobotXpLedger.play_game = 4;
    stats.tetrobotXpLedger.fail_repeated = 3;
    stats.tetrobotXpLedger.win_game = 1;
    stats.tetrobotXpLedger.try_new_mode = 1;

    const result = syncTetrobotProgressionState(stats);

    expect(result.playerLongTermMemory.activeExclusiveAlignment?.objectiveProgress).toBe(2);
    expect(result.playerLongTermMemory.activeExclusiveAlignment?.rewardClaimed).toBe(true);
    expect(result.tetrobotProgression.pulse.affinity).toBeGreaterThan(
      stats.tetrobotProgression.pulse.affinity
    );
    expect(result.tetrobotProgression.pulse.xp).toBeGreaterThan(stats.tetrobotProgression.pulse.xp);
    expect(
      result.tetrobotMemories.pulse.some((entry) => entry.text.includes("ligne exclusive"))
    ).toBe(true);
    expect(
      result.tetrobotMemories.rookie.some((entry) => entry.text.includes("encaisse mal"))
    ).toBe(true);
  });

  it("penalizes ignored recommendations after enough real time passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T09:00:00Z"));

    const stats = createBaseStats();
    stats.playerBehaviorByMode.CLASSIQUE.sessions = 6;
    stats.playerBehaviorByMode.CLASSIQUE.losses = 5;
    stats.playerBehaviorByMode.SPRINT.sessions = 4;
    stats.playerBehaviorByMode.SPRINT.wins = 3;

    const first = syncTetrobotProgressionState(stats);
    expect(first.playerLongTermMemory.activeRecommendations.apex?.targetMode).toBe("CLASSIQUE");

    vi.setSystemTime(new Date("2026-03-26T00:00:00Z"));

    const delayed = {
      ...stats,
      playerLongTermMemory: first.playerLongTermMemory,
      tetrobotProgression: first.tetrobotProgression,
      tetrobotXpLedger: first.tetrobotXpLedger,
      tetrobotAffinityLedger: first.tetrobotAffinityLedger,
      tetrobotMemories: first.tetrobotMemories,
      counters: { ...stats.counters, ...first.counterDeltas },
    };

    const second = syncTetrobotProgressionState(delayed);
    expect(second.tetrobotProgression.apex.affinity).toBeLessThan(
      first.tetrobotProgression.apex.affinity
    );
    expect(second.playerLongTermMemory.activeRecommendations.apex?.ignoredMs).toBeGreaterThan(0);
  });

  it("derives per-mode profiles from recent runs", () => {
    const stats = createBaseStats();
    stats.playerLongTermMemory.recentRunsByMode.CLASSIQUE = [
      {
        at: 4,
        won: false,
        durationMs: 45_000,
        mistakeCount: 3,
        mistakes: ["panic_stack", "top_out", "unsafe_stack"],
        contextualMistakes: [
          { key: "panic_stack", phase: "late", pressure: "high", trigger: "tilt" },
          { key: "top_out", phase: "late", pressure: "high", trigger: "tilt" },
          { key: "unsafe_stack", phase: "late", pressure: "high", trigger: "tilt" },
        ],
        rageQuitEstimate: true,
        runContext: { boardMaxHeight: 18, comboPeak: 2, pressureScore: 92, stageIndex: 6 },
        timelineSamples: [
          { atMs: 12000, phase: "early", runContext: { pressureScore: 40, boardMaxHeight: 7 }, tags: [] },
          { atMs: 32000, phase: "mid", runContext: { pressureScore: 86, boardMaxHeight: 16 }, tags: ["pressure_spike"] },
        ],
      },
      {
        at: 3,
        won: false,
        durationMs: 70_000,
        mistakeCount: 2,
        mistakes: ["panic_stack", "slow_decision"],
        contextualMistakes: [
          { key: "panic_stack", phase: "late", pressure: "high", trigger: "collapse" },
          { key: "slow_decision", phase: "early", pressure: "high", trigger: "timeout" },
        ],
        rageQuitEstimate: false,
        runContext: { boardMaxHeight: 15, comboPeak: 3, pressureScore: 74, stageIndex: 7 },
        timelineSamples: [
          { atMs: 18000, phase: "early", runContext: { pressureScore: 35, comboPeak: 2 }, tags: ["execution_peak"] },
          { atMs: 52000, phase: "mid", runContext: { pressureScore: 77, boardMaxHeight: 15 }, tags: ["pressure_spike"] },
          { atMs: 65000, phase: "mid", runContext: { pressureScore: 48, boardMaxHeight: 11 }, tags: ["recovery"] },
        ],
      },
      {
        at: 2,
        won: true,
        durationMs: 110_000,
        mistakeCount: 1,
        mistakes: ["unsafe_stack"],
        contextualMistakes: [
          { key: "unsafe_stack", phase: "mid", pressure: "high", trigger: "collapse" },
        ],
        rageQuitEstimate: false,
        runContext: { boardMaxHeight: 11, comboPeak: 5, pressureScore: 58, stageIndex: 9 },
        timelineSamples: [
          { atMs: 35000, phase: "mid", runContext: { pressureScore: 55, comboPeak: 5 }, tags: ["execution_peak"] },
        ],
      },
      {
        at: 1,
        won: true,
        durationMs: 120_000,
        mistakeCount: 0,
        mistakes: [],
        contextualMistakes: [],
        rageQuitEstimate: false,
        runContext: { boardMaxHeight: 8, comboPeak: 6, pressureScore: 36, stageIndex: 10 },
        timelineSamples: [
          { atMs: 54000, phase: "late", runContext: { pressureScore: 28, comboPeak: 6, boardMaxHeight: 8 }, tags: ["recovery", "execution_peak"] },
        ],
      },
    ];

    const result = syncTetrobotProgressionState(stats);
    const profile = result.playerLongTermMemory.modeProfiles.CLASSIQUE;

    expect(profile.recentRuns).toBe(4);
    expect(profile.pressureIndex).toBeGreaterThan(0);
    expect(profile.averagePressureScore).toBeGreaterThan(0);
    expect(profile.averageBoardHeight).toBeGreaterThan(0);
    expect(profile.executionPeak).toBeGreaterThan(0);
    expect(profile.volatilityIndex).toBeGreaterThan(0);
    expect(profile.recoveryScore).toBeGreaterThan(0);
    expect(profile.dominantMistakes).toContain("panic_stack");
    expect(profile.improvementTrend).toBe("down");
    expect(result.playerLongTermMemory.contextualMistakePatterns.CLASSIQUE[0]?.key).toBe(
      "panic_stack"
    );
  });

  it("creates rivalry memories when tetrobots disagree on the player plan", () => {
    const stats = createBaseStats();
    stats.playerBehaviorByMode.CLASSIQUE = {
      sessions: 2,
      wins: 0,
      losses: 2,
      totalDurationMs: 160_000,
      lastPlayedAt: 10,
    };
    stats.playerBehaviorByMode.SPRINT = {
      sessions: 10,
      wins: 8,
      losses: 2,
      totalDurationMs: 320_000,
      lastPlayedAt: 11,
    };
    stats.playerBehaviorByMode.VERSUS = {
      sessions: 12,
      wins: 9,
      losses: 3,
      totalDurationMs: 480_000,
      lastPlayedAt: 12,
    };
    stats.modesVisited.SPRINT = true;
    stats.modesVisited.VERSUS = true;
    stats.playerMistakesByMode.CLASSIQUE.top_out = 4;
    stats.playerMistakesByMode.CLASSIQUE.unsafe_stack = 4;
    stats.playerMistakesByMode.CLASSIQUE.slow = 2;
    stats.playerLongTermMemory.recentRunsByMode.CLASSIQUE = [
      {
        at: 3,
        won: false,
        durationMs: 60_000,
        mistakeCount: 3,
        mistakes: ["top_out", "unsafe_stack", "panic_stack"],
        contextualMistakes: [
          { key: "top_out", phase: "late", pressure: "high", trigger: "tilt" },
          { key: "unsafe_stack", phase: "late", pressure: "high", trigger: "collapse" },
          { key: "panic_stack", phase: "late", pressure: "high", trigger: "tilt" },
        ],
        rageQuitEstimate: true,
        runContext: { boardMaxHeight: 18, pressureScore: 94, comboPeak: 2, stageIndex: 6 },
        timelineSamples: [
          { atMs: 15000, phase: "mid", runContext: { pressureScore: 82, boardMaxHeight: 15 }, tags: ["pressure_spike"] },
        ],
      },
      {
        at: 2,
        won: false,
        durationMs: 75_000,
        mistakeCount: 2,
        mistakes: ["top_out", "unsafe_stack"],
        contextualMistakes: [
          { key: "top_out", phase: "late", pressure: "high", trigger: "collapse" },
          { key: "unsafe_stack", phase: "late", pressure: "high", trigger: "collapse" },
        ],
        rageQuitEstimate: false,
        runContext: { boardMaxHeight: 17, pressureScore: 88, comboPeak: 2, stageIndex: 6 },
        timelineSamples: [],
      },
    ];

    const result = syncTetrobotProgressionState(stats);

    expect(
      result.tetrobotMemories.rookie.some((entry) =>
        entry.text.includes("Ne l'ecoute pas")
      )
    ).toBe(true);
    expect(
      result.tetrobotMemories.apex.some((entry) =>
        entry.text.includes("Ignore Rookie")
      )
    ).toBe(true);
  });

  it("resolves a tetrobot conflict from the mode the player actually chooses", () => {
    const stats = createBaseStats();
    stats.playerBehaviorByMode.CLASSIQUE = {
      sessions: 2,
      wins: 0,
      losses: 2,
      totalDurationMs: 160_000,
      lastPlayedAt: 10,
    };
    stats.playerBehaviorByMode.SPRINT = {
      sessions: 10,
      wins: 8,
      losses: 2,
      totalDurationMs: 320_000,
      lastPlayedAt: 11,
    };
    stats.playerBehaviorByMode.VERSUS = {
      sessions: 12,
      wins: 9,
      losses: 3,
      totalDurationMs: 480_000,
      lastPlayedAt: 12,
    };
    stats.modesVisited.SPRINT = true;
    stats.modesVisited.VERSUS = true;
    stats.playerMistakesByMode.CLASSIQUE.top_out = 4;
    stats.playerMistakesByMode.CLASSIQUE.unsafe_stack = 4;
    stats.playerLongTermMemory.recentRunsByMode.CLASSIQUE = [
      {
        at: 3,
        won: false,
        durationMs: 60_000,
        mistakeCount: 3,
        mistakes: ["top_out", "unsafe_stack", "panic_stack"],
        contextualMistakes: [
          { key: "top_out", phase: "late", pressure: "high", trigger: "tilt" },
          { key: "unsafe_stack", phase: "late", pressure: "high", trigger: "collapse" },
          { key: "panic_stack", phase: "late", pressure: "high", trigger: "tilt" },
        ],
        rageQuitEstimate: true,
        runContext: { boardMaxHeight: 18, pressureScore: 94, comboPeak: 2, stageIndex: 6 },
        timelineSamples: [],
      },
    ];

    const first = syncTetrobotProgressionState(stats);
    expect(first.playerLongTermMemory.activeConflict?.resolvedAt).toBeNull();

    const chosen = {
      ...stats,
      playerLongTermMemory: first.playerLongTermMemory,
      tetrobotProgression: first.tetrobotProgression,
      tetrobotXpLedger: first.tetrobotXpLedger,
      tetrobotAffinityLedger: first.tetrobotAffinityLedger,
      tetrobotMemories: first.tetrobotMemories,
      playerBehaviorByMode: {
        ...stats.playerBehaviorByMode,
        CLASSIQUE: {
          ...stats.playerBehaviorByMode.CLASSIQUE,
          sessions: stats.playerBehaviorByMode.CLASSIQUE.sessions + 1,
          losses: stats.playerBehaviorByMode.CLASSIQUE.losses + 1,
        },
      },
    };

    const second = syncTetrobotProgressionState(chosen);
    expect(second.playerLongTermMemory.activeConflict?.chosenBot).toBe("apex");
    expect(second.playerLongTermMemory.activeConflict?.resolvedAt).not.toBeNull();
    expect(second.playerLongTermMemory.activeExclusiveAlignment?.favoredBot).toBe("apex");
    expect(second.playerLongTermMemory.activeExclusiveAlignment?.blockedBot).toBe("rookie");
    expect(second.playerLongTermMemory.activeExclusiveAlignment?.lockedAdvice).toContain(
      "comforting_routes"
    );
    expect(second.playerLongTermMemory.activeExclusiveAlignment?.favoredLine).toContain(
      "Apex prend le canal"
    );
    expect(second.playerLongTermMemory.lingeringResentment.rookie).toBe(6);
    expect(second.tetrobotProgression.rookie.affinity).toBeLessThanOrEqual(first.tetrobotProgression.rookie.affinity);
    expect(
      second.tetrobotMemories.apex.some((entry) =>
        entry.text.includes("Tu as suivi apex")
      )
    ).toBe(true);
    expect(
      second.tetrobotMemories.rookie.some((entry) =>
        entry.text.includes("n'oublie pas")
      )
    ).toBe(true);
  });
});
