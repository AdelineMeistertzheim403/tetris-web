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
