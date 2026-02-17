import type { BrickfallLevel } from "../types/levels";
import { isBrickfallLevel, normalizeBrickfallLevel } from "../types/levels";

const STORAGE_KEY = "brickfall-solo-custom-levels-v1";

export function listCustomLevels(): BrickfallLevel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is BrickfallLevel => isBrickfallLevel(item))
      .map((lvl) => normalizeBrickfallLevel(lvl));
  } catch {
    return [];
  }
}

function persist(levels: BrickfallLevel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
}

export function replaceCustomLevels(levels: BrickfallLevel[]): BrickfallLevel[] {
  const normalized = levels.map((lvl) => normalizeBrickfallLevel(lvl));
  persist(normalized);
  return normalized;
}

export function mergeCustomLevels(levels: BrickfallLevel[]): BrickfallLevel[] {
  const merged = [...listCustomLevels()];
  for (const level of levels) {
    const normalized = normalizeBrickfallLevel(level);
    const idx = merged.findIndex((l) => l.id === normalized.id);
    if (idx >= 0) merged[idx] = normalized;
    else merged.unshift(normalized);
  }
  persist(merged);
  return merged;
}

export function upsertCustomLevel(level: BrickfallLevel): BrickfallLevel[] {
  const normalized = normalizeBrickfallLevel(level);
  const levels = listCustomLevels();
  const idx = levels.findIndex((l) => l.id === normalized.id);
  if (idx >= 0) levels[idx] = normalized;
  else levels.unshift(normalized);
  persist(levels);
  return levels;
}

export function removeCustomLevel(id: string): BrickfallLevel[] {
  const levels = listCustomLevels().filter((l) => l.id !== id);
  persist(levels);
  return levels;
}

export function findCustomLevel(id: string): BrickfallLevel | null {
  const levels = listCustomLevels();
  return levels.find((l) => l.id === id) ?? null;
}

export function exportLevelJson(level: BrickfallLevel): string {
  return JSON.stringify(normalizeBrickfallLevel(level), null, 2);
}

export function parseLevelsFromJson(json: string): BrickfallLevel[] {
  const parsed = JSON.parse(json) as unknown;
  if (Array.isArray(parsed)) {
    return parsed
      .filter((item): item is BrickfallLevel => isBrickfallLevel(item))
      .map((lvl) => normalizeBrickfallLevel(lvl));
  }
  if (isBrickfallLevel(parsed)) {
    return [normalizeBrickfallLevel(parsed)];
  }
  return [];
}
