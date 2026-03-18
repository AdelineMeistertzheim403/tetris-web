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
  | "misread";

type ModeBehaviorStats = {
  sessions: number;
  wins: number;
  losses: number;
  totalDurationMs: number;
  lastPlayedAt: number | null;
};

type MistakeStats = Record<PlayerMistakeKey, number>;

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
  lastPlayedMode: PlayerBehaviorMode | null;
  mostPlayedMode: PlayerBehaviorMode | null;
  lowestWinrateMode: PlayerBehaviorMode | null;
  tetrobotProgression: PlayerBotProgression;
  tetrobotXpLedger: TetrobotXpLedger;
  tetrobotAffinityLedger: TetrobotAffinityLedger;
  lastTetrobotLevelUp: TetrobotLevelUp;
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
  lastPlayedMode: null,
  mostPlayedMode: null,
  lowestWinrateMode: null,
  tetrobotProgression: createBotProgression(),
  tetrobotXpLedger: { ...DEFAULT_TETROBOT_XP_LEDGER },
  tetrobotAffinityLedger: { ...DEFAULT_TETROBOT_AFFINITY_LEDGER },
  lastTetrobotLevelUp: null,
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
    lastTetrobotLevelUp: raw.lastTetrobotLevelUp ?? null,
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
      a.lastPlayedMode === b.lastPlayedMode &&
      a.mostPlayedMode === b.mostPlayedMode &&
      a.lowestWinrateMode === b.lowestWinrateMode &&
      areBotProgressionEqual(a.tetrobotProgression, b.tetrobotProgression) &&
      areRecordNumbersEqual(a.tetrobotXpLedger, b.tetrobotXpLedger) &&
      areRecordNumbersEqual(a.tetrobotAffinityLedger, b.tetrobotAffinityLedger) &&
      areTetrobotLevelUpsEqual(a.lastTetrobotLevelUp, b.lastTetrobotLevelUp) &&
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
        for (const mistake of event.mistakes ?? []) {
          nextMistakes[mistake] = (nextMistakes[mistake] ?? 0) + 1;
        }

        const playerMistakesByMode = {
          ...prev.playerMistakesByMode,
          [event.mode]: nextMistakes,
        };

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
          lastPlayedMode: event.mode,
          mostPlayedMode,
          lowestWinrateMode,
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

        let lastLevelUp = prev.lastTetrobotLevelUp;
        let changed = false;

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

        if (
          !changed &&
          areRecordNumbersEqual(prev.tetrobotXpLedger, nextLedger) &&
          areRecordNumbersEqual(prev.tetrobotAffinityLedger, nextAffinityLedger)
        ) {
          return prev;
        }

        return {
          ...prev,
          tetrobotProgression: progression,
          tetrobotXpLedger: nextLedger,
          tetrobotAffinityLedger: nextAffinityLedger,
          lastTetrobotLevelUp: lastLevelUp,
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
            lastTetrobotLevelUp: (remote.lastTetrobotLevelUp as TetrobotLevelUp | null) ?? prev.lastTetrobotLevelUp,
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
      lastTetrobotLevelUp: stats.lastTetrobotLevelUp as unknown as Record<string, unknown> | null,
    }).catch(() => {});
  }, [
    stats.lastTetrobotLevelUp,
    stats.loginDays,
    stats.tetrobotAffinityLedger,
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
