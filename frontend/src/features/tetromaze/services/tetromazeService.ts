import { getAuthHeader } from "../../auth/services/authService";
import type { TetromazeLevel } from "../types";
import { normalizeTetromazeLevel } from "../utils/customLevels";

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

export type TetromazeCommunityLevel = {
  id: number;
  level: TetromazeLevel;
  authorId: number;
  authorPseudo: string;
  isOwn: boolean;
  likeCount: number;
  playCount: number;
  likedByMe: boolean;
  updatedAt?: string | null;
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

function isTetromazeCommunityLevel(value: unknown): value is TetromazeCommunityLevel {
  if (!value || typeof value !== "object") return false;
  const row = value as TetromazeCommunityLevel;
  return (
    Number.isFinite(row.id) &&
    Boolean(normalizeTetromazeLevel(row.level)) &&
    Number.isFinite(row.authorId) &&
    typeof row.authorPseudo === "string" &&
    typeof row.isOwn === "boolean" &&
    Number.isFinite(row.likeCount) &&
    Number.isFinite(row.playCount) &&
    typeof row.likedByMe === "boolean"
  );
}

function parseCommunityLevelsPayload(data: unknown): TetromazeCommunityLevel[] {
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { levels?: unknown[] }).levels)
      ? (data as { levels: unknown[] }).levels
      : [];

  return arr
    .filter(isTetromazeCommunityLevel)
    .map((item) => ({
      ...item,
      level: normalizeTetromazeLevel(item.level) as TetromazeLevel,
      likeCount: Math.max(0, Math.floor(item.likeCount)),
      playCount: Math.max(0, Math.floor(item.playCount)),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
    }));
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

export async function fetchTetromazeCustomLevels(): Promise<TetromazeLevel[]> {
  const res = await fetch(`${API_URL}/tetromaze/custom-levels`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux custom Tetromaze"));
  }

  const data = (await res.json()) as { levels?: unknown[] };
  const arr = Array.isArray(data.levels) ? data.levels : [];
  return arr
    .map((item) => normalizeTetromazeLevel(item))
    .filter((item): item is TetromazeLevel => Boolean(item));
}

export async function saveTetromazeCustomLevel(level: TetromazeLevel): Promise<void> {
  const normalized = normalizeTetromazeLevel(level);
  if (!normalized) {
    throw new Error("Niveau Tetromaze invalide");
  }

  const res = await fetch(`${API_URL}/tetromaze/custom-levels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify({ level: normalized }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde niveau custom Tetromaze"));
  }
}

export async function deleteTetromazeCustomLevel(levelId: string): Promise<void> {
  const res = await fetch(`${API_URL}/tetromaze/custom-levels/${encodeURIComponent(levelId)}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur suppression niveau custom Tetromaze"));
  }
}

export async function fetchTetromazeCommunityLevels(): Promise<TetromazeCommunityLevel[]> {
  const res = await fetch(`${API_URL}/tetromaze/community-levels`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux joueurs Tetromaze"));
  }

  return parseCommunityLevelsPayload(await res.json());
}

export async function fetchTetromazeCommunityLevel(
  publishedId: number
): Promise<TetromazeCommunityLevel> {
  const res = await fetch(`${API_URL}/tetromaze/community-levels/${publishedId}`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveau joueur Tetromaze"));
  }

  const data = (await res.json()) as { level?: unknown };
  if (isTetromazeCommunityLevel(data.level)) {
    return {
      ...data.level,
      level: normalizeTetromazeLevel(data.level.level) as TetromazeLevel,
      updatedAt: typeof data.level.updatedAt === "string" ? data.level.updatedAt : null,
    };
  }
  throw new Error("Niveau joueur Tetromaze invalide");
}

export async function publishTetromazeCommunityLevel(
  levelId: string
): Promise<TetromazeCommunityLevel> {
  const res = await fetch(`${API_URL}/tetromaze/community-levels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify({ levelId }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur publication niveau Tetromaze"));
  }

  const data = (await res.json()) as { level?: unknown };
  if (isTetromazeCommunityLevel(data.level)) {
    return {
      ...data.level,
      level: normalizeTetromazeLevel(data.level.level) as TetromazeLevel,
      updatedAt: typeof data.level.updatedAt === "string" ? data.level.updatedAt : null,
    };
  }
  throw new Error("Publication Tetromaze invalide");
}

export async function toggleTetromazeCommunityLevelLike(
  publishedId: number
): Promise<{ liked: boolean; likeCount: number }> {
  const res = await fetch(`${API_URL}/tetromaze/community-levels/${publishedId}/like`, {
    method: "POST",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur vote niveau Tetromaze"));
  }

  const data = (await res.json()) as { liked?: unknown; likeCount?: unknown };
  return {
    liked: Boolean(data.liked),
    likeCount: Number.isFinite(data.likeCount)
      ? Math.max(0, Math.floor(data.likeCount as number))
      : 0,
  };
}
