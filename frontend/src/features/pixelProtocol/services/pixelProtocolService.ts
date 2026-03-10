import { getAuthHeader } from "../../auth/services/authService";
import { sortLevels } from "../levelBuilders";
import type { LevelDef, WorldTemplate } from "../types";

const API_URL = import.meta.env.VITE_API_URL;

export type PixelProtocolAdminLevel = LevelDef & {
  active: boolean;
  sortOrder?: number;
  updatedAt?: string | null;
};

export type PixelProtocolProgress = {
  highestLevel: number;
  currentLevel: number;
  updatedAt?: string | null;
};

export type PixelProtocolCommunityLevel = {
  id: number;
  level: LevelDef;
  authorId: number;
  authorPseudo: string;
  isOwn: boolean;
  likeCount: number;
  likedByMe: boolean;
  updatedAt?: string | null;
};

export type SavePixelProtocolProgressPayload = {
  highestLevel?: number;
  currentLevel?: number;
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
  const validDecorations =
    level.decorations === undefined ||
    (Array.isArray(level.decorations) &&
      level.decorations.every(
        (decoration) =>
          decoration &&
          typeof decoration.id === "string" &&
          typeof decoration.type === "string" &&
          typeof decoration.x === "number" &&
          typeof decoration.y === "number" &&
          typeof decoration.width === "number" &&
          typeof decoration.height === "number"
      ));
  return (
    typeof level.id === "string" &&
    typeof level.name === "string" &&
    typeof level.world === "number" &&
    typeof level.worldWidth === "number" &&
    (level.worldHeight === undefined || typeof level.worldHeight === "number") &&
    (level.worldTopPadding === undefined || typeof level.worldTopPadding === "number") &&
    (level.worldTemplateId === undefined ||
      level.worldTemplateId === null ||
      typeof level.worldTemplateId === "string") &&
    typeof level.requiredOrbs === "number" &&
    typeof level.spawn?.x === "number" &&
    typeof level.spawn?.y === "number" &&
    typeof level.portal?.x === "number" &&
    typeof level.portal?.y === "number" &&
    Array.isArray(level.platforms) &&
    Array.isArray(level.checkpoints) &&
    Array.isArray(level.orbs) &&
    Array.isArray(level.enemies) &&
    validDecorations
  );
}

function isWorldTemplate(value: unknown): value is WorldTemplate {
  if (!value || typeof value !== "object") return false;
  const world = value as WorldTemplate;
  return (
    typeof world.id === "string" &&
    typeof world.name === "string" &&
    typeof world.worldWidth === "number" &&
    (world.worldHeight === undefined || typeof world.worldHeight === "number") &&
    (world.worldTopPadding === undefined || typeof world.worldTopPadding === "number") &&
    Array.isArray(world.decorations)
  );
}

function isAdminLevel(value: unknown): value is PixelProtocolAdminLevel {
  return isLevelDef(value) && typeof (value as PixelProtocolAdminLevel).active === "boolean";
}

function isCommunityLevel(value: unknown): value is PixelProtocolCommunityLevel {
  if (!value || typeof value !== "object") return false;
  const row = value as PixelProtocolCommunityLevel;
  return (
    Number.isFinite(row.id) &&
    isLevelDef(row.level) &&
    Number.isFinite(row.authorId) &&
    typeof row.authorPseudo === "string" &&
    typeof row.isOwn === "boolean" &&
    Number.isFinite(row.likeCount) &&
    typeof row.likedByMe === "boolean"
  );
}

function normalizeProgress(data: unknown): PixelProtocolProgress {
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const highestLevel = Number.isFinite(row.highestLevel)
    ? Math.max(1, Math.floor(row.highestLevel as number))
    : 1;
  const currentLevel = Number.isFinite(row.currentLevel)
    ? Math.max(1, Math.floor(row.currentLevel as number))
    : 1;

  return {
    highestLevel,
    currentLevel,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : null,
  };
}

function parseLevelsPayload(data: unknown): LevelDef[] {
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { levels?: unknown[] }).levels)
      ? (data as { levels: unknown[] }).levels
      : [];
  return sortLevels(arr.filter(isLevelDef));
}

function parseWorldTemplatesPayload(data: unknown): WorldTemplate[] {
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { worlds?: unknown[] }).worlds)
      ? (data as { worlds: unknown[] }).worlds
      : [];
  return arr.filter(isWorldTemplate);
}

