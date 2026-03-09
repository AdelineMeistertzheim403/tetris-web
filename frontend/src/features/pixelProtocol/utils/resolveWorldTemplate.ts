import type { LevelDef, WorldTemplate } from "../types";

export function applyWorldTemplateToLevel(
  level: LevelDef,
  world: WorldTemplate
): LevelDef {
  return {
    ...level,
    worldTemplateId: world.id,
    worldWidth: world.worldWidth,
    decorations: world.decorations,
  };
}

export function resolveLevelWorldTemplate(
  level: LevelDef | null,
  worlds: WorldTemplate[]
): LevelDef | null {
  if (!level) return null;
  if (!level.worldTemplateId) return level;
  const world = worlds.find((item) => item.id === level.worldTemplateId);
  if (!world) return level;
  return applyWorldTemplateToLevel(level, world);
}

export function resolveLevelsWorldTemplates(
  levels: LevelDef[],
  worlds: WorldTemplate[]
): LevelDef[] {
  return levels
    .map((level) => resolveLevelWorldTemplate(level, worlds))
    .filter((level): level is LevelDef => level !== null);
}
