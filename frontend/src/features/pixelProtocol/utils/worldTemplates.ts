import { createStoredCollection } from "../../app/logic/localStorageCollection";
import type { DecorationDef, WorldTemplate } from "../types";

const STORAGE_KEY = "pixel-protocol-world-templates-v1";

export function isDecorationDef(value: unknown): value is DecorationDef {
  if (!value || typeof value !== "object") return false;
  const decoration = value as DecorationDef;
  return (
    typeof decoration.id === "string" &&
    typeof decoration.type === "string" &&
    typeof decoration.x === "number" &&
    typeof decoration.y === "number" &&
    typeof decoration.width === "number" &&
    typeof decoration.height === "number"
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
    Array.isArray(world.decorations) &&
    world.decorations.every(isDecorationDef)
  );
}

function sortWorldTemplates(worlds: WorldTemplate[]) {
  return [...worlds].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

const normalizeWorldTemplate = (value: unknown) => (isWorldTemplate(value) ? value : null);

const worldTemplatesStore = createStoredCollection<WorldTemplate>({
  storageKey: STORAGE_KEY,
  getId: (world) => world.id,
  normalize: normalizeWorldTemplate,
  sort: sortWorldTemplates,
});

export const listPixelProtocolWorldTemplates = worldTemplatesStore.list;
export const upsertPixelProtocolWorldTemplate = worldTemplatesStore.upsert;
export const mergePixelProtocolWorldTemplates = worldTemplatesStore.merge;
export const removePixelProtocolWorldTemplate = worldTemplatesStore.remove;
export const findPixelProtocolWorldTemplate = worldTemplatesStore.find;
