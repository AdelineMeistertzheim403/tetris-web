// Service d'acces aux donnees/API pour ce domaine.
import type { PuzzleDefinition } from "../types/Puzzle";

const API_URL = import.meta.env.VITE_API_URL;

export type PuzzleAttemptPayload = {
  success: boolean;
  movesUsed: number;
  linesCleared: number;
  piecesPlaced: number;
  holdUsed: boolean;
  efficiencyScore: number;
  optimal?: boolean;
};

export type PuzzleSolutionPayload = {
  movesUsed: number;
  data: Record<string, unknown>;
  optimal?: boolean;
};

export type PuzzleCompletion = {
  puzzleId: string;
  attempts: number;
  success: boolean;
  optimal: boolean;
  lastCompletedAt?: string | null;
};

export async function fetchPuzzles(): Promise<PuzzleDefinition[]> {
  const res = await fetch(`${API_URL}/puzzles`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Erreur lors du chargement des puzzles");
  }
  return res.json();
}

export async function fetchPuzzle(id: string): Promise<PuzzleDefinition> {
  const res = await fetch(`${API_URL}/puzzles/${id}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Erreur lors du chargement du puzzle");
  }
  return res.json();
}

export async function fetchPuzzleCompletions(): Promise<PuzzleCompletion[]> {
  const res = await fetch(`${API_URL}/puzzles/me/completions`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Erreur lors du chargement des completions");
  }
  return res.json();
}

export async function submitPuzzleAttempt(
  id: string,
  payload: PuzzleAttemptPayload
): Promise<void> {
  const res = await fetch(`${API_URL}/puzzles/${id}/attempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Erreur lors de l'enregistrement de la tentative");
  }
}

export async function submitPuzzleSolution(
  id: string,
  payload: PuzzleSolutionPayload
): Promise<void> {
  const res = await fetch(`${API_URL}/puzzles/${id}/solution`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Erreur lors de l'enregistrement de la solution");
  }
}
