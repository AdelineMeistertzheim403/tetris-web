import { getAuthHeader } from "../../auth/services/authService";
import { sortLevels } from "../levelBuilders";
import type { LevelDef } from "../types";

const API_URL = import.meta.env.VITE_API_URL;

export type PixelProtocolAdminLevel = LevelDef & {
  active: boolean;
  sortOrder?: number;
  updatedAt?: string | null;
};

async function parseError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function isLevelDef(value: unknown): value is LevelDef {
  if (!value || typeof value !== "object") return false;
  const level = value as LevelDef;
  return (
    typeof level.id === "string" &&
    typeof level.name === "string" &&
    typeof level.world === "number" &&
    typeof level.worldWidth === "number" &&
    typeof level.requiredOrbs === "number" &&
    typeof level.spawn?.x === "number" &&
    typeof level.spawn?.y === "number" &&
    typeof level.portal?.x === "number" &&
    typeof level.portal?.y === "number" &&
    Array.isArray(level.platforms) &&
    Array.isArray(level.checkpoints) &&
    Array.isArray(level.orbs) &&
    Array.isArray(level.enemies)
  );
}

function isAdminLevel(value: unknown): value is PixelProtocolAdminLevel {
  return isLevelDef(value) && typeof (value as PixelProtocolAdminLevel).active === "boolean";
}

export async function fetchPixelProtocolLevels(): Promise<LevelDef[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/levels`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux Pixel Protocol"));
  }

  const data = (await res.json()) as unknown;
  const arr = Array.isArray(data) ? data : [];
  const levels = arr.filter(isLevelDef);
  return sortLevels(levels);
}

export async function fetchPixelProtocolAdminLevels(): Promise<PixelProtocolAdminLevel[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/levels/admin`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux admin Pixel Protocol"));
  }

  const data = (await res.json()) as unknown;
  const arr = Array.isArray(data) ? data : [];
  return arr.filter(isAdminLevel);
}

export async function savePixelProtocolLevel(
  level: LevelDef,
  active: boolean
): Promise<PixelProtocolAdminLevel> {
  const res = await fetch(`${API_URL}/pixel-protocol/levels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify({ level, active }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde niveau Pixel Protocol"));
  }

  const data = (await res.json()) as unknown;
  if (isAdminLevel(data)) return data;

  return { ...level, active };
}

export async function deletePixelProtocolLevel(levelId: string): Promise<void> {
  const res = await fetch(`${API_URL}/pixel-protocol/levels/${encodeURIComponent(levelId)}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur suppression niveau Pixel Protocol"));
  }
}
