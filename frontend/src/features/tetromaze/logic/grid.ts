import type { Direction } from "../types";

// Coordonnées d'une case dans la grille.
export type GridPos = { x: number; y: number };

type Move = { dir: Direction; pos: GridPos };

// Vecteurs unitaires par direction.
export const DIRS: Record<Direction, GridPos> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

// Format de clé stable pour les Sets/Maps de positions.
export const toKey = (x: number, y: number) => `${x},${y}`;

export const parseKey = (key: string): GridPos => {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
};

export const inBounds = (grid: string[], x: number, y: number) =>
  y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0);

export const isWall = (grid: string[], x: number, y: number) =>
  !inBounds(grid, x, y) || grid[y][x] === "#";

export const canMoveTo = (grid: string[], x: number, y: number) => !isWall(grid, x, y);

export const nextPos = (x: number, y: number, dir: Direction): GridPos => {
  const d = DIRS[dir];
  return { x: x + d.x, y: y + d.y };
};

export const getValidMoves = (grid: string[], x: number, y: number): Move[] => {
  const entries = Object.entries(DIRS) as Array<[Direction, GridPos]>;
  return entries
    .map(([dir, d]) => ({ dir, pos: { x: x + d.x, y: y + d.y } }))
    .filter((m) => canMoveTo(grid, m.pos.x, m.pos.y));
};

export const manhattan = (a: GridPos, b: GridPos) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// BFS "pas suivant":
// retourne la prochaine case à emprunter pour aller de `from` vers `target`.
export const findNextStepBfs = (
  grid: string[],
  from: GridPos,
  target: GridPos
): GridPos | null => {
  if (from.x === target.x && from.y === target.y) return from;

  const q: GridPos[] = [from];
  const visited = new Set<string>([toKey(from.x, from.y)]);
  const parent = new Map<string, string>();

  while (q.length > 0) {
    const cur = q.shift()!;
    if (cur.x === target.x && cur.y === target.y) break;

    for (const { pos } of getValidMoves(grid, cur.x, cur.y)) {
      const key = toKey(pos.x, pos.y);
      if (visited.has(key)) continue;
      visited.add(key);
      parent.set(key, toKey(cur.x, cur.y));
      q.push(pos);
    }
  }

  const targetKey = toKey(target.x, target.y);
  if (!visited.has(targetKey)) return null;

  let current = targetKey;
  let prev = parent.get(current);
  while (prev && prev !== toKey(from.x, from.y)) {
    current = prev;
    prev = parent.get(current);
  }

  return parseKey(current);
};

// Sélection aléatoire utilitaire (retourne null si tableau vide).
export const chooseRandom = <T>(items: T[]): T | null => {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
};
