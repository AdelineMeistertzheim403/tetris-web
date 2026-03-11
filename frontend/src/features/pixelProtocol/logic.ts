import {
  CAMERA_MIN_TOP_PADDING,
  CAMERA_BOTTOM_TRIGGER_RATIO,
  CAMERA_TOP_TRIGGER_RATIO,
  DEFAULT_WORLD_TOP_PADDING,
  TILE,
  VIEWPORT_W,
  WORLD_H,
  WORLD_RENDER_SCALE,
} from "./constants";
import type {
  GrappleAnchor,
  GameRuntime,
  LevelDef,
  PixelSkill,
  PlatformType,
  Rect,
  RuntimePlatform,
  Tetromino,
} from "./types";
import { createRuntimePlatform } from "./utils/platformRuntime";

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
  level: Pick<LevelDef, "worldWidth" | "worldHeight">
): Rect[] {
  const groundY = levelGroundY(level);
  return [
    ...platforms.flatMap((p) => platformBlocks(p)),
    {
      x: 0,
      y: groundY,
      w: level.worldWidth,
      h: TILE,
      platformId: "ground",
      type: "stable" as PlatformType,
    },
  ];
}

export function levelWorldHeight(level: Pick<LevelDef, "worldHeight" | "worldTopPadding">): number {
  const baseHeight =
    typeof level.worldHeight === "number" &&
    Number.isFinite(level.worldHeight) &&
    level.worldHeight >= TILE * 8
      ? Math.round(level.worldHeight)
      : WORLD_H;
  return baseHeight + levelTopPadding(level);
}

export function levelPlayableHeight(level: Pick<LevelDef, "worldHeight">): number {
  if (
    typeof level.worldHeight === "number" &&
    Number.isFinite(level.worldHeight) &&
    level.worldHeight >= TILE * 8
  ) {
    return Math.round(level.worldHeight);
  }
  return WORLD_H;
}

export function levelTopPadding(level: Pick<LevelDef, "worldTopPadding">): number {
  if (
    typeof level.worldTopPadding === "number" &&
    Number.isFinite(level.worldTopPadding) &&
    level.worldTopPadding >= 0
  ) {
    return Math.round(level.worldTopPadding);
  }
  return DEFAULT_WORLD_TOP_PADDING;
}

export function levelGroundY(level: Pick<LevelDef, "worldHeight" | "worldTopPadding">): number {
  return levelWorldHeight(level) - TILE;
}

export function cloneLevel(level: LevelDef): GameRuntime {
  const yOffset = levelTopPadding(level);
  return {
    startedAt: performance.now(),
    player: {
      x: level.spawn.x,
      y: level.spawn.y + yOffset,
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
      grappleUntil: 0,
      grappleCooldownUntil: 0,
      grappleTargetX: null,
      grappleTargetY: null,
      grappleLandY: null,
      grapplePlatformId: null,
      grappleAttachSide: null,
      groundPlatformId: null,
      groundedSurface: null,
      gravityInvertedUntil: 0,
      corruptedUntil: 0,
      corruptedDamageCooldownUntil: 0,
      phaseShiftUntil: 0,
      phaseShiftCooldownUntil: 0,
      overclockUntil: 0,
      overclockCooldownUntil: 0,
      pulseShockCooldownUntil: 0,
      timeBufferCooldownUntil: 0,
      platformSpawnCooldownUntil: 0,
    },
    platforms: level.platforms.map((platform) =>
      createRuntimePlatform(platform, {
        now: performance.now(),
        yOffsetTiles: yOffset / TILE,
      })
    ),
    checkpoints: level.checkpoints.map((c) => ({
      ...c,
      y: c.y + yOffset,
      spawnY: c.spawnY + yOffset,
      activated: false,
    })),
    respawn: { x: level.spawn.x, y: level.spawn.y + yOffset },
    orbs: level.orbs.map((o) => ({ ...o, y: o.y + yOffset, taken: false })),
    enemies: level.enemies.map((e) => ({ ...e, y: e.y + yOffset })),
    cameraX: 0,
    cameraY: 0,
    collected: 0,
    history: [],
    status: "running",
    message: "Collecte les Data-Orbs puis atteins le portail.",
  };
}

export function abilityFlags(world: number, unlockedSkills: PixelSkill[] = []) {
  const has = (skill: PixelSkill) => unlockedSkills.includes(skill);
  return {
    doubleJump: world >= 2 || has("OVERJUMP"),
    extraAirJumps: has("OVERJUMP") ? 2 : world >= 2 ? 1 : 0,
    airDash: world >= 3,
    hackWave: world >= 3,
    shield: world >= 4,
    overjump: has("OVERJUMP"),
    dataGrapple: has("DATA_GRAPPLE"),
    phaseShift: has("PHASE_SHIFT"),
    pulseShock: has("PULSE_SHOCK"),
    overclockMode: has("OVERCLOCK_MODE"),
    timeBuffer: has("TIME_BUFFER"),
    platformSpawn: has("PLATFORM_SPAWN"),
  };
}

