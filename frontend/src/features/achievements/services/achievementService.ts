// Service d'acces aux donnees/API pour ce domaine.
import { getAuthHeader } from "../../auth/services/authService";
const API_URL = import.meta.env.VITE_API_URL;
let unlockedAchievementsRequest: Promise<{ id: string; unlockedAt: number }[]> | null = null;
let achievementStatsRequest: Promise<AchievementStatsPayload> | null = null;

export type AchievementStatsPayload = {
  loginDays: string[];
  tetrobotProgression?: Record<string, unknown>;
  tetrobotXpLedger?: Record<string, unknown>;
  tetrobotAffinityLedger?: Record<string, unknown>;
  lastTetrobotLevelUp?: Record<string, unknown> | null;
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
      headers: {
        ...getAuthHeader(),
      },
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
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ achievements }),
  });

  if (!res.ok) {
    throw new Error("Erreur unlock achievements");
  }
}

export async function fetchAchievementStats(): Promise<AchievementStatsPayload> {
  if (!achievementStatsRequest) {
    achievementStatsRequest = fetch(`${API_URL}/achievements/stats`, {
      headers: {
        ...getAuthHeader(),
      },
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Erreur chargement stats achievements");
        }

        const data = await res.json();
        return {
          loginDays: data.loginDays ?? [],
          tetrobotProgression: data.tetrobotProgression ?? {},
          tetrobotXpLedger: data.tetrobotXpLedger ?? {},
          tetrobotAffinityLedger: data.tetrobotAffinityLedger ?? {},
          lastTetrobotLevelUp: data.lastTetrobotLevelUp ?? null,
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
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Erreur sauvegarde stats achievements");
  }
}
