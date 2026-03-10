import type { LevelDef, WorldTemplate } from "../types";

function scaleDecorationsToLevel(level: LevelDef, world: WorldTemplate) {
  const sourceWidth = Math.max(1, world.worldWidth);
  const sourceHeight = Math.max(1, world.worldHeight ?? level.worldHeight ?? 1);
  const targetWidth = Math.max(1, level.worldWidth);
  const targetHeight = Math.max(1, level.worldHeight ?? world.worldHeight ?? sourceHeight);
  const scaleX = targetWidth / sourceWidth;
  const scaleY = targetHeight / sourceHeight;

  return world.decorations.map((decoration) => ({
    ...decoration,
    x: Math.round(decoration.x * scaleX),
    y: Math.round(decoration.y * scaleY),
    width: Math.max(4, Math.round(decoration.width * scaleX)),
    height: Math.max(4, Math.round(decoration.height * scaleY)),
  }));
}

export function applyWorldTemplateToLevel(
  level: LevelDef,
  world: WorldTemplate
): LevelDef {
  return {
    ...level,
    worldTemplateId: world.id,
    decorations: scaleDecorationsToLevel(level, world),
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
