import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/pixel-protocol.css";

type Tetromino = "I" | "O" | "T" | "L" | "J" | "S" | "Z";
type PlatformType = "stable" | "unstable" | "rotating" | "glitch" | "bounce" | "armored" | "hackable";
type EnemyKind = "rookie" | "pulse" | "apex";

type PlatformDef = {
  id: string;
  tetromino: Tetromino;
  x: number;
  y: number;
  rotation?: 0 | 1 | 2 | 3;
  type: PlatformType;
  rotateEveryMs?: number;
};

type DataOrb = { id: string; x: number; y: number; taken?: boolean };
type Checkpoint = { id: string; x: number; y: number; spawnX: number; spawnY: number; activated?: boolean };
type Enemy = {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  minX: number;
  maxX: number;
  stunnedUntil: number;
};

type LevelDef = {
  id: string;
  world: number;
  name: string;
  worldWidth: number;
  requiredOrbs: number;
  spawn: { x: number; y: number };
  portal: { x: number; y: number };
  platforms: PlatformDef[];
  checkpoints: Checkpoint[];
  orbs: DataOrb[];
  enemies: Enemy[];
};

type Player = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  grounded: boolean;
  jumpsLeft: number;
  hp: number;
  dashUntil: number;
  dashCooldownUntil: number;
  invulnUntil: number;
};

type RuntimePlatform = PlatformDef & {
  currentRotation: 0 | 1 | 2 | 3;
  active: boolean;
  unstableWakeAt: number;
  unstableDropAt: number;
  hackedUntil: number;
  nextRotateAt: number;
};

type GameRuntime = {
  player: Player;
  platforms: RuntimePlatform[];
  checkpoints: Checkpoint[];
  respawn: { x: number; y: number };
  orbs: DataOrb[];
  enemies: Enemy[];
  cameraX: number;
  collected: number;
  status: "running" | "won" | "lost";
  message: string;
};

type Rect = { x: number; y: number; w: number; h: number; platformId?: string; type?: PlatformType };

const TILE = 32;
const VIEWPORT_W = 30 * TILE;
const WORLD_H = 18 * TILE;
const GROUND_Y = WORLD_H - TILE;
const GRAVITY = 1700;
const SPEED = 240;
const JUMP = 560;
const DASH_SPEED = 620;
const DASH_MS = 150;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function orbOnTile(id: string, tileX: number, tileY: number): DataOrb {
  return { id, x: tileX * TILE + 7, y: tileY * TILE - 20 };
}
function checkpointOnTile(id: string, tileX: number, tileY: number): Checkpoint {
  return {
    id,
    x: tileX * TILE + 10,
    y: tileY * TILE - 42,
    spawnX: tileX * TILE + 4,
    spawnY: tileY * TILE - 30,
  };
}

function enemyOnITop(
  id: string,
  kind: EnemyKind,
  anchorX: number,
  anchorY: number,
  speed: number,
  dir: 1 | -1 = 1,
  spanI: number = 1
): Enemy {
  const minTileX = anchorX - 1;
  const maxTileX = anchorX + 2 + (spanI - 1) * 4;
  return {
    id,
    kind,
    x: anchorX * TILE,
    y: anchorY * TILE - 26,
    vx: speed * dir,
    minX: minTileX * TILE,
    maxX: (maxTileX + 1) * TILE - 26,
    stunnedUntil: 0,
  };
}

const SHAPES: Record<Tetromino, Array<{ x: number; y: number }>> = {
  I: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  O: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  T: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ],
  L: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ],
  J: [
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  S: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: 1 },
  ],
  Z: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
};

