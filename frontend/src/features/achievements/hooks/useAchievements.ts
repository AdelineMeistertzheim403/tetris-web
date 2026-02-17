import { useCallback, useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS, type Achievement } from "../data/achievements";
import type { GameMode } from "../../game/types/GameMode";
import { useAuth } from "../../auth/context/AuthContext";
import {
  fetchUnlockedAchievements,
  fetchAchievementStats,
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
  mode?: GameMode | "ALL";

  // run meta
  bombsUsed?: number;
  usedSecondChance?: boolean;
  chaosMode?: boolean;
  seed?: string;
  historyViewedCount?: number;
  custom?: Record<string, boolean | number>;

  // collections
  perks?: string[];
  synergies?: string[];
  mutations?: string[];

  // historique
  runsPlayed?: number;
  sameSeedRuns?: number;
};

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
  };
};

export function useAchievements() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<AchievementState[]>([]);
  const [recent, setRecent] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats>(() => {
    const rawStats = localStorage.getItem(STATS_KEY);
    return rawStats ? mergeStats(JSON.parse(rawStats)) : DEFAULT_STATS;
  });
  const statsRef = useRef(stats);

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
      areRecordNumbersEqual(a.puzzleAttemptsById, b.puzzleAttemptsById)
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
    (id: string) => unlocked.some((a) => a.id === id),
    [unlocked]
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

      for (const achievement of ACHIEVEMENTS) {
        if (isUnlocked(achievement.id)) continue;
        if (achievement.mode && achievement.mode !== "ALL") {
          if (ctx.mode !== achievement.mode) continue;
        }

        const c = achievement.condition;
        let ok = false;

        switch (c.type) {
          case "runs_played":
            ok = (ctx.runsPlayed ?? stats.runsPlayed) >= c.count;
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
                (ctx.seed ? stats.seedRuns[ctx.seed] ?? 0 : 0)) >= c.count;
            break;

          case "history_viewed":
            ok = (ctx.historyViewedCount ?? stats.historyViewedCount) >= c.count;
            break;

          case "custom":
            if (c.key === "achievements_50_percent") {
              const total = Math.max(1, ACHIEVEMENTS.length - 1);
              ok = unlocked.length / total >= 0.5;
            } else if (c.key === "achievements_100_percent") {
              const total = Math.max(1, ACHIEVEMENTS.length - 1);
              ok = unlocked.length >= total;
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
        setUnlocked((prev) => [
          ...prev,
          ...newlyUnlocked.map((a) => ({
            id: a.id,
            unlockedAt: Date.now(),
          })),
        ]);

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
    [isUnlocked, stats.runsPlayed, stats.seedRuns, user]
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
          };
        });
        checkAchievements({
          custom: {
            login_days_7: next.loginDays.length >= 7,
            login_days_30: next.loginDays.length >= 30,
          },
        });
      } catch {
        // silent fallback to localStorage
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, [checkAchievements, updateStats, user]);

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
    registerRun,
    checkAchievements,
  };
}
