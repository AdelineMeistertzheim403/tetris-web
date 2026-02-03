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

// ✅ Ajouter un score
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

// ✅ Récupérer mes scores
export async function getMyScores(mode: GameMode = "CLASSIQUE") {
  const res = await fetch(`${API_URL}/scores/me/${mode}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erreur de récupération des scores");
  return res.json();
}

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

// ✅ Récupérer le classement
export async function getLeaderboard(mode: GameMode = "CLASSIQUE") {
  const res = await fetch(`${API_URL}/scores/leaderboard/${mode}`);
  if (!res.ok) throw new Error("Erreur de récupération du classement");
  return res.json();
}

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