const LEVELS: LevelDef[] = [
  {
    id: "w1-1",
    world: 1,
    name: "Bloc Stable",
    worldWidth: 96 * TILE,
    requiredOrbs: 7,
    spawn: { x: 96, y: 450 },
    portal: { x: 2460, y: 260 },
    platforms: [
      { id: "p1", tetromino: "I", x: 5, y: 15, type: "stable" },
      { id: "p1b", tetromino: "I", x: 9, y: 15, type: "stable" },
      { id: "p2", tetromino: "T", x: 10, y: 14, type: "stable" },
      { id: "p3", tetromino: "I", x: 15, y: 14, type: "stable" },
      { id: "p4", tetromino: "L", x: 20, y: 13, type: "bounce" },
      { id: "p5", tetromino: "O", x: 25, y: 13, type: "stable" },
      { id: "p6", tetromino: "I", x: 31, y: 12, type: "stable" },
      { id: "p6b", tetromino: "I", x: 35, y: 12, type: "stable" },
      { id: "p7", tetromino: "T", x: 37, y: 12, type: "stable" },
      { id: "p8", tetromino: "L", x: 43, y: 11, type: "bounce" },
      { id: "p9", tetromino: "I", x: 49, y: 11, type: "stable" },
      { id: "p10", tetromino: "O", x: 56, y: 10, type: "stable" },
      { id: "p11", tetromino: "I", x: 63, y: 10, type: "stable" },
      { id: "p12", tetromino: "T", x: 71, y: 9, type: "stable" },
    ],
    checkpoints: [checkpointOnTile("c1", 16, 14), checkpointOnTile("c2", 44, 11), checkpointOnTile("c3", 63, 10)],
    orbs: [
      orbOnTile("o1", 6, 15),
      orbOnTile("o2", 11, 14),
      orbOnTile("o3", 21, 13),
      orbOnTile("o4", 32, 12),
      orbOnTile("o5", 44, 11),
      orbOnTile("o6", 57, 10),
      orbOnTile("o7", 72, 9),
    ],
    enemies: [
      enemyOnITop("e1", "rookie", 5, 15, 70, 1, 2),
      enemyOnITop("e2", "rookie", 31, 12, 75, -1, 2),
    ],
  },
  {
    id: "w2-1",
    world: 2,
    name: "Glitch Sector",
    worldWidth: 104 * TILE,
    requiredOrbs: 8,
    spawn: { x: 120, y: 450 },
    portal: { x: 3160, y: 286 },
    platforms: [
      { id: "p1", tetromino: "I", x: 4, y: 15, type: "stable" },
      { id: "p1b", tetromino: "I", x: 8, y: 15, type: "stable" },
      { id: "p2", tetromino: "S", x: 11, y: 14, type: "glitch" },
      { id: "p3", tetromino: "T", x: 18, y: 13, type: "rotating", rotateEveryMs: 2300 },
      { id: "p4", tetromino: "Z", x: 25, y: 12, type: "unstable" },
      { id: "p5", tetromino: "O", x: 32, y: 11, type: "stable" },
      { id: "p6", tetromino: "I", x: 39, y: 10, type: "unstable" },
      { id: "p7", tetromino: "T", x: 47, y: 9, type: "rotating", rotateEveryMs: 2200 },
      { id: "p8", tetromino: "L", x: 55, y: 10, type: "glitch" },
      { id: "p9", tetromino: "I", x: 63, y: 9, type: "stable" },
      { id: "p9b", tetromino: "I", x: 67, y: 9, type: "stable" },
      { id: "p10", tetromino: "S", x: 71, y: 8, type: "unstable" },
      { id: "p11", tetromino: "O", x: 79, y: 9, type: "stable" },
      { id: "p12", tetromino: "T", x: 87, y: 10, type: "rotating", rotateEveryMs: 2000 },
      { id: "p13", tetromino: "I", x: 95, y: 10, type: "stable" },
      { id: "p13b", tetromino: "I", x: 99, y: 10, type: "stable" },
    ],
    checkpoints: [checkpointOnTile("c1", 18, 13), checkpointOnTile("c2", 48, 9), checkpointOnTile("c3", 80, 9)],
    orbs: [
      orbOnTile("o1", 5, 15),
      orbOnTile("o2", 12, 14),
      orbOnTile("o3", 19, 13),
      orbOnTile("o4", 33, 11),
      orbOnTile("o5", 48, 9),
      orbOnTile("o6", 64, 9),
      orbOnTile("o7", 80, 9),
      orbOnTile("o8", 96, 10),
    ],
    enemies: [
      enemyOnITop("e1", "rookie", 4, 15, 80, 1, 2),
      enemyOnITop("e2", "pulse", 63, 9, 95, -1, 2),
      enemyOnITop("e3", "pulse", 95, 10, 100, 1, 2),
    ],
  },
  {
    id: "w3-1",
    world: 3,
    name: "Corrupted Grid",
    worldWidth: 112 * TILE,
    requiredOrbs: 9,
    spawn: { x: 110, y: 450 },
    portal: { x: 3400, y: 272 },
    platforms: [
      { id: "p1", tetromino: "I", x: 4, y: 15, type: "hackable" },
      { id: "p1b", tetromino: "I", x: 8, y: 15, type: "hackable" },
      { id: "p2", tetromino: "J", x: 11, y: 14, type: "rotating", rotateEveryMs: 1800 },
      { id: "p3", tetromino: "L", x: 18, y: 13, type: "glitch" },
      { id: "p4", tetromino: "T", x: 26, y: 12, type: "unstable" },
      { id: "p5", tetromino: "S", x: 34, y: 11, type: "bounce" },
      { id: "p6", tetromino: "O", x: 42, y: 10, type: "armored" },
      { id: "p7", tetromino: "I", x: 50, y: 9, type: "hackable" },
      { id: "p7b", tetromino: "I", x: 54, y: 9, type: "hackable" },
      { id: "p8", tetromino: "T", x: 58, y: 8, type: "rotating", rotateEveryMs: 1700 },
      { id: "p9", tetromino: "L", x: 66, y: 9, type: "glitch" },
      { id: "p10", tetromino: "Z", x: 74, y: 8, type: "unstable" },
      { id: "p11", tetromino: "O", x: 82, y: 9, type: "armored" },
      { id: "p12", tetromino: "I", x: 90, y: 10, type: "hackable" },
      { id: "p12b", tetromino: "I", x: 94, y: 10, type: "hackable" },
      { id: "p13", tetromino: "T", x: 99, y: 9, type: "bounce" },
      { id: "p14", tetromino: "O", x: 106, y: 8, type: "armored" },
    ],
    checkpoints: [checkpointOnTile("c1", 19, 13), checkpointOnTile("c2", 51, 9), checkpointOnTile("c3", 91, 10)],
    orbs: [
      orbOnTile("o1", 5, 15),
      orbOnTile("o2", 12, 14),
      orbOnTile("o3", 19, 13),
      orbOnTile("o4", 35, 11),
      orbOnTile("o5", 51, 9),
      orbOnTile("o6", 59, 8),
      orbOnTile("o7", 75, 8),
      orbOnTile("o8", 91, 10),
      orbOnTile("o9", 107, 8),
    ],
    enemies: [
      enemyOnITop("e1", "pulse", 4, 15, 110, 1, 2),
      enemyOnITop("e2", "pulse", 50, 9, 115, -1, 2),
      enemyOnITop("e3", "apex", 90, 10, 140, 1, 2),
    ],
  },
  {
    id: "w4-1",
    world: 4,
    name: "Apex Core",
    worldWidth: 120 * TILE,
    requiredOrbs: 10,
    spawn: { x: 110, y: 450 },
    portal: { x: 3640, y: 240 },
    platforms: [
      { id: "p1", tetromino: "I", x: 4, y: 15, type: "stable" },
      { id: "p1b", tetromino: "I", x: 8, y: 15, type: "stable" },
      { id: "p2", tetromino: "T", x: 11, y: 14, type: "rotating", rotateEveryMs: 1600 },
      { id: "p3", tetromino: "L", x: 18, y: 13, type: "hackable" },
      { id: "p4", tetromino: "J", x: 25, y: 12, type: "glitch" },
      { id: "p5", tetromino: "S", x: 32, y: 11, type: "bounce" },
      { id: "p6", tetromino: "Z", x: 39, y: 10, type: "rotating", rotateEveryMs: 1450 },
      { id: "p7", tetromino: "O", x: 46, y: 9, type: "armored" },
      { id: "p8", tetromino: "I", x: 54, y: 8, type: "unstable" },
      { id: "p9", tetromino: "T", x: 62, y: 7, type: "rotating", rotateEveryMs: 1400 },
      { id: "p10", tetromino: "L", x: 70, y: 8, type: "hackable" },
      { id: "p11", tetromino: "S", x: 78, y: 7, type: "glitch" },
      { id: "p12", tetromino: "O", x: 86, y: 8, type: "armored" },
      { id: "p13", tetromino: "I", x: 94, y: 9, type: "bounce" },
      { id: "p13b", tetromino: "I", x: 98, y: 9, type: "bounce" },
      { id: "p14", tetromino: "T", x: 102, y: 8, type: "rotating", rotateEveryMs: 1350 },
      { id: "p15", tetromino: "O", x: 110, y: 7, type: "armored" },
      { id: "p16", tetromino: "I", x: 116, y: 8, type: "stable" },
      { id: "p16b", tetromino: "I", x: 112, y: 8, type: "stable" },
    ],
    checkpoints: [checkpointOnTile("c1", 19, 13), checkpointOnTile("c2", 55, 8), checkpointOnTile("c3", 95, 9)],
    orbs: [
      orbOnTile("o1", 5, 15),
      orbOnTile("o2", 12, 14),
      orbOnTile("o3", 19, 13),
      orbOnTile("o4", 33, 11),
      orbOnTile("o5", 47, 9),
      orbOnTile("o6", 55, 8),
      orbOnTile("o7", 63, 7),
      orbOnTile("o8", 79, 7),
      orbOnTile("o9", 95, 9),
      orbOnTile("o10", 111, 7),
    ],
    enemies: [
      enemyOnITop("e1", "rookie", 4, 15, 100, 1, 2),
      enemyOnITop("e2", "pulse", 94, 9, 130, -1, 2),
      enemyOnITop("e3", "apex", 112, 8, 170, 1, 2),
    ],
  },
];

