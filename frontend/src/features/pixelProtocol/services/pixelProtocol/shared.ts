import { getAuthHeader } from "../../../auth/services/authService";
import { sortLevels } from "../../levelBuilders";
import type { LevelDef, WorldTemplate } from "../../types";

export const API_URL = import.meta.env.VITE_API_URL;

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
  playCount: number;
  likedByMe: boolean;
  updatedAt?: string | null;
};

export type SavePixelProtocolProgressPayload = {
  highestLevel?: number;
  currentLevel?: number;
};

export function authHeaders() {
  return {
    ...getAuthHeader(),
  };
}

export async function parseError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export function isLevelDef(value: unknown): value is LevelDef {
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

export function isWorldTemplate(value: unknown): value is WorldTemplate {
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

export function isAdminLevel(value: unknown): value is PixelProtocolAdminLevel {
  return isLevelDef(value) && typeof (value as PixelProtocolAdminLevel).active === "boolean";
}

export function isCommunityLevel(value: unknown): value is PixelProtocolCommunityLevel {
  if (!value || typeof value !== "object") return false;
  const row = value as PixelProtocolCommunityLevel;
  return (
    Number.isFinite(row.id) &&
    isLevelDef(row.level) &&
    Number.isFinite(row.authorId) &&
    typeof row.authorPseudo === "string" &&
    typeof row.isOwn === "boolean" &&
    Number.isFinite(row.likeCount) &&
    Number.isFinite(row.playCount) &&
    typeof row.likedByMe === "boolean"
  );
}

export function normalizeProgress(data: unknown): PixelProtocolProgress {
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

export function parseLevelsPayload(data: unknown): LevelDef[] {
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { levels?: unknown[] }).levels)
      ? (data as { levels: unknown[] }).levels
      : [];
  return sortLevels(arr.filter(isLevelDef));
}

export function parseWorldTemplatesPayload(data: unknown): WorldTemplate[] {
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { worlds?: unknown[] }).worlds)
      ? (data as { worlds: unknown[] }).worlds
      : [];
  return arr.filter(isWorldTemplate);
}

export function parseCommunityLevelsPayload(data: unknown): PixelProtocolCommunityLevel[] {
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { levels?: unknown[] }).levels)
      ? (data as { levels: unknown[] }).levels
      : [];
  return arr.filter(isCommunityLevel);
}
