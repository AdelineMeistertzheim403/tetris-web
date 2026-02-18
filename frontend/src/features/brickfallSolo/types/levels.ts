// Types partages utilises par ce module.
export type BrickType =
  | "normal"
  | "armor"
  | "bonus"
  | "malus"
  | "explosive"
  | "cursed"
  | "mirror";

export type BrickfallBrick = {
  x: number;
  y: number;
  type: BrickType;
  hp?: number;
  drop?: string;
};

export interface BrickfallLevel {
  id: string;
  name: string;
  width: number;
  height: number;
  bricks: BrickfallBrick[];
  boss?: boolean;
}

const VALID_TYPES: BrickType[] = [
  "normal",
  "armor",
  "bonus",
  "malus",
  "explosive",
  "cursed",
  "mirror",
];

export function isBrickfallLevel(value: unknown): value is BrickfallLevel {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || !v.id) return false;
  if (typeof v.name !== "string" || !v.name) return false;
  if (typeof v.width !== "number" || v.width <= 0) return false;
  if (typeof v.height !== "number" || v.height <= 0) return false;
  if (!Array.isArray(v.bricks)) return false;
  for (const brick of v.bricks) {
    if (!brick || typeof brick !== "object") return false;
    const b = brick as Record<string, unknown>;
    if (typeof b.x !== "number" || typeof b.y !== "number") return false;
    if (typeof b.type !== "string" || !VALID_TYPES.includes(b.type as BrickType)) return false;
    if (b.hp !== undefined && typeof b.hp !== "number") return false;
    if (b.drop !== undefined && typeof b.drop !== "string") return false;
  }
  if (v.boss !== undefined && typeof v.boss !== "boolean") return false;
  return true;
}

export function normalizeBrickfallLevel(level: BrickfallLevel): BrickfallLevel {
  const width = Math.max(1, Math.floor(level.width));
  const height = Math.max(1, Math.floor(level.height));
  const dedupe = new Map<string, BrickfallBrick>();
  for (const brick of level.bricks) {
    const x = Math.floor(brick.x);
    const y = Math.floor(brick.y);
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const key = `${x}:${y}`;
    dedupe.set(key, {
      x,
      y,
      type: brick.type,
      hp: brick.type === "armor" ? Math.max(2, Math.floor(brick.hp ?? 3)) : 1,
      drop: brick.drop,
    });
  }
  return {
    id: level.id.trim(),
    name: level.name.trim() || "Niveau custom",
    width,
    height,
    boss: Boolean(level.boss),
    bricks: [...dedupe.values()],
  };
}
