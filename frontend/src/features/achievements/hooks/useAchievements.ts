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
import { PUZZLES } from "../../puzzle/data/puzzles";
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
import type { AchievementStats } from "../types/achievementStats";
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
import { hasReachedAchievementCompletionThreshold } from "../lib/achievementCompletion";
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

const normalizeLoginDays = (loginDays: string[]) =>
  Array.from(new Set(loginDays.filter(Boolean))).sort();

const mergeLoginDays = (...sources: Array<string[] | undefined>) =>
  normalizeLoginDays(sources.flatMap((source) => source ?? []));

const getTodayLoginDay = () => new Date().toISOString().slice(0, 10);

function clampAffinity(value: number) {
  return Math.max(-100, Math.min(100, value));
}

export const getApexTrustState = getApexTrustStateFromLogic;

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
    loginDays: normalizeLoginDays(raw.loginDays ?? DEFAULT_STATS.loginDays),
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
  recordLoginDay: (day?: string) => AchievementStats;
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
      const unlockedIds = unlockedRef.current.map((entry) => entry.id);
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
      const totalSessions = Object.values(currentStats.playerBehaviorByMode).reduce(
        (sum, mode) => sum + mode.sessions,
        0
      );
      const totalLosses = Object.values(currentStats.playerBehaviorByMode).reduce(
        (sum, mode) => sum + mode.losses,
        0
      );
      const panicMistakes = Object.values(currentStats.playerMistakesByMode).reduce(
        (sum, mistakes) =>
          sum +
          (mistakes.panic_stack ?? 0) +
          (mistakes.slow_decision ?? 0) +
          (mistakes.unsafe_stack ?? 0),
        0
      );
      const riskyMistakes = Object.values(currentStats.playerMistakesByMode).reduce(
        (sum, mistakes) => sum + (mistakes.greedy_play ?? 0) + (mistakes.unsafe_stack ?? 0),
        0
      );
      const countVisitedModes = Object.values(currentStats.modesVisited).filter(Boolean).length;
      const totalVisitedModes = Object.keys(currentStats.modesVisited).length;
      const countLevel10Modes = Object.values(currentStats.level10Modes).filter(Boolean).length;
      const countScoredModes = Object.values(currentStats.scoredModes).filter(Boolean).length;
      const totalScoredModes = Object.keys(currentStats.scoredModes).length;
      const progressFromCount = (current: number, target: number, suffix = "") => ({
        current: Math.max(0, current),
        target,
        label: `${Math.max(0, current)}/${target}${suffix}`,
      });
      const progressFromBoolean = (done: boolean, label: string) => ({
        current: done ? 1 : 0,
        target: 1,
        label: `${done ? 1 : 0}/1 ${label}`,
      });

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
          switch (condition.type) {
            case "runs_played":
              return progressFromCount(currentStats.runsPlayed, condition.count);
            case "score_reached":
              return undefined;
            case "level_reached":
              if (
                condition.level === 10 &&
                achievement.mode &&
                achievement.mode !== "ALL" &&
                achievement.mode !== "GLOBAL" &&
                achievement.mode !== "EDITOR" &&
                achievement.mode !== "PIXEL_PROTOCOL"
              ) {
                const reached = currentStats.level10Modes[achievement.mode as GameMode] ?? false;
                return {
                  current: reached ? 10 : 0,
                  target: 10,
                  label: `${reached ? 10 : 0}/10 niveaux`,
                };
              }
              return undefined;
            case "tetris_cleared":
              return progressFromCount(currentStats.counters.total_tetris_clears ?? 0, 1);
            case "lines_cleared":
              return undefined;
            case "same_seed_runs": {
              const current = Math.max(0, ...Object.values(currentStats.seedRuns));
              return progressFromCount(current, condition.count);
            }
            case "history_viewed":
              return progressFromCount(currentStats.historyViewedCount, condition.count);
            case "counter": {
              const current = getDerivedCounterValue(currentStats, condition.key);
              return { current, target: condition.value, label: `${current}/${condition.value}` };
            }
            case "affinity": {
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
            case "custom":
              break;
            default:
              return undefined;
          }

          switch (condition.key) {
            case "created_account":
              return progressFromBoolean(Boolean(user), "compte");
            case "login_days_7":
              return progressFromCount(currentStats.loginDays.length, 7, " jours");
            case "login_days_30":
              return progressFromCount(currentStats.loginDays.length, 30, " jours");
            case "modes_visited_all":
              return {
                current: countVisitedModes,
                target: totalVisitedModes,
                label: `${countVisitedModes}/${totalVisitedModes} modes`,
              };
            case "achievements_50_percent":
            case "achievements_100_percent": {
              const target = condition.key === "achievements_50_percent" ? 0.5 : 1;
              const total = ACHIEVEMENTS.filter((item) => item.id !== "global-completionist").length;
              const current = Math.round(total * target);
              const unlocked = Math.min(
                total,
                ACHIEVEMENTS.filter(
                  (item) => item.id !== "global-completionist" && unlockedIds.includes(item.id)
                ).length
              );
              return {
                current: unlocked,
                target: current,
                label: `${unlocked}/${current} succes`,
              };
            }
            case "no_hold_runs_10":
              return progressFromCount(currentStats.noHoldRuns, 10);
            case "classic_half_board":
              return progressFromCount(currentStats.counters.classic_half_board_runs ?? 0, 1);
            case "classic_hold_under_3":
              return progressFromCount(currentStats.counters.classic_hold_under_3_runs ?? 0, 1);
            case "classic_tetris_10":
              return progressFromCount(currentStats.counters.classic_best_tetris_run ?? 0, 10);
            case "sprint_finish":
              return progressFromCount(currentStats.counters.sprint_finishes ?? 0, 1);
            case "sprint_under_5":
              return progressFromCount(currentStats.counters.sprint_sub_5m_finishes ?? 0, 1);
            case "sprint_under_3":
              return progressFromCount(currentStats.counters.sprint_sub_3m_finishes ?? 0, 1);
            case "sprint_under_2":
              return progressFromCount(currentStats.counters.sprint_sub_2m_finishes ?? 0, 1);
            case "sprint_no_hold":
              return progressFromCount(currentStats.counters.sprint_no_hold_finishes ?? 0, 1);
            case "harddrop_50":
              return progressFromCount(currentStats.hardDropCount, 50);
            case "level_10_three_modes":
              return {
                current: countLevel10Modes,
                target: 3,
                label: `${countLevel10Modes}/3 modes`,
              };
            case "scored_all_modes":
              return {
                current: countScoredModes,
                target: totalScoredModes,
                label: `${countScoredModes}/${totalScoredModes} modes`,
              };
            case "playtime_60m":
              return progressFromCount(
                Math.floor(currentStats.playtimeMs / 60_000),
                60,
                " min"
              );
            case "playtime_300m":
              return progressFromCount(
                Math.floor(currentStats.playtimeMs / 60_000),
                300,
                " min"
              );
            case "versus_match_1":
              return progressFromCount(currentStats.versusMatches, 1);
            case "versus_match_10":
              return progressFromCount(currentStats.versusMatches, 10);
            case "versus_match_50":
              return progressFromCount(currentStats.versusMatches, 50);
            case "versus_win_1":
              return progressFromCount(currentStats.versusWins, 1);
            case "versus_win_streak_5":
              return progressFromCount(currentStats.versusWinStreak, 5);
            case "versus_perfect_win":
              return progressFromCount(currentStats.counters.versus_perfect_wins ?? 0, 1);
            case "versus_lines_sent_20":
              return progressFromCount(currentStats.versusLinesSent, 20);
            case "bf_survive_architect":
              return progressFromCount(currentStats.counters.bf_survive_architect_wins ?? 0, 1);
            case "bf_armored_10":
              return progressFromCount(currentStats.counters.bf_max_armored_spawns ?? 0, 10);
            case "bf_overwhelm":
              return progressFromCount(currentStats.counters.bf_overwhelm_wins ?? 0, 1);
            case "bf_blocks_50":
              return progressFromCount(currentStats.counters.bf_max_blocks_destroyed ?? 0, 50);
            case "bf_core_destroyed":
              return progressFromCount(currentStats.counters.bf_core_destroyed_count ?? 0, 1);
            case "bf_no_ball_lost":
              return progressFromCount(currentStats.counters.bf_no_ball_lost_wins ?? 0, 1);
            case "bf_chaos_5":
              return progressFromCount(currentStats.counters.bf_max_chaos_effects ?? 0, 5);
            case "bf_win_both_roles":
              return {
                current:
                  (currentStats.brickfallArchitectWins > 0 ? 1 : 0) +
                  (currentStats.brickfallDemolisherWins > 0 ? 1 : 0),
                target: 2,
                label: `${currentStats.brickfallArchitectWins > 0 ? 1 : 0}/1 architecte · ${currentStats.brickfallDemolisherWins > 0 ? 1 : 0}/1 demolisseur`,
              };
            case "bf_inverted_win":
              return progressFromCount(currentStats.counters.bf_inverted_wins ?? 0, 1);
            case "bf_solo_1_clear":
              return progressFromCount(currentStats.brickfallSoloLevelsCleared, 1);
            case "bf_solo_world1_clear":
              return progressFromCount(currentStats.brickfallSoloBestWorld, 1);
            case "bf_solo_campaign_clear":
              return progressFromBoolean(currentStats.brickfallSoloCampaignCleared, "campagne");
            case "bf_solo_no_miss":
              return progressFromCount(currentStats.counters.bf_solo_no_miss_wins ?? 0, 1);
            case "bf_solo_1000_blocks":
              return progressFromCount(currentStats.brickfallSoloBlocksDestroyed, 1000);
            case "bf_solo_under_45s":
              return progressFromCount(currentStats.counters.bf_solo_under_45s_wins ?? 0, 1);
            case "bf_solo_3_multiballs":
              return progressFromCount(currentStats.counters.bf_solo_max_multiballs_run ?? 0, 3);
            case "bf_solo_3_malus_win":
              return progressFromCount(currentStats.counters.bf_solo_max_malus_run ?? 0, 3);
            case "bf_editor_create":
              return progressFromCount(currentStats.brickfallSoloEditorCreated, 1);
            case "bf_editor_win":
              return progressFromCount(currentStats.brickfallSoloEditorWins, 1);
            case "rv_match_1":
              return progressFromCount(currentStats.roguelikeVersusMatches, 1);
            case "rv_match_10":
              return progressFromCount(currentStats.roguelikeVersusMatches, 10);
            case "rv_match_50":
              return progressFromCount(currentStats.roguelikeVersusMatches, 50);
            case "rv_win_1":
              return progressFromCount(currentStats.roguelikeVersusWins, 1);
            case "rv_win_streak_5":
              return progressFromCount(currentStats.roguelikeVersusWinStreak, 5);
            case "rv_perfect_win":
              return progressFromCount(currentStats.counters.rv_perfect_wins ?? 0, 1);
            case "rv_lines_sent_30":
              return progressFromCount(currentStats.roguelikeVersusLinesSent, 30);
            case "rv_win_after_bot_synergy":
              return progressFromCount(currentStats.counters.rv_wins_after_bot_synergy ?? 0, 1);
            case "rv_apex_chaos_win":
              return progressFromCount(currentStats.counters.rv_apex_chaos_wins ?? 0, 1);
            case "rv_10_bombs_sent":
              return progressFromCount(currentStats.counters.rv_max_bombs_sent ?? 0, 10);
            case "rv_more_mutations_than_bot":
              return progressFromCount(
                currentStats.counters.rv_more_mutations_than_bot_wins ?? 0,
                1
              );
            case "rv_apex_3_synergies_win":
              return progressFromCount(currentStats.counters.rv_apex_three_synergy_wins ?? 0, 1);
            case "puzzle_completed_1":
              return progressFromCount(currentStats.puzzleCompletedIds.length, 1);
            case "puzzle_completed_5":
              return progressFromCount(currentStats.puzzleCompletedIds.length, 5);
            case "puzzle_completed_all":
              return progressFromCount(currentStats.puzzleCompletedIds.length, PUZZLES.length);
            case "puzzle_no_hold":
              return progressFromCount(currentStats.puzzleNoHoldCount, 1);
            case "puzzle_optimal":
              return progressFromCount(currentStats.puzzleOptimalCount, 1);
            case "puzzle_no_hold_5":
              return progressFromCount(currentStats.puzzleNoHoldCount, 5);
            case "puzzle_optimal_1":
              return progressFromCount(currentStats.puzzleOptimalCount, 1);
            case "puzzle_optimal_5":
              return progressFromCount(currentStats.puzzleOptimalCount, 5);
            case "puzzle_streak_3":
              return progressFromCount(currentStats.puzzleWinStreak, 3);
            case "puzzle_survive_3":
              return progressFromCount(currentStats.puzzleSurviveCount, 3);
            case "puzzle_free_zones_5":
              return progressFromCount(currentStats.puzzleFreeZonesTotal, 5);
            case "puzzle_lines_10":
              return progressFromCount(currentStats.puzzleLinesTotal, 10);
            case "bot_match_1":
              return progressFromCount(currentStats.botMatches, 1);
            case "bot_win_1":
              return progressFromCount(currentStats.botWins, 1);
            case "bot_rookie_win":
              return progressFromCount(currentStats.counters.bot_rookie_wins ?? 0, 1);
            case "bot_balanced_win":
              return progressFromCount(currentStats.counters.bot_balanced_wins ?? 0, 1);
            case "bot_apex_win":
              return progressFromCount(currentStats.counters.bot_apex_wins_total ?? 0, 1);
            case "bot_perfect_win":
              return progressFromCount(currentStats.counters.bot_perfect_wins ?? 0, 1);
            case "bot_win_under_60s":
              return progressFromCount(currentStats.counters.bot_under_60s_wins ?? 0, 1);
            case "bot_won_after_blunder":
              return progressFromCount(currentStats.counters.bot_wins_after_blunder ?? 0, 1);
            case "bot_fewer_holes":
              return progressFromCount(currentStats.counters.bot_fewer_holes_wins ?? 0, 1);
            case "bot_win_streak_5":
              return progressFromCount(currentStats.botWinStreak, 5);
            case "bot_all_personalities_session":
              return progressFromCount(
                currentStats.counters.bot_all_personalities_session_max ?? 0,
                3
              );
            case "bot_apex_win_10":
              return progressFromCount(currentStats.botApexWins, 10);
            case "bot_outscore_lines_apex":
              return progressFromCount(currentStats.counters.bot_outscore_lines_apex_wins ?? 0, 1);
            case "tm_play_1":
              return progressFromCount(currentStats.tetromazeRuns, 1);
            case "tm_win_1":
              return progressFromCount(currentStats.tetromazeWins, 1);
            case "tm_world1_clear":
              return progressFromCount(currentStats.counters.tm_world1_clear_count ?? 0, 1);
            case "tm_campaign_clear":
              return progressFromCount(currentStats.counters.tm_campaign_clear_count ?? 0, 1);
            case "tm_no_hit":
              return progressFromCount(currentStats.counters.tm_no_hit_wins ?? 0, 1);
            case "tm_close_escape":
              return progressFromCount(currentStats.counters.tm_close_escape_count ?? 0, 1);
            case "tm_escape_10":
              return progressFromCount(currentStats.tetromazeEscapesTotal, 10);
            case "tm_under_60s":
              return progressFromCount(currentStats.counters.tm_under_60s_wins ?? 0, 1);
            case "tm_stun_3":
              return progressFromCount(
                currentStats.counters.tm_max_stunned_simultaneously ?? 0,
                3
              );
            case "tm_5_effects":
              return progressFromCount(currentStats.counters.tm_max_effects_run ?? 0, 5);
            case "tm_escape_rookie_5":
              return progressFromCount(currentStats.tetromazeEscapesRookie, 5);
            case "tm_escape_pulse_5":
              return progressFromCount(currentStats.tetromazeEscapesPulse, 5);
            case "tm_escape_apex_5":
              return progressFromCount(currentStats.tetromazeEscapesApex, 5);
            case "tm_encircled":
              return progressFromCount(currentStats.counters.tm_encircled_count ?? 0, 1);
            case "tm_loop_10s":
              return progressFromCount(currentStats.counters.tm_loop_10s_count ?? 0, 1);
            case "tm_30s_undetected":
              return progressFromCount(currentStats.counters.tm_30s_undetected_count ?? 0, 1);
            case "tm_power_used":
              return progressFromCount(currentStats.tetromazePowerUses, 1);
            case "tm_capture_3":
              return progressFromCount(currentStats.tetromazeCaptures, 3);
            case "no_damage_level":
              return progressFromCount(currentStats.counters.no_damage_level_count ?? 0, 1);
            case "level_100_plays":
              return progressFromCount(currentStats.counters.level_100_plays_best ?? 0, 100);
            case "level_1000_plays":
              return progressFromCount(currentStats.counters.level_1000_plays_best ?? 0, 1000);
            case "level_50_likes":
              return progressFromCount(currentStats.counters.level_50_likes_best ?? 0, 50);
            case "grid_master": {
              const campaign = Math.min(currentStats.counters.campaign_level_complete ?? 0, 20);
              const created = Math.min(currentStats.counters.levels_created ?? 0, 10);
              return {
                current: campaign + created,
                target: 30,
                label: `${campaign}/20 campagne · ${created}/10 niveaux`,
              };
            }
            case "improved_after_pulse":
              return progressFromCount(
                Math.max(
                  currentStats.counters.pulse_advice_success ?? 0,
                  currentStats.tetrobotAffinityLedger.improve_stat > 0 &&
                    currentStats.tetrobotProgression.pulse.affinity >= 10
                    ? 1
                    : 0
                ),
                1
              );
            case "stable_winrate":
              return {
                current: Math.min(
                  2,
                  (totalSessions >= 5 ? 1 : 0) +
                    (currentStats.playerLongTermMemory.consistencyScore >= 60 ? 1 : 0)
                ),
                target: 2,
                label: `${Math.min(totalSessions, 5)}/5 sessions · ${Math.min(
                  currentStats.playerLongTermMemory.consistencyScore,
                  60
                )}/60 stabilite`,
              };
            case "negative_bot_reaction":
              return progressFromCount(
                [
                  currentStats.tetrobotProgression.rookie,
                  currentStats.tetrobotProgression.pulse,
                  currentStats.tetrobotProgression.apex,
                ].filter((bot) => bot.affinity < 0 || bot.mood === "angry").length,
                1
              );
            case "panic_sequence":
              return progressFromCount(panicMistakes, 3);
            case "risky_loss":
              return {
                current: Math.min(2, (totalLosses > 0 ? 1 : 0) + (riskyMistakes > 0 ? 1 : 0)),
                target: 2,
                label: `${Math.min(totalLosses, 1)}/1 defaite · ${Math.min(
                  riskyMistakes,
                  1
                )}/1 erreur`,
              };
            case "critical_win":
              return progressFromCount(currentStats.counters.comeback_estimate ?? 0, 1);
            case "perfect_play_duration":
              return {
                current: Math.min(
                  2,
                  (totalSessions >= 5 ? 1 : 0) +
                    (currentStats.playerLongTermMemory.disciplineScore >= 80 ? 1 : 0)
                ),
                target: 2,
                label: `${Math.min(totalSessions, 5)}/5 sessions · ${Math.min(
                  currentStats.playerLongTermMemory.disciplineScore,
                  80
                )}/80 discipline`,
              };
            case "tilt_detected":
              return {
                current: Math.min(
                  2,
                  Math.floor((currentStats.counters.rage_quit_estimate ?? 0) / 3) +
                    Math.floor(totalLosses / 3)
                ),
                target: 2,
                label: `${Math.min(currentStats.counters.rage_quit_estimate ?? 0, 3)}/3 rage quit · ${Math.min(totalLosses, 3)}/3 defaites`,
              };
            case "stat_improved":
              return progressFromCount(currentStats.tetrobotAffinityLedger.improve_stat, 1);
            case "multiple_stats_improved":
              return progressFromCount(currentStats.tetrobotAffinityLedger.improve_stat, 3);
            case "bot_angry":
              return progressFromCount(
                [
                  currentStats.tetrobotProgression.rookie,
                  currentStats.tetrobotProgression.pulse,
                  currentStats.tetrobotProgression.apex,
                ].filter((bot) => bot.mood === "angry").length,
                1
              );
            case "bot_memory_dialogue":
              return progressFromCount(
                Object.values(currentStats.tetrobotMemories).filter((entries) => entries.length > 0)
                  .length,
                1
              );
            case "bot_detected_style":
              return progressFromCount(
                Object.values(currentStats.playerLongTermMemory.weakestModes ?? {}).filter(
                  (value) => typeof value === "number" && value > 0
                ).length,
                1
              );
          }
          return undefined;
        }
      }
    },
    [user]
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
              ok = hasReachedAchievementCompletionThreshold(
                ACHIEVEMENTS,
                unlockedRef.current.map((entry) => entry.id),
                0.5
              );
            } else if (c.key === "achievements_100_percent") {
              ok = hasReachedAchievementCompletionThreshold(
                ACHIEVEMENTS,
                unlockedRef.current.map((entry) => entry.id),
                1
              );
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

  const recordLoginDay = useCallback(
    (day = getTodayLoginDay()) => {
      const next = updateStats((prev) => {
        const loginDays = mergeLoginDays(prev.loginDays, [day]);
        if (areArraysEqual(prev.loginDays, loginDays)) {
          return prev;
        }

        return {
          ...prev,
          loginDays,
        };
      });

      checkAchievements({
        custom: {
          login_days_7: next.loginDays.length >= 7,
          login_days_30: next.loginDays.length >= 30,
        },
      });

      return next;
    },
    [checkAchievements, updateStats]
  );

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadStats = async () => {
      try {
        const remote = await fetchAchievementStats();
        if (!active) return;
        const next = updateStats((prev) => {
          if (remote.stats) {
            return mergeStats({
              ...prev,
              ...remote.stats,
              loginDays: mergeLoginDays(
                prev.loginDays,
                remote.loginDays,
                Array.isArray(remote.stats.loginDays) ? remote.stats.loginDays : undefined
              ),
            });
          }

          const loginDays = mergeLoginDays(prev.loginDays, remote.loginDays);
          return {
            ...prev,
            loginDays,
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
      stats: stats,
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
    recordLoginDay,
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
