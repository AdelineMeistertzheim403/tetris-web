import { getApexTrustState } from "./tetrobotAchievementLogic";
import type {
  BotLevel,
  BotMemoryEntry,
  BotMemoryType,
  BotMood,
  BotState,
  BotTrait,
  MistakeLastSeenStats,
  MistakeMemory,
  MistakeStats,
  ModeBehaviorStats,
  PlayerBehaviorMode,
  PlayerLongTermMemory,
  PlayerMistakeKey,
  TetrobotAffinityEvent,
  TetrobotAffinityLedger,
  TetrobotChallengeState,
  TetrobotId,
  TetrobotLevelUp,
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
  activeTetrobotChallenge: TetrobotChallengeState | null;
  lastTetrobotLevelUp: TetrobotLevelUp;
};

export type TetrobotSyncResult = {
  changed: boolean;
  counterDeltas: Record<string, number>;
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
  rageQuitCount: number
): TetrobotChallengeState {
  const now = Date.now();
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
    rewardAffinity: 24,
    rewardXp: 30,
    startSessions: modeSessions,
    startRageQuitCount: rageQuitCount,
    createdAt: now,
    acceptedAt: null,
    resolvedAt: null,
  };
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
      if (event === "play_regularly") return 5;
      if (event === "rage_quit") return -10;
      break;
    case "pulse":
      if (event === "improve_stat") return 10;
      if (event === "repeat_mistake") return -5;
      break;
    case "apex":
      if (event === "challenge_yourself") return 15;
      if (event === "avoid_weakness") return -15;
      break;
  }
  return 0;
}

export function syncTetrobotProgressionState(prev: TetrobotSyncStats): TetrobotSyncResult {
  const totalSessions = Object.values(prev.playerBehaviorByMode).reduce(
    (sum, mode) => sum + mode.sessions,
    0
  );
  const totalWins = Object.values(prev.playerBehaviorByMode).reduce(
    (sum, mode) => sum + mode.wins,
    0
  );
  const visitedModesCount = Object.values(prev.modesVisited).filter(Boolean).length;
  const totalLosses = Object.values(prev.playerBehaviorByMode).reduce(
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
    ? prev.playerBehaviorByMode[prev.lowestWinrateMode]?.sessions ?? 0
    : 0;
  const improvementSignals =
    Object.values(prev.level10Modes).filter(Boolean).length +
    Object.values(prev.scoredModes).filter(Boolean).length +
    Math.floor(prev.botApexWins / 3) +
    Math.floor(prev.tetromazeEscapesTotal / 10);

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
    play_regularly: Math.floor(totalSessions / 2),
    rage_quit: totalLosses,
    improve_stat: improvementSignals,
    repeat_mistake: Math.floor(totalMistakes / 4),
    challenge_yourself:
      Object.values(prev.level10Modes).filter(Boolean).length + visitedModesCount,
    avoid_weakness: Math.floor(Math.max(0, totalSessions - weakestModeSessions * 2) / 3),
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
  let changed = false;
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

  const totalPlayedModes = Object.entries(prev.playerBehaviorByMode).filter(
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
      const sessions = prev.playerBehaviorByMode[mode].sessions;
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
        ((prev.playerBehaviorByMode.ROGUELIKE.sessions +
          prev.playerBehaviorByMode.ROGUELIKE_VERSUS.sessions +
          prev.playerBehaviorByMode.PUZZLE.sessions) /
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
  };

  if (affinityDeltas.play_regularly > 0) {
    pushMemory("rookie", "player_comeback", "Tu es revenu apres plusieurs echecs sans abandonner.", 3);
  }
  if (affinityDeltas.improve_stat > 0) {
    pushMemory("pulse", "player_progress", "Ta progression recente est assez nette pour etre mesuree.", 4);
    bumpCounter("pulse_advice_success");
  }
  if ((playerLongTermMemory.avoidedModes[prev.lowestWinrateMode ?? ""] ?? 0) >= 5) {
    pushMemory("apex", "player_avoidance", `Tu evites encore ${prev.lowestWinrateMode ?? "ton point faible"}.`, 5);
  }
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
    (apexTrustState === "refusing" || apexTrustState === "cold")
  ) {
    activeTetrobotChallenge = createApexChallenge(
      prev.lowestWinrateMode,
      prev.playerBehaviorByMode[prev.lowestWinrateMode].sessions,
      prev.counters.rage_quit_estimate ?? 0
    );
    changed = true;
  }

  if (
    activeTetrobotChallenge &&
    activeTetrobotChallenge.bot === "apex" &&
    activeTetrobotChallenge.status === "active" &&
    activeTetrobotChallenge.targetMode
  ) {
    const modeSessions = prev.playerBehaviorByMode[activeTetrobotChallenge.targetMode].sessions;
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
    tetrobotProgression: progression,
    tetrobotXpLedger: nextLedger,
    tetrobotAffinityLedger: nextAffinityLedger,
    playerLongTermMemory,
    tetrobotMemories: memories,
    lastTetrobotLevelUp: lastLevelUp,
    activeTetrobotChallenge,
  };
}
