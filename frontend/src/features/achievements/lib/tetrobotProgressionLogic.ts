import { getApexTrustState } from "./tetrobotAchievementLogic";
import type {
  BotLevel,
  BotMemoryEntry,
  BotMemoryType,
  BotMood,
  BotState,
  BotTrait,
  ContextualMistakePattern,
  MistakeLastSeenStats,
  MistakePhase,
  MistakePressure,
  MistakeMemory,
  MistakeStats,
  MistakeTrigger,
  ModeBehaviorStats,
  PlayerBehaviorMode,
  PlayerLongTermMemory,
  PlayerModeProfile,
  PlayerMistakeKey,
  PlayerRunSnapshot,
  PlayerRunTimelineSample,
  TetrobotAffinityEvent,
  TetrobotAffinityLedger,
  TetrobotChallengeState,
  TetrobotConflict,
  TetrobotExclusiveAlignment,
  TetrobotId,
  TetrobotLevelUp,
  TetrobotRecommendation,
  TetrobotXpEvent,
  TetrobotXpLedger,
} from "../types/tetrobots";

export type TetrobotSyncStats = {
  botApexWins: number;
  counters: Record<string, number>;
  level10Modes: Record<string, boolean>;
  lowestWinrateMode: PlayerBehaviorMode | null;
  modesVisited: Record<string, boolean>;
  playerBehaviorByMode: Record<PlayerBehaviorMode, ModeBehaviorStats>;
  playerLongTermMemory: PlayerLongTermMemory;
  playerMistakesByMode: Record<PlayerBehaviorMode, MistakeStats>;
  playerMistakeLastSeenByMode: Record<PlayerBehaviorMode, MistakeLastSeenStats>;
  scoredModes: Record<string, boolean>;
  tetrobotAffinityLedger: TetrobotAffinityLedger;
  tetrobotMemories: Record<TetrobotId, BotMemoryEntry[]>;
  tetrobotProgression: Record<TetrobotId, BotState>;
  tetrobotXpLedger: TetrobotXpLedger;
  tetromazeEscapesTotal: number;
  versusMatches: number;
  roguelikeVersusMatches: number;
  activeTetrobotChallenge: TetrobotChallengeState | null;
  lastTetrobotLevelUp: TetrobotLevelUp;
};

export type TetrobotSyncResult = {
  changed: boolean;
  counterDeltas: Record<string, number>;
  playerBehaviorByMode: Record<PlayerBehaviorMode, ModeBehaviorStats>;
  tetrobotProgression: Record<TetrobotId, BotState>;
  tetrobotXpLedger: TetrobotXpLedger;
  tetrobotAffinityLedger: TetrobotAffinityLedger;
  playerLongTermMemory: PlayerLongTermMemory;
  tetrobotMemories: Record<TetrobotId, BotMemoryEntry[]>;
  lastTetrobotLevelUp: TetrobotLevelUp;
  activeTetrobotChallenge: TetrobotChallengeState | null;
};

const PLAYER_BEHAVIOR_MODES: PlayerBehaviorMode[] = [
  "CLASSIQUE",
  "SPRINT",
  "VERSUS",
  "BRICKFALL_SOLO",
  "ROGUELIKE",
  "ROGUELIKE_VERSUS",
  "PUZZLE",
  "TETROMAZE",
  "PIXEL_INVASION",
  "PIXEL_PROTOCOL",
];

const EMPTY_MISTAKE_STATS: MistakeStats = {
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
};

const TETROBOT_TRAITS: Record<TetrobotId, Array<{ level: BotLevel; unlock: BotTrait }>> = {
  rookie: [
    { level: 2, unlock: "contextualTips" },
    { level: 4, unlock: "errorDetection" },
  ],
  pulse: [
    { level: 3, unlock: "performanceAnalysis" },
    { level: 5, unlock: "deepOptimization" },
  ],
  apex: [
    { level: 2, unlock: "provocation" },
    { level: 5, unlock: "hardcoreCoach" },
  ],
};

const TETROBOT_LEVEL_UP_MESSAGES: Record<TetrobotId, Partial<Record<BotLevel, string>>> = {
  rookie: {
    2: "Rookie evolue niveau 2: il structure enfin ses conseils.",
    3: "Rookie evolue niveau 3: il commence a comprendre tes erreurs.",
    4: "Rookie evolue niveau 4: detection d'erreurs debloquee.",
    5: "Rookie evolue niveau 5: coach methodique en ligne.",
  },
  pulse: {
    2: "Pulse niveau 2: analyse simple stabilisee.",
    3: "Pulse niveau 3: optimisation des performances debloquee.",
    4: "Pulse niveau 4: nouvelles strategies actives.",
    5: "Pulse niveau 5: analyse avancee debloquee.",
  },
  apex: {
    2: "Apex niveau 2: il commence a te provoquer serieusement.",
    3: "Apex niveau 3: il cible maintenant tes evasions.",
    4: "Apex niveau 4: il ne va plus te laisser tricher.",
    5: "Apex niveau 5: mentor hardcore active.",
  },
};

const BOT_IGNORE_THRESHOLDS: Record<TetrobotId, number> = {
  rookie: 5,
  pulse: 4,
  apex: 2,
};

const BOT_IGNORE_TIME_THRESHOLDS_MS: Record<TetrobotId, number> = {
  rookie: 5 * 24 * 60 * 60 * 1000,
  pulse: 3 * 24 * 60 * 60 * 1000,
  apex: 36 * 60 * 60 * 1000,
};

const BOT_IGNORE_AFFINITY_PENALTIES: Record<TetrobotId, number> = {
  rookie: -4,
  pulse: -6,
  apex: -12,
};

const RECOMMENDATION_REEVALUATION_INTERVAL_MS = 60_000;

export const BOT_LEVEL_XP_BANDS: Array<{
  level: BotLevel;
  minXp: number;
  maxXpExclusive: number | null;
}> = [
  { level: 1, minXp: 0, maxXpExclusive: 50 },
  { level: 2, minXp: 50, maxXpExclusive: 150 },
  { level: 3, minXp: 150, maxXpExclusive: 300 },
  { level: 4, minXp: 300, maxXpExclusive: 600 },
  { level: 5, minXp: 600, maxXpExclusive: null },
];

export const MOOD_AFFINITY_BANDS: Array<{
  mood: BotMood;
  minAffinity: number;
  maxAffinityExclusive: number | null;
}> = [
  { mood: "angry", minAffinity: -100, maxAffinityExclusive: -50 },
  { mood: "neutral", minAffinity: -50, maxAffinityExclusive: 10 },
  { mood: "friendly", minAffinity: 10, maxAffinityExclusive: 50 },
  { mood: "respect", minAffinity: 50, maxAffinityExclusive: null },
];

function createApexChallenge(
  mode: PlayerBehaviorMode,
  modeSessions: number,
  rageQuitCount: number,
  currentAffinity: number
): TetrobotChallengeState {
  const now = Date.now();
  const rewardAffinity = getApexReconciliationReward(currentAffinity);
  return {
    id: `apex-reconciliation-${mode}-${now}`,
    bot: "apex",
    kind: "apex_reconciliation",
    status: "offered",
    title: "Defi d'Apex",
    description: `Joue 3 sessions utiles sur ${mode} sans rage quit pour rouvrir completement le canal.`,
    targetMode: mode,
    targetCount: 3,
    progress: 0,
    rewardAffinity,
    rewardXp: 30,
    startSessions: modeSessions,
    startRageQuitCount: rageQuitCount,
    createdAt: now,
    acceptedAt: null,
    resolvedAt: null,
  };
}

function getApexReconciliationReward(currentAffinity: number) {
  return Math.max(24, -59 - currentAffinity);
}

function getLevelFromXP(xp: number): BotLevel {
  if (xp < 50) return 1;
  if (xp < 150) return 2;
  if (xp < 300) return 3;
  if (xp < 600) return 4;
  return 5;
}

function getUnlockedTraits(bot: TetrobotId, level: BotLevel): BotTrait[] {
  return TETROBOT_TRAITS[bot]
    .filter((trait) => trait.level <= level)
    .map((trait) => trait.unlock);
}

function computeBotXP(event: TetrobotXpEvent) {
  switch (event) {
    case "play_game":
      return 5;
    case "win_game":
      return 10;
    case "try_new_mode":
      return 15;
    case "fail_repeated":
      return 8;
    case "improve_stat":
      return 20;
    default:
      return 3;
  }
}

function clampAffinity(value: number) {
  return Math.max(-100, Math.min(100, value));
}

export function getMood(affinity: number): BotMood {
  if (affinity < -50) return "angry";
  if (affinity < 10) return "neutral";
  if (affinity < 50) return "friendly";
  return "respect";
}

