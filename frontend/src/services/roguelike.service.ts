import { getToken } from "./authService";

export type RoguelikeStoredMutation = {
  id: string;
  stacks: number;
};

const API_URL = import.meta.env.VITE_API_URL;

export type RoguelikeCheckpointPayload = {
  score: number;
  lines: number;
  level: number;
  perks: string[];
  mutations: RoguelikeStoredMutation[];
  bombs: number;
  timeFreezeCharges: number;
  chaosMode: boolean;
  gravityMultiplier: number;
  scoreMultiplier: number;
};

export type RoguelikeRunHistoryItem = {
  id: number;
  seed: string;
  score: number;
  lines: number;
  level: number;
  perks: string[];
  mutations: RoguelikeStoredMutation[];
  chaosMode: boolean;
  status: "FINISHED" | "ABANDONED" | "IN_PROGRESS";
  createdAt: string;
  endedAt?: string | null;
};

export type RoguelikeLeaderboardItem = {
  score: number;
  level: number;
  lines: number;
  chaosMode: boolean;
  seed: string;
  createdAt: string;
  user: {
    pseudo: string;
  };
};

/* ───────────────────────────── */
/* 🚀 Démarrer une run */
/* ───────────────────────────── */
export async function startRoguelikeRun(seed: string, state: any) {
  const token = getToken();

  const res = await fetch(`${API_URL}/roguelike/run/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ seed, state }),
  });

  if (!res.ok) {
    throw new Error("Erreur lors du démarrage de la run roguelike");
  }

  return res.json();
}

/* ───────────────────────────── */
/* 🔄 Récupérer la run en cours */
/* ───────────────────────────── */
export async function getCurrentRoguelikeRun() {
  const token = getToken();

  const res = await fetch(`${API_URL}/roguelike/run/current`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Erreur lors de la récupération de la run en cours");
  }

  return res.json();
}

/* ───────────────────────────── */
/* 💾 Checkpoint (toutes les 10 lignes) */
/* ───────────────────────────── */
export async function checkpointRoguelikeRun(
  runId: number,
  payload: RoguelikeCheckpointPayload
) {
  const token = getToken();

  const res = await fetch(`${API_URL}/roguelike/run/${runId}/checkpoint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Erreur lors de la sauvegarde de la run");
  }

  return res.json();
}

/* ───────────────────────────── */
/* 🏁 Terminer une run */
/* ───────────────────────────── */
export async function endRoguelikeRun(
  runId: number,
  status: "FINISHED" | "ABANDONED"
) {
  const token = getToken();

  const res = await fetch(`${API_URL}/roguelike/run/${runId}/end`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error("Erreur lors de la fin de la run");
  }

  return res.json();
}

/* ───────────────────────────── */
/* 🏆 Leaderboard Roguelike */
/* ───────────────────────────── */
export async function getRoguelikeLeaderboard(): Promise<RoguelikeLeaderboardItem[]> {
  const res = await fetch(`${API_URL}/roguelike/leaderboard`);

  if (!res.ok) {
    throw new Error("Erreur lors de la récupération du classement roguelike");
  }

  return res.json();
}

/* ───────────────────────────── */
/* 📜 Historique des runs perso */
/* ───────────────────────────── */
export async function getMyRoguelikeRuns(): Promise<RoguelikeRunHistoryItem[]> {
  const token = getToken();

  const res = await fetch(`${API_URL}/roguelike/runs/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Erreur lors de la récupération de l'historique roguelike");
  }

  return res.json();
}
