import { createStoredCollection } from "../../app/logic/localStorageCollection";
import { sortLevels } from "../levelBuilders";
import type { LevelDef } from "../types";

const STORAGE_KEY = "pixel-protocol-custom-levels-v1";

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

function mergeOrbMetadata(base: LevelDef | undefined, incoming: LevelDef): LevelDef {
  if (!base) return incoming;
  return {
    ...incoming,
    worldTopPadding: incoming.worldTopPadding ?? base.worldTopPadding,
    worldTemplateId: incoming.worldTemplateId ?? base.worldTemplateId ?? null,
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

const normalizeLevel = (value: unknown) => (isLevelDef(value) ? value : null);

const pixelProtocolCustomLevelsStore = createStoredCollection<LevelDef>({
  storageKey: STORAGE_KEY,
  getId: (level) => level.id,
  normalize: normalizeLevel,
  mergeItem: mergeOrbMetadata,
  sort: sortLevels,
});

export const listPixelProtocolCustomLevels = pixelProtocolCustomLevelsStore.list;
export const replacePixelProtocolCustomLevels = pixelProtocolCustomLevelsStore.replace;
export const mergePixelProtocolCustomLevels = pixelProtocolCustomLevelsStore.merge;
export const upsertPixelProtocolCustomLevel = pixelProtocolCustomLevelsStore.upsert;
export const removePixelProtocolCustomLevel = pixelProtocolCustomLevelsStore.remove;
export const findPixelProtocolCustomLevel = pixelProtocolCustomLevelsStore.find;
