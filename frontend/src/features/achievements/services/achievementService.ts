const API_URL = import.meta.env.VITE_API_URL;

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
  const res = await fetch(`${API_URL}/achievements`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Erreur chargement achievements");
  }

  const data = await res.json();
  return data.achievements ?? [];
}

export async function unlockAchievements(
  achievements: AchievementUnlockPayload[]
): Promise<void> {
  const res = await fetch(`${API_URL}/achievements/unlock`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ achievements }),
  });

  if (!res.ok) {
    throw new Error("Erreur unlock achievements");
  }
}

export async function fetchAchievementStats(): Promise<{ loginDays: string[] }> {
  const res = await fetch(`${API_URL}/achievements/stats`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Erreur chargement stats achievements");
  }

  const data = await res.json();
  return { loginDays: data.loginDays ?? [] };
}

export async function saveAchievementStats(loginDays: string[]): Promise<void> {
  const res = await fetch(`${API_URL}/achievements/stats`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ loginDays }),
  });

  if (!res.ok) {
    throw new Error("Erreur sauvegarde stats achievements");
  }
}
