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
    (level.worldHeight === undefined || typeof level.worldHeight === "number") &&
    (level.worldTopPadding === undefined || typeof level.worldTopPadding === "number") &&
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

function mergeOrbMetadata(base: LevelDef | undefined, incoming: LevelDef): LevelDef {
  if (!base) return incoming;
  return {
    ...incoming,
    worldTopPadding: incoming.worldTopPadding ?? base.worldTopPadding,
    orbs: incoming.orbs.map((orb) => {
      const previous = base.orbs.find((item) => item.id === orb.id);
      return {
        ...orb,
        affinity: orb.affinity ?? previous?.affinity ?? "standard",
        grantsSkill: orb.grantsSkill ?? previous?.grantsSkill ?? null,
      };
    }),
  };
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
    if (index >= 0) merged[index] = mergeOrbMetadata(merged[index], level);
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
  if (index >= 0) levels[index] = mergeOrbMetadata(levels[index], level);
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
