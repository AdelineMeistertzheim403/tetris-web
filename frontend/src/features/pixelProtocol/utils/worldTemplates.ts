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

function persist(worlds: WorldTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds));
}

function sortWorldTemplates(worlds: WorldTemplate[]) {
  return [...worlds].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function listPixelProtocolWorldTemplates(): WorldTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortWorldTemplates(parsed.filter(isWorldTemplate));
  } catch {
    return [];
  }
}

export function upsertPixelProtocolWorldTemplate(world: WorldTemplate): WorldTemplate[] {
  if (!isWorldTemplate(world)) return listPixelProtocolWorldTemplates();
  const worlds = listPixelProtocolWorldTemplates();
  const index = worlds.findIndex((item) => item.id === world.id);
  if (index >= 0) worlds[index] = world;
  else worlds.unshift(world);
  const next = sortWorldTemplates(worlds);
  persist(next);
  return next;
}

export function mergePixelProtocolWorldTemplates(worlds: WorldTemplate[]): WorldTemplate[] {
  const merged = [...listPixelProtocolWorldTemplates()];
  for (const world of worlds) {
    if (!isWorldTemplate(world)) continue;
    const index = merged.findIndex((item) => item.id === world.id);
    if (index >= 0) merged[index] = world;
    else merged.unshift(world);
  }
  const next = sortWorldTemplates(merged);
  persist(next);
  return next;
}

export function removePixelProtocolWorldTemplate(worldId: string): WorldTemplate[] {
  const next = listPixelProtocolWorldTemplates().filter((world) => world.id !== worldId);
  persist(next);
  return next;
}

export function findPixelProtocolWorldTemplate(worldId: string): WorldTemplate | null {
  return listPixelProtocolWorldTemplates().find((world) => world.id === worldId) ?? null;
}