const PLATFORM_CLASS: Record<PlatformType, string> = {
  stable: "pp-platform--stable",
  unstable: "pp-platform--unstable",
  rotating: "pp-platform--rotating",
  glitch: "pp-platform--glitch",
  bounce: "pp-platform--bounce",
  armored: "pp-platform--armored",
  hackable: "pp-platform--hackable",
};

function rotate(point: { x: number; y: number }, turns: number) {
  let p = { ...point };
  for (let i = 0; i < turns; i += 1) p = { x: -p.y, y: p.x };
  return p;
}

function rectIntersects(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function overlapX(aX: number, aW: number, bX: number, bW: number) {
  return aX < bX + bW && aX + aW > bX;
}

function findSupportTop(blocks: Rect[], x: number, y: number, w: number, h: number): number | null {
  const feetY = y + h;
  let best: number | null = null;
  for (const block of blocks) {
    if (!overlapX(x, w, block.x, block.w)) continue;
    if (Math.abs(feetY - block.y) > 8) continue;
    if (best === null || block.y < best) best = block.y;
  }
  return best;
}

function platformBlocks(platform: RuntimePlatform): Rect[] {
  if (!platform.active) return [];
  const base = SHAPES[platform.tetromino];
  return base.map((block) => {
    const p = rotate(block, platform.currentRotation);
    return {
      x: (platform.x + p.x) * TILE,
      y: (platform.y + p.y) * TILE,
      w: TILE,
      h: TILE,
      platformId: platform.id,
      type: platform.type,
    };
  });
}

function allCollisionBlocks(platforms: RuntimePlatform[], worldWidth: number): Rect[] {
  return [
    ...platforms.flatMap((p) => platformBlocks(p)),
    { x: 0, y: GROUND_Y, w: worldWidth, h: TILE, platformId: "ground", type: "stable" },
  ];
}

function cloneLevel(level: LevelDef): GameRuntime {
  return {
    player: {
      x: level.spawn.x,
      y: level.spawn.y,
      w: 24,
      h: 30,
      vx: 0,
      vy: 0,
      grounded: false,
      jumpsLeft: 1,
      hp: 3,
      dashUntil: 0,
      dashCooldownUntil: 0,
      invulnUntil: 0,
    },
    platforms: level.platforms.map((p) => ({
      ...p,
      currentRotation: p.rotation ?? 0,
      active: true,
      unstableWakeAt: 0,
      unstableDropAt: 0,
      hackedUntil: 0,
      nextRotateAt: p.rotateEveryMs ? performance.now() + p.rotateEveryMs : Number.POSITIVE_INFINITY,
    })),
    checkpoints: level.checkpoints.map((c) => ({ ...c, activated: false })),
    respawn: { ...level.spawn },
    orbs: level.orbs.map((o) => ({ ...o, taken: false })),
    enemies: level.enemies.map((e) => ({ ...e })),
    cameraX: 0,
    collected: 0,
    status: "running",
    message: "Collecte les Data-Orbs puis atteins le portail.",
  };
}

function abilityFlags(world: number) {
  return {
    doubleJump: world >= 2,
    airDash: world >= 3,
    hackWave: world >= 3,
    shield: world >= 4,
  };
}

export default function PixelProtocolPage() {
  const navigate = useNavigate();
  const [, setRenderTick] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(VIEWPORT_W);
  const gameViewportRef = useRef<HTMLElement | null>(null);
  const runtimeRef = useRef<GameRuntime>(cloneLevel(LEVELS[0]));
  const keysRef = useRef<Set<string>>(new Set());
  const justPressedRef = useRef<Set<string>>(new Set());
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(performance.now());

  const level = LEVELS[levelIndex];
  const ability = useMemo(() => abilityFlags(level.world), [level.world]);

  useEffect(() => {
    runtimeRef.current = cloneLevel(level);
    setRenderTick((v) => v + 1);
  }, [level]);

  useEffect(() => {
    const updateViewport = () => {
      const measured = gameViewportRef.current?.clientWidth ?? VIEWPORT_W;
      setViewportWidth(measured);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!keysRef.current.has(e.code)) justPressedRef.current.add(e.code);
      keysRef.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const loop = (ts: number) => {
      const dt = Math.min(0.033, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      const game = runtimeRef.current;
      const now = ts;

      if (game.status === "running") {
        for (const p of game.platforms) {
          if (p.type === "unstable" && !p.active && now >= p.unstableWakeAt) p.active = true;
          if (p.type === "unstable" && p.active && p.unstableDropAt > 0 && now >= p.unstableDropAt) {
            p.active = false;
            p.unstableDropAt = 0;
            p.unstableWakeAt = now + 3000;
          }
          if (p.type === "hackable" && p.hackedUntil > 0 && now >= p.hackedUntil) p.hackedUntil = 0;
          if (p.type === "rotating" && p.rotateEveryMs && now >= p.nextRotateAt) {
            p.currentRotation = ((p.currentRotation + 1) % 4) as 0 | 1 | 2 | 3;
            p.nextRotateAt = now + p.rotateEveryMs;
          }
        }

        const blocks = allCollisionBlocks(game.platforms, level.worldWidth);
        const player = game.player;

        const left = keysRef.current.has("ArrowLeft") || keysRef.current.has("KeyA");
        const right = keysRef.current.has("ArrowRight") || keysRef.current.has("KeyD");
        const wantJump = justPressedRef.current.has("Space") || justPressedRef.current.has("ArrowUp") || justPressedRef.current.has("KeyW");
        const wantDash = justPressedRef.current.has("ShiftLeft") || justPressedRef.current.has("ShiftRight");
        const wantHack = justPressedRef.current.has("KeyE");
        const wantRespawn = justPressedRef.current.has("KeyR");

        if (wantHack && ability.hackWave) {
          for (const enemy of game.enemies) {
            if (Math.abs(enemy.x - player.x) < 150 && Math.abs(enemy.y - player.y) < 90) {
              enemy.stunnedUntil = now + 1700;
            }
          }
          for (const p of game.platforms) {
            if (p.type === "hackable") p.hackedUntil = now + 3500;
          }
          game.message = "Hack pulse execute.";
        }

        let targetVx = 0;
        if (left) targetVx -= SPEED;
        if (right) targetVx += SPEED;

        const isDashing = now < player.dashUntil;
        if (isDashing) {
          player.vx = player.vx > 0 ? DASH_SPEED : -DASH_SPEED;
          player.vy = Math.max(player.vy, -70);
        } else {
          const accel = player.grounded ? 1800 : 1200;
          if (Math.abs(targetVx - player.vx) <= accel * dt) player.vx = targetVx;
          else player.vx += Math.sign(targetVx - player.vx) * accel * dt;
        }

        if (wantDash && ability.airDash && now > player.dashCooldownUntil) {
          const dir = right ? 1 : left ? -1 : player.vx >= 0 ? 1 : -1;
          player.vx = dir * DASH_SPEED;
          player.vy = -20;
          player.dashUntil = now + DASH_MS;
          player.dashCooldownUntil = now + 1100;
        }

        if (wantJump) {
          if (player.grounded) {
            player.vy = -JUMP;
            player.grounded = false;
            player.jumpsLeft = ability.doubleJump ? 1 : 0;
          } else if (player.jumpsLeft > 0) {
            player.vy = -JUMP * 0.92;
            player.jumpsLeft -= 1;
          }
        }

        player.vy += GRAVITY * dt;

        const wasGrounded = player.grounded;
        const moveAxis = (axis: "x" | "y", amount: number) => {
          if (axis === "x") player.x += amount;
          else player.y += amount;

          const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
          for (const b of blocks) {
            if (!rectIntersects(playerRect, b)) continue;
            if (axis === "x") {
              if (amount > 0) player.x = b.x - player.w;
              else player.x = b.x + b.w;
              player.vx = 0;
            } else {
              if (amount > 0) {
                player.y = b.y - player.h;
                player.vy = 0;
                player.grounded = true;
                if (ability.doubleJump) player.jumpsLeft = 1;
                if (b.type === "bounce") player.vy = -JUMP * 1.16;
                // Effet glitch seulement a l'atterrissage, pas en continu.
                if (b.type === "glitch" && !wasGrounded) {
                  player.x += Math.random() < 0.5 ? -14 : 14;
                }
                if (b.type === "unstable") {
                  const p = game.platforms.find((pl) => pl.id === b.platformId);
                  if (p && p.unstableDropAt === 0) p.unstableDropAt = now + 850;
                }
              } else {
                player.y = b.y + b.h;
                player.vy = Math.max(0, player.vy);
              }
            }
          }
        };

        player.grounded = false;
        moveAxis("x", player.vx * dt);
        moveAxis("y", player.vy * dt);
        player.x = clamp(player.x, 0, level.worldWidth - player.w);
        game.cameraX = clamp(player.x - viewportWidth * 0.4, 0, Math.max(0, level.worldWidth - viewportWidth));
        const onGroundFloor = player.y + player.h >= GROUND_Y - 1;

        if (onGroundFloor) {
          game.message = "Tu es tombe. Appuie sur R pour reprendre au checkpoint.";
          if (wantRespawn) {
            player.x = game.respawn.x;
            player.y = game.respawn.y;
            player.vx = 0;
            player.vy = 0;
            player.invulnUntil = now + 900;
            game.message = "Retour checkpoint.";
          }
        }

        if (player.y > WORLD_H + 120) {
          player.hp -= 1;
          player.x = game.respawn.x;
          player.y = game.respawn.y;
          player.vx = 0;
          player.vy = 0;
          player.invulnUntil = now + 1500;
          game.message = "Recompilation du noyau...";
        }

        for (const checkpoint of game.checkpoints) {
          const cpRect: Rect = { x: checkpoint.x, y: checkpoint.y, w: 12, h: 42 };
          const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
          if (!checkpoint.activated && rectIntersects(playerRect, cpRect)) {
            checkpoint.activated = true;
            game.respawn.x = checkpoint.spawnX;
            game.respawn.y = checkpoint.spawnY;
            game.message = "Checkpoint active.";
          }
        }

        for (const orb of game.orbs) {
          if (orb.taken) continue;
          const orbRect: Rect = { x: orb.x, y: orb.y, w: 18, h: 18 };
          const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
          if (rectIntersects(playerRect, orbRect)) {
            orb.taken = true;
            game.collected += 1;
            game.message = "Data-Orb capture.";
          }
        }

        for (const enemy of game.enemies) {
          const enemySpeed = enemy.kind === "apex" ? 170 : enemy.kind === "pulse" ? 120 : 90;
          const enemyDir = enemy.vx >= 0 ? 1 : -1;
          const desiredX = clamp(enemy.x + enemyDir * enemySpeed * dt, enemy.minX, enemy.maxX);
          const supportAtDesired = findSupportTop(blocks, desiredX, enemy.y, 26, 26);

          if (enemy.stunnedUntil <= now) {
            if (supportAtDesired === null) {
              enemy.vx *= -1;
            } else {
              enemy.x = desiredX;
              enemy.y = supportAtDesired - 26;
              if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) enemy.vx *= -1;
            }
          } else {
            const supportAtCurrent = findSupportTop(blocks, enemy.x, enemy.y, 26, 26);
            if (supportAtCurrent !== null) enemy.y = supportAtCurrent - 26;
          }

          const enemyRect: Rect = { x: enemy.x, y: enemy.y, w: 26, h: 26 };
          const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
          if (rectIntersects(playerRect, enemyRect) && now > player.invulnUntil) {
            const stomp = player.vy > 80 && player.y + player.h - 6 < enemy.y;
            if (stomp) {
              enemy.stunnedUntil = now + 1400;
              player.vy = -JUMP * 0.65;
              game.message = "Tetrobot neutralise.";
            } else {
              const hasShield = ability.shield;
              player.hp -= hasShield ? 0 : 1;
              player.invulnUntil = now + 1600;
              player.x = game.respawn.x;
              player.y = game.respawn.y;
              player.vx = 0;
              player.vy = 0;
              game.message = hasShield ? "Bouclier actif." : "Impact critique.";
            }
          }
        }

        const portalRect: Rect = { x: level.portal.x, y: level.portal.y, w: 34, h: 44 };
        const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
        const onPortal = rectIntersects(playerRect, portalRect);
        const portalOpen = game.collected >= level.requiredOrbs;
        if (onPortal) {
          if (!portalOpen) {
            game.message = `Portail verrouille: ${game.collected}/${level.requiredOrbs} Data-Orbs`;
          } else if (levelIndex < LEVELS.length - 1) {
            game.message = "Portail actif: transfert vers le secteur suivant...";
            setLevelIndex(levelIndex + 1);
          } else {
            game.status = "won";
            game.message = "TETRIX CORE neutralise. Le systeme est recompile.";
          }
        }

        if (player.hp <= 0) {
          game.status = "lost";
          game.message = "Pixel a ete desynchronise.";
        }
      }

      justPressedRef.current.clear();
      setRenderTick((v) => v + 1);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [ability.airDash, ability.doubleJump, ability.hackWave, ability.shield, level, levelIndex, viewportWidth]);

  const runtime = runtimeRef.current;
  const portalOpen = runtime.collected >= level.requiredOrbs;

  return (
    <div className="pp-shell">
      <header className="pp-header">
        <div>
          <h1>Pixel Protocol</h1>
          <p>
            Monde {level.world} - {level.name}
          </p>
        </div>
        <div className="pp-stats">
          <span>HP: {runtime.player.hp}</span>
          <span>
            Data-Orbs: {runtime.collected}/{level.requiredOrbs}
          </span>
          <span>
            Capacites: {ability.doubleJump ? "DJ" : "-"} {ability.airDash ? "Dash" : "-"} {ability.hackWave ? "Hack" : "-"}
          </span>
        </div>
      </header>

      <section ref={gameViewportRef} className="pp-game" style={{ height: WORLD_H }}>
        <div
          className="pp-world"
          style={{
            width: level.worldWidth,
            height: WORLD_H,
            transform: `translateX(${-runtime.cameraX}px)`,
          }}
        >
          <div className="pp-ground" style={{ top: GROUND_Y, width: level.worldWidth }} />

          {runtime.platforms.flatMap((platform) =>
            platformBlocks(platform).map((block, i) => (
              <div
                key={`${platform.id}-${i}-${platform.currentRotation}-${platform.active ? 1 : 0}`}
                className={`pp-platform ${PLATFORM_CLASS[platform.type]} ${platform.active ? "" : "pp-platform--off"}`}
                style={{ left: block.x, top: block.y, width: block.w, height: block.h }}
              />
            ))
          )}

          {runtime.orbs.filter((orb) => !orb.taken).map((orb) => (
            <div key={orb.id} className="pp-orb" style={{ left: orb.x, top: orb.y }} />
          ))}

          {runtime.checkpoints.map((cp) => (
            <div
              key={cp.id}
              className={`pp-checkpoint ${cp.activated ? "pp-checkpoint--active" : ""}`}
              style={{ left: cp.x, top: cp.y }}
              title={cp.activated ? "Checkpoint actif" : "Checkpoint"}
            />
          ))}

          <div
            className={`pp-portal ${portalOpen ? "pp-portal--open" : ""}`}
            style={{ left: level.portal.x, top: level.portal.y }}
            title={portalOpen ? "Portail actif" : "Collecte les Data-Orbs"}
          />

          {runtime.enemies.map((enemy) => (
            <div
              key={enemy.id}
              className={`pp-enemy pp-enemy--${enemy.kind} ${enemy.stunnedUntil > performance.now() ? "pp-enemy--stunned" : ""}`}
              style={{ left: enemy.x, top: enemy.y }}
              title={enemy.kind}
            />
          ))}

          <div
            className={`pp-player ${runtime.player.invulnUntil > performance.now() ? "pp-player--invuln" : ""}`}
            style={{ left: runtime.player.x, top: runtime.player.y, width: runtime.player.w, height: runtime.player.h }}
          />
        </div>
      </section>

      <footer className="pp-footer">
        <p>{runtime.message}</p>
        <p>Controles: A/D ou fleches, Espace saut, Shift dash, E hack, R checkpoint, stomp sur les Tetrobots.</p>
        <div className="pp-actions">
          <button
            className="retro-btn"
            onClick={() => {
              runtimeRef.current = cloneLevel(level);
              setRenderTick((v) => v + 1);
            }}
          >
            Rejouer le niveau
          </button>
          <button className="retro-btn" onClick={() => navigate("/dashboard")}>Retour dashboard</button>
        </div>
      </footer>
    </div>
  );
}
