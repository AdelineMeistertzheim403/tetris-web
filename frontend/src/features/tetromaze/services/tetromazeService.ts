import { getAuthHeader } from "../../auth/services/authService";

const API_URL = import.meta.env.VITE_API_URL;

type TetromazeProgressResponse = {
  highestLevel?: number;
  currentLevel?: number;
  levelScores?: Record<string, number>;
};

export type TetromazeProgress = {
  highestLevel: number;
  currentLevel: number;
  levelScores: Record<string, number>;
};

export type SaveTetromazeProgressPayload = {
  highestLevel?: number;
  currentLevel?: number;
  levelIndex?: number;
  score?: number;
};

async function parseError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function normalizeProgress(data: TetromazeProgressResponse): TetromazeProgress {
  const highestLevel = Number.isFinite(data.highestLevel) ? Math.max(1, Math.floor(data.highestLevel as number)) : 1;
  const currentLevel = Number.isFinite(data.currentLevel) ? Math.max(1, Math.floor(data.currentLevel as number)) : 1;

  const levelScoresRaw = data.levelScores ?? {};
  const levelScores: Record<string, number> = {};
  for (const [key, value] of Object.entries(levelScoresRaw)) {
    const level = Number.parseInt(key, 10);
    const score = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : Number.parseInt(String(value), 10);
    if (!Number.isFinite(level) || level < 1 || !Number.isFinite(score) || score < 0) continue;
    levelScores[String(level)] = score;
  }

  return { highestLevel, currentLevel, levelScores };
}

export async function fetchTetromazeProgress(): Promise<TetromazeProgress> {
  const res = await fetch(`${API_URL}/tetromaze/progress`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement progression Tetromaze"));
  }

  const data = (await res.json()) as TetromazeProgressResponse;
  return normalizeProgress(data);
}

export async function saveTetromazeProgress(
  payload: SaveTetromazeProgressPayload
): Promise<TetromazeProgress> {
  const body: SaveTetromazeProgressPayload = {};

  if (payload.highestLevel !== undefined) body.highestLevel = Math.max(1, Math.floor(payload.highestLevel));
  if (payload.currentLevel !== undefined) body.currentLevel = Math.max(1, Math.floor(payload.currentLevel));
  if (payload.levelIndex !== undefined) body.levelIndex = Math.max(1, Math.floor(payload.levelIndex));
  if (payload.score !== undefined) body.score = Math.max(0, Math.floor(payload.score));

  const res = await fetch(`${API_URL}/tetromaze/progress`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde progression Tetromaze"));
  }

  const data = (await res.json()) as TetromazeProgressResponse;
  return normalizeProgress(data);
}
