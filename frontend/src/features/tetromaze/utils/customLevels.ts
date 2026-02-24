import type { TetromazeLevel, TetromazeOrbType, TetrobotKind } from "../types";

const STORAGE_KEY = "tetromaze-custom-levels-v1";

const ALL_POWERUPS: TetromazeOrbType[] = [
  "OVERCLOCK",
  "GLITCH",
  "HACK",
  "LOOP",
  "FREEZE_PROTOCOL",
  "MAGNET_FIELD",
  "FIREWALL",
  "GHOST_MODE",
  "DESYNC",
  "MIRROR_SIGNAL",
  "PULSE_WAVE",
  "OVERHEAT",
  "NEURAL_LAG",
  "RANDOMIZER",
  "CORRUPTION",
  "SCAN",
  "VIRUS",
];

const BOT_KINDS: TetrobotKind[] = ["rookie", "balanced", "apex"];
const MAX_CUSTOM_BOTS = 90;

type Pos = { x: number; y: number };

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function isPos(value: unknown): value is Pos {
  if (!value || typeof value !== "object") return false;
  const item = value as any;
  return Number.isFinite(item.x) && Number.isFinite(item.y);
}

function sanitizeGrid(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length < 5) return [];
  const rows = raw.filter((row): row is string => typeof row === "string");
  if (!rows.length) return [];
  const width = Math.max(...rows.map((r) => r.length));
  if (width < 5) return [];
  return rows.map((row) => {
    const padded = row.padEnd(width, "#").slice(0, width);
    return padded
      .split("")
      .map((c) => (c === "#" ? "#" : "."))
      .join("");
  });
}

function sanitizePos(grid: string[], pos: Pos, fallback: Pos): Pos {
  const w = grid[0]?.length ?? 1;
  const h = grid.length;
  const safe = {
    x: clamp(Math.floor(pos.x), 1, Math.max(1, w - 2)),
    y: clamp(Math.floor(pos.y), 1, Math.max(1, h - 2)),
  };
  if (!Number.isFinite(safe.x) || !Number.isFinite(safe.y)) return fallback;
  return safe;
}

function isPowerup(value: unknown): value is TetromazeOrbType {
  return typeof value === "string" && ALL_POWERUPS.includes(value as TetromazeOrbType);
}

function sanitizeBotKinds(raw: unknown): TetrobotKind[] {
  if (!Array.isArray(raw)) return ["rookie", "balanced", "apex"];
  const kinds = raw.filter((it): it is TetrobotKind => BOT_KINDS.includes(it as TetrobotKind));
  return kinds.length ? kinds.slice(0, MAX_CUSTOM_BOTS) : ["rookie", "balanced", "apex"];
}

function defaultBotHome(grid: string[]) {
  const width = 5;
  const height = 4;
  const w = grid[0]?.length ?? 19;
  return {
    x: Math.max(1, Math.floor((w - width) / 2)),
    y: 2,
    width,
    height,
    gate: { x: Math.max(1, Math.floor((w - 3) / 2)), y: 5, width: 3 },
  };
}

function buildBotSpawns(home: { x: number; y: number; width: number; height: number }, count: number): Pos[] {
  const slots: Pos[] = [];
  for (let y = home.y + 1; y < home.y + home.height; y += 1) {
    for (let x = home.x + 1; x < home.x + home.width - 1; x += 1) {
      slots.push({ x, y });
    }
  }
  if (!slots.length) slots.push({ x: home.x + 1, y: home.y + 1 });
  return Array.from({ length: count }, (_, i) => slots[i % slots.length]);
}