export function grappleAnchors(platforms: RuntimePlatform[]): GrappleAnchor[] {
  const anchors: GrappleAnchor[] = [];
  for (const platform of platforms) {
    if (!platform.active) continue;
    if (platform.type !== "grapplable") continue;
    const blocks = platformBlocks(platform);
    if (blocks.length === 0) continue;
    const left = Math.min(...blocks.map((block) => block.x));
    const right = Math.max(...blocks.map((block) => block.x + block.w));
    const top = Math.min(...blocks.map((block) => block.y));
    const bottom = Math.max(...blocks.map((block) => block.y + block.h));
    const width = right - left;
    const height = bottom - top;
    if (height > width) {
      const centerY = top + height / 2;
      anchors.push({
        x: left - 18,
        y: centerY,
        landY: centerY,
        platformId: platform.id,
        attachSide: "left",
      });
      anchors.push({
        x: right + 18,
        y: centerY,
        landY: centerY,
        platformId: platform.id,
        attachSide: "right",
      });
      continue;
    }
    anchors.push({
      x: left + (right - left) / 2,
      y: top - 18,
      landY: top,
      platformId: platform.id,
      attachSide: "top",
    });
  }
  return anchors;
}

export function selectGrappleTarget(params: {
  platforms: RuntimePlatform[];
  player: Pick<GameRuntime["player"], "x" | "y" | "w" | "h" | "groundPlatformId" | "grapplePlatformId">;
  aimX: number;
  aimY: number;
}) {
  const { aimX, aimY, platforms, player } = params;
  const anchors = grappleAnchors(platforms);
  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;
  const aiming = aimX !== 0 || aimY !== 0;
  const blockedPlatformId = player.groundPlatformId ?? player.grapplePlatformId;
  const aimLength = Math.hypot(aimX, aimY) || 1;
  const normalizedAimX = aimX / aimLength;
  const normalizedAimY = aimY / aimLength;

  return anchors
    .map((anchor) => {
      const dx = anchor.x - playerCenterX;
      const dy = anchor.y - playerCenterY;
      const distance = Math.hypot(dx, dy);
      const dirDot = aiming
        ? (dx * normalizedAimX + dy * normalizedAimY) / Math.max(distance, 1)
        : 0;
      const angularPenalty = aiming ? (1 - clamp(dirDot, -1, 1)) * 180 : 0;
      return {
        ...anchor,
        distance,
        dirDot,
        score:
          distance +
          angularPenalty +
          (anchor.platformId === blockedPlatformId ? 180 : 0),
      };
    })
    .filter((anchor) => anchor.distance <= 680)
    .sort((a, b) => a.score - b.score)[0] ?? null;
}

export function updateCameraY(
  game: GameRuntime,
  viewportHeight: number,
  level: Pick<LevelDef, "worldHeight" | "worldTopPadding">
): void {
  const visibleWorldHeight = viewportHeight / WORLD_RENDER_SCALE;
  const worldHeight = levelWorldHeight(level);
  const maxCameraY = Math.max(0, worldHeight - visibleWorldHeight);
  const maxTopPadding = Math.max(levelTopPadding(level), CAMERA_MIN_TOP_PADDING, visibleWorldHeight * 0.72);
  const minCameraY = -Math.min(maxTopPadding, Math.max(0, visibleWorldHeight - TILE));
  const isAttached = Boolean(game.player.grappleAttachSide);
  const isAirborne = !game.player.grounded;
  const isAscending = game.player.vy < -180;
  const targetRatio = isAttached
    ? 0.34
    : isAscending
      ? 0.42
      : isAirborne
        ? 0.48
        : 0.52;
  const topTriggerRatio = isAttached
    ? 0.18
    : isAscending
      ? 0.22
      : isAirborne
        ? 0.26
        : Math.max(CAMERA_TOP_TRIGGER_RATIO, 0.3);
  const bottomTriggerRatio = isAttached
    ? 0.72
    : isAscending
      ? 0.76
      : isAirborne
        ? 0.8
        : Math.max(CAMERA_BOTTOM_TRIGGER_RATIO, 0.82);
  const playerTop = game.player.y;
  const playerBottom = game.player.y + game.player.h;
  const topTriggerY = game.cameraY + visibleWorldHeight * topTriggerRatio;
  const bottomTriggerY = game.cameraY + visibleWorldHeight * bottomTriggerRatio;
  const desiredCameraY = playerTop - visibleWorldHeight * targetRatio;

  if (playerTop < topTriggerY || playerBottom > bottomTriggerY) {
    const smoothing = isAttached ? 0.18 : isAscending ? 0.14 : 0.1;
    game.cameraY += (desiredCameraY - game.cameraY) * smoothing;
  }

  game.cameraY = clamp(game.cameraY, minCameraY, maxCameraY);
}

export function viewportWorldWidth(clientWidth: number) {
  return clientWidth / WORLD_RENDER_SCALE;
}

export function defaultViewportWorldWidth() {
  return VIEWPORT_W / WORLD_RENDER_SCALE;
}