function parseCommunityLevelsPayload(data: unknown): PixelProtocolCommunityLevel[] {
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { levels?: unknown[] }).levels)
      ? (data as { levels: unknown[] }).levels
      : [];
  return arr.filter(isCommunityLevel);
}

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

export async function fetchPixelProtocolCustomLevels(): Promise<LevelDef[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/custom-levels`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux custom Pixel Protocol"));
  }

  return parseLevelsPayload(await res.json());
}

export async function fetchPixelProtocolWorldTemplates(): Promise<WorldTemplate[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/world-templates`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement mondes custom Pixel Protocol"));
  }

  return parseWorldTemplatesPayload(await res.json());
}

export async function fetchPixelProtocolCommunityLevels(): Promise<PixelProtocolCommunityLevel[]> {
  const res = await fetch(`${API_URL}/pixel-protocol/community-levels`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveaux joueurs Pixel Protocol"));
  }

  return parseCommunityLevelsPayload(await res.json());
}

export async function fetchPixelProtocolCommunityLevel(
  publishedId: number
): Promise<PixelProtocolCommunityLevel> {
  const res = await fetch(`${API_URL}/pixel-protocol/community-levels/${publishedId}`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement niveau joueur Pixel Protocol"));
  }

  const data = (await res.json()) as { level?: unknown };
  if (isCommunityLevel(data.level)) return data.level;
  throw new Error("Niveau joueur invalide");
}

export async function savePixelProtocolCustomLevel(level: LevelDef): Promise<LevelDef> {
  const res = await fetch(`${API_URL}/pixel-protocol/custom-levels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
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

export async function savePixelProtocolWorldTemplate(world: WorldTemplate): Promise<WorldTemplate> {
  const res = await fetch(`${API_URL}/pixel-protocol/world-templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify({ world }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde monde custom Pixel Protocol"));
  }

  const data = (await res.json()) as { world?: unknown };
  return isWorldTemplate(data.world) ? data.world : world;
}

export async function publishPixelProtocolCommunityLevel(
  levelId: string
): Promise<PixelProtocolCommunityLevel> {
  const res = await fetch(`${API_URL}/pixel-protocol/community-levels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify({ levelId }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur publication niveau Pixel Protocol"));
  }

  const data = (await res.json()) as { level?: unknown };
  if (isCommunityLevel(data.level)) return data.level;
  throw new Error("Publication invalide");
}

export async function togglePixelProtocolCommunityLevelLike(
  publishedId: number
): Promise<{ liked: boolean; likeCount: number }> {
  const res = await fetch(`${API_URL}/pixel-protocol/community-levels/${publishedId}/like`, {
    method: "POST",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur vote niveau Pixel Protocol"));
  }

  const data = (await res.json()) as { liked?: unknown; likeCount?: unknown };
  return {
    liked: Boolean(data.liked),
    likeCount: Number.isFinite(data.likeCount) ? Math.max(0, Math.floor(data.likeCount as number)) : 0,
  };
}

export async function deletePixelProtocolCustomLevel(levelId: string): Promise<void> {
  const res = await fetch(`${API_URL}/pixel-protocol/custom-levels/${encodeURIComponent(levelId)}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur suppression niveau custom Pixel Protocol"));
  }
}

export async function deletePixelProtocolWorldTemplate(templateId: string): Promise<void> {
  const res = await fetch(`${API_URL}/pixel-protocol/world-templates/${encodeURIComponent(templateId)}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur suppression monde custom Pixel Protocol"));
  }
}

export async function fetchPixelProtocolProgress(): Promise<PixelProtocolProgress> {
  const res = await fetch(`${API_URL}/pixel-protocol/progress`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement progression Pixel Protocol"));
  }

  return normalizeProgress(await res.json());
}

export async function savePixelProtocolProgress(
  payload: SavePixelProtocolProgressPayload
): Promise<PixelProtocolProgress> {
  const body: SavePixelProtocolProgressPayload = {};
  if (payload.highestLevel !== undefined) {
    body.highestLevel = Math.max(1, Math.floor(payload.highestLevel));
  }
  if (payload.currentLevel !== undefined) {
    body.currentLevel = Math.max(1, Math.floor(payload.currentLevel));
  }

  const res = await fetch(`${API_URL}/pixel-protocol/progress`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde progression Pixel Protocol"));
  }

  return normalizeProgress(await res.json());
}
