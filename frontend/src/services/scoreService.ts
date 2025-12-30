import { getToken } from "./authService";
import type { GameMode } from "../types/GameMode";

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

// ✅ Ajouter un score
export async function addScore(value: number, level: number, lines: number, mode: GameMode) {
  const token = getToken();
  const res = await fetch(`${API_URL}/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value, level, lines, mode }),
  });

  if (!res.ok) throw new Error("Erreur lors de l'enregistrement du score");
  return res.json();
}

// ✅ Récupérer mes scores
export async function getMyScores(mode: GameMode = "CLASSIQUE") {
  const token = getToken();
  const res = await fetch(`${API_URL}/scores/me/${mode}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur de récupération des scores");
  return res.json();
}

export async function saveScore(scoreData: {
  userId: number;
  value: number;
  level: number;
  lines: number;
  mode: GameMode;
}) {
  const token = getToken();
  const res = await fetch(`${API_URL}/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(scoreData), // ✅ ici, plus de { scoreData }
  });

  if (!res.ok) throw new Error("Erreur lors de l'enregistrement du score");
  return res.json();
}

// ✅ Récupérer le classement
export async function getLeaderboard(mode: GameMode = "CLASSIQUE") {
  const res = await fetch(`${API_URL}/scores/leaderboard/${mode}`);
  if (!res.ok) throw new Error("Erreur de récupération du classement");
  return res.json();
}

export async function saveVersusMatch(payload: VersusMatchPayload) {
  const token = getToken();
  const res = await fetch(`${API_URL}/scores/versus-match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Erreur lors de l'enregistrement du match versus");
  return res.json();
}
