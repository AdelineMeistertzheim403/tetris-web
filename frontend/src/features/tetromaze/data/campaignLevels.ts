import { defaultTetromazeLevel } from "./defaultLevel";
import type { TetromazeLevel, TetromazeOrbType, TetrobotKind } from "../types";

export const TETROMAZE_WORLDS = 5;
export const TETROMAZE_LEVELS_PER_WORLD = 8;
export const TETROMAZE_TOTAL_LEVELS = TETROMAZE_WORLDS * TETROMAZE_LEVELS_PER_WORLD;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

type Pos = { x: number; y: number };

type CampaignLevelConfig = {
  layout: "A" | "B" | "C" | "D" | "E";
  botKinds: TetrobotKind[];
  playerSpawn?: Pos;
  powerOrbs?: Array<Pos & { type: TetromazeOrbType }>;
  loopPairs?: Array<{ a: Pos; b: Pos }>;
};

export function toWorldStage(index: number) {
  const safe = clamp(index, 1, TETROMAZE_TOTAL_LEVELS);
  const world = Math.floor((safe - 1) / TETROMAZE_LEVELS_PER_WORLD) + 1;
  const stage = ((safe - 1) % TETROMAZE_LEVELS_PER_WORLD) + 1;
  return { world, stage };
}

export function worldStageToIndex(world: number, stage: number) {
  const w = clamp(world, 1, TETROMAZE_WORLDS);
  const s = clamp(stage, 1, TETROMAZE_LEVELS_PER_WORLD);
  return (w - 1) * TETROMAZE_LEVELS_PER_WORLD + s;
}

const LAYOUTS: Record<"A" | "B" | "C" | "D" | "E", string[]> = {
  A: defaultTetromazeLevel.grid,
  B: [
    "###################",
    "#.........#.......#",
    "#.###.###.#.###.#.#",
    "#.#.....#...#...#.#",
    "#.#.###.#####.###.#",
    "#...#...#...#.....#",
    "###.#.###.#.###.###",
    "#...#.....#.....#.#",
    "#.#####.#####.###.#",
    "#.....#...#...#...#",
    "###.#.###.#.###.#.#",
    "#...#...#...#...#.#",
    "#.###.#.#####.#.###",
    "#.#...#...#...#...#",
    "#.#.#####.#.#####.#",
    "#...#.....#.....#.#",
    "###.#.###.#.###.#.#",
    "#...#...#...#...#.#",
    "#.###.#.#####.#.###",
    "#........P........#",
    "###################",
  ],
  C: [
    "###################",
    "#.......#.........#",
    "#.#####.#.#####.#.#",
    "#...#...#.....#.#.#",
    "###.#.#######.#.#.#",
    "#...#.......#.#...#",
    "#.#######.#.#.###.#",
    "#.......#.#.#...#.#",
    "#.#####.#.#.###.#.#",
    "#.#...#...#...#...#",
    "#.#.#.#######.#.###",
    "#...#.....#...#...#",
    "###.#####.#.#####.#",
    "#...#.....#.....#.#",
    "#.###.#########.#.#",
    "#.#...#.......#.#.#",
    "#.#.###.#####.#.#.#",
    "#...#...#...#...#.#",
    "#.###.###.#.#####.#",
    "#........P........#",
    "###################",
  ],
  D: [
    "###################",
    "#.......#.........#",
    "#.###.#.#.#.#####.#",
    "#...#.#...#...#...#",
    "###.#.#######.#.###",
    "#...#.....#...#...#",
    "#.#####.#.#.#####.#",
    "#.....#.#.#.#.....#",
    "#.###.#.#.#.#.###.#",
    "#.#...#...#...#...#",
    "#.#.###########.###",
    "#...#...#...#.....#",
    "###.#.#.#.#.#.###.#",
    "#...#.#...#...#...#",
    "#.###.#######.#.###",
    "#.#...#.....#.#...#",
    "#.#.###.###.#.###.#",
    "#...#...#...#.....#",
    "#.###.#.#.#####.###",
    "#........P........#",
    "###################",
  ],
  E: [
    "###################",
    "#....#.......#....#",
    "#.##.#.#####.#.##.#",
    "#.#..#...#...#..#.#",
    "#.#.###.#.#.###.#.#",
    "#...#...#.#...#...#",
    "###.#.###.###.#.###",
    "#...#.#.....#.#...#",
    "#.###.#.###.#.###.#",
    "#.#...#.#.#.#...#.#",
    "#.#.###.#.#.###.#.#",
    "#...#...#.#...#...#",
    "###.#.###.###.#.###",
    "#...#.#.....#.#...#",
    "#.###.#.###.#.###.#",
    "#...#...#...#...#.#",
    "#.#.###.#.#.###.#.#",
    "#.#...#.#.#...#.#.#",
    "#.###.#.#.###.#.###",
    "#........P........#",
    "###################",
  ],
};

