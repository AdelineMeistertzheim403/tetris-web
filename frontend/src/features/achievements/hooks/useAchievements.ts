import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ACHIEVEMENTS,
  type Achievement,
  type AchievementMode,
} from "../data/achievements";
import type { GameMode } from "../../game/types/GameMode";
import { useAuth } from "../../auth/context/AuthContext";
import {
  fetchUnlockedAchievements,
  fetchAchievementStats,
  saveAchievementStats,
  unlockAchievements,
} from "../services/achievementService";

type AchievementState = {
  id: string;
  unlockedAt: number;
};

type AchievementContext = {
  // stats run courante
  score?: number;
  lines?: number;
  level?: number;
  tetrisCleared?: boolean;
  mode?: AchievementMode;

  // run meta
  bombsUsed?: number;
  usedSecondChance?: boolean;
  chaosMode?: boolean;
  seed?: string;
  historyViewedCount?: number;
  custom?: Record<string, boolean | number>;
  counters?: Record<string, number>;

  // collections
  perks?: string[];
  synergies?: string[];
  mutations?: string[];

  // historique
  runsPlayed?: number;
  sameSeedRuns?: number;
};

export type PlayerBehaviorMode = GameMode | "PIXEL_PROTOCOL";
export type TetrobotId = "rookie" | "pulse" | "apex";
export type BotLevel = 1 | 2 | 3 | 4 | 5;
export type BotMood = "angry" | "neutral" | "friendly" | "respect";
export type BotTrait =
  | "contextualTips"
  | "errorDetection"
  | "performanceAnalysis"
  | "deepOptimization"
  | "provocation"
  | "hardcoreCoach";

type BotState = {
  level: BotLevel;
  xp: number;
  affinity: number;
  mood: BotMood;
  unlockedTraits: BotTrait[];
  lastTip?: string;
};

type PlayerBotProgression = Record<TetrobotId, BotState>;

type TetrobotXpEvent =
  | "play_game"
  | "win_game"
  | "try_new_mode"
  | "fail_repeated"
  | "improve_stat";

type TetrobotXpLedger = Record<TetrobotXpEvent, number>;

type TetrobotAffinityEvent =
  | "play_regularly"
  | "rage_quit"
  | "improve_stat"
  | "repeat_mistake"
  | "challenge_yourself"
  | "avoid_weakness";

type TetrobotAffinityLedger = Record<TetrobotAffinityEvent, number>;

type TetrobotLevelUp = {
  bot: TetrobotId;
  level: BotLevel;
  unlockedTraits: BotTrait[];
  message: string;
  at: number;
} | null;

export type PlayerMistakeKey =
  | "holes"
  | "top_out"
  | "slow"
  | "unsafe_stack"
  | "damage_taken"
  | "misread"
  | "panic_stack"
  | "slow_decision"
  | "greedy_play"
  | "mode_avoidance"
  | "inconsistent_precision";

export type BotMemoryType =
  | "player_progress"
  | "player_failure"
  | "player_avoidance"
  | "player_comeback"
  | "trust_break"
  | "trust_rebuild";

export type ApexTrustState = "open" | "warning" | "cold" | "refusing";

export type MistakeMemory = {
  key: PlayerMistakeKey;
  count: number;
  lastSeenAt: number;
  severity: number;
  trend: "up" | "down" | "stable";
};

export type PlayerLongTermMemory = {
  recurringMistakes: MistakeMemory[];
  avoidedModes: Record<string, number>;
  strongestModes: Record<string, number>;
  weakestModes: Record<string, number>;
  rageQuitCount: number;
  comebackCount: number;
  consistencyScore: number;
  courageScore: number;
  disciplineScore: number;
};

export type BotMemoryEntry = {
  id: string;
  bot: TetrobotId;
  type: BotMemoryType;
  text: string;
  importance: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
};

export type TetrobotChallengeState = {
  id: string;
  bot: TetrobotId;
  kind: "apex_reconciliation";
  status: "offered" | "active" | "completed";
  title: string;
  description: string;
  targetMode: PlayerBehaviorMode | null;
  targetCount: number;
  progress: number;
  rewardAffinity: number;
  rewardXp: number;
  startSessions: number;
  startRageQuitCount: number;
  createdAt: number;
  acceptedAt: number | null;
  resolvedAt: number | null;
};

type ModeBehaviorStats = {
  sessions: number;
  wins: number;
  losses: number;
  totalDurationMs: number;
  lastPlayedAt: number | null;
};

type MistakeStats = Record<PlayerMistakeKey, number>;
type MistakeLastSeenStats = Record<PlayerMistakeKey, number | null>;

type PlayerBehaviorEvent = {
  mode: PlayerBehaviorMode;
  won?: boolean;
  durationMs?: number;
  mistakes?: PlayerMistakeKey[];
};

const PLAYER_BEHAVIOR_MODES: PlayerBehaviorMode[] = [
  "CLASSIQUE",
  "SPRINT",
  "VERSUS",
  "BRICKFALL_SOLO",
  "BRICKFALL_VERSUS",
  "ROGUELIKE",
  "ROGUELIKE_VERSUS",
  "PUZZLE",
  "TETROMAZE",
  "PIXEL_PROTOCOL",
];

const TETROBOT_IDS: TetrobotId[] = ["rookie", "pulse", "apex"];

const DEFAULT_BOT_STATE: BotState = {
  level: 1,
  xp: 0,
  affinity: 0,
  mood: "neutral",
  unlockedTraits: [],
  lastTip: undefined,
};

const createBotProgression = (): PlayerBotProgression => ({
  rookie: { ...DEFAULT_BOT_STATE },
  pulse: { ...DEFAULT_BOT_STATE },
  apex: { ...DEFAULT_BOT_STATE },
});

const DEFAULT_TETROBOT_XP_LEDGER: TetrobotXpLedger = {
  play_game: 0,
  win_game: 0,
  try_new_mode: 0,
  fail_repeated: 0,
  improve_stat: 0,
};

