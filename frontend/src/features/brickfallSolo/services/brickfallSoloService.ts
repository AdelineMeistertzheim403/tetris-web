// Service d'acces aux donnees/API pour ce domaine.
import { getAuthHeader } from "../../auth/services/authService";
import type { BrickfallLevel } from "../types/levels";
import { isBrickfallLevel, normalizeBrickfallLevel } from "../types/levels";

const API_URL = import.meta.env.VITE_API_URL;

async function parseError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchBrickfallSoloProgress(): Promise<number> {
  const res = await fetch(`${API_URL}/brickfall-solo/progress`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement progression Brickfall Solo"));
  }

  const data = (await res.json()) as { highestLevel?: number };
  const highestLevel = Number.isFinite(data.highestLevel) ? Math.floor(data.highestLevel as number) : 1;
  return Math.max(1, highestLevel);
}

export async function saveBrickfallSoloProgress(highestLevel: number): Promise<number> {
  const res = await fetch(`${API_URL}/brickfall-solo/progress`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify({ highestLevel: Math.max(1, Math.floor(highestLevel)) }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde progression Brickfall Solo"));
  }

  const data = (await res.json()) as { highestLevel?: number };
  const savedLevel = Number.isFinite(data.highestLevel) ? Math.floor(data.highestLevel as number) : 1;
  return Math.max(1, savedLevel);
}

export async function fetchBrickfallSoloCustomLevels(): Promise<BrickfallLevel[]> {
  const res = await fetch(`${API_URL}/brickfall-solo/custom-levels`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux custom Brickfall Solo"));
  }

  const data = (await res.json()) as { levels?: unknown[] };
  const arr = Array.isArray(data.levels) ? data.levels : [];
  return arr
    .filter((item): item is BrickfallLevel => isBrickfallLevel(item))
    .map((lvl) => normalizeBrickfallLevel(lvl));
}

export async function saveBrickfallSoloCustomLevel(level: BrickfallLevel): Promise<void> {
  const normalized = normalizeBrickfallLevel(level);
  const res = await fetch(`${API_URL}/brickfall-solo/custom-levels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify({ level: normalized }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde niveau custom Brickfall Solo"));
  }
}

export async function deleteBrickfallSoloCustomLevel(levelId: string): Promise<void> {
  const res = await fetch(`${API_URL}/brickfall-solo/custom-levels/${encodeURIComponent(levelId)}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur suppression niveau custom Brickfall Solo"));
  }
}

export type BrickfallSoloCommunityLevel = {
  id: number;
  level: BrickfallLevel;
  authorId: number;
  authorPseudo: string;
  isOwn: boolean;
  likeCount: number;
  playCount: number;
  likedByMe: boolean;
  updatedAt?: string | null;
};

function isCommunityLevel(value: unknown): value is BrickfallSoloCommunityLevel {
  if (!value || typeof value !== "object") return false;
  const row = value as BrickfallSoloCommunityLevel;
  return (
    Number.isFinite(row.id) &&
    isBrickfallLevel(row.level) &&
    Number.isFinite(row.authorId) &&
    typeof row.authorPseudo === "string" &&
    typeof row.isOwn === "boolean" &&
    Number.isFinite(row.likeCount) &&
    Number.isFinite(row.playCount) &&
    typeof row.likedByMe === "boolean"
  );
}

function parseCommunityLevelsPayload(data: unknown): BrickfallSoloCommunityLevel[] {
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { levels?: unknown[] }).levels)
      ? (data as { levels: unknown[] }).levels
      : [];

  return arr
    .filter(isCommunityLevel)
    .map((item) => ({
      ...item,
      level: normalizeBrickfallLevel(item.level),
      likeCount: Math.max(0, Math.floor(item.likeCount)),
      playCount: Math.max(0, Math.floor(item.playCount)),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
    }));
}

export async function fetchBrickfallSoloCommunityLevels(): Promise<BrickfallSoloCommunityLevel[]> {
  const res = await fetch(`${API_URL}/brickfall-solo/community-levels`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux joueurs Brickfall Solo"));
  }

  return parseCommunityLevelsPayload(await res.json());
}

export async function fetchBrickfallSoloCommunityLevel(
  publishedId: number
): Promise<BrickfallSoloCommunityLevel> {
  const res = await fetch(`${API_URL}/brickfall-solo/community-levels/${publishedId}`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveau joueur Brickfall Solo"));
  }

  const data = (await res.json()) as { level?: unknown };
  if (isCommunityLevel(data.level)) {
    return {
      ...data.level,
      level: normalizeBrickfallLevel(data.level.level),
      updatedAt: typeof data.level.updatedAt === "string" ? data.level.updatedAt : null,
    };
  }
  throw new Error("Niveau joueur Brickfall Solo invalide");
}

export async function publishBrickfallSoloCommunityLevel(
  levelId: string
): Promise<BrickfallSoloCommunityLevel> {
  const res = await fetch(`${API_URL}/brickfall-solo/community-levels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify({ levelId }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur publication niveau Brickfall Solo"));
  }

  const data = (await res.json()) as { level?: unknown };
  if (isCommunityLevel(data.level)) {
    return {
      ...data.level,
      level: normalizeBrickfallLevel(data.level.level),
      updatedAt: typeof data.level.updatedAt === "string" ? data.level.updatedAt : null,
    };
  }
  throw new Error("Publication Brickfall Solo invalide");
}

export async function toggleBrickfallSoloCommunityLevelLike(
  publishedId: number
): Promise<{ liked: boolean; likeCount: number }> {
  const res = await fetch(`${API_URL}/brickfall-solo/community-levels/${publishedId}/like`, {
    method: "POST",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur vote niveau Brickfall Solo"));
  }

  const data = (await res.json()) as { liked?: unknown; likeCount?: unknown };
  return {
    liked: Boolean(data.liked),
    likeCount: Number.isFinite(data.likeCount)
      ? Math.max(0, Math.floor(data.likeCount as number))
      : 0,
  };
}