const DEFAULT_ORBS = defaultTetromazeLevel.powerOrbs;
const DEFAULT_LOOPS = defaultTetromazeLevel.loopPairs ?? [];

const WORLD_CONFIGS: Record<number, CampaignLevelConfig[]> = {
  1: [
    { layout: "A", botKinds: ["rookie", "rookie", "balanced"] },
    { layout: "A", botKinds: ["rookie", "balanced", "rookie"] },
    { layout: "B", botKinds: ["rookie", "balanced", "balanced"] },
    { layout: "B", botKinds: ["rookie", "balanced", "balanced"], powerOrbs: [...DEFAULT_ORBS, { x: 3, y: 10, type: "GLITCH" }] },
    { layout: "C", botKinds: ["rookie", "balanced", "balanced"] },
    { layout: "C", botKinds: ["rookie", "balanced", "balanced", "rookie"] },
    { layout: "B", botKinds: ["rookie", "balanced", "balanced", "balanced"] },
    { layout: "D", botKinds: ["balanced", "balanced", "rookie", "balanced"] },
  ],
  2: [
    { layout: "B", botKinds: ["balanced", "rookie", "balanced", "rookie"] },
    { layout: "C", botKinds: ["balanced", "balanced", "rookie", "balanced"] },
    { layout: "C", botKinds: ["balanced", "balanced", "balanced", "rookie"], powerOrbs: [...DEFAULT_ORBS, { x: 15, y: 10, type: "OVERCLOCK" }] },
    { layout: "D", botKinds: ["balanced", "balanced", "rookie", "balanced"], loopPairs: [...DEFAULT_LOOPS, { a: { x: 3, y: 5 }, b: { x: 15, y: 15 } }] },
    { layout: "D", botKinds: ["balanced", "balanced", "balanced", "rookie", "balanced"] },
    { layout: "C", botKinds: ["balanced", "balanced", "balanced", "balanced", "rookie"] },
    { layout: "E", botKinds: ["balanced", "apex", "balanced", "rookie", "balanced"] },
    { layout: "E", botKinds: ["balanced", "apex", "balanced", "balanced", "rookie"] },
  ],
  3: [
    { layout: "C", botKinds: ["balanced", "apex", "rookie", "balanced", "balanced"] },
    { layout: "D", botKinds: ["balanced", "apex", "balanced", "rookie", "balanced"], powerOrbs: [...DEFAULT_ORBS, { x: 9, y: 7, type: "HACK" }] },
    { layout: "D", botKinds: ["balanced", "apex", "balanced", "balanced", "rookie"] },
    { layout: "E", botKinds: ["balanced", "apex", "balanced", "balanced", "balanced"] },
    { layout: "E", botKinds: ["apex", "balanced", "balanced", "balanced", "rookie", "balanced"] },
    { layout: "D", botKinds: ["apex", "balanced", "balanced", "balanced", "balanced", "rookie"] },
    { layout: "E", botKinds: ["apex", "balanced", "apex", "balanced", "balanced", "rookie"] },
    { layout: "E", botKinds: ["apex", "balanced", "apex", "balanced", "balanced", "balanced"] },
  ],
  4: [
    { layout: "D", botKinds: ["apex", "balanced", "balanced", "balanced", "balanced", "rookie"] },
    { layout: "E", botKinds: ["apex", "balanced", "balanced", "apex", "balanced", "balanced"] },
    { layout: "E", botKinds: ["apex", "balanced", "apex", "balanced", "balanced", "balanced"], powerOrbs: [...DEFAULT_ORBS, { x: 9, y: 15, type: "LOOP" }] },
    { layout: "D", botKinds: ["apex", "balanced", "apex", "balanced", "balanced", "balanced"], loopPairs: [...DEFAULT_LOOPS, { a: { x: 3, y: 5 }, b: { x: 15, y: 15 } }] },
    { layout: "E", botKinds: ["apex", "apex", "balanced", "balanced", "balanced", "balanced"] },
    { layout: "E", botKinds: ["apex", "apex", "balanced", "balanced", "apex", "balanced"] },
    { layout: "D", botKinds: ["apex", "apex", "balanced", "apex", "balanced", "balanced", "balanced"] },
    { layout: "E", botKinds: ["apex", "apex", "balanced", "apex", "balanced", "balanced", "apex"] },
  ],
  5: [
    { layout: "E", botKinds: ["apex", "apex", "balanced", "apex", "balanced", "balanced", "apex"] },
    { layout: "E", botKinds: ["apex", "apex", "balanced", "apex", "balanced", "apex", "balanced"] },
    { layout: "D", botKinds: ["apex", "apex", "apex", "balanced", "apex", "balanced", "balanced"] },
    { layout: "E", botKinds: ["apex", "apex", "apex", "balanced", "apex", "balanced", "balanced"], loopPairs: [...DEFAULT_LOOPS, { a: { x: 3, y: 15 }, b: { x: 15, y: 5 } }] },
    { layout: "D", botKinds: ["apex", "apex", "apex", "balanced", "apex", "apex", "balanced"] },
    { layout: "E", botKinds: ["apex", "apex", "apex", "apex", "balanced", "apex", "balanced"] },
    { layout: "E", botKinds: ["apex", "apex", "apex", "apex", "balanced", "apex", "apex"] },
    {
      layout: "E",
      botKinds: ["apex", "apex", "apex", "apex", "apex", "balanced", "apex"],
      powerOrbs: [...DEFAULT_ORBS, { x: 9, y: 7, type: "HACK" }, { x: 9, y: 15, type: "LOOP" }],
      loopPairs: [...DEFAULT_LOOPS, { a: { x: 3, y: 5 }, b: { x: 15, y: 15 } }, { a: { x: 3, y: 15 }, b: { x: 15, y: 5 } }],
    },
  ],
};

