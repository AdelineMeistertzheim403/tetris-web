import { useCallback, useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS, type Achievement } from "../data/achievements";
import { useAuth } from "../context/AuthContext";
import {
  fetchUnlockedAchievements,
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
};

const STORAGE_KEY = "tetris-roguelike-achievements";
const STATS_KEY = "tetris-roguelike-achievement-stats";

export function useAchievements() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<AchievementState[]>([]);
  const [recent, setRecent] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats>({
    runsPlayed: 0,
    seedRuns: {},
  });
  const statsRef = useRef(stats);

  // ─────────────────────────────
  // LOAD
  // ─────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setUnlocked(JSON.parse(raw));

    const rawStats = localStorage.getItem(STATS_KEY);
    if (rawStats) setStats(JSON.parse(rawStats));
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

  const registerRun = useCallback((seed?: string) => {
    const base = statsRef.current;
    const seedRuns = { ...base.seedRuns };
    const runsPlayed = base.runsPlayed + 1;
    let sameSeedRuns = 0;
    if (seed) {
      seedRuns[seed] = (seedRuns[seed] ?? 0) + 1;
      sameSeedRuns = seedRuns[seed];
    }
    const next = { runsPlayed, seedRuns };
    statsRef.current = next;
    setStats(next);
    return { runsPlayed, sameSeedRuns };
  }, []);

  // ─────────────────────────────
  // CHECKER
  // ─────────────────────────────
  const checkAchievements = useCallback(
    (ctx: AchievementContext) => {
      const newlyUnlocked: Achievement[] = [];

      for (const achievement of ACHIEVEMENTS) {
        if (isUnlocked(achievement.id)) continue;

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
            ok = (ctx.historyViewedCount ?? 0) >= c.count;
            break;

          case "custom":
            ok = Boolean(ctx.custom?.[c.key]);
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

    recentUnlocks: recent,
    clearRecent: () => setRecent([]),

    registerRun,
    checkAchievements,
  };
}
