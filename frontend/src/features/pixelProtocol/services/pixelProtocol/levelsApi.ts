import type { LevelDef } from "../../types";
import {
  API_URL,
  authHeaders,
  isAdminLevel,
  isLevelDef,
  parseError,
  parseLevelsPayload,
  type PixelProtocolAdminLevel,
} from "./shared";

export async function fetchPixelProtocolLevels(): Promise<LevelDef[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/levels`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux Pixel Protocol"));
  }

  return parseLevelsPayload(await res.json());
}

export async function fetchPixelProtocolAdminLevels(): Promise<PixelProtocolAdminLevel[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/levels/admin`, {
    headers: authHeaders(),
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
      ...authHeaders(),
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
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur suppression niveau Pixel Protocol"));
  }
}

export async function fetchPixelProtocolCustomLevels(): Promise<LevelDef[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/custom-levels`, {
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux custom Pixel Protocol"));
  }

  return parseLevelsPayload(await res.json());
}

export async function savePixelProtocolCustomLevel(level: LevelDef): Promise<LevelDef> {
  const res = await fetch(`${API_URL}/pixel-protocol/custom-levels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ level }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde niveau custom Pixel Protocol"));
  }

  const data = (await res.json()) as { level?: unknown };
  return isLevelDef(data.level) ? data.level : level;
}

export async function deletePixelProtocolCustomLevel(levelId: string): Promise<void> {
  const res = await fetch(`${API_URL}/pixel-protocol/custom-levels/${encodeURIComponent(levelId)}`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur suppression niveau custom Pixel Protocol"));
  }
}