export function normalizeTetromazeLevel(raw: unknown): TetromazeLevel | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as any;
  const grid = sanitizeGrid(item.grid);
  if (!grid.length) return null;

  const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `tmz-custom-${Date.now().toString(36)}`;
  const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Niveau custom";

  const spawnFallback = { x: Math.floor((grid[0].length - 1) / 2), y: grid.length - 2 };
  const playerSpawn = isPos(item.playerSpawn)
    ? sanitizePos(grid, item.playerSpawn, spawnFallback)
    : spawnFallback;

  const botKinds = sanitizeBotKinds(item.botKinds);

  const homeRaw = item.botHome;
  const fallbackHome = defaultBotHome(grid);
  const botHome =
    homeRaw && typeof homeRaw === "object"
      ? {
          x: clamp(Math.floor(Number((homeRaw as any).x) || fallbackHome.x), 1, Math.max(1, grid[0].length - 6)),
          y: clamp(Math.floor(Number((homeRaw as any).y) || fallbackHome.y), 1, Math.max(1, grid.length - 5)),
          width: 5,
          height: 4,
          gate: {
            x: clamp(Math.floor(Number((homeRaw as any).gate?.x) || fallbackHome.gate.x), 1, Math.max(1, grid[0].length - 4)),
            y: clamp(Math.floor(Number((homeRaw as any).gate?.y) || fallbackHome.gate.y), 1, Math.max(1, grid.length - 2)),
            width: 3,
          },
        }
      : fallbackHome;

  const botSpawns = buildBotSpawns(botHome, botKinds.length);

  const powerOrbs = Array.isArray(item.powerOrbs)
    ? item.powerOrbs
        .map((p: unknown): { x: number; y: number; type: TetromazeOrbType } | null => {
          const raw = p as any;
          const maybeType = raw?.type;
          if (!isPos(raw) || !isPowerup(maybeType)) return null;
          return { ...sanitizePos(grid, raw, playerSpawn), type: maybeType };
        })
        .filter(
          (p: { x: number; y: number; type: TetromazeOrbType } | null): p is { x: number; y: number; type: TetromazeOrbType } => Boolean(p)
        )
    : [];

  const loopPairs = Array.isArray(item.loopPairs)
    ? item.loopPairs
        .map((pair: any) => {
          if (!pair || !isPos(pair.a) || !isPos(pair.b)) return null;
          return {
            a: sanitizePos(grid, pair.a, playerSpawn),
            b: sanitizePos(grid, pair.b, playerSpawn),
          };
        })
        .filter((p: { a: Pos; b: Pos } | null): p is { a: Pos; b: Pos } => Boolean(p))
    : [];

  return {
    id,
    name,
    grid,
    playerSpawn,
    botSpawns,
    botKinds,
    botHome,
    powerOrbs,
    loopPairs,
  };
}

export function listTetromazeCustomLevels(): TetromazeLevel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeTetromazeLevel(item))
      .filter((item): item is TetromazeLevel => Boolean(item));
  } catch {
    return [];
  }
}

function persist(levels: TetromazeLevel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
}

export function upsertTetromazeCustomLevel(level: TetromazeLevel): TetromazeLevel[] {
  const normalized = normalizeTetromazeLevel(level);
  if (!normalized) return listTetromazeCustomLevels();
  const levels = listTetromazeCustomLevels();
  const idx = levels.findIndex((l) => l.id === normalized.id);
  if (idx >= 0) levels[idx] = normalized;
  else levels.unshift(normalized);
  persist(levels);
  return levels;
}

export function removeTetromazeCustomLevel(id: string): TetromazeLevel[] {
  const levels = listTetromazeCustomLevels().filter((level) => level.id !== id);
  persist(levels);
  return levels;
}

export function findTetromazeCustomLevel(id: string): TetromazeLevel | null {
  return listTetromazeCustomLevels().find((level) => level.id === id) ?? null;
}

export function exportTetromazeLevelJson(level: TetromazeLevel): string {
  return JSON.stringify(level, null, 2);
}

export function parseTetromazeLevelsFromJson(json: string): TetromazeLevel[] {
  const parsed = JSON.parse(json) as unknown;
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => normalizeTetromazeLevel(item))
      .filter((item): item is TetromazeLevel => Boolean(item));
  }
  const one = normalizeTetromazeLevel(parsed);
  return one ? [one] : [];
}