function updateAffinity(bot: TetrobotId, event: TetrobotAffinityEvent) {
  switch (bot) {
    case "rookie":
      if (event === "play_regularly") return 3;
      if (event === "rage_quit") return -12;
      break;
    case "pulse":
      if (event === "improve_stat") return 5;
      if (event === "repeat_mistake") return -8;
      break;
    case "apex":
      if (event === "challenge_yourself") return 6;
      if (event === "avoid_weakness") return -18;
      break;
  }
  return 0;
}

function getModeWinRate(stats: ModeBehaviorStats) {
  return stats.sessions > 0 ? stats.wins / stats.sessions : 0;
}

function getModeMistakeCount(stats: MistakeStats) {
  return Object.values(stats).reduce((sum, value) => sum + value, 0);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function createEmptyModeProfile(): PlayerModeProfile {
  return {
    recentRuns: 0,
    recentWinRate: 0,
    recentMistakeRate: 0,
    averageDurationMs: 0,
    resilienceScore: 0,
    pressureIndex: 0,
    averagePressureScore: 0,
    averageBoardHeight: 0,
    resourceStability: 0,
    executionPeak: 0,
    averageStageIndex: 0,
    volatilityIndex: 0,
    recoveryScore: 0,
    improvementTrend: "stable",
    dominantMistakes: [],
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function inferPressureScore(run: PlayerRunSnapshot) {
  if (typeof run.runContext?.pressureScore === "number") {
    return clampScore(run.runContext.pressureScore);
  }

  const contextualPressure = average(
    run.contextualMistakes.map((entry) =>
      entry.pressure === "high" ? 90 : entry.pressure === "medium" ? 60 : 25
    )
  );
  const mistakePressure = Math.min(35, run.mistakeCount * 12);
  const rageQuitPressure = run.rageQuitEstimate ? 20 : 0;
  return clampScore(contextualPressure + mistakePressure + rageQuitPressure);
}

function inferTimelinePressureScore(sample: PlayerRunTimelineSample) {
  if (typeof sample.runContext.pressureScore === "number") {
    return clampScore(sample.runContext.pressureScore);
  }
  return 0;
}

function inferRecoveryScore(samples: PlayerRunTimelineSample[]) {
  if (!samples.length) return 0;
  let recoveries = 0;
  let executionResets = 0;
  let pressureSpikeSeen = false;
  let previousPressure = inferTimelinePressureScore(samples[0]);

  samples.forEach((sample) => {
    const pressure = inferTimelinePressureScore(sample);
    if (sample.tags.includes("pressure_spike")) pressureSpikeSeen = true;
    if (
      sample.tags.includes("recovery") ||
      (pressureSpikeSeen && pressure <= previousPressure - 18)
    ) {
      recoveries += 1;
      pressureSpikeSeen = false;
    }
    if (sample.tags.includes("execution_peak")) executionResets += 1;
    previousPressure = pressure;
  });

  return clampScore(recoveries * 35 + executionResets * 12);
}

function inferVolatilityIndex(samples: PlayerRunTimelineSample[]) {
  if (samples.length < 2) {
    return clampScore(
      samples.some((sample) => sample.tags.includes("pressure_spike")) ? 35 : 0
    );
  }

  const deltas: number[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    deltas.push(
      Math.abs(
        inferTimelinePressureScore(samples[index]) -
          inferTimelinePressureScore(samples[index - 1])
      )
    );
  }
  const taggedSpikes = samples.filter((sample) => sample.tags.includes("pressure_spike")).length;
  const taggedLosses = samples.filter((sample) => sample.tags.includes("resource_loss")).length;
  return clampScore(average(deltas) * 1.4 + taggedSpikes * 18 + taggedLosses * 12);
}

function getTrendFromRuns(runs: PlayerRunSnapshot[]) {
  if (runs.length < 4) return "stable" as const;
  const recentHalf = runs.slice(0, Math.ceil(runs.length / 2));
  const olderHalf = runs.slice(Math.ceil(runs.length / 2));
  const recentScore =
    recentHalf.reduce((sum, run) => sum + (run.won ? 1 : 0) - run.mistakeCount * 0.15, 0) /
    Math.max(1, recentHalf.length);
  const olderScore =
    olderHalf.reduce((sum, run) => sum + (run.won ? 1 : 0) - run.mistakeCount * 0.15, 0) /
    Math.max(1, olderHalf.length);
  if (recentScore - olderScore > 0.2) return "up" as const;
  if (olderScore - recentScore > 0.2) return "down" as const;
  return "stable" as const;
}

function buildModeProfile(runs: PlayerRunSnapshot[]): PlayerModeProfile {
  if (!runs.length) return createEmptyModeProfile();

  const winRate = runs.filter((run) => run.won).length / runs.length;
  const averageDurationMs = Math.round(
    runs.reduce((sum, run) => sum + run.durationMs, 0) / Math.max(1, runs.length)
  );
  const recentMistakeRate =
    runs.reduce((sum, run) => sum + run.mistakeCount, 0) / Math.max(1, runs.length);
  const pressureRuns = runs.filter(
    (run) => run.mistakes.includes("panic_stack") || run.mistakes.includes("slow_decision")
  ).length;
  const rageQuitRuns = runs.filter((run) => run.rageQuitEstimate).length;
  const resilienceWins = runs.filter((run, index) => index > 0 && run.won && !runs[index - 1]?.won).length;
  const pressureScores = runs.map(inferPressureScore);
  const boardHeights = runs
    .map((run) => run.runContext?.boardMaxHeight)
    .filter((value): value is number => typeof value === "number");
  const comboPeaks = runs
    .map((run) => run.runContext?.comboPeak)
    .filter((value): value is number => typeof value === "number");
  const lifeSamples = runs
    .map((run) => run.runContext?.livesRemaining)
    .filter((value): value is number => typeof value === "number");
  const stageSamples = runs
    .map((run) => run.runContext?.stageIndex)
    .filter((value): value is number => typeof value === "number");
  const timelineSamples = runs.flatMap((run) => run.timelineSamples ?? []);
  const mistakeCounts = new Map<PlayerMistakeKey, number>();
  runs.forEach((run) =>
    run.mistakes.forEach((mistake) => {
      mistakeCounts.set(mistake, (mistakeCounts.get(mistake) ?? 0) + 1);
    })
  );
  const dominantMistakes = [...mistakeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key);
  const averagePressureScore = clampScore(average(pressureScores));
  const averageBoardHeight = round1(average(boardHeights));
  const averageStageIndex = round1(average(stageSamples));
  const averageLives = average(lifeSamples);
  const resourceStability = clampScore(
    (lifeSamples.length > 0 ? (averageLives / 3) * 100 : winRate * 70 + 15) -
      rageQuitRuns * 12 -
      (averagePressureScore > 75 ? 8 : 0)
  );
  const executionPeak = clampScore(
    average(comboPeaks) * 12 + winRate * 30 + Math.max(0, 20 - recentMistakeRate * 5)
  );
  const boardPressureWeight = boardHeights.length > 0 ? (average(boardHeights) / 20) * 100 : 0;
  const volatilityIndex = inferVolatilityIndex(timelineSamples);
  const recoveryScore = inferRecoveryScore(timelineSamples);

  return {
    recentRuns: runs.length,
    recentWinRate: clampScore(winRate * 100),
    recentMistakeRate: Math.round(recentMistakeRate * 10) / 10,
    averageDurationMs,
    resilienceScore: clampScore(
      winRate * 45 + resilienceWins * 12 - rageQuitRuns * 18 + Math.max(0, 25 - recentMistakeRate * 5)
    ),
    pressureIndex: clampScore(
      averagePressureScore * 0.55 +
        boardPressureWeight * 0.25 +
        (pressureRuns / Math.max(1, runs.length)) * 20 +
        rageQuitRuns * 8
    ),
    averagePressureScore,
    averageBoardHeight,
    resourceStability,
    executionPeak,
    averageStageIndex,
    volatilityIndex,
    recoveryScore,
    improvementTrend: getTrendFromRuns(runs),
    dominantMistakes,
  };
}

function buildContextualMistakePatterns(
  runs: PlayerRunSnapshot[],
  previous: ContextualMistakePattern[]
): ContextualMistakePattern[] {
  const counts = new Map<string, ContextualMistakePattern>();

  runs.forEach((run) => {
    run.contextualMistakes.forEach((entry) => {
      const id = `${entry.key}:${entry.phase}:${entry.pressure}:${entry.trigger}`;
      const current = counts.get(id);
      if (current) {
        current.count += 1;
      } else {
        counts.set(id, {
          key: entry.key,
          phase: entry.phase,
          pressure: entry.pressure,
          trigger: entry.trigger,
          count: 1,
          trend: "stable",
        });
      }
    });
  });

  return [...counts.values()]
    .map((pattern) => {
      const previousCount =
        previous.find(
          (item) =>
            item.key === pattern.key &&
            item.phase === pattern.phase &&
            item.pressure === pattern.pressure &&
            item.trigger === pattern.trigger
        )?.count ?? pattern.count;
      return {
        ...pattern,
        trend: (
          pattern.count > previousCount
            ? "up"
            : pattern.count < previousCount
              ? "down"
              : "stable"
        ) as "up" | "down" | "stable",
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function describeContextualPattern(
  key: PlayerMistakeKey,
  phase: MistakePhase,
  pressure: MistakePressure,
  trigger: MistakeTrigger
) {
  return `${key} revient surtout en phase ${phase}, sous pression ${pressure}, declencheur ${trigger}`;
}

function buildRookieRecommendationReason(
  targetMode: PlayerBehaviorMode,
  profile: PlayerModeProfile
) {
  if (profile.recoveryScore < 35) {
    return `Rookie attend un retour plus calme sur ${targetMode}. Stabilite ${profile.resourceStability}/100, recovery ${profile.recoveryScore}/100.`;
  }
  return `Rookie attend plus de regularite sur ${targetMode}. Stabilite ${profile.resourceStability}/100, recovery ${profile.recoveryScore}/100.`;
}

function buildPulseRecommendationReason(
  targetMode: PlayerBehaviorMode,
  profile: PlayerModeProfile
) {
  if (profile.volatilityIndex >= 60) {
    return `Pulse veut casser la volatilite sur ${targetMode}. Execution ${profile.executionPeak}/100, volatilite ${profile.volatilityIndex}/100.`;
  }
  return `Pulse veut une baisse nette des erreurs sur ${targetMode}. Tendance ${profile.improvementTrend}, execution ${profile.executionPeak}/100, volatilite ${profile.volatilityIndex}/100.`;
}

function buildApexRecommendationReason(
  targetMode: PlayerBehaviorMode,
  profile: PlayerModeProfile
) {
  if (profile.recoveryScore < 35) {
    return `Apex refuse les detours. Travaille ${targetMode}. Pression ${profile.pressureIndex}/100, stack ${profile.averageBoardHeight}/20, recovery critique ${profile.recoveryScore}/100.`;
  }
  return `Apex refuse les detours. Travaille ${targetMode}. Pression ${profile.pressureIndex}/100, stack ${profile.averageBoardHeight}/20, recovery ${profile.recoveryScore}/100.`;
}

function buildConflict(
  challenger: TetrobotId,
  opponent: TetrobotId,
  challengerMode: PlayerBehaviorMode | null,
  opponentMode: PlayerBehaviorMode | null,
  totalSessions: number,
  playerBehaviorByMode: Record<PlayerBehaviorMode, ModeBehaviorStats>,
  summary: string,
  now: number
): TetrobotConflict | null {
  if (!challengerMode && !opponentMode) return null;
  return {
    id: `conflict-${challenger}-${opponent}-${challengerMode ?? "none"}-${opponentMode ?? "none"}`,
    challenger,
    opponent,
    challengerMode,
    opponentMode,
    issuedAt: now,
    totalSessionsAtIssue: totalSessions,
    challengerModeSessionsAtIssue: challengerMode
      ? playerBehaviorByMode[challengerMode].sessions
      : 0,
    opponentModeSessionsAtIssue: opponentMode
      ? playerBehaviorByMode[opponentMode].sessions
      : 0,
    resolvedAt: null,
    chosenBot: null,
    summary,
  };
}

function getExclusiveAlignmentFlavor(
  favoredBot: TetrobotId,
  blockedBot: TetrobotId
) {
  const pairId = `${favoredBot}:${blockedBot}`;
  switch (pairId) {
    case "rookie:apex":
      return {
        favoredLine:
          "Rookie prend le canal: on reconstruit proprement, sans laisser Apex te casser trop vite.",
        blockedLine:
          "Apex reste en retrait, mais il note deja que tu as choisi le confort avant la contrainte.",
        lockedAdvice: ["hard_truths", "punishing_challenges"],
      };
    case "apex:rookie":
      return {
        favoredLine:
          "Apex prend le canal: fini les detours, tu travailles maintenant ce que Rookie voulait encore adoucir.",
        blockedLine:
          "Rookie se retire un temps. Il pense qu'Apex te pousse trop loin, trop vite.",
        lockedAdvice: ["comforting_routes", "reassurance_loops"],
      };
    case "pulse:rookie":
      return {
        favoredLine:
          "Pulse prend le canal: les conseils flous s'effacent, place a une correction precise et mesuree.",
        blockedLine:
          "Rookie se crispe. Il supporte mal de voir sa lecture relationnelle passer apres l'analyse froide.",
        lockedAdvice: ["comforting_routes", "broad_reassurance"],
      };
    case "rookie:pulse":
      return {
        favoredLine:
          "Rookie prend le canal: d'abord la regularite et le rythme, ensuite seulement l'obsession des chiffres.",
        blockedLine:
          "Pulse se tait a contrecoeur. Il considere que tu repousses encore la vraie correction technique.",
        lockedAdvice: ["micro_analysis", "precision_breakdowns"],
      };
    case "apex:pulse":
      return {
        favoredLine:
          "Apex prend le canal: fini la dispersion, Pulse n'imposera plus ses detours analytiques pendant quelques sessions.",
        blockedLine:
          "Pulse encaisse mal. Il juge qu'Apex t'enferme dans une logique brutale au lieu de comprendre l'erreur.",
        lockedAdvice: ["micro_analysis", "optimization_detours"],
      };
    case "pulse:apex":
      return {
        favoredLine:
          "Pulse prend le canal: avant d'encaisser la pression d'Apex, tu corriges d'abord la structure de ton jeu.",
        blockedLine:
          "Apex garde le silence, mais il considere ce report comme un nouveau sursis accorde a ta faiblesse.",
        lockedAdvice: ["hard_truths", "punishing_challenges"],
      };
    default:
      return {
        favoredLine: `${favoredBot} prend le dessus pour quelques sessions.`,
        blockedLine: `${blockedBot} garde ses conseils en retrait apres ton choix.`,
        lockedAdvice: ["exclusive_advice"],
      };
  }
}

function buildExclusiveAlignmentObjective(
  favoredBot: TetrobotId,
  conflict: TetrobotConflict | null,
  playerBehaviorByMode: Record<PlayerBehaviorMode, ModeBehaviorStats>
) {
  const mode =
    (favoredBot === conflict?.challenger ? conflict.challengerMode : null) ??
    (favoredBot === conflict?.opponent ? conflict.opponentMode : null) ??
    conflict?.challengerMode ??
    conflict?.opponentMode ??
    null;
  const startSessions = mode ? playerBehaviorByMode[mode].sessions : 0;

  if (favoredBot === "rookie") {
    return {
      objectiveLabel: mode
        ? `Rookie veut 2 sessions propres sur ${mode}`
        : "Rookie veut 2 sessions regulieres sans detour",
      objectiveMode: mode,
      objectiveStartSessions: startSessions,
      objectiveTargetSessions: 2,
      objectiveProgress: 0,
      rewardAffinity: 8,
      rewardXp: 12,
      rewardClaimed: false,
    };
  }
  if (favoredBot === "pulse") {
    return {
      objectiveLabel: mode
        ? `Pulse veut 2 sessions mesurees sur ${mode}`
        : "Pulse veut 2 sessions de correction nette",
      objectiveMode: mode,
      objectiveStartSessions: startSessions,
      objectiveTargetSessions: 2,
      objectiveProgress: 0,
      rewardAffinity: 10,
      rewardXp: 14,
      rewardClaimed: false,
    };
  }
  return {
    objectiveLabel: mode
      ? `Apex exige 3 sessions utiles sur ${mode}`
      : "Apex exige 3 sessions sans esquive",
    objectiveMode: mode,
    objectiveStartSessions: startSessions,
    objectiveTargetSessions: 3,
    objectiveProgress: 0,
    rewardAffinity: 14,
    rewardXp: 18,
    rewardClaimed: false,
  };
}

function buildExclusiveAlignment(
  favoredBot: TetrobotId,
  blockedBot: TetrobotId,
  reason: string,
  now: number,
  conflict: TetrobotConflict | null,
  playerBehaviorByMode: Record<PlayerBehaviorMode, ModeBehaviorStats>
): TetrobotExclusiveAlignment {
  const flavor = getExclusiveAlignmentFlavor(favoredBot, blockedBot);
  const objective = buildExclusiveAlignmentObjective(favoredBot, conflict, playerBehaviorByMode);
  return {
    favoredBot,
    blockedBot,
    issuedAt: now,
    expiresAt: now + 3 * 24 * 60 * 60 * 1000,
    sessionsRemaining: 4,
    reason,
    favoredLine: flavor.favoredLine,
    blockedLine: flavor.blockedLine,
    lockedAdvice: flavor.lockedAdvice,
    objectiveLabel: objective.objectiveLabel,
    objectiveMode: objective.objectiveMode,
    objectiveStartSessions: objective.objectiveStartSessions,
    objectiveTargetSessions: objective.objectiveTargetSessions,
    objectiveProgress: objective.objectiveProgress,
    rewardAffinity: objective.rewardAffinity,
    rewardXp: objective.rewardXp,
    rewardClaimed: objective.rewardClaimed,
  };
}

function hasLockedAdvice(
  alignment: TetrobotExclusiveAlignment | null,
  bot: TetrobotId,
  advice: string
) {
  return alignment?.blockedBot === bot && alignment.lockedAdvice.includes(advice);
}

function getExclusiveRewardDialogue(bot: TetrobotId, objectiveLabel: string) {
  switch (bot) {
    case "rookie":
      return `Rookie ouvre une ligne rare: tu as tenu ${objectiveLabel}. Cette fois, il te fait vraiment confiance.`;
    case "pulse":
      return `Pulse ouvre une ligne rare: ${objectiveLabel} est valide. Il admet enfin que ta correction est mesurable.`;
    case "apex":
      return `Apex ouvre une ligne rare: ${objectiveLabel} est accompli. Pour lui, tu as enfin choisi le vrai travail.`;
    default:
      return `${bot} ouvre une ligne rare apres validation de ${objectiveLabel}.`;
  }
}

function getExclusiveRivalDialogue(
  favoredBot: TetrobotId,
  blockedBot: TetrobotId,
  objectiveLabel: string
) {
  const pairId = `${favoredBot}:${blockedBot}`;
  switch (pairId) {
    case "rookie:apex":
      return `Apex voit que Rookie t'a stabilise sur ${objectiveLabel}, mais refuse encore de parler de vraie victoire.`;
    case "pulse:rookie":
      return `Rookie encaisse mal la validation de Pulse sur ${objectiveLabel}. Il pense encore que tu avances trop froidement.`;
    case "apex:rookie":
      return `Rookie n'aime pas l'admettre, mais Apex t'a fait tenir ${objectiveLabel} jusqu'au bout.`;
    case "apex:pulse":
      return `Pulse note la performance, mais critique encore la brutalite d'Apex sur ${objectiveLabel}.`;
    case "pulse:apex":
      return `Apex ne l'admet pas vraiment, mais Pulse a corrige quelque chose d'utile sur ${objectiveLabel}.`;
    case "rookie:pulse":
      return `Pulse voit que Rookie t'a remis en mouvement sur ${objectiveLabel}, meme si sa methode lui parait trop floue.`;
    default:
      return `${blockedBot} reagit encore a la validation de ${objectiveLabel} par ${favoredBot}.`;
  }
}

function buildRecommendation(
  bot: TetrobotId,
  prevRecommendation: TetrobotRecommendation | null,
  totalSessions: number,
  targetMode: PlayerBehaviorMode | null,
  targetModeSessions: number,
  reason: string,
  kind: TetrobotRecommendation["kind"],
  now: number
): TetrobotRecommendation | null {
  if (!targetMode) return null;

  if (
    prevRecommendation &&
    prevRecommendation.kind === kind &&
    prevRecommendation.targetMode === targetMode
  ) {
    const gainedTargetSessions = Math.max(
      0,
      targetModeSessions - prevRecommendation.targetModeSessionsAtIssue
    );
    const gainedTotalSessions = Math.max(
      0,
      totalSessions - prevRecommendation.totalSessionsAtIssue
    );
    const ignoredSessions =
      gainedTargetSessions > 0
        ? 0
        : prevRecommendation.ignoredSessions + Math.max(0, gainedTotalSessions);
    const ignoredMs = gainedTargetSessions > 0 ? 0 : Math.max(0, now - prevRecommendation.issuedAt);

    if (
      gainedTargetSessions === 0 &&
      gainedTotalSessions === 0 &&
      prevRecommendation.reason === reason &&
      now - prevRecommendation.lastEvaluatedAt < RECOMMENDATION_REEVALUATION_INTERVAL_MS
    ) {
      return prevRecommendation;
    }

    return {
      ...prevRecommendation,
      reason,
      ignoredSessions,
      ignoredMs,
      lastEvaluatedAt: now,
      issuedAt: gainedTargetSessions > 0 ? now : prevRecommendation.issuedAt,
      totalSessionsAtIssue: gainedTargetSessions > 0 ? totalSessions : prevRecommendation.totalSessionsAtIssue,
      targetModeSessionsAtIssue:
        gainedTargetSessions > 0 ? targetModeSessions : prevRecommendation.targetModeSessionsAtIssue,
    };
  }

  return {
    bot,
    kind,
    targetMode,
    reason,
    issuedAt: now,
    lastEvaluatedAt: now,
    totalSessionsAtIssue: totalSessions,
    targetModeSessionsAtIssue: targetModeSessions,
    ignoredSessions: 0,
    ignoreThreshold: BOT_IGNORE_THRESHOLDS[bot],
    ignoredMs: 0,
    ignoreThresholdMs: BOT_IGNORE_TIME_THRESHOLDS_MS[bot],
    penaltyCount: 0,
  };
}

function normalizePlayerBehaviorByMode(
  prev: TetrobotSyncStats
): Record<PlayerBehaviorMode, ModeBehaviorStats> {
  return Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => {
      const current = prev.playerBehaviorByMode[mode];
      const legacyMinimumSessions =
        mode === "VERSUS"
          ? prev.versusMatches
          : mode === "ROGUELIKE_VERSUS"
            ? prev.roguelikeVersusMatches
            : 0;

      return [
        mode,
        {
          ...current,
          sessions: Math.max(current.sessions, current.wins + current.losses, legacyMinimumSessions),
        },
      ];
    })
  ) as Record<PlayerBehaviorMode, ModeBehaviorStats>;
}

export function syncTetrobotProgressionState(prev: TetrobotSyncStats): TetrobotSyncResult {
  const playerBehaviorByMode = normalizePlayerBehaviorByMode(prev);
  const totalSessions = Object.values(playerBehaviorByMode).reduce(
    (sum, mode) => sum + mode.sessions,
    0
  );
  const totalWins = Object.values(playerBehaviorByMode).reduce(
    (sum, mode) => sum + mode.wins,
    0
  );
  const visitedModesCount = Object.values(prev.modesVisited).filter(Boolean).length;
  const totalLosses = Object.values(playerBehaviorByMode).reduce(
    (sum, mode) => sum + mode.losses,
    0
  );
  const totalMistakes = Object.values(prev.playerMistakesByMode).reduce(
    (sum, mistakes) =>
      sum +
      mistakes.holes +
      mistakes.top_out +
      mistakes.slow +
      mistakes.unsafe_stack +
      mistakes.damage_taken +
      mistakes.misread,
    0
  );
  const weakestModeSessions = prev.lowestWinrateMode
    ? playerBehaviorByMode[prev.lowestWinrateMode]?.sessions ?? 0
    : 0;
  const playedModes = Object.entries(playerBehaviorByMode).filter(([, value]) => value.sessions > 0) as Array<
    [PlayerBehaviorMode, ModeBehaviorStats]
  >;
  const recentRunsByMode = Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => [
      mode,
      prev.playerLongTermMemory.recentRunsByMode?.[mode] ?? [],
    ])
  ) as Record<PlayerBehaviorMode, PlayerRunSnapshot[]>;
  const modeProfiles = Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => [mode, buildModeProfile(recentRunsByMode[mode])])
  ) as Record<PlayerBehaviorMode, PlayerModeProfile>;
  const contextualMistakePatterns = Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => [
      mode,
      buildContextualMistakePatterns(
        recentRunsByMode[mode],
        prev.playerLongTermMemory.contextualMistakePatterns?.[mode] ?? []
      ),
    ])
  ) as Record<PlayerBehaviorMode, ContextualMistakePattern[]>;
  const modeCount = playedModes.length;
  const sessionsByMode = playedModes.map(([, value]) => value.sessions);
  const minModeSessions = sessionsByMode.length ? Math.min(...sessionsByMode) : 0;
  const maxModeSessions = sessionsByMode.length ? Math.max(...sessionsByMode) : 0;
  const totalMistakeWeight = Object.values(prev.playerMistakesByMode).reduce(
    (sum, modeStats) => sum + getModeMistakeCount(modeStats),
    0
  );
  const improvementSignals =
    Object.values(prev.level10Modes).filter(Boolean).length +
    Object.values(prev.scoredModes).filter(Boolean).length +
    Math.floor(prev.botApexWins / 3) +
    Math.floor(prev.tetromazeEscapesTotal / 10);

  const strongestModeFocus =
    playedModes
      .sort((a, b) => {
        const leftRate = modeProfiles[a[0]].recentRuns > 0 ? modeProfiles[a[0]].recentWinRate / 100 : getModeWinRate(a[1]);
        const rightRate = modeProfiles[b[0]].recentRuns > 0 ? modeProfiles[b[0]].recentWinRate / 100 : getModeWinRate(b[1]);
        return rightRate - leftRate || b[1].sessions - a[1].sessions;
      })[0]?.[0] ?? null;
  const weakestModeFocus =
    playedModes
      .sort((a, b) => {
        const leftProfile = modeProfiles[a[0]];
        const rightProfile = modeProfiles[b[0]];
        const leftMistakes =
          leftProfile.recentRuns > 0
            ? leftProfile.recentMistakeRate
            : getModeMistakeCount(prev.playerMistakesByMode[a[0]]) / Math.max(1, a[1].sessions);
        const rightMistakes =
          rightProfile.recentRuns > 0
            ? rightProfile.recentMistakeRate
            : getModeMistakeCount(prev.playerMistakesByMode[b[0]]) / Math.max(1, b[1].sessions);
        const leftWinRate =
          leftProfile.recentRuns > 0 ? leftProfile.recentWinRate / 100 : getModeWinRate(a[1]);
        const rightWinRate =
          rightProfile.recentRuns > 0 ? rightProfile.recentWinRate / 100 : getModeWinRate(b[1]);
        const leftSeverity =
          (1 - leftWinRate) * 100 +
          leftMistakes * 10 +
          leftProfile.pressureIndex * 0.2 +
          (leftProfile.improvementTrend === "down" ? 8 : 0);
        const rightSeverity =
          (1 - rightWinRate) * 100 +
          rightMistakes * 10 +
          rightProfile.pressureIndex * 0.2 +
          (rightProfile.improvementTrend === "down" ? 8 : 0);
        return rightSeverity - leftSeverity || b[1].sessions - a[1].sessions;
      })[0]?.[0] ?? null;
  const weakFocusWins = weakestModeFocus ? playerBehaviorByMode[weakestModeFocus]?.wins ?? 0 : 0;
  const regularityScore = clampScore(
    Math.min(40, modeCount * 10) +
      (modeCount > 1 && maxModeSessions > 0 ? (minModeSessions / maxModeSessions) * 45 : 0) +
      Math.min(15, totalSessions * 1.5)
  );
  const strategyScore = clampScore(
    100 -
      (totalMistakeWeight / Math.max(1, totalSessions)) * 12 -
      (prev.counters.rage_quit_estimate ?? 0) * 6 +
      improvementSignals * 8
  );

  const nextLedger: TetrobotXpLedger = {
    play_game: totalSessions,
    win_game: totalWins,
    try_new_mode: visitedModesCount,
    fail_repeated: totalLosses,
    improve_stat: improvementSignals,
  };

  const deltas: TetrobotXpLedger = {
    play_game: Math.max(0, nextLedger.play_game - prev.tetrobotXpLedger.play_game),
    win_game: Math.max(0, nextLedger.win_game - prev.tetrobotXpLedger.win_game),
    try_new_mode: Math.max(0, nextLedger.try_new_mode - prev.tetrobotXpLedger.try_new_mode),
    fail_repeated: Math.max(0, nextLedger.fail_repeated - prev.tetrobotXpLedger.fail_repeated),
    improve_stat: Math.max(0, nextLedger.improve_stat - prev.tetrobotXpLedger.improve_stat),
  };

  const nextAffinityLedger: TetrobotAffinityLedger = {
    play_regularly: Math.floor(totalSessions / 4) + Math.floor(regularityScore / 25),
    rage_quit: prev.counters.rage_quit_estimate ?? totalLosses,
    improve_stat: improvementSignals + Math.floor(strategyScore / 30),
    repeat_mistake: Math.floor(totalMistakes / 5),
    challenge_yourself:
      Math.floor(weakFocusWins / 2) +
      playerBehaviorByMode.ROGUELIKE.wins +
      playerBehaviorByMode.ROGUELIKE_VERSUS.wins +
      playerBehaviorByMode.PUZZLE.wins,
    avoid_weakness: weakestModeFocus
      ? Math.floor((prev.playerLongTermMemory.avoidedModes[weakestModeFocus] ?? 0) / 3)
      : Math.floor(Math.max(0, totalSessions - weakestModeSessions * 2) / 3),
  };

  const affinityDeltas: TetrobotAffinityLedger = {
    play_regularly: Math.max(
      0,
      nextAffinityLedger.play_regularly - prev.tetrobotAffinityLedger.play_regularly
    ),
    rage_quit: Math.max(0, nextAffinityLedger.rage_quit - prev.tetrobotAffinityLedger.rage_quit),
    improve_stat: Math.max(
      0,
      nextAffinityLedger.improve_stat - prev.tetrobotAffinityLedger.improve_stat
    ),
    repeat_mistake: Math.max(
      0,
      nextAffinityLedger.repeat_mistake - prev.tetrobotAffinityLedger.repeat_mistake
    ),
    challenge_yourself: Math.max(
      0,
      nextAffinityLedger.challenge_yourself - prev.tetrobotAffinityLedger.challenge_yourself
    ),
    avoid_weakness: Math.max(
      0,
      nextAffinityLedger.avoid_weakness - prev.tetrobotAffinityLedger.avoid_weakness
    ),
  };

  const progression = {
    rookie: { ...prev.tetrobotProgression.rookie },
    pulse: { ...prev.tetrobotProgression.pulse },
    apex: { ...prev.tetrobotProgression.apex },
  };
  const memories = {
    rookie: [...prev.tetrobotMemories.rookie],
    pulse: [...prev.tetrobotMemories.pulse],
    apex: [...prev.tetrobotMemories.apex],
  };
  let activeTetrobotChallenge = prev.activeTetrobotChallenge;
  let lastLevelUp = prev.lastTetrobotLevelUp;
  let changed = PLAYER_BEHAVIOR_MODES.some(
    (mode) => playerBehaviorByMode[mode].sessions !== prev.playerBehaviorByMode[mode].sessions
  );
  const counterDeltas: Record<string, number> = {};
  const now = Date.now();

  const bumpCounter = (key: string, amount = 1) => {
    counterDeltas[key] = (counterDeltas[key] ?? 0) + amount;
  };

  const applyXp = (bot: TetrobotId, xpGain: number) => {
    if (xpGain <= 0) return;
    changed = true;
    const current = progression[bot];
    const nextXp = current.xp + xpGain;
    const nextLevel = getLevelFromXP(nextXp);
    const unlockedTraits = getUnlockedTraits(bot, nextLevel);
    progression[bot] = {
      ...current,
      xp: nextXp,
      level: nextLevel,
      unlockedTraits,
    };
    if (nextLevel > current.level) {
      lastLevelUp = {
        bot,
        level: nextLevel,
        unlockedTraits,
        message: TETROBOT_LEVEL_UP_MESSAGES[bot][nextLevel] ?? `${bot} evolue niveau ${nextLevel}.`,
        at: now,
      };
    }
  };

  const pushMemory = (
    bot: TetrobotId,
    type: BotMemoryType,
    text: string,
    importance: 1 | 2 | 3 | 4 | 5
  ) => {
    const current = memories[bot];
    if (current.some((entry) => entry.text === text)) return;
    changed = true;
    memories[bot] = [
      {
        id: `${bot}-${type}-${now}-${current.length}`,
        bot,
        type,
        text,
        importance,
        createdAt: now,
      },
      ...current,
    ]
      .sort((a, b) => b.createdAt - a.createdAt || b.importance - a.importance)
      .slice(0, 8);
  };

  const applyAffinity = (
    bot: TetrobotId,
    event: TetrobotAffinityEvent,
    occurrences: number
  ) => {
    if (occurrences <= 0) return;
    changed = true;
    const current = progression[bot];
    const nextAffinity = clampAffinity(current.affinity + updateAffinity(bot, event) * occurrences);
    progression[bot] = {
      ...current,
      affinity: nextAffinity,
      mood: getMood(nextAffinity),
    };
  };

  applyXp("rookie", deltas.play_game * computeBotXP("play_game"));
  applyXp("rookie", deltas.fail_repeated * computeBotXP("fail_repeated"));
  applyXp("rookie", Math.floor(deltas.try_new_mode / 2) * computeBotXP("try_new_mode"));

  applyXp("pulse", deltas.win_game * computeBotXP("win_game"));
  applyXp("pulse", deltas.improve_stat * computeBotXP("improve_stat"));
  applyXp("pulse", Math.floor(deltas.play_game / 3) * computeBotXP("play_game"));

  applyXp("apex", deltas.try_new_mode * computeBotXP("try_new_mode"));
  applyXp("apex", Math.floor(deltas.win_game / 2) * computeBotXP("win_game"));
  applyXp("apex", Math.floor(deltas.improve_stat / 2) * computeBotXP("improve_stat"));

  applyAffinity("rookie", "play_regularly", affinityDeltas.play_regularly);
  applyAffinity("rookie", "rage_quit", affinityDeltas.rage_quit);
  applyAffinity("pulse", "improve_stat", affinityDeltas.improve_stat);
  applyAffinity("pulse", "repeat_mistake", affinityDeltas.repeat_mistake);
  applyAffinity("apex", "challenge_yourself", affinityDeltas.challenge_yourself);
  applyAffinity("apex", "avoid_weakness", affinityDeltas.avoid_weakness);

  const totalPlayedModes = Object.entries(playerBehaviorByMode).filter(
    ([, value]) => value.sessions > 0
  );
  const strongestModes = Object.fromEntries(
    [...totalPlayedModes]
      .sort((a, b) => {
        const left = a[1];
        const right = b[1];
        const leftRate = left.sessions > 0 ? left.wins / left.sessions : 0;
        const rightRate = right.sessions > 0 ? right.wins / right.sessions : 0;
        return rightRate - leftRate || right.sessions - left.sessions;
      })
      .slice(0, 3)
      .map(([mode, value]) => [mode, value.wins])
  );
  const weakestModes = Object.fromEntries(
    [...totalPlayedModes]
      .sort((a, b) => {
        const left = a[1];
        const right = b[1];
        const leftRate = left.sessions > 0 ? left.wins / left.sessions : 1;
        const rightRate = right.sessions > 0 ? right.wins / right.sessions : 1;
        return leftRate - rightRate || right.sessions - left.sessions;
      })
      .slice(0, 3)
      .map(([mode, value]) => [mode, value.losses])
  );
  const avoidedModes = Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode): [PlayerBehaviorMode, number] => {
      const sessions = playerBehaviorByMode[mode].sessions;
      return [mode, Math.max(0, totalSessions - sessions)];
    }).filter(([, count]) => count > 0)
  );
  const aggregatedMistakes = Object.keys(EMPTY_MISTAKE_STATS)
    .map((key) => {
      const typedKey = key as PlayerMistakeKey;
      const count = PLAYER_BEHAVIOR_MODES.reduce(
        (sum, mode) => sum + (prev.playerMistakesByMode[mode][typedKey] ?? 0),
        0
      );
      const previousCount =
        prev.playerLongTermMemory.recurringMistakes.find((entry) => entry.key === typedKey)?.count ??
        count;
      const lastSeenAt = PLAYER_BEHAVIOR_MODES.reduce((max, mode) => {
        const seen = prev.playerMistakeLastSeenByMode[mode][typedKey] ?? 0;
        return Math.max(max, seen ?? 0);
      }, 0);
      if (count <= 0 || lastSeenAt <= 0) return null;
      return {
        key: typedKey,
        count,
        lastSeenAt,
        severity: Math.max(1, Math.min(5, Math.ceil(count / 3))),
        trend: count > previousCount ? "up" : count < previousCount ? "down" : "stable",
      } as MistakeMemory;
    })
    .filter(Boolean) as MistakeMemory[];

  const consistencyScore = Math.max(
    0,
    Math.min(100, Math.round((totalWins / Math.max(1, totalSessions)) * 100 - totalMistakes * 1.5))
  );
  const courageScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((playerBehaviorByMode.ROGUELIKE.sessions +
          playerBehaviorByMode.ROGUELIKE_VERSUS.sessions +
          playerBehaviorByMode.PUZZLE.sessions) /
          Math.max(1, totalSessions)) *
          100
      )
    )
  );
  const disciplineScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        consistencyScore * 0.45 +
          courageScore * 0.25 +
          Math.max(0, 100 - affinityDeltas.repeat_mistake * 10) * 0.3
      )
    )
  );
  const rookieTargetMode =
    modeCount < 3
      ? (PLAYER_BEHAVIOR_MODES.find((mode) => playerBehaviorByMode[mode].sessions === 0) ?? null)
      : (playedModes
          .slice()
          .sort((a, b) => a[1].sessions - b[1].sessions || (a[1].lastPlayedAt ?? 0) - (b[1].lastPlayedAt ?? 0))[0]?.[0] ?? null);
  const pulseTargetMode =
    playedModes
      .slice()
      .sort((a, b) => {
        const leftProfile = modeProfiles[a[0]];
        const rightProfile = modeProfiles[b[0]];
        const leftDensity =
          leftProfile.recentRuns > 0
            ? leftProfile.recentMistakeRate + (leftProfile.improvementTrend === "down" ? 1 : 0)
            : getModeMistakeCount(prev.playerMistakesByMode[a[0]]) / Math.max(1, a[1].sessions);
        const rightDensity =
          rightProfile.recentRuns > 0
            ? rightProfile.recentMistakeRate + (rightProfile.improvementTrend === "down" ? 1 : 0)
            : getModeMistakeCount(prev.playerMistakesByMode[b[0]]) / Math.max(1, b[1].sessions);
        return rightDensity - leftDensity || b[1].sessions - a[1].sessions;
      })[0]?.[0] ?? null;
  const rookieRecommendation =
    regularityScore < 65 && rookieTargetMode
      ? buildRecommendation(
        "rookie",
        prev.playerLongTermMemory.activeRecommendations.rookie,
        totalSessions,
        rookieTargetMode,
        playerBehaviorByMode[rookieTargetMode].sessions,
        modeCount < 3
          ? `Rookie veut te voir revenir aussi sur ${rookieTargetMode}, pas seulement sur ton confort.`
          : buildRookieRecommendationReason(
                rookieTargetMode,
                modeProfiles[rookieTargetMode]
              ),
          "play_underplayed_mode",
          now
        )
      : null;
  const pulseRecommendation =
    strategyScore < 72 && pulseTargetMode
      ? buildRecommendation(
        "pulse",
        prev.playerLongTermMemory.activeRecommendations.pulse,
        totalSessions,
        pulseTargetMode,
        playerBehaviorByMode[pulseTargetMode].sessions,
          buildPulseRecommendationReason(
            pulseTargetMode,
            modeProfiles[pulseTargetMode]
          ),
          "reduce_mistakes",
          now
        )
      : null;
  const apexRecommendation = weakestModeFocus
    ? buildRecommendation(
        "apex",
        prev.playerLongTermMemory.activeRecommendations.apex,
        totalSessions,
        weakestModeFocus,
        playerBehaviorByMode[weakestModeFocus].sessions,
        buildApexRecommendationReason(
          weakestModeFocus,
          modeProfiles[weakestModeFocus]
        ),
        "train_weak_mode",
        now
      )
    : null;
  const candidateConflict =
    rookieRecommendation?.targetMode &&
    apexRecommendation?.targetMode &&
    rookieRecommendation.targetMode === apexRecommendation.targetMode
      ? buildConflict(
          "rookie",
          "apex",
          rookieRecommendation.targetMode,
          apexRecommendation.targetMode,
          totalSessions,
          playerBehaviorByMode,
          `Rookie veut te faire reprendre ${rookieRecommendation.targetMode} proprement, Apex veut t'y forcer sans ménagement.`,
          now
        )
      : rookieRecommendation?.targetMode &&
          pulseRecommendation?.targetMode &&
          rookieRecommendation.targetMode !== pulseRecommendation.targetMode
        ? buildConflict(
            "pulse",
            "rookie",
            pulseRecommendation.targetMode,
            rookieRecommendation.targetMode,
            totalSessions,
            playerBehaviorByMode,
            `Pulse veut une correction ciblée sur ${pulseRecommendation.targetMode}, Rookie préfère te renvoyer sur ${rookieRecommendation.targetMode}.`,
            now
          )
        : pulseRecommendation?.targetMode &&
            apexRecommendation?.targetMode &&
            pulseRecommendation.targetMode !== apexRecommendation.targetMode
          ? buildConflict(
              "apex",
              "pulse",
              apexRecommendation.targetMode,
              pulseRecommendation.targetMode,
              totalSessions,
              playerBehaviorByMode,
              `Apex veut verrouiller ${apexRecommendation.targetMode}, Pulse te disperse encore sur ${pulseRecommendation.targetMode}.`,
              now
            )
          : null;
  const previousConflict = prev.playerLongTermMemory.activeConflict;
  let activeConflict =
    previousConflict &&
    previousConflict.resolvedAt === null &&
    candidateConflict &&
    previousConflict.id === candidateConflict.id
      ? previousConflict
      : candidateConflict ?? previousConflict;
  const playerLongTermMemory: PlayerLongTermMemory = {
    recurringMistakes: aggregatedMistakes
      .sort((a, b) => b.count - a.count || b.lastSeenAt - a.lastSeenAt)
      .slice(0, 6),
    avoidedModes,
    strongestModes,
    weakestModes,
    rageQuitCount: prev.counters.rage_quit_estimate ?? 0,
    comebackCount: prev.counters.comeback_estimate ?? 0,
    consistencyScore,
    courageScore,
    disciplineScore,
    regularityScore,
    strategyScore,
    weakestModeFocus,
    strongestModeFocus,
    lingeringResentment: {
      rookie: Math.max(
        0,
        (prev.playerLongTermMemory.lingeringResentment?.rookie ?? 0) - Math.max(0, deltas.play_game)
      ),
      pulse: Math.max(
        0,
        (prev.playerLongTermMemory.lingeringResentment?.pulse ?? 0) - Math.max(0, deltas.play_game)
      ),
      apex: Math.max(
        0,
        (prev.playerLongTermMemory.lingeringResentment?.apex ?? 0) - Math.max(0, deltas.play_game)
      ),
    },
    activeRecommendations: {
      rookie: rookieRecommendation,
      pulse: pulseRecommendation,
      apex: apexRecommendation,
    },
    activeConflict,
    activeExclusiveAlignment: prev.playerLongTermMemory.activeExclusiveAlignment,
    recentRunsByMode,
    modeProfiles,
    contextualMistakePatterns,
  };

  if (playerLongTermMemory.activeExclusiveAlignment) {
    const alignment = playerLongTermMemory.activeExclusiveAlignment;
    const nextProgress = alignment.objectiveMode
      ? Math.min(
          alignment.objectiveTargetSessions,
          Math.max(
            0,
            playerBehaviorByMode[alignment.objectiveMode].sessions -
              alignment.objectiveStartSessions
          )
        )
      : alignment.objectiveProgress;
    const remaining =
      alignment.sessionsRemaining - Math.max(0, deltas.play_game);
    if (remaining <= 0 || now >= playerLongTermMemory.activeExclusiveAlignment.expiresAt) {
      playerLongTermMemory.activeExclusiveAlignment = null;
    } else {
      playerLongTermMemory.activeExclusiveAlignment = {
        ...alignment,
        sessionsRemaining: remaining,
        objectiveProgress: nextProgress,
      };
      if (
        !alignment.rewardClaimed &&
        alignment.objectiveTargetSessions > 0 &&
        nextProgress >= alignment.objectiveTargetSessions
      ) {
        const nextAffinity = clampAffinity(
          progression[alignment.favoredBot].affinity + alignment.rewardAffinity
        );
        progression[alignment.favoredBot] = {
          ...progression[alignment.favoredBot],
          affinity: nextAffinity,
          mood: getMood(nextAffinity),
        };
        applyXp(alignment.favoredBot, alignment.rewardXp);
        playerLongTermMemory.activeExclusiveAlignment = {
          ...playerLongTermMemory.activeExclusiveAlignment,
          rewardClaimed: true,
        };
        pushMemory(
          alignment.favoredBot,
          "player_progress",
          `${alignment.favoredBot} valide sa ligne exclusive: ${alignment.objectiveLabel}.`,
          alignment.favoredBot === "apex" ? 5 : 4
        );
        pushMemory(
          alignment.favoredBot,
          "player_progress",
          getExclusiveRewardDialogue(alignment.favoredBot, alignment.objectiveLabel),
          5
        );
        pushMemory(
          alignment.blockedBot,
          "player_failure",
          getExclusiveRivalDialogue(
            alignment.favoredBot,
            alignment.blockedBot,
            alignment.objectiveLabel
          ),
          4
        );
        bumpCounter(`tetrobot_exclusive_reward_${alignment.favoredBot}`);
        bumpCounter(`tetrobot_exclusive_dialogue_${alignment.favoredBot}`);
        changed = true;
      }
    }
  }

  if (activeConflict && activeConflict.resolvedAt === null) {
    const challengerGain = activeConflict.challengerMode
      ? Math.max(
          0,
          playerBehaviorByMode[activeConflict.challengerMode].sessions -
            activeConflict.challengerModeSessionsAtIssue
        )
      : 0;
    const opponentGain = activeConflict.opponentMode
      ? Math.max(
          0,
          playerBehaviorByMode[activeConflict.opponentMode].sessions -
            activeConflict.opponentModeSessionsAtIssue
        )
      : 0;
    const chosenBot =
      activeConflict.challengerMode &&
      activeConflict.opponentMode &&
      activeConflict.challengerMode === activeConflict.opponentMode &&
      challengerGain > 0
        ? modeProfiles[activeConflict.challengerMode].recoveryScore >= 45
          ? activeConflict.challenger
          : activeConflict.opponent
        : challengerGain > opponentGain
          ? activeConflict.challenger
          : opponentGain > challengerGain
            ? activeConflict.opponent
            : null;

    if (chosenBot) {
      const otherBot =
        chosenBot === activeConflict.challenger
          ? activeConflict.opponent
          : activeConflict.challenger;
      const chosenCurrent = progression[chosenBot];
      const otherCurrent = progression[otherBot];
      const chosenAffinity = clampAffinity(chosenCurrent.affinity + (chosenBot === "apex" ? 8 : 6));
      const otherAffinity = clampAffinity(otherCurrent.affinity - (otherBot === "apex" ? 6 : 4));
      progression[chosenBot] = {
        ...chosenCurrent,
        affinity: chosenAffinity,
        mood: getMood(chosenAffinity),
      };
      progression[otherBot] = {
        ...otherCurrent,
        affinity: otherAffinity,
        mood: getMood(otherAffinity),
      };
      playerLongTermMemory.activeConflict = {
        ...activeConflict,
        chosenBot,
        resolvedAt: now,
      };
      playerLongTermMemory.activeExclusiveAlignment = buildExclusiveAlignment(
        chosenBot,
        otherBot,
        `Tu as choisi ${chosenBot} contre ${otherBot}. Ses lignes exclusives passent devant pour quelques sessions.`,
        now,
        activeConflict,
        playerBehaviorByMode
      );
      playerLongTermMemory.lingeringResentment[otherBot] = Math.max(
        playerLongTermMemory.lingeringResentment[otherBot],
        6
      );
      changed = true;
      pushMemory(
        chosenBot,
        "player_progress",
        `Tu as suivi ${chosenBot} dans le conflit contre ${otherBot}.`,
        chosenBot === "apex" ? 5 : 4
      );
      pushMemory(
        otherBot,
        "player_failure",
        `Tu as choisi ${chosenBot} plutot que ${otherBot}.`,
        otherBot === "apex" ? 5 : 4
      );
      pushMemory(
        otherBot,
        "trust_break",
        `${otherBot} n'oublie pas que tu as pris parti pour ${chosenBot}.`,
        4
      );
      bumpCounter(`tetrobot_conflict_side_${chosenBot}`);
    }
  }

  if (affinityDeltas.play_regularly > 0) {
    pushMemory("rookie", "player_comeback", "Tu es revenu apres plusieurs echecs sans abandonner.", 3);
  }
  if (affinityDeltas.improve_stat > 0) {
    pushMemory("pulse", "player_progress", "Ta progression recente est assez nette pour etre mesuree.", 4);
    bumpCounter("pulse_advice_success");
  }
  if (
    weakestModeFocus &&
    modeProfiles[weakestModeFocus].improvementTrend === "down" &&
    modeProfiles[weakestModeFocus].recentRuns >= 4
  ) {
    pushMemory(
      "apex",
      "player_failure",
      `Apex voit une regression recente sur ${weakestModeFocus}.`,
      4
    );
  }
  if (
    weakestModeFocus &&
    modeProfiles[weakestModeFocus].averagePressureScore >= 70 &&
    modeProfiles[weakestModeFocus].averageBoardHeight >= 12
  ) {
    pushMemory(
      "apex",
      "player_failure",
      `Apex voit ${weakestModeFocus} te faire monter trop haut: stack moyen ${modeProfiles[weakestModeFocus].averageBoardHeight}/20.`,
      5
    );
  }
  if (
    pulseTargetMode &&
    modeProfiles[pulseTargetMode].volatilityIndex >= 55 &&
    modeProfiles[pulseTargetMode].recentRuns >= 3
  ) {
    pushMemory(
      "pulse",
      "player_failure",
      `Pulse voit une execution trop instable sur ${pulseTargetMode}: volatilite ${modeProfiles[pulseTargetMode].volatilityIndex}/100.`,
      4
    );
  }
  if (pulseTargetMode && contextualMistakePatterns[pulseTargetMode]?.length) {
    const pattern = contextualMistakePatterns[pulseTargetMode][0];
    if (pattern && pattern.count >= 2) {
      pushMemory(
        "pulse",
        "player_failure",
        `Pulse detecte un schema: ${describeContextualPattern(
          pattern.key,
          pattern.phase,
          pattern.pressure,
          pattern.trigger
        )}.`,
        4
      );
    }
  }
  if (weakestModeFocus && contextualMistakePatterns[weakestModeFocus]?.length) {
    const pattern = contextualMistakePatterns[weakestModeFocus][0];
    if (pattern && pattern.count >= 2) {
      pushMemory(
        "apex",
        "player_failure",
        `Apex cible une faille precise: ${describeContextualPattern(
          pattern.key,
          pattern.phase,
          pattern.pressure,
          pattern.trigger
        )}.`,
        5
      );
    }
  }
  if ((playerLongTermMemory.avoidedModes[prev.lowestWinrateMode ?? ""] ?? 0) >= 5) {
    pushMemory("apex", "player_avoidance", `Tu evites encore ${prev.lowestWinrateMode ?? "ton point faible"}.`, 5);
  }
  if (
    rookieRecommendation?.targetMode &&
    apexRecommendation?.targetMode &&
    rookieRecommendation.targetMode === apexRecommendation.targetMode &&
    modeProfiles[rookieRecommendation.targetMode].recoveryScore < 45
  ) {
    pushMemory(
      "rookie",
      "player_failure",
      `Ne l'ecoute pas... Apex te pousse trop fort sur ${rookieRecommendation.targetMode}. Tu as besoin de reprendre le controle.`,
      4
    );
    pushMemory(
      "apex",
      "player_failure",
      `Ignore Rookie. Il veut t'adoucir sur ${apexRecommendation.targetMode} alors que c'est la faille a corriger.`,
      5
    );
  }
  if (
    rookieRecommendation?.targetMode &&
    pulseRecommendation?.targetMode &&
    rookieRecommendation.targetMode !== pulseRecommendation.targetMode &&
    pulseTargetMode &&
    modeProfiles[pulseTargetMode].volatilityIndex >= 55
  ) {
    pushMemory(
      "pulse",
      "player_failure",
      `Rookie te dit de juste rejouer. Mauvaise lecture. Sur ${pulseRecommendation.targetMode}, il faut corriger avant de grinder.`,
      4
    );
  }
  if (
    pulseRecommendation?.targetMode &&
    apexRecommendation?.targetMode &&
    pulseRecommendation.targetMode !== apexRecommendation.targetMode &&
    weakestModeFocus &&
    modeProfiles[weakestModeFocus].pressureIndex >= 65
  ) {
    pushMemory(
      "apex",
      "player_failure",
      `Ignore Pulse. Il disperse encore ton attention alors que ton vrai probleme reste ${apexRecommendation.targetMode}.`,
      5
    );
  }

  (["rookie", "pulse", "apex"] as TetrobotId[]).forEach((bot) => {
    const recommendation = playerLongTermMemory.activeRecommendations[bot];
    if (!recommendation) return;
    const expectedPenaltyCount = Math.max(
      Math.floor(recommendation.ignoredSessions / Math.max(1, recommendation.ignoreThreshold)),
      Math.floor(recommendation.ignoredMs / Math.max(1, recommendation.ignoreThresholdMs))
    );
    const newPenaltyCount = Math.max(0, expectedPenaltyCount - recommendation.penaltyCount);
    if (newPenaltyCount <= 0) return;

    const current = progression[bot];
    const nextAffinity = clampAffinity(
      current.affinity + BOT_IGNORE_AFFINITY_PENALTIES[bot] * newPenaltyCount
    );
    progression[bot] = {
      ...current,
      affinity: nextAffinity,
      mood: getMood(nextAffinity),
    };
    playerLongTermMemory.activeRecommendations[bot] = {
      ...recommendation,
      penaltyCount: recommendation.penaltyCount + newPenaltyCount,
    };
    changed = true;
    pushMemory(
      bot,
      bot === "apex" ? "player_avoidance" : "player_failure",
      bot === "rookie"
        ? `Rookie remarque que tu ignores encore sa demande sur ${recommendation.targetMode}.`
        : bot === "pulse"
          ? `Pulse constate que tu laisses les memes erreurs revenir sur ${recommendation.targetMode}.`
          : `Apex note que tu contournes encore ${recommendation.targetMode}.`,
      bot === "apex" ? 5 : 4
    );
  });
  if (getApexTrustState(playerLongTermMemory, progression.apex.affinity) === "refusing") {
    pushMemory("apex", "trust_break", "Je refuse de te conseiller tant que tu contournes le vrai travail.", 5);
    bumpCounter("apex_refusal_count");
  }
  if (
    getApexTrustState(playerLongTermMemory, progression.apex.affinity) === "open" &&
    prev.tetrobotMemories.apex.some((entry) => entry.type === "trust_break")
  ) {
    pushMemory("apex", "trust_rebuild", "Bien. Tu t'es enfin presente. On peut reprendre.", 5);
    bumpCounter("apex_trust_restored_count");
  }

  const apexTrustState = getApexTrustState(playerLongTermMemory, progression.apex.affinity);
  if (
    !activeTetrobotChallenge &&
    prev.lowestWinrateMode &&
    (apexTrustState === "refusing" || apexTrustState === "cold") &&
    !hasLockedAdvice(playerLongTermMemory.activeExclusiveAlignment, "apex", "punishing_challenges")
  ) {
    activeTetrobotChallenge = createApexChallenge(
      prev.lowestWinrateMode,
      playerBehaviorByMode[prev.lowestWinrateMode].sessions,
      prev.counters.rage_quit_estimate ?? 0,
      progression.apex.affinity
    );
    changed = true;
  }

  if (
    activeTetrobotChallenge &&
    activeTetrobotChallenge.bot === "apex" &&
    activeTetrobotChallenge.status !== "completed"
  ) {
    const minimumReward = getApexReconciliationReward(progression.apex.affinity);
    if (activeTetrobotChallenge.rewardAffinity < minimumReward) {
      activeTetrobotChallenge = {
        ...activeTetrobotChallenge,
        rewardAffinity: minimumReward,
      };
      changed = true;
    }
  }

  if (
    activeTetrobotChallenge &&
    activeTetrobotChallenge.bot === "apex" &&
    activeTetrobotChallenge.status === "offered" &&
    activeTetrobotChallenge.targetMode
  ) {
    const modeSessions = playerBehaviorByMode[activeTetrobotChallenge.targetMode].sessions;
    if (modeSessions > activeTetrobotChallenge.startSessions) {
      activeTetrobotChallenge = {
        ...activeTetrobotChallenge,
        status: "active",
        acceptedAt: activeTetrobotChallenge.acceptedAt ?? now,
      };
      bumpCounter("apex_challenge_accepted_count");
      changed = true;
    }
  }

  if (
    activeTetrobotChallenge &&
    activeTetrobotChallenge.bot === "apex" &&
    activeTetrobotChallenge.status === "active" &&
    activeTetrobotChallenge.targetMode
  ) {
    const modeSessions = playerBehaviorByMode[activeTetrobotChallenge.targetMode].sessions;
    const rageQuitCount = prev.counters.rage_quit_estimate ?? 0;
    const progress = Math.max(0, modeSessions - activeTetrobotChallenge.startSessions);
    const nextProgress = Math.min(activeTetrobotChallenge.targetCount, progress);

    if (nextProgress !== activeTetrobotChallenge.progress) {
      activeTetrobotChallenge = {
        ...activeTetrobotChallenge,
        progress: nextProgress,
      };
      changed = true;
    }

    if (
      nextProgress >= activeTetrobotChallenge.targetCount &&
      rageQuitCount <= activeTetrobotChallenge.startRageQuitCount
    ) {
      const nextAffinity = clampAffinity(progression.apex.affinity + activeTetrobotChallenge.rewardAffinity);
      progression.apex = {
        ...progression.apex,
        affinity: nextAffinity,
        mood: getMood(nextAffinity),
      };

      const nextXp = progression.apex.xp + activeTetrobotChallenge.rewardXp;
      const nextLevel = getLevelFromXP(nextXp);
      const unlockedTraits = getUnlockedTraits("apex", nextLevel);
      progression.apex = {
        ...progression.apex,
        xp: nextXp,
        level: nextLevel,
        unlockedTraits,
      };
      if (nextLevel > (prev.tetrobotProgression.apex.level ?? 1)) {
        lastLevelUp = {
          bot: "apex",
          level: nextLevel,
          unlockedTraits,
          message: TETROBOT_LEVEL_UP_MESSAGES.apex[nextLevel] ?? `apex evolue niveau ${nextLevel}.`,
          at: now,
        };
      }

      activeTetrobotChallenge = {
        ...activeTetrobotChallenge,
        status: "completed",
        progress: activeTetrobotChallenge.targetCount,
        resolvedAt: now,
      };
      pushMemory("apex", "trust_rebuild", "Tu as accepte le defi d'Apex et tu l'as termine sans fuir.", 5);
      bumpCounter("apex_trust_restored_count");
      changed = true;
    }
  }

  return {
    changed,
    counterDeltas,
    playerBehaviorByMode,
    tetrobotProgression: progression,
    tetrobotXpLedger: nextLedger,
    tetrobotAffinityLedger: nextAffinityLedger,
    playerLongTermMemory,
    tetrobotMemories: memories,
    lastTetrobotLevelUp: lastLevelUp,
    activeTetrobotChallenge,
  };
}
