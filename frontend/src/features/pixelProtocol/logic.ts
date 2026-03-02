import {
  CAMERA_BOTTOM_TRIGGER_RATIO,
  CAMERA_TOP_TRIGGER_RATIO,
  GROUND_Y,
  TILE,
  VIEWPORT_W,
  WORLD_H,
  WORLD_RENDER_SCALE,
} from "./constants";
import type {
  GameRuntime,
  LevelDef,
  PlatformType,
  Rect,
  RuntimePlatform,
  Tetromino,
} from "./types";

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

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function rotate(point: { x: number; y: number }, turns: number) {
  let p = { ...point };
  for (let i = 0; i < turns; i += 1) p = { x: -p.y, y: p.x };
  return p;
}

export function rectIntersects(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function overlapX(aX: number, aW: number, bX: number, bW: number) {
  return aX < bX + bW && aX + aW > bX;
}

export function findSupportTop(
  blocks: Rect[],
  x: number,
  y: number,
  w: number,
  h: number
): number | null {
  // Les ennemis ont seulement besoin de savoir s'il existe un support juste sous leurs pieds.
  const feetY = y + h;
  let best: number | null = null;
  for (const block of blocks) {
    if (!overlapX(x, w, block.x, block.w)) continue;
    if (Math.abs(feetY - block.y) > 8) continue;
    if (best === null || block.y < best) best = block.y;
  }
  return best;
}

export function platformBlocks(platform: RuntimePlatform): Rect[] {
  if (!platform.active) return [];
  const base = SHAPES[platform.tetromino];
  // Un tetromino logique devient un ensemble de tuiles de collision concretes apres rotation.
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

export function allCollisionBlocks(
  platforms: RuntimePlatform[],
  worldWidth: number
): Rect[] {
  return [
    ...platforms.flatMap((p) => platformBlocks(p)),
    {
      x: 0,
      y: GROUND_Y,
      w: worldWidth,
      h: TILE,
      platformId: "ground",
      type: "stable" as PlatformType,
    },
  ];
}

export function cloneLevel(level: LevelDef): GameRuntime {
  return {
    player: {
      x: level.spawn.x,
      y: level.spawn.y,
      w: 24,
      h: 30,
      vx: 0,
      vy: 0,
      facing: 1,
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
      nextRotateAt: p.rotateEveryMs
        ? performance.now() + p.rotateEveryMs
        : Number.POSITIVE_INFINITY,
    })),
    checkpoints: level.checkpoints.map((c) => ({ ...c, activated: false })),
    respawn: { ...level.spawn },
    orbs: level.orbs.map((o) => ({ ...o, taken: false })),
    enemies: level.enemies.map((e) => ({ ...e })),
    cameraX: 0,
    cameraY: 0,
    collected: 0,
    status: "running",
    message: "Collecte les Data-Orbs puis atteins le portail.",
  };
}

export function abilityFlags(world: number) {
  // Les capacites se debloquent par monde, pas par niveau, pour garder une progression lisible.
  return {
    doubleJump: world >= 2,
    airDash: world >= 3,
    hackWave: world >= 3,
    shield: world >= 4,
  };
}

export function updateCameraY(
  game: GameRuntime,
  viewportHeight: number
): void {
  // La camera utilise une zone morte verticale pour eviter de recentrer l'ecran a chaque saut.
  const visibleWorldHeight = viewportHeight / WORLD_RENDER_SCALE;
  const maxCameraY = Math.max(0, WORLD_H - visibleWorldHeight);
  const topTriggerY =
    game.cameraY + visibleWorldHeight * CAMERA_TOP_TRIGGER_RATIO;
  const bottomTriggerY =
    game.cameraY + visibleWorldHeight * CAMERA_BOTTOM_TRIGGER_RATIO;

  if (game.player.y < topTriggerY) {
    game.cameraY =
      game.player.y - visibleWorldHeight * CAMERA_TOP_TRIGGER_RATIO;
  } else if (game.player.y + game.player.h > bottomTriggerY) {
    game.cameraY =
      game.player.y +
      game.player.h -
      visibleWorldHeight * CAMERA_BOTTOM_TRIGGER_RATIO;
  }

  game.cameraY = clamp(game.cameraY, 0, maxCameraY);
}

export function viewportWorldWidth(clientWidth: number) {
  return clientWidth / WORLD_RENDER_SCALE;
}

export function defaultViewportWorldWidth() {
  return VIEWPORT_W / WORLD_RENDER_SCALE;
}
