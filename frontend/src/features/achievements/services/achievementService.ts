// Service d'acces aux donnees/API pour ce domaine.
import { getAuthHeader } from "../../auth/services/authService";
import type { AchievementStats } from "../types/achievementStats";
const API_URL = import.meta.env.VITE_API_URL;
let unlockedAchievementsRequest: Promise<{ id: string; unlockedAt: number }[]> | null = null;
let achievementStatsRequest: Promise<AchievementStatsPayload> | null = null;

function getNoStoreHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    "Cache-Control": "no-cache, no-store, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
    ...headers,
  };
}

export type AchievementStatsPayload = {
  stats?: Partial<AchievementStats>;
  loginDays: string[];
  tetrobotProgression?: Record<string, unknown>;
  tetrobotXpLedger?: Record<string, unknown>;
  tetrobotAffinityLedger?: Record<string, unknown>;
  playerLongTermMemory?: Record<string, unknown>;
  tetrobotMemories?: Record<string, unknown>;
  lastTetrobotLevelUp?: Record<string, unknown> | null;
  activeTetrobotChallenge?: Record<string, unknown> | null;
};

export type AchievementUnlockPayload = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  hidden: boolean;
};

export async function fetchUnlockedAchievements(): Promise<
  { id: string; unlockedAt: number }[]
> {
  if (!unlockedAchievementsRequest) {
    unlockedAchievementsRequest = fetch(`${API_URL}/achievements`, {
      cache: "no-store",
      headers: getNoStoreHeaders({
        ...getAuthHeader(),
      }),
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Erreur chargement achievements");
        }

        const data = await res.json();
        return data.achievements ?? [];
      })
      .finally(() => {
        unlockedAchievementsRequest = null;
      });
  }

  return unlockedAchievementsRequest;
}

export async function unlockAchievements(
  achievements: AchievementUnlockPayload[]
): Promise<void> {
  const res = await fetch(`${API_URL}/achievements/unlock`, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: getNoStoreHeaders({
      "Content-Type": "application/json",
      ...getAuthHeader(),
    }),
    body: JSON.stringify({ achievements }),
  });

  if (!res.ok) {
    throw new Error("Erreur unlock achievements");
  }
}

export async function fetchAchievementStats(): Promise<AchievementStatsPayload> {
  if (!achievementStatsRequest) {
    achievementStatsRequest = fetch(`${API_URL}/achievements/stats`, {
      cache: "no-store",
      headers: getNoStoreHeaders({
        ...getAuthHeader(),
      }),
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Erreur chargement stats achievements");
        }

        const data = await res.json();
        return {
          stats: data.stats ?? undefined,
          loginDays: data.loginDays ?? [],
          tetrobotProgression: data.tetrobotProgression ?? {},
          tetrobotXpLedger: data.tetrobotXpLedger ?? {},
          tetrobotAffinityLedger: data.tetrobotAffinityLedger ?? {},
          playerLongTermMemory: data.playerLongTermMemory ?? {},
          tetrobotMemories: data.tetrobotMemories ?? {},
          lastTetrobotLevelUp: data.lastTetrobotLevelUp ?? null,
          activeTetrobotChallenge: data.activeTetrobotChallenge ?? null,
        };
      })
      .finally(() => {
        achievementStatsRequest = null;
      });
  }

  return achievementStatsRequest;
}

export async function saveAchievementStats(payload: AchievementStatsPayload): Promise<void> {
  const res = await fetch(`${API_URL}/achievements/stats`, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: getNoStoreHeaders({
      "Content-Type": "application/json",
      ...getAuthHeader(),
    }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Erreur sauvegarde stats achievements");
  }
}