const DEFAULT_TETROBOT_AFFINITY_LEDGER: TetrobotAffinityLedger = {
  play_regularly: 0,
  rage_quit: 0,
  improve_stat: 0,
  repeat_mistake: 0,
  challenge_yourself: 0,
  avoid_weakness: 0,
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

const EMPTY_MISTAKE_LAST_SEEN: MistakeLastSeenStats = {
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
};

const createBehaviorByMode = (): Record<PlayerBehaviorMode, ModeBehaviorStats> =>
  Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => [
      mode,
      {
        sessions: 0,
        wins: 0,
        losses: 0,
        totalDurationMs: 0,
        lastPlayedAt: null,
      },
    ])
  ) as Record<PlayerBehaviorMode, ModeBehaviorStats>;

const createMistakesByMode = (): Record<PlayerBehaviorMode, MistakeStats> =>
  Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => [mode, { ...EMPTY_MISTAKE_STATS }])
  ) as Record<PlayerBehaviorMode, MistakeStats>;

const createMistakeLastSeenByMode = (): Record<PlayerBehaviorMode, MistakeLastSeenStats> =>
  Object.fromEntries(
    PLAYER_BEHAVIOR_MODES.map((mode) => [mode, { ...EMPTY_MISTAKE_LAST_SEEN }])
  ) as Record<PlayerBehaviorMode, MistakeLastSeenStats>;

const DEFAULT_PLAYER_LONG_TERM_MEMORY: PlayerLongTermMemory = {
  recurringMistakes: [],
  avoidedModes: {},
  strongestModes: {},
  weakestModes: {},
  rageQuitCount: 0,
  comebackCount: 0,
  consistencyScore: 0,
  courageScore: 0,
  disciplineScore: 0,
};

const createTetrobotMemories = (): Record<TetrobotId, BotMemoryEntry[]> => ({
  rookie: [],
  pulse: [],
  apex: [],
});

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

