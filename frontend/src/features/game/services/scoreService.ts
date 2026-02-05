import type { GameMode } from "../types/GameMode";

// API base URL fourni par Vite (env). Centralise toutes les routes score.
const API_URL = import.meta.env.VITE_API_URL;

export type VersusMatchPayload = {
  matchId?: string;
  players: Array<{
    slot: number;
    userId?: number;
    pseudo: string;
    score: number;
    lines: number;
  }>;
};

// Récupère un runToken côté backend pour sécuriser la soumission des scores.
export async function getScoreRunToken(mode: GameMode, matchId?: string) {
  const res = await fetch(`${API_URL}/scores/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode, matchId }),
    credentials: "include",
  });

  if (!res.ok) throw new Error("Erreur lors de la récupération du token de run");
  const data = await res.json();
  return data.runToken as string;
}

// Ajoute un score “classique” (hors sprint qui utilise saveScore).
export async function addScore(
  value: number,
  level: number,
  lines: number,
  mode: GameMode,
  runToken: string
) {
  const res = await fetch(`${API_URL}/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Run-Token": runToken,
    },
    body: JSON.stringify({ value, level, lines, mode, runToken }),
    credentials: "include",
  });

  if (!res.ok) throw new Error("Erreur lors de l'enregistrement du score");
  return res.json();
}

// Récupère les scores du joueur courant pour un mode donné.
export async function getMyScores(mode: GameMode = "CLASSIQUE") {
  const res = await fetch(`${API_URL}/scores/me/${mode}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erreur de récupération des scores");
  return res.json();
}

// Enregistre un score complet (utilisé en sprint/versus avec runToken).
export async function saveScore(
  scoreData: {
    userId: number;
    value: number;
    level: number;
    lines: number;
    mode: GameMode;
  },
  runToken: string
) {
  const res = await fetch(`${API_URL}/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Run-Token": runToken,
    },
    body: JSON.stringify({ ...scoreData, runToken }), // ✅ ici, plus de { scoreData }
    credentials: "include",
  });

  if (!res.ok) throw new Error("Erreur lors de l'enregistrement du score");
  return res.json();
}

// Récupère le leaderboard pour un mode.
export async function getLeaderboard(mode: GameMode = "CLASSIQUE") {
  const res = await fetch(`${API_URL}/scores/leaderboard/${mode}`);
  if (!res.ok) throw new Error("Erreur de récupération du classement");
  return res.json();
}

// Sauvegarde un match Versus (payload multi-joueurs).
export async function saveVersusMatch(payload: VersusMatchPayload) {
  const res = await fetch(`${API_URL}/scores/versus-match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Run-Token": await getScoreRunToken("VERSUS", payload.matchId),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) throw new Error("Erreur lors de l'enregistrement du match versus");
  return res.json();
}

// Sauvegarde un match Roguelike Versus (payload multi-joueurs).
export async function saveRoguelikeVersusMatch(payload: VersusMatchPayload) {
  const res = await fetch(`${API_URL}/scores/roguelike-versus-match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Run-Token": await getScoreRunToken("ROGUELIKE_VERSUS", payload.matchId),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok)
    throw new Error("Erreur lors de l'enregistrement du match roguelike versus");
  return res.json();
}
