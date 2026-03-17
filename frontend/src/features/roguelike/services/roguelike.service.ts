import { getAuthHeader } from "../../auth/services/authService";

export type RoguelikeStoredMutation = {
  id: string;
  stacks: number;
};

export type RoguelikeLineClears = {
  single: number;
  double: number;
  triple: number;
  tetris: number;
};

const API_URL = import.meta.env.VITE_API_URL;

export type RoguelikeInitialState = Record<string, unknown>;

export type RoguelikeCheckpointPayload = {
  score: number;
  lines: number;
  level: number;
  perks: string[];
  mutations: RoguelikeStoredMutation[];
  lineClears: RoguelikeLineClears;
  bombs: number;
  bombsUsed: number;
  timeFreezeCharges: number;
  chaosMode: boolean;
  gravityMultiplier: number;
  scoreMultiplier: number;
};

export type RoguelikeRunStateServer = {
  id: number;
  seed: string;
  score: string;
  lines: number;
  level: number;
  perks: string[];
  mutations: RoguelikeStoredMutation[];
  bombs: number;
  timeFreezeCharges: number;
  chaosMode: boolean;
  gravityMultiplier: number;
  scoreMultiplier: number;
  status: "FINISHED" | "ABANDONED" | "IN_PROGRESS";
  createdAt: string;
  endedAt?: string | null;
  runToken: string;
};

export type RoguelikeRunHistoryItem = {
  id: number;
  seed: string;
  score: string;
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
  score: string;
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
export async function startRoguelikeRun(seed: string, state: RoguelikeInitialState): Promise<RoguelikeRunStateServer> {
  // Le runToken renvoyé sert à sécuriser les checkpoints côté backend.

  const res = await fetch(`${API_URL}/roguelike/run/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ seed, state }),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Erreur lors du démarrage de la run roguelike");
  }

  return res.json();
}

/* ───────────────────────────── */
/* 🔄 Récupérer la run en cours */
/* ───────────────────────────── */
export async function getCurrentRoguelikeRun(): Promise<RoguelikeRunStateServer | null> {

  const res = await fetch(`${API_URL}/roguelike/run/current`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    return null;
  }

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
  payload: RoguelikeCheckpointPayload,
  runToken: string
): Promise<{ success: boolean; score?: string; lines?: number; level?: number }> {
  // Le header X-Run-Token évite les sauvegardes frauduleuses.

  const res = await fetch(`${API_URL}/roguelike/run/${runId}/checkpoint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Run-Token": runToken,
      ...getAuthHeader(),
    },
    body: JSON.stringify({ ...payload, runToken }),
    credentials: "include",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const suffix =
      res.status === 401
        ? " (session expirée)"
        : res.status === 403
          ? " (token invalide)"
          : "";
    throw new Error(
      `Erreur lors de la sauvegarde de la run (${res.status}${suffix})${
        bodyText ? `: ${bodyText}` : ""
      }`
    );
  }

  return res.json();
}

/* ───────────────────────────── */
/* 🏁 Terminer une run */
/* ───────────────────────────── */
export async function endRoguelikeRun(
  runId: number,
  status: "FINISHED" | "ABANDONED",
  runToken: string
): Promise<{ success: boolean }> {
  // Clôture la run (succès ou abandon) côté backend.

  const res = await fetch(`${API_URL}/roguelike/run/${runId}/end`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Run-Token": runToken,
      ...getAuthHeader(),
    },
    body: JSON.stringify({ status, runToken }),
    credentials: "include",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const suffix =
      res.status === 401
        ? " (session expirée)"
        : res.status === 403
          ? " (token invalide)"
          : "";
    throw new Error(
      `Erreur lors de la fin de la run (${res.status}${suffix})${
        bodyText ? `: ${bodyText}` : ""
      }`
    );
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

  const res = await fetch(`${API_URL}/roguelike/runs/me`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    return [];
  }

  if (!res.ok) {
    throw new Error("Erreur lors de la récupération de l'historique roguelike");
  }

  return res.json();
}