function getMood(affinity: number): BotMood {
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

export function getApexTrustState(memory: PlayerLongTermMemory, affinity: number): ApexTrustState {
  if (affinity < -60) return "refusing";
  if ((memory.avoidedModes.ROGUELIKE ?? 0) >= 5 || (memory.avoidedModes.PUZZLE ?? 0) >= 5) {
    return "cold";
  }
  if (memory.rageQuitCount >= 3) return "warning";
  return "open";
}

type AchievementStats = {
  runsPlayed: number;
  seedRuns: Record<string, number>;
  loginDays: string[];
  historyViewedCount: number;
  modesVisited: Record<GameMode, boolean>;
  level10Modes: Record<GameMode, boolean>;
  scoredModes: Record<GameMode, boolean>;
  playtimeMs: number;
  noHoldRuns: number;
  hardDropCount: number;
  versusMatches: number;
  versusWins: number;
  versusWinStreak: number;
  versusLinesSent: number;
  botMatches: number;
  botWins: number;
  botWinStreak: number;
  botApexWins: number;
  roguelikeVersusMatches: number;
  roguelikeVersusWins: number;
  roguelikeVersusWinStreak: number;
  roguelikeVersusLinesSent: number;
  brickfallSoloLevelsCleared: number;
  brickfallSoloBlocksDestroyed: number;
  brickfallSoloBestWorld: number;
  brickfallSoloCampaignCleared: boolean;
  brickfallSoloEditorCreated: number;
  brickfallSoloEditorWins: number;
  brickfallMatches: number;
  brickfallWins: number;
  brickfallArchitectWins: number;
  brickfallDemolisherWins: number;
  lastScore: number | null;
  puzzleCompletedIds: string[];
  puzzleOptimalCount: number;
  puzzleNoHoldCount: number;
  puzzleSurviveCount: number;
  puzzleFreeZonesTotal: number;
  puzzleLinesTotal: number;
  puzzleWinStreak: number;
  puzzleAttemptsById: Record<string, number>;
  tetromazeRuns: number;
  tetromazeWins: number;
  tetromazeEscapesTotal: number;
  tetromazeEscapesRookie: number;
  tetromazeEscapesPulse: number;
  tetromazeEscapesApex: number;
  tetromazePowerUses: number;
  tetromazeCaptures: number;
  playerBehaviorByMode: Record<PlayerBehaviorMode, ModeBehaviorStats>;
  playerMistakesByMode: Record<PlayerBehaviorMode, MistakeStats>;
  playerMistakeLastSeenByMode: Record<PlayerBehaviorMode, MistakeLastSeenStats>;
  lastPlayedMode: PlayerBehaviorMode | null;
  mostPlayedMode: PlayerBehaviorMode | null;
  lowestWinrateMode: PlayerBehaviorMode | null;
  tetrobotProgression: PlayerBotProgression;
  tetrobotXpLedger: TetrobotXpLedger;
  tetrobotAffinityLedger: TetrobotAffinityLedger;
  playerLongTermMemory: PlayerLongTermMemory;
  tetrobotMemories: Record<TetrobotId, BotMemoryEntry[]>;
  lastTetrobotLevelUp: TetrobotLevelUp;
  activeTetrobotChallenge: TetrobotChallengeState | null;
  counters: Record<string, number>;
};

// Persistance locale des achievements + stats pour éviter un fetch constant.
const STORAGE_KEY = "tetris-roguelike-achievements";
const STATS_KEY = "tetris-roguelike-achievement-stats";

const DEFAULT_STATS: AchievementStats = {
  runsPlayed: 0,
  seedRuns: {},
  loginDays: [],
  historyViewedCount: 0,
  modesVisited: {
    CLASSIQUE: false,
    SPRINT: false,
    VERSUS: false,
    BRICKFALL_SOLO: false,
    BRICKFALL_VERSUS: false,
    ROGUELIKE: false,
    ROGUELIKE_VERSUS: false,
    PUZZLE: false,
    TETROMAZE: false,
  },
  level10Modes: {
    CLASSIQUE: false,
    SPRINT: false,
    VERSUS: false,
    BRICKFALL_SOLO: false,
    BRICKFALL_VERSUS: false,
    ROGUELIKE: false,
    ROGUELIKE_VERSUS: false,
    PUZZLE: false,
    TETROMAZE: false,
  },
  scoredModes: {
    CLASSIQUE: false,
    SPRINT: false,
    VERSUS: false,
    BRICKFALL_SOLO: false,
    BRICKFALL_VERSUS: false,
    ROGUELIKE: false,
    ROGUELIKE_VERSUS: false,
    PUZZLE: false,
    TETROMAZE: false,
  },
  playtimeMs: 0,
  noHoldRuns: 0,
  hardDropCount: 0,
  versusMatches: 0,
  versusWins: 0,
  versusWinStreak: 0,
  versusLinesSent: 0,
  botMatches: 0,
  botWins: 0,
  botWinStreak: 0,
  botApexWins: 0,
  roguelikeVersusMatches: 0,
  roguelikeVersusWins: 0,
  roguelikeVersusWinStreak: 0,
  roguelikeVersusLinesSent: 0,
  brickfallSoloLevelsCleared: 0,
  brickfallSoloBlocksDestroyed: 0,
  brickfallSoloBestWorld: 0,
  brickfallSoloCampaignCleared: false,
  brickfallSoloEditorCreated: 0,
  brickfallSoloEditorWins: 0,
  brickfallMatches: 0,
  brickfallWins: 0,
  brickfallArchitectWins: 0,
  brickfallDemolisherWins: 0,
  lastScore: null,
  puzzleCompletedIds: [],
  puzzleOptimalCount: 0,
  puzzleNoHoldCount: 0,
  puzzleSurviveCount: 0,
  puzzleFreeZonesTotal: 0,
  puzzleLinesTotal: 0,
  puzzleWinStreak: 0,
  puzzleAttemptsById: {},
  tetromazeRuns: 0,
  tetromazeWins: 0,
  tetromazeEscapesTotal: 0,
  tetromazeEscapesRookie: 0,
  tetromazeEscapesPulse: 0,
  tetromazeEscapesApex: 0,
  tetromazePowerUses: 0,
  tetromazeCaptures: 0,
  playerBehaviorByMode: createBehaviorByMode(),
  playerMistakesByMode: createMistakesByMode(),
  playerMistakeLastSeenByMode: createMistakeLastSeenByMode(),
  lastPlayedMode: null,
  mostPlayedMode: null,
  lowestWinrateMode: null,
  tetrobotProgression: createBotProgression(),
  tetrobotXpLedger: { ...DEFAULT_TETROBOT_XP_LEDGER },
  tetrobotAffinityLedger: { ...DEFAULT_TETROBOT_AFFINITY_LEDGER },
  playerLongTermMemory: { ...DEFAULT_PLAYER_LONG_TERM_MEMORY },
  tetrobotMemories: createTetrobotMemories(),
  lastTetrobotLevelUp: null,
  activeTetrobotChallenge: null,
  counters: {},
};

const mergeStats = (raw: Partial<AchievementStats> | null): AchievementStats => {
  if (!raw) return DEFAULT_STATS;
  return {
    ...DEFAULT_STATS,
    ...raw,
    seedRuns: { ...DEFAULT_STATS.seedRuns, ...(raw.seedRuns ?? {}) },
    modesVisited: { ...DEFAULT_STATS.modesVisited, ...(raw.modesVisited ?? {}) },
    level10Modes: { ...DEFAULT_STATS.level10Modes, ...(raw.level10Modes ?? {}) },
    scoredModes: { ...DEFAULT_STATS.scoredModes, ...(raw.scoredModes ?? {}) },
    puzzleCompletedIds: raw.puzzleCompletedIds ?? DEFAULT_STATS.puzzleCompletedIds,
    puzzleAttemptsById: {
      ...DEFAULT_STATS.puzzleAttemptsById,
      ...(raw.puzzleAttemptsById ?? {}),
    },
    playerBehaviorByMode: Object.fromEntries(
      PLAYER_BEHAVIOR_MODES.map((mode) => [
        mode,
        {
          ...DEFAULT_STATS.playerBehaviorByMode[mode],
          ...(raw.playerBehaviorByMode?.[mode] ?? {}),
        },
      ])
    ) as Record<PlayerBehaviorMode, ModeBehaviorStats>,
    playerMistakesByMode: {
      ...createMistakesByMode(),
      ...Object.fromEntries(
        Object.entries(raw.playerMistakesByMode ?? {}).map(([mode, mistakes]) => [
          mode,
          { ...EMPTY_MISTAKE_STATS, ...mistakes },
        ])
      ),
    } as Record<PlayerBehaviorMode, MistakeStats>,
    playerMistakeLastSeenByMode: {
      ...createMistakeLastSeenByMode(),
      ...Object.fromEntries(
        Object.entries(raw.playerMistakeLastSeenByMode ?? {}).map(([mode, seen]) => [
          mode,
          { ...EMPTY_MISTAKE_LAST_SEEN, ...seen },
        ])
      ),
    } as Record<PlayerBehaviorMode, MistakeLastSeenStats>,
    tetrobotProgression: {
      ...createBotProgression(),
      ...Object.fromEntries(
        Object.entries(raw.tetrobotProgression ?? {}).map(([bot, state]) => [
          bot,
          {
            ...DEFAULT_BOT_STATE,
            ...state,
            unlockedTraits: (state?.unlockedTraits ?? []).filter(Boolean) as BotTrait[],
          },
        ])
      ),
    } as PlayerBotProgression,
    tetrobotXpLedger: {
      ...DEFAULT_TETROBOT_XP_LEDGER,
      ...(raw.tetrobotXpLedger ?? {}),
    },
    tetrobotAffinityLedger: {
      ...DEFAULT_TETROBOT_AFFINITY_LEDGER,
      ...(raw.tetrobotAffinityLedger ?? {}),
    },
    playerLongTermMemory: {
      ...DEFAULT_PLAYER_LONG_TERM_MEMORY,
      ...(raw.playerLongTermMemory ?? {}),
      recurringMistakes:
        (raw.playerLongTermMemory?.recurringMistakes as MistakeMemory[] | undefined) ?? [],
    },
    tetrobotMemories: {
      ...createTetrobotMemories(),
      ...Object.fromEntries(
        Object.entries(raw.tetrobotMemories ?? {}).map(([bot, entries]) => [bot, entries ?? []])
      ),
    } as Record<TetrobotId, BotMemoryEntry[]>,
    lastTetrobotLevelUp: raw.lastTetrobotLevelUp ?? null,
    activeTetrobotChallenge:
      (raw.activeTetrobotChallenge as TetrobotChallengeState | null | undefined) ?? null,
    counters: { ...DEFAULT_STATS.counters, ...(raw.counters ?? {}) },
  };
};

type UseAchievementsValue = {
  achievements: Array<Achievement & { unlocked: boolean; unlockedAt?: number }>;
  unlockedIds: string[];
  stats: AchievementStats;
  recentUnlocks: Achievement[];
  clearRecent: () => void;
  updateStats: (updater: (prev: AchievementStats) => AchievementStats) => AchievementStats;
  recordPlayerBehavior: (event: PlayerBehaviorEvent) => AchievementStats;
  syncTetrobotProgression: () => AchievementStats;
  setLastTetrobotTip: (bot: TetrobotId, tip: string) => AchievementStats;
  setTetrobotMood: (bot: TetrobotId, affinity: number) => AchievementStats;
  clearLastTetrobotLevelUp: () => AchievementStats;
  acceptActiveTetrobotChallenge: () => AchievementStats;
  registerRun: (seed?: string) => { runsPlayed: number; sameSeedRuns: number };
  checkAchievements: (ctx: AchievementContext) => void;
};

const AchievementsContext = createContext<UseAchievementsValue | null>(null);

function useAchievementsValue(): UseAchievementsValue {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<AchievementState[]>([]);
  const [recent, setRecent] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats>(() => {
    const rawStats = localStorage.getItem(STATS_KEY);
    return rawStats ? mergeStats(JSON.parse(rawStats)) : DEFAULT_STATS;
  });
  const statsRef = useRef(stats);
  const unlockedRef = useRef(unlocked);
  const remoteStatsReadyRef = useRef(false);

  const areArraysEqual = (a: string[], b: string[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  const areRecordNumbersEqual = (
    a: Record<string, number>,
    b: Record<string, number>
  ) => {
    if (a === b) return true;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  };

  const areRecordBooleansEqual = <T extends Record<string, boolean>>(
    a: T,
    b: T
  ) => {
    if (a === b) return true;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  };

  const areModeBehaviorStatsEqual = (
    a: Record<PlayerBehaviorMode, ModeBehaviorStats>,
    b: Record<PlayerBehaviorMode, ModeBehaviorStats>
  ) =>
    PLAYER_BEHAVIOR_MODES.every((mode) => {
      const left = a[mode];
      const right = b[mode];
      return (
        left.sessions === right.sessions &&
        left.wins === right.wins &&
        left.losses === right.losses &&
        left.totalDurationMs === right.totalDurationMs &&
        left.lastPlayedAt === right.lastPlayedAt
      );
    });

  const areMistakeStatsEqual = (
    a: Record<PlayerBehaviorMode, MistakeStats>,
    b: Record<PlayerBehaviorMode, MistakeStats>
  ) =>
    PLAYER_BEHAVIOR_MODES.every((mode) =>
      Object.keys(EMPTY_MISTAKE_STATS).every((key) => {
        const typedKey = key as PlayerMistakeKey;
        return a[mode][typedKey] === b[mode][typedKey];
      })
    );

  const areMistakeLastSeenEqual = (
    a: Record<PlayerBehaviorMode, MistakeLastSeenStats>,
    b: Record<PlayerBehaviorMode, MistakeLastSeenStats>
  ) =>
    PLAYER_BEHAVIOR_MODES.every((mode) =>
      Object.keys(EMPTY_MISTAKE_LAST_SEEN).every((key) => {
        const typedKey = key as PlayerMistakeKey;
        return a[mode][typedKey] === b[mode][typedKey];
      })
    );

  const areBotProgressionEqual = (a: PlayerBotProgression, b: PlayerBotProgression) =>
    TETROBOT_IDS.every((bot) => {
      const left = a[bot];
      const right = b[bot];
      return (
        left.level === right.level &&
        left.xp === right.xp &&
        left.affinity === right.affinity &&
        left.mood === right.mood &&
        areArraysEqual(left.unlockedTraits, right.unlockedTraits) &&
        left.lastTip === right.lastTip
      );
    });

  const areChallengesEqual = (
    a: TetrobotChallengeState | null,
    b: TetrobotChallengeState | null
  ) => JSON.stringify(a) === JSON.stringify(b);

  const areTetrobotLevelUpsEqual = (a: TetrobotLevelUp, b: TetrobotLevelUp) => {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
      a.bot === b.bot &&
      a.level === b.level &&
      a.message === b.message &&
      a.at === b.at &&
      areArraysEqual(a.unlockedTraits, b.unlockedTraits)
    );
  };

  const areMemoriesEqual = (
    a: Record<TetrobotId, BotMemoryEntry[]>,
    b: Record<TetrobotId, BotMemoryEntry[]>
  ) =>
    TETROBOT_IDS.every((bot) => JSON.stringify(a[bot]) === JSON.stringify(b[bot]));

  const areStatsEqual = (a: AchievementStats, b: AchievementStats) => {
    if (a === b) return true;
    return (
      a.runsPlayed === b.runsPlayed &&
      areRecordNumbersEqual(a.seedRuns, b.seedRuns) &&
      areArraysEqual(a.loginDays, b.loginDays) &&
      a.historyViewedCount === b.historyViewedCount &&
      areRecordBooleansEqual(a.modesVisited, b.modesVisited) &&
      areRecordBooleansEqual(a.level10Modes, b.level10Modes) &&
      areRecordBooleansEqual(a.scoredModes, b.scoredModes) &&
      a.playtimeMs === b.playtimeMs &&
      a.noHoldRuns === b.noHoldRuns &&
      a.hardDropCount === b.hardDropCount &&
      a.versusMatches === b.versusMatches &&
      a.versusWins === b.versusWins &&
      a.versusWinStreak === b.versusWinStreak &&
      a.versusLinesSent === b.versusLinesSent &&
      a.botMatches === b.botMatches &&
      a.botWins === b.botWins &&
      a.botWinStreak === b.botWinStreak &&
      a.botApexWins === b.botApexWins &&
      a.roguelikeVersusMatches === b.roguelikeVersusMatches &&
      a.roguelikeVersusWins === b.roguelikeVersusWins &&
      a.roguelikeVersusWinStreak === b.roguelikeVersusWinStreak &&
      a.roguelikeVersusLinesSent === b.roguelikeVersusLinesSent &&
      a.brickfallSoloLevelsCleared === b.brickfallSoloLevelsCleared &&
      a.brickfallSoloBlocksDestroyed === b.brickfallSoloBlocksDestroyed &&
      a.brickfallSoloBestWorld === b.brickfallSoloBestWorld &&
      a.brickfallSoloCampaignCleared === b.brickfallSoloCampaignCleared &&
      a.brickfallSoloEditorCreated === b.brickfallSoloEditorCreated &&
      a.brickfallSoloEditorWins === b.brickfallSoloEditorWins &&
      a.brickfallMatches === b.brickfallMatches &&
      a.brickfallWins === b.brickfallWins &&
      a.brickfallArchitectWins === b.brickfallArchitectWins &&
      a.brickfallDemolisherWins === b.brickfallDemolisherWins &&
      a.lastScore === b.lastScore &&
      areArraysEqual(a.puzzleCompletedIds, b.puzzleCompletedIds) &&
      a.puzzleOptimalCount === b.puzzleOptimalCount &&
      a.puzzleNoHoldCount === b.puzzleNoHoldCount &&
      a.puzzleSurviveCount === b.puzzleSurviveCount &&
      a.puzzleFreeZonesTotal === b.puzzleFreeZonesTotal &&
      a.puzzleLinesTotal === b.puzzleLinesTotal &&
      a.puzzleWinStreak === b.puzzleWinStreak &&
      areRecordNumbersEqual(a.puzzleAttemptsById, b.puzzleAttemptsById) &&
      a.tetromazeRuns === b.tetromazeRuns &&
      a.tetromazeWins === b.tetromazeWins &&
      a.tetromazeEscapesTotal === b.tetromazeEscapesTotal &&
      a.tetromazeEscapesRookie === b.tetromazeEscapesRookie &&
      a.tetromazeEscapesPulse === b.tetromazeEscapesPulse &&
      a.tetromazeEscapesApex === b.tetromazeEscapesApex &&
      a.tetromazePowerUses === b.tetromazePowerUses &&
      a.tetromazeCaptures === b.tetromazeCaptures &&
      areModeBehaviorStatsEqual(a.playerBehaviorByMode, b.playerBehaviorByMode) &&
      areMistakeStatsEqual(a.playerMistakesByMode, b.playerMistakesByMode) &&
      areMistakeLastSeenEqual(a.playerMistakeLastSeenByMode, b.playerMistakeLastSeenByMode) &&
      a.lastPlayedMode === b.lastPlayedMode &&
      a.mostPlayedMode === b.mostPlayedMode &&
      a.lowestWinrateMode === b.lowestWinrateMode &&
      areBotProgressionEqual(a.tetrobotProgression, b.tetrobotProgression) &&
      areRecordNumbersEqual(a.tetrobotXpLedger, b.tetrobotXpLedger) &&
      areRecordNumbersEqual(a.tetrobotAffinityLedger, b.tetrobotAffinityLedger) &&
      JSON.stringify(a.playerLongTermMemory) === JSON.stringify(b.playerLongTermMemory) &&
      areMemoriesEqual(a.tetrobotMemories, b.tetrobotMemories) &&
      areTetrobotLevelUpsEqual(a.lastTetrobotLevelUp, b.lastTetrobotLevelUp) &&
      areChallengesEqual(a.activeTetrobotChallenge, b.activeTetrobotChallenge) &&
      areRecordNumbersEqual(a.counters, b.counters)
    );
  };

  // ─────────────────────────────
  // LOAD
  // ─────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setUnlocked(JSON.parse(raw));
  }, []);

  // ─────────────────────────────
  // SAVE
  // ─────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
  }, [unlocked]);

  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadFromBackend = async () => {
      try {
        const remote = await fetchUnlockedAchievements();
        if (!active) return;
        if (!remote.length) return;

        setUnlocked((prev) => {
          const merged = new Map<string, AchievementState>();
          for (const entry of prev) {
            merged.set(entry.id, entry);
          }
          for (const entry of remote) {
            const existing = merged.get(entry.id);
            if (!existing || existing.unlockedAt > entry.unlockedAt) {
              merged.set(entry.id, entry);
            }
          }
          return Array.from(merged.values());
        });
      } catch {
        // silent fallback to localStorage
      }
    };

    loadFromBackend();
    return () => {
      active = false;
    };
  }, [user]);

  const isUnlocked = useCallback(
    (id: string) => unlockedRef.current.some((a) => a.id === id),
    []
  );

  // Met à jour les stats locales (et persiste) via un updater fonctionnel.
  const updateStats = useCallback(
    (updater: (prev: AchievementStats) => AchievementStats) => {
      const next = updater(statsRef.current);
      if (!areStatsEqual(next, statsRef.current)) {
        statsRef.current = next;
        setStats(next);
      }
      return next;
    },
    []
  );

  useEffect(() => {
    const curiousUnlocked = unlocked.some((entry) => entry.id === "global-curious");
    if (!curiousUnlocked) return;

    const allVisited = Object.values(statsRef.current.modesVisited).every(Boolean);
    if (allVisited) return;

    updateStats((prev) => ({
      ...prev,
      modesVisited: Object.fromEntries(
        Object.keys(prev.modesVisited).map((mode) => [mode, true])
      ) as AchievementStats["modesVisited"],
    }));
  }, [unlocked, updateStats]);

  const recordPlayerBehavior = useCallback(
    (event: PlayerBehaviorEvent) =>
      updateStats((prev) => {
        const now = Date.now();
        const previousModeStats = prev.playerBehaviorByMode[event.mode] ?? {
          sessions: 0,
          wins: 0,
          losses: 0,
          totalDurationMs: 0,
          lastPlayedAt: null,
        };

        const playerBehaviorByMode = {
          ...prev.playerBehaviorByMode,
          [event.mode]: {
            sessions: previousModeStats.sessions + 1,
            wins: previousModeStats.wins + (event.won ? 1 : 0),
            losses: previousModeStats.losses + (event.won === false ? 1 : 0),
            totalDurationMs: previousModeStats.totalDurationMs + Math.max(0, event.durationMs ?? 0),
            lastPlayedAt: now,
          },
        };

        const previousMistakes = prev.playerMistakesByMode[event.mode] ?? EMPTY_MISTAKE_STATS;
        const nextMistakes = { ...previousMistakes };
        const previousLastSeen = prev.playerMistakeLastSeenByMode[event.mode] ?? EMPTY_MISTAKE_LAST_SEEN;
        const nextLastSeen = { ...previousLastSeen };
        for (const mistake of event.mistakes ?? []) {
          nextMistakes[mistake] = (nextMistakes[mistake] ?? 0) + 1;
          nextLastSeen[mistake] = now;
        }

        const playerMistakesByMode = {
          ...prev.playerMistakesByMode,
          [event.mode]: nextMistakes,
        };

        const playerMistakeLastSeenByMode = {
          ...prev.playerMistakeLastSeenByMode,
          [event.mode]: nextLastSeen,
        };

        const estimatedRageQuit =
          event.won === false && (event.durationMs ?? 0) > 0 && (event.durationMs ?? 0) < 90_000;
        const comebackWin =
          event.won === true &&
          previousModeStats.losses > previousModeStats.wins &&
          previousModeStats.sessions >= 2;

        const mostPlayedMode =
          [...PLAYER_BEHAVIOR_MODES]
            .sort((a, b) => {
              const left = playerBehaviorByMode[a];
              const right = playerBehaviorByMode[b];
              return (
                right.sessions - left.sessions ||
                (right.lastPlayedAt ?? 0) - (left.lastPlayedAt ?? 0)
              );
            })
            .find((mode) => playerBehaviorByMode[mode].sessions > 0) ?? null;

        const lowestWinrateMode =
          [...PLAYER_BEHAVIOR_MODES]
            .filter((mode) => playerBehaviorByMode[mode].sessions > 0)
            .sort((a, b) => {
              const left = playerBehaviorByMode[a];
              const right = playerBehaviorByMode[b];
              const leftRate = left.sessions > 0 ? left.wins / left.sessions : 1;
              const rightRate = right.sessions > 0 ? right.wins / right.sessions : 1;
              return leftRate - rightRate || right.sessions - left.sessions;
            })[0] ?? null;

        return {
          ...prev,
          playerBehaviorByMode,
          playerMistakesByMode,
          playerMistakeLastSeenByMode,
          lastPlayedMode: event.mode,
          mostPlayedMode,
          lowestWinrateMode,
          counters: {
            ...prev.counters,
            rage_quit_estimate:
              (prev.counters.rage_quit_estimate ?? 0) + (estimatedRageQuit ? 1 : 0),
            comeback_estimate:
              (prev.counters.comeback_estimate ?? 0) + (comebackWin ? 1 : 0),
          },
        };
      }),
    [updateStats]
  );

  const syncTetrobotProgression = useCallback(
    () =>
      updateStats((prev) => {
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
          rage_quit: Math.max(
            0,
            nextAffinityLedger.rage_quit - prev.tetrobotAffinityLedger.rage_quit
          ),
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

        const progression: PlayerBotProgression = {
          rookie: { ...prev.tetrobotProgression.rookie },
          pulse: { ...prev.tetrobotProgression.pulse },
          apex: { ...prev.tetrobotProgression.apex },
        };
        const memories: Record<TetrobotId, BotMemoryEntry[]> = {
          rookie: [...prev.tetrobotMemories.rookie],
          pulse: [...prev.tetrobotMemories.pulse],
          apex: [...prev.tetrobotMemories.apex],
        };
        let activeTetrobotChallenge = prev.activeTetrobotChallenge;

        let lastLevelUp = prev.lastTetrobotLevelUp;
        let changed = false;
        const now = Date.now();

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
              message:
                TETROBOT_LEVEL_UP_MESSAGES[bot][nextLevel] ??
                `${bot} evolue niveau ${nextLevel}.`,
              at: Date.now(),
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
          const nextAffinity = clampAffinity(
            current.affinity + updateAffinity(bot, event) * occurrences
          );
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
        const avoidedModeEntries = PLAYER_BEHAVIOR_MODES.map(
          (mode): [PlayerBehaviorMode, number] => {
            const sessions = prev.playerBehaviorByMode[mode].sessions;
            return [mode, Math.max(0, totalSessions - sessions)];
          }
        ).filter(([, count]) => count > 0);
        const avoidedModes = Object.fromEntries(avoidedModeEntries);
        const aggregatedMistakes = Object.keys(EMPTY_MISTAKE_STATS).map((key) => {
          const typedKey = key as PlayerMistakeKey;
          const count = PLAYER_BEHAVIOR_MODES.reduce(
            (sum, mode) => sum + (prev.playerMistakesByMode[mode][typedKey] ?? 0),
            0
          );
          const previousCount =
            prev.playerLongTermMemory.recurringMistakes.find((entry) => entry.key === typedKey)
              ?.count ?? count;
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
        }).filter(Boolean) as MistakeMemory[];

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
          pushMemory(
            "rookie",
            "player_comeback",
            "Tu es revenu apres plusieurs echecs sans abandonner.",
            3
          );
        }
        if (affinityDeltas.improve_stat > 0) {
          pushMemory(
            "pulse",
            "player_progress",
            "Ta progression recente est assez nette pour etre mesuree.",
            4
          );
        }
        if ((playerLongTermMemory.avoidedModes[prev.lowestWinrateMode ?? ""] ?? 0) >= 5) {
          pushMemory(
            "apex",
            "player_avoidance",
            `Tu evites encore ${prev.lowestWinrateMode ?? "ton point faible"}.`,
            5
          );
        }
        if (getApexTrustState(playerLongTermMemory, progression.apex.affinity) === "refusing") {
          pushMemory(
            "apex",
            "trust_break",
            "Je refuse de te conseiller tant que tu contournes le vrai travail.",
            5
          );
        }
        if (
          getApexTrustState(playerLongTermMemory, progression.apex.affinity) === "open" &&
          prev.tetrobotMemories.apex.some((entry) => entry.type === "trust_break")
        ) {
          pushMemory(
            "apex",
            "trust_rebuild",
            "Bien. Tu t'es enfin presente. On peut reprendre.",
            5
          );
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
          const modeSessions =
            prev.playerBehaviorByMode[activeTetrobotChallenge.targetMode].sessions;
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
            const nextAffinity = clampAffinity(
              progression.apex.affinity + activeTetrobotChallenge.rewardAffinity
            );
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
                message:
                  TETROBOT_LEVEL_UP_MESSAGES.apex[nextLevel] ??
                  `apex evolue niveau ${nextLevel}.`,
                at: Date.now(),
              };
            }

            activeTetrobotChallenge = {
              ...activeTetrobotChallenge,
              status: "completed",
              progress: activeTetrobotChallenge.targetCount,
              resolvedAt: now,
            };
            pushMemory(
              "apex",
              "trust_rebuild",
              "Tu as accepte le defi d'Apex et tu l'as termine sans fuir.",
              5
            );
            changed = true;
          }
        }

        if (
          !changed &&
          areRecordNumbersEqual(prev.tetrobotXpLedger, nextLedger) &&
          areRecordNumbersEqual(prev.tetrobotAffinityLedger, nextAffinityLedger) &&
          JSON.stringify(prev.playerLongTermMemory) === JSON.stringify(playerLongTermMemory) &&
          areMemoriesEqual(prev.tetrobotMemories, memories) &&
          areChallengesEqual(prev.activeTetrobotChallenge, activeTetrobotChallenge)
        ) {
          return prev;
        }

        return {
          ...prev,
          tetrobotProgression: progression,
          tetrobotXpLedger: nextLedger,
          tetrobotAffinityLedger: nextAffinityLedger,
          playerLongTermMemory,
          tetrobotMemories: memories,
          lastTetrobotLevelUp: lastLevelUp,
          activeTetrobotChallenge,
        };
      }),
    [updateStats]
  );

  const setLastTetrobotTip = useCallback(
    (bot: TetrobotId, tip: string) =>
      updateStats((prev) => ({
        ...prev,
        tetrobotProgression: {
          ...prev.tetrobotProgression,
          [bot]: {
            ...prev.tetrobotProgression[bot],
            lastTip: tip,
          },
        },
      })),
    [updateStats]
  );

  const setTetrobotMood = useCallback(
    (bot: TetrobotId, affinity: number) =>
      updateStats((prev) => ({
        ...prev,
        tetrobotProgression: {
          ...prev.tetrobotProgression,
          [bot]: {
            ...prev.tetrobotProgression[bot],
            affinity: clampAffinity(affinity),
            mood: getMood(affinity),
          },
        },
      })),
    [updateStats]
  );

  const clearLastTetrobotLevelUp = useCallback(
    () =>
      updateStats((prev) => ({
        ...prev,
        lastTetrobotLevelUp: null,
      })),
    [updateStats]
  );

  const acceptActiveTetrobotChallenge = useCallback(
    () =>
      updateStats((prev) => {
        if (!prev.activeTetrobotChallenge || prev.activeTetrobotChallenge.status !== "offered") {
          return prev;
        }

        return {
          ...prev,
          activeTetrobotChallenge: {
            ...prev.activeTetrobotChallenge,
            status: "active",
            acceptedAt: Date.now(),
          },
        };
      }),
    [updateStats]
  );

  // Enregistre une nouvelle run (utilisé pour les achievements liés aux runs/seed).
  const registerRun = useCallback(
    (seed?: string) => {
      let sameSeedRuns = 0;
      const next = updateStats((prev) => {
        const seedRuns = { ...prev.seedRuns };
        const runsPlayed = prev.runsPlayed + 1;
        if (seed) {
          seedRuns[seed] = (seedRuns[seed] ?? 0) + 1;
          sameSeedRuns = seedRuns[seed];
        }
        return {
          ...prev,
          runsPlayed,
          seedRuns,
        };
      });
      return { runsPlayed: next.runsPlayed, sameSeedRuns };
    },
    [updateStats]
  );

  // ─────────────────────────────
  // CHECKER
  // ─────────────────────────────
  // Évalue l’ensemble des achievements à partir d’un contexte d’événement.
  const checkAchievements = useCallback(
    (ctx: AchievementContext) => {
      const newlyUnlocked: Achievement[] = [];
      const currentStats = statsRef.current;
      const currentUnlockedCount = unlockedRef.current.length;

      for (const achievement of ACHIEVEMENTS) {
        if (isUnlocked(achievement.id)) continue;
        if (achievement.mode && achievement.mode !== "ALL") {
          if (ctx.mode !== achievement.mode) continue;
        }

        const c = achievement.condition;
        let ok = false;

        switch (c.type) {
          case "runs_played":
            ok = (ctx.runsPlayed ?? currentStats.runsPlayed) >= c.count;
            break;

          case "score_reached":
            ok = (ctx.score ?? 0) >= c.score;
            break;

          case "level_reached":
            ok = (ctx.level ?? 0) >= c.level;
            break;

          case "lines_cleared":
            ok = (ctx.lines ?? 0) >= c.lines;
            break;

          case "tetris_cleared":
            ok = ctx.tetrisCleared === true;
            break;

          case "bombs_used":
            ok = (ctx.bombsUsed ?? 0) >= c.count;
            break;

          case "no_bomb_run":
            ok = (ctx.bombsUsed ?? 0) === 0;
            break;

          case "perk_count":
            ok = (ctx.perks?.length ?? 0) >= c.count;
            break;

          case "synergy_count":
            ok = (ctx.synergies?.length ?? 0) >= c.count;
            break;

          case "synergy_activated":
            ok = ctx.synergies?.includes(c.id) ?? false;
            break;

          case "mutation_count":
            ok = (ctx.mutations?.length ?? 0) >= c.count;
            break;

          case "chaos_mode_run":
            ok = ctx.chaosMode === true;
            break;

          case "second_chance_used":
            ok = ctx.usedSecondChance === true;
            break;

          case "seed_used":
            ok = ctx.seed === c.seed;
            break;

          case "seed_score":
            ok = ctx.seed === c.seed && (ctx.score ?? 0) >= c.score;
            break;

          case "same_seed_runs":
            ok =
              (ctx.sameSeedRuns ??
                (ctx.seed ? currentStats.seedRuns[ctx.seed] ?? 0 : 0)) >= c.count;
            break;

          case "history_viewed":
            ok = (ctx.historyViewedCount ?? currentStats.historyViewedCount) >= c.count;
            break;

          case "counter":
            ok = (ctx.counters?.[c.key] ?? currentStats.counters[c.key] ?? 0) >= c.value;
            break;

          case "custom":
            if (c.key === "achievements_50_percent") {
              const total = Math.max(1, ACHIEVEMENTS.length - 1);
              ok = currentUnlockedCount / total >= 0.5;
            } else if (c.key === "achievements_100_percent") {
              const total = Math.max(1, ACHIEVEMENTS.length - 1);
              ok = currentUnlockedCount >= total;
            } else {
              ok = Boolean(ctx.custom?.[c.key]);
            }
            break;

          default:
            break;
        }

        if (ok) {
          newlyUnlocked.push(achievement);
        }
      }

      if (newlyUnlocked.length) {
        setUnlocked((prev) => {
          const next = [
            ...prev,
            ...newlyUnlocked.map((a) => ({
              id: a.id,
              unlockedAt: Date.now(),
            })),
          ];
          unlockedRef.current = next;
          return next;
        });

        if (user) {
          unlockAchievements(
            newlyUnlocked.map((a) => ({
              id: a.id,
              name: a.name,
              description: a.description,
              icon: a.icon,
              category: "general",
              hidden: a.secret ?? false,
            }))
          ).catch(() => {
            // keep local unlock even if backend failed
          });
        }

        setRecent(newlyUnlocked);
      }
    },
    [isUnlocked, user]
  );

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadStats = async () => {
      try {
        const remote = await fetchAchievementStats();
        if (!active) return;
        const next = updateStats((prev) => {
          const uniqueDays = new Set(remote.loginDays ?? prev.loginDays);
          return {
            ...prev,
            loginDays: Array.from(uniqueDays),
            tetrobotProgression: {
              ...prev.tetrobotProgression,
              ...Object.fromEntries(
                Object.entries((remote.tetrobotProgression ?? {}) as Record<string, Partial<BotState>>)
                  .filter(([bot]) => TETROBOT_IDS.includes(bot as TetrobotId))
                  .map(([bot, state]) => {
                    const affinity = clampAffinity(state.affinity ?? prev.tetrobotProgression[bot as TetrobotId].affinity);
                    return [
                      bot,
                      {
                        ...prev.tetrobotProgression[bot as TetrobotId],
                        ...state,
                        affinity,
                        mood: getMood(affinity),
                      },
                    ];
                  })
              ),
            },
            tetrobotXpLedger: {
              ...prev.tetrobotXpLedger,
              ...((remote.tetrobotXpLedger ?? {}) as Partial<TetrobotXpLedger>),
            },
            tetrobotAffinityLedger: {
              ...prev.tetrobotAffinityLedger,
              ...((remote.tetrobotAffinityLedger ?? {}) as Partial<TetrobotAffinityLedger>),
            },
            playerLongTermMemory: {
              ...prev.playerLongTermMemory,
              ...((remote.playerLongTermMemory ?? {}) as Partial<PlayerLongTermMemory>),
              recurringMistakes:
                ((remote.playerLongTermMemory as Partial<PlayerLongTermMemory> | undefined)
                  ?.recurringMistakes as MistakeMemory[] | undefined) ??
                prev.playerLongTermMemory.recurringMistakes,
            },
            tetrobotMemories: {
              ...prev.tetrobotMemories,
              ...((remote.tetrobotMemories ?? {}) as Partial<Record<TetrobotId, BotMemoryEntry[]>>),
            },
            lastTetrobotLevelUp: (remote.lastTetrobotLevelUp as TetrobotLevelUp | null) ?? prev.lastTetrobotLevelUp,
            activeTetrobotChallenge:
              (remote.activeTetrobotChallenge as TetrobotChallengeState | null | undefined) ??
              prev.activeTetrobotChallenge,
          };
        });
        remoteStatsReadyRef.current = true;
        checkAchievements({
          custom: {
            login_days_7: next.loginDays.length >= 7,
            login_days_30: next.loginDays.length >= 30,
          },
        });
      } catch {
        remoteStatsReadyRef.current = true;
        // silent fallback to localStorage
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, [checkAchievements, updateStats, user]);

  useEffect(() => {
    if (!user) return;
    if (!remoteStatsReadyRef.current) return;

    saveAchievementStats({
      loginDays: stats.loginDays,
      tetrobotProgression: stats.tetrobotProgression as unknown as Record<string, unknown>,
      tetrobotXpLedger: stats.tetrobotXpLedger as unknown as Record<string, unknown>,
      tetrobotAffinityLedger: stats.tetrobotAffinityLedger as unknown as Record<string, unknown>,
      playerLongTermMemory: stats.playerLongTermMemory as unknown as Record<string, unknown>,
      tetrobotMemories: stats.tetrobotMemories as unknown as Record<string, unknown>,
      lastTetrobotLevelUp: stats.lastTetrobotLevelUp as unknown as Record<string, unknown> | null,
      activeTetrobotChallenge:
        stats.activeTetrobotChallenge as unknown as Record<string, unknown> | null,
    }).catch(() => {});
  }, [
    stats.activeTetrobotChallenge,
    stats.lastTetrobotLevelUp,
    stats.loginDays,
    stats.tetrobotAffinityLedger,
    stats.playerLongTermMemory,
    stats.tetrobotMemories,
    stats.tetrobotProgression,
    stats.tetrobotXpLedger,
    user,
  ]);

  // ─────────────────────────────
  // API
  // ─────────────────────────────
  return {
    achievements: ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: isUnlocked(a.id),
      unlockedAt: unlocked.find((u) => u.id === a.id)?.unlockedAt,
    })),

    unlockedIds: unlocked.map((a) => a.id),
    stats,

    recentUnlocks: recent,
    clearRecent: () => setRecent([]),

    updateStats,
    recordPlayerBehavior,
    syncTetrobotProgression,
    setLastTetrobotTip,
    setTetrobotMood,
    clearLastTetrobotLevelUp,
    acceptActiveTetrobotChallenge,
    registerRun,
    checkAchievements,
  };
}

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const value = useAchievementsValue();
  return createElement(AchievementsContext.Provider, { value }, children);
}

export function useAchievements() {
  const value = useContext(AchievementsContext);
  if (!value) {
    throw new Error("useAchievements must be used within AchievementsProvider");
  }
  return value;
}
