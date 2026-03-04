import { sortLevels } from "../levelBuilders";
import type { LevelDef } from "../types";

const STORAGE_KEY = "pixel-protocol-custom-levels-v1";

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

function persist(levels: LevelDef[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortLevels(levels)));
}

export function listPixelProtocolCustomLevels(): LevelDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortLevels(parsed.filter(isLevelDef));
  } catch {
    return [];
  }
}

export function replacePixelProtocolCustomLevels(levels: LevelDef[]): LevelDef[] {
  const normalized = sortLevels(levels.filter(isLevelDef));
  persist(normalized);
  return normalized;
}

export function mergePixelProtocolCustomLevels(levels: LevelDef[]): LevelDef[] {
  const merged = [...listPixelProtocolCustomLevels()];
  for (const level of levels) {
    if (!isLevelDef(level)) continue;
    const index = merged.findIndex((item) => item.id === level.id);
    if (index >= 0) merged[index] = level;
    else merged.unshift(level);
  }
  const next = sortLevels(merged);
  persist(next);
  return next;
}

export function upsertPixelProtocolCustomLevel(level: LevelDef): LevelDef[] {
  if (!isLevelDef(level)) return listPixelProtocolCustomLevels();
  const levels = listPixelProtocolCustomLevels();
  const index = levels.findIndex((item) => item.id === level.id);
  if (index >= 0) levels[index] = level;
  else levels.unshift(level);
  const next = sortLevels(levels);
  persist(next);
  return next;
}

export function removePixelProtocolCustomLevel(levelId: string): LevelDef[] {
  const next = listPixelProtocolCustomLevels().filter((level) => level.id !== levelId);
  persist(next);
  return next;
}

export function findPixelProtocolCustomLevel(levelId: string): LevelDef | null {
  return listPixelProtocolCustomLevels().find((level) => level.id === levelId) ?? null;
}
