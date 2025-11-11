import { getToken } from "./authService";

const API_URL = import.meta.env.VITE_API_URL?.replace("/auth", "/scores") || "http://localhost:8080/api/scores";

// ✅ Ajouter un score
export async function addScore(value: number, level: number, lines: number) {
  const token = getToken();
  const res = await fetch(`${API_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value, level, lines }),
  });

  if (!res.ok) throw new Error("Erreur lors de l'enregistrement du score");
  return res.json();
}

// ✅ Récupérer mes scores
export async function getMyScores() {
  const token = getToken();
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur de récupération des scores");
  return res.json();
}

// ✅ Récupérer le classement
export async function getLeaderboard() {
  const res = await fetch(`${API_URL}/leaderboard`);
  if (!res.ok) throw new Error("Erreur de récupération du classement");
  return res.json();
}