function buildBotSpawns(level: TetromazeLevel, count: number) {
  const home = level.botHome ?? { x: 7, y: 2, width: 5, height: 4 };
  const slots: Pos[] = [];

  for (let y = home.y + 1; y < home.y + home.height; y += 1) {
    for (let x = home.x + 1; x < home.x + home.width - 1; x += 1) {
      slots.push({ x, y });
    }
  }

  return Array.from({ length: count }, (_, i) => slots[i % slots.length] ?? level.botSpawns[i % level.botSpawns.length]);
}

function inBounds(grid: string[], x: number, y: number) {
  return y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0);
}

function isWalkable(grid: string[], x: number, y: number) {
  return inBounds(grid, x, y) && grid[y][x] !== "#";
}

function findNearestWalkable(grid: string[], start: Pos): Pos {
  if (isWalkable(grid, start.x, start.y)) return start;

  const q: Pos[] = [start];
  const seen = new Set<string>([`${start.x},${start.y}`]);
  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (q.length > 0) {
    const cur = q.shift()!;
    for (const d of dirs) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      if (!inBounds(grid, nx, ny)) continue;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (isWalkable(grid, nx, ny)) return { x: nx, y: ny };
      q.push({ x: nx, y: ny });
    }
  }

  return start;
}

function sanitizePowerOrbs(
  grid: string[],
  orbs: Array<Pos & { type: TetromazeOrbType }>
) {
  const used = new Set<string>();
  const safe: Array<Pos & { type: TetromazeOrbType }> = [];

  for (const orb of orbs) {
    const pos = findNearestWalkable(grid, orb);
    const key = `${pos.x},${pos.y}`;
    if (used.has(key)) continue;
    used.add(key);
    safe.push({ ...orb, x: pos.x, y: pos.y });
  }

  return safe;
}

function sanitizeLoopPairs(grid: string[], pairs: Array<{ a: Pos; b: Pos }>) {
  const safe: Array<{ a: Pos; b: Pos }> = [];
  const dedupe = new Set<string>();

  for (const pair of pairs) {
    const a = findNearestWalkable(grid, pair.a);
    const b = findNearestWalkable(grid, pair.b);
    if (a.x === b.x && a.y === b.y) continue;
    const key = `${a.x},${a.y}|${b.x},${b.y}`;
    const reverse = `${b.x},${b.y}|${a.x},${a.y}`;
    if (dedupe.has(key) || dedupe.has(reverse)) continue;
    dedupe.add(key);
    safe.push({ a, b });
  }

  return safe;
}

function sanitizeSpawns(grid: string[], spawns: Pos[]) {
  return spawns.map((spawn) => findNearestWalkable(grid, spawn));
}

export function getTetromazeCampaignLevel(index: number): TetromazeLevel {
  const safeIndex = clamp(index, 1, TETROMAZE_TOTAL_LEVELS);
  const { world, stage } = toWorldStage(safeIndex);
  const config = WORLD_CONFIGS[world][stage - 1];

  const layout = LAYOUTS[config.layout];
  const playerSpawn = findNearestWalkable(
    layout,
    config.playerSpawn ?? defaultTetromazeLevel.playerSpawn
  );

  const base: TetromazeLevel = {
    ...defaultTetromazeLevel,
    id: `tetromaze-w${world}-n${stage}`,
    name: `Monde ${world} - Niveau ${stage}`,
    grid: layout,
    playerSpawn,
    botKinds: config.botKinds,
  };

  const rawSpawns = buildBotSpawns(base, config.botKinds.length);
  const safeSpawns = sanitizeSpawns(layout, rawSpawns);
  const safePowerOrbs = sanitizePowerOrbs(layout, config.powerOrbs ?? DEFAULT_ORBS);
  const safeLoopPairs = sanitizeLoopPairs(layout, config.loopPairs ?? DEFAULT_LOOPS);

  return {
    ...base,
    botSpawns: safeSpawns,
    powerOrbs: safePowerOrbs,
    loopPairs: safeLoopPairs,
  };
}
