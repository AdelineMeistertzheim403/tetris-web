const DEFAULT_ROTATE_EVERY_MS = 1800;
const DEFAULT_WORLD_HEIGHT = 18 * 32;
const DEFAULT_MOVE_AXIS = "x";
const DEFAULT_MOVE_PATTERN = "pingpong";
const DEFAULT_MOVE_RANGE_TILES = 4;
const DEFAULT_MOVE_SPEED = 96;

type PixelProtocolPlatformLike = {
  type?: unknown;
  rotateEveryMs?: unknown;
  moveAxis?: unknown;
  movePattern?: unknown;
  moveRangeTiles?: unknown;
  moveSpeed?: unknown;
} & Record<string, unknown>;

type PixelProtocolLevelLike = {
  platforms?: unknown;
  worldHeight?: unknown;
} & Record<string, unknown>;

function normalizePlatform(platform: PixelProtocolPlatformLike) {
  const next = { ...platform };

  if (next.type === "rotating") {
    if (
      typeof next.rotateEveryMs !== "number" ||
      !Number.isFinite(next.rotateEveryMs) ||
      next.rotateEveryMs <= 0
    ) {
      next.rotateEveryMs = DEFAULT_ROTATE_EVERY_MS;
    }
  }

  if (next.type === "moving") {
    next.moveAxis = next.moveAxis === "y" ? "y" : DEFAULT_MOVE_AXIS;
    next.movePattern = next.movePattern === "loop" ? "loop" : DEFAULT_MOVE_PATTERN;
    next.moveRangeTiles =
      typeof next.moveRangeTiles === "number" &&
      Number.isFinite(next.moveRangeTiles) &&
      next.moveRangeTiles > 0
        ? Math.round(next.moveRangeTiles)
        : DEFAULT_MOVE_RANGE_TILES;
    next.moveSpeed =
      typeof next.moveSpeed === "number" &&
      Number.isFinite(next.moveSpeed) &&
      next.moveSpeed > 0
        ? Math.round(next.moveSpeed)
        : DEFAULT_MOVE_SPEED;
  }

  return next;
}

export function normalizePixelProtocolLevelDefinition<T extends PixelProtocolLevelLike>(
  level: T
): T {
  const nextLevel = {
    ...level,
    worldHeight:
      typeof level.worldHeight === "number" &&
      Number.isFinite(level.worldHeight) &&
      level.worldHeight >= DEFAULT_WORLD_HEIGHT
        ? Math.round(level.worldHeight)
        : DEFAULT_WORLD_HEIGHT,
  };

  if (!Array.isArray(level.platforms)) {
    return nextLevel as T;
  }

  return {
    ...nextLevel,
    platforms: level.platforms.map((platform) =>
      platform && typeof platform === "object"
        ? normalizePlatform(platform as PixelProtocolPlatformLike)
        : platform
    ),
  };
}

export {
  DEFAULT_MOVE_AXIS,
  DEFAULT_MOVE_PATTERN,
  DEFAULT_MOVE_RANGE_TILES,
  DEFAULT_MOVE_SPEED,
  DEFAULT_ROTATE_EVERY_MS,
  DEFAULT_WORLD_HEIGHT,
};
