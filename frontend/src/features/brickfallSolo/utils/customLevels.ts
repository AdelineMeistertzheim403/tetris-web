// Utilitaires purs reutilisables pour ce module.
import {
  createStoredCollection,
  exportStoredItemJson,
  parseStoredItemsFromJson,
} from "../../app/logic/localStorageCollection";
import type { BrickfallLevel } from "../types/levels";
import { isBrickfallLevel, normalizeBrickfallLevel } from "../types/levels";

const STORAGE_KEY = "brickfall-solo-custom-levels-v1";

const normalizeLevel = (value: unknown) =>
  isBrickfallLevel(value) ? normalizeBrickfallLevel(value) : null;

const customLevelsStore = createStoredCollection<BrickfallLevel>({
  storageKey: STORAGE_KEY,
  getId: (level) => level.id,
  normalize: normalizeLevel,
});

export const listCustomLevels = customLevelsStore.list;
export const replaceCustomLevels = customLevelsStore.replace;
export const mergeCustomLevels = customLevelsStore.merge;
export const upsertCustomLevel = customLevelsStore.upsert;
export const removeCustomLevel = customLevelsStore.remove;
export const findCustomLevel = customLevelsStore.find;

export function exportLevelJson(level: BrickfallLevel): string {
  return exportStoredItemJson(level, normalizeBrickfallLevel);
}

export function parseLevelsFromJson(json: string): BrickfallLevel[] {
  return parseStoredItemsFromJson(json, normalizeLevel);
}
