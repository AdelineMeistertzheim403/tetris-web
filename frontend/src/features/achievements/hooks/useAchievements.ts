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
import type {
  BotMemoryEntry,
  BotState,
  BotTrait,
  MistakeLastSeenStats,
  MistakeMemory,
  MistakeStats,
  ModeBehaviorStats,
  PlayerBehaviorEvent,
  PlayerBehaviorMode,
  PlayerBotProgression,
  PlayerLongTermMemory,
  PlayerMistakeKey,
  TetrobotAffinityLedger,
  TetrobotAchievementEvent,
  TetrobotChallengeState,
  TetrobotId,
  TetrobotLevelUp,
  TetrobotXpLedger,
} from "../types/tetrobots";
import {
  fetchUnlockedAchievements,
  fetchAchievementStats,
  saveAchievementStats,
  unlockAchievements,
} from "../services/achievementService";
import {
  getApexTrustState as getApexTrustStateFromLogic,
  getDerivedCounterValue,
  getDerivedCustomAchievementValue,
} from "../lib/tetrobotAchievementLogic";
import {
  getMood,
  syncTetrobotProgressionState,
} from "../lib/tetrobotProgressionLogic";

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

function clampAffinity(value: number) {
  return Math.max(-100, Math.min(100, value));
}

export const getApexTrustState = getApexTrustStateFromLogic;

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
  achievements: Array<
    Achievement & {
      unlocked: boolean;
      unlockedAt?: number;
      progress?: { current: number; target: number; label?: string };
    }
  >;
  unlockedIds: string[];
  stats: AchievementStats;
  recentUnlocks: Achievement[];
  clearRecent: () => void;
  updateStats: (updater: (prev: AchievementStats) => AchievementStats) => AchievementStats;
  recordPlayerBehavior: (event: PlayerBehaviorEvent) => AchievementStats;
  syncTetrobotProgression: () => AchievementStats;
  setLastTetrobotTip: (bot: TetrobotId, tip: string) => AchievementStats;
  recordTetrobotEvent: (event: TetrobotAchievementEvent) => AchievementStats;
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

  const getAchievementProgress = useCallback(
    (achievement: Achievement) => {
      const currentStats = statsRef.current;
      const highestBotLevel = Math.max(
        currentStats.tetrobotProgression.rookie.level,
        currentStats.tetrobotProgression.pulse.level,
        currentStats.tetrobotProgression.apex.level
      );
      const weakMode = currentStats.lowestWinrateMode;
      const weakModeSessions = weakMode
        ? currentStats.playerBehaviorByMode[weakMode]?.sessions ?? 0
        : 0;
      const weakModeWins = weakMode
        ? currentStats.playerBehaviorByMode[weakMode]?.wins ?? 0
        : 0;

      switch (achievement.id) {
        case "rookie-protection": {
          const current = currentStats.tetrobotProgression.rookie.affinity;
          return {
            current: Math.max(0, current),
            target: 60,
            label: `${Math.max(0, current)}/60 affinite`,
          };
        }
        case "rookie-listen": {
          const current = getDerivedCounterValue(currentStats, "rookie_tips_followed");
          return { current, target: 3, label: `${current}/3 conseils suivis` };
        }
        case "pulse-analysis": {
          const current = currentStats.counters.pulse_advice_success ?? 0;
          return { current, target: 1, label: `${Math.min(1, current)}/1 progression` };
        }
        case "pulse-optimization": {
          const current = currentStats.playerLongTermMemory.consistencyScore;
          return { current, target: 60, label: `${current}/60 stabilite` };
        }
        case "apex-respect": {
          const current = currentStats.tetrobotProgression.apex.affinity;
          return {
            current: Math.max(0, current),
            target: 80,
            label: `${Math.max(0, current)}/80 affinite`,
          };
        }
        case "apex-rivalry": {
          const current = currentStats.counters.apex_refusal_count ?? 0;
          return { current, target: 1, label: `${Math.min(1, current)}/1 refus` };
        }
        case "apex-challenge": {
          const current = weakMode ? Math.min(1, weakModeSessions) : 0;
          return {
            current,
            target: 1,
            label: weakMode
              ? `${Math.min(1, weakModeSessions)}/1 session sur ${weakMode}`
              : "mode faible non identifie",
          };
        }
        case "apex-face-yourself": {
          const current = weakMode ? Math.min(1, weakModeWins) : 0;
          return {
            current,
            target: 1,
            label: weakMode
              ? `${Math.min(1, weakModeWins)}/1 victoire sur ${weakMode}`
              : "mode faible non identifie",
          };
        }
        case "apex-approved": {
          const refusal = currentStats.counters.apex_refusal_count ?? 0;
          const restored = currentStats.counters.apex_trust_restored_count ?? 0;
          const current = (refusal > 0 ? 1 : 0) + (restored > 0 ? 1 : 0);
          const step =
            refusal <= 0
              ? "provoquer un refus d'Apex"
              : restored <= 0
                ? "reussir une reconciliation"
                : "pret";
          return {
            current,
            target: 2,
            label: `${current}/2 etapes · ${step}`,
          };
        }
        case "apex-reconciliation":
        {
          const accepted = currentStats.counters.apex_challenge_accepted_count ?? 0;
          const restored = currentStats.counters.apex_trust_restored_count ?? 0;
          const current = (accepted > 0 ? 1 : 0) + (restored > 0 ? 1 : 0);
          const step =
            accepted <= 0
              ? "accepter le defi Apex"
              : restored <= 0
                ? "terminer la reconciliation"
                : "termine";
          return {
            current,
            target: 2,
            label: `${current}/2 etapes · ${step}`,
          };
        }
        case "first-contact": {
          const current = [
            currentStats.tetrobotProgression.rookie,
            currentStats.tetrobotProgression.pulse,
            currentStats.tetrobotProgression.apex,
          ].filter((bot) => bot.xp > 0 || Boolean(bot.lastTip)).length;
          return { current, target: 3, label: `${current}/3 bots rencontres` };
        }
        case "respected-by-all": {
          const current = [
            currentStats.tetrobotProgression.rookie.affinity,
            currentStats.tetrobotProgression.pulse.affinity,
            currentStats.tetrobotProgression.apex.affinity,
          ].filter((affinity) => affinity >= 50).length;
          return { current, target: 3, label: `${current}/3 bots en respect` };
        }
        case "balance": {
          const current = [
            currentStats.tetrobotProgression.rookie.affinity,
            currentStats.tetrobotProgression.pulse.affinity,
            currentStats.tetrobotProgression.apex.affinity,
          ].filter((affinity) => affinity >= 25).length;
          return { current, target: 3, label: `${current}/3 relations stables` };
        }
        case "student": {
          const current = currentStats.counters.tips_read ?? 0;
          return { current, target: 10, label: `${current}/10 conseils lus` };
        }
        case "discipline": {
          const current = weakMode ? Math.min(3, weakModeSessions) : 0;
          return {
            current,
            target: 3,
            label: weakMode
              ? `${Math.min(3, weakModeSessions)}/3 sessions sur ${weakMode}`
              : "mode faible non identifie",
          };
        }
        case "evolution":
        case "max-aura": {
          return {
            current: highestBotLevel,
            target: 5,
            label: `niveau ${highestBotLevel}/5`,
          };
        }
        default: {
          const condition = achievement.condition;
          if (condition.type === "counter") {
            const current = getDerivedCounterValue(currentStats, condition.key);
            return { current, target: condition.value, label: `${current}/${condition.value}` };
          }
          if (condition.type === "affinity") {
            const current = Math.max(
              0,
              currentStats.tetrobotProgression[condition.bot].affinity
            );
            return {
              current,
              target: condition.value,
              label: `${current}/${condition.value} affinite`,
            };
          }
          return undefined;
        }
      }
    },
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
        const next = syncTetrobotProgressionState(prev);

        if (
          !next.changed &&
          areRecordNumbersEqual(prev.tetrobotXpLedger, next.tetrobotXpLedger) &&
          areRecordNumbersEqual(prev.tetrobotAffinityLedger, next.tetrobotAffinityLedger) &&
          JSON.stringify(prev.playerLongTermMemory) === JSON.stringify(next.playerLongTermMemory) &&
          areMemoriesEqual(prev.tetrobotMemories, next.tetrobotMemories) &&
          areChallengesEqual(prev.activeTetrobotChallenge, next.activeTetrobotChallenge)
        ) {
          return prev;
        }

        return {
          ...prev,
          counters: Object.entries(next.counterDeltas).length
            ? Object.entries(next.counterDeltas).reduce(
                (acc, [key, value]) => {
                  acc[key] = (acc[key] ?? 0) + value;
                  return acc;
                },
                { ...prev.counters } as Record<string, number>
              )
            : prev.counters,
          tetrobotProgression: next.tetrobotProgression,
          tetrobotXpLedger: next.tetrobotXpLedger,
          tetrobotAffinityLedger: next.tetrobotAffinityLedger,
          playerLongTermMemory: next.playerLongTermMemory,
          tetrobotMemories: next.tetrobotMemories,
          lastTetrobotLevelUp: next.lastTetrobotLevelUp,
          activeTetrobotChallenge: next.activeTetrobotChallenge,
        };
      }),
    [updateStats]
  );

  const setLastTetrobotTip = useCallback(
    (bot: TetrobotId, tip: string) =>
      updateStats((prev) => {
        const previousTip = prev.tetrobotProgression[bot].lastTip;
        const tipChanged = previousTip !== tip;
        return {
          ...prev,
          tetrobotProgression: {
            ...prev.tetrobotProgression,
            [bot]: {
              ...prev.tetrobotProgression[bot],
              lastTip: tip,
            },
          },
          counters: tipChanged
            ? {
                ...prev.counters,
                tips_read: (prev.counters.tips_read ?? 0) + 1,
              }
            : prev.counters,
        };
      }),
    [updateStats]
  );

  const recordTetrobotEvent = useCallback(
    (event: TetrobotAchievementEvent) =>
      updateStats((prev) => {
        const counters = { ...prev.counters };

        switch (event.type) {
          case "tip_read":
            counters.tips_read = (counters.tips_read ?? 0) + 1;
            break;
          case "rookie_tip_followed":
            counters.rookie_tips_followed = (counters.rookie_tips_followed ?? 0) + 1;
            break;
          case "pulse_advice_success":
            counters.pulse_advice_success = (counters.pulse_advice_success ?? 0) + 1;
            break;
          case "apex_refusal":
            counters.apex_refusal_count = (counters.apex_refusal_count ?? 0) + 1;
            break;
          case "apex_trust_restored":
            counters.apex_trust_restored_count =
              (counters.apex_trust_restored_count ?? 0) + 1;
            break;
          case "apex_challenge_accepted":
            counters.apex_challenge_accepted_count =
              (counters.apex_challenge_accepted_count ?? 0) + 1;
            break;
          default:
            return prev;
        }

        return {
          ...prev,
          counters,
        };
      }),
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
          counters: {
            ...prev.counters,
            apex_challenge_accepted_count:
              (prev.counters.apex_challenge_accepted_count ?? 0) + 1,
          },
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
            ok = Math.max(
              ctx.counters?.[c.key] ?? 0,
              getDerivedCounterValue(currentStats, c.key)
            ) >= c.value;
            break;

          case "custom":
            if (c.key === "achievements_50_percent") {
              const total = Math.max(1, ACHIEVEMENTS.length - 1);
              ok = currentUnlockedCount / total >= 0.5;
            } else if (c.key === "achievements_100_percent") {
              const total = Math.max(1, ACHIEVEMENTS.length - 1);
              ok = currentUnlockedCount >= total;
            } else {
              ok = Boolean(ctx.custom?.[c.key]) || getDerivedCustomAchievementValue(currentStats, c.key, ctx);
            }
            break;

          case "affinity":
            ok = (currentStats.tetrobotProgression[c.bot]?.affinity ?? 0) >= c.value;
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
    checkAchievements({});
  }, [
    checkAchievements,
    stats.activeTetrobotChallenge,
    stats.counters,
    stats.lastPlayedMode,
    stats.lowestWinrateMode,
    stats.playerBehaviorByMode,
    stats.playerLongTermMemory,
    stats.tetrobotAffinityLedger,
    stats.tetrobotMemories,
    stats.tetrobotProgression,
  ]);

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
      progress: isUnlocked(a.id) ? undefined : getAchievementProgress(a),
    })),

    unlockedIds: unlocked.map((a) => a.id),
    stats,

    recentUnlocks: recent,
    clearRecent: () => setRecent([]),

    updateStats,
    recordPlayerBehavior,
    syncTetrobotProgression,
    setLastTetrobotTip,
    recordTetrobotEvent,
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
