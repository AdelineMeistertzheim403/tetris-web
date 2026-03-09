const DEFAULT_ROTATE_EVERY_MS = 1800;
const DEFAULT_WORLD_HEIGHT = 18 * 32;
const DEFAULT_MOVE_AXIS = "x";
const DEFAULT_MOVE_PATTERN = "pingpong";
const DEFAULT_MOVE_RANGE_TILES = 4;
const DEFAULT_MOVE_SPEED = 96;
const DEFAULT_DECORATION_LAYER = "mid";
const DEFAULT_DECORATION_ANIMATION = "none";
const DEFAULT_DECORATION_OPACITY = 0.9;

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
  worldTopPadding?: unknown;
  worldTemplateId?: unknown;
  decorations?: unknown;
} & Record<string, unknown>;

type PixelProtocolDecorationLike = {
  id?: unknown;
  type?: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  rotation?: unknown;
  opacity?: unknown;
  color?: unknown;
  colorSecondary?: unknown;
  layer?: unknown;
  animation?: unknown;
  flipX?: unknown;
  flipY?: unknown;
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

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeDecoration(decoration: PixelProtocolDecorationLike) {
  return {
    ...decoration,
    id:
      typeof decoration.id === "string" && decoration.id.trim().length > 0
        ? decoration.id.trim()
        : "dec-1",
    type:
      typeof decoration.type === "string" && decoration.type.trim().length > 0
        ? decoration.type.trim()
        : "pixel_glitch",
    x: Math.round(toFiniteNumber(decoration.x, 0)),
    y: Math.round(toFiniteNumber(decoration.y, 0)),
    width: Math.max(4, Math.round(toFiniteNumber(decoration.width, 80))),
    height: Math.max(4, Math.round(toFiniteNumber(decoration.height, 80))),
    rotation: toFiniteNumber(decoration.rotation, 0),
    opacity: Math.min(1, Math.max(0, toFiniteNumber(decoration.opacity, DEFAULT_DECORATION_OPACITY))),
    color:
      typeof decoration.color === "string" && decoration.color.trim().length > 0
        ? decoration.color.trim()
        : "#00ffff",
    colorSecondary:
      typeof decoration.colorSecondary === "string" &&
      decoration.colorSecondary.trim().length > 0
        ? decoration.colorSecondary.trim()
        : "#ff00ff",
    layer:
      decoration.layer === "far" || decoration.layer === "near"
        ? decoration.layer
        : DEFAULT_DECORATION_LAYER,
    animation:
      decoration.animation === "pulse" ||
      decoration.animation === "flow" ||
      decoration.animation === "glitch"
        ? decoration.animation
        : DEFAULT_DECORATION_ANIMATION,
    flipX: Boolean(decoration.flipX),
    flipY: Boolean(decoration.flipY),
  };
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
    worldTopPadding:
      typeof level.worldTopPadding === "number" &&
      Number.isFinite(level.worldTopPadding) &&
      level.worldTopPadding >= 0
        ? Math.round(level.worldTopPadding)
        : 0,
    worldTemplateId:
      typeof level.worldTemplateId === "string" && level.worldTemplateId.trim().length > 0
        ? level.worldTemplateId.trim()
        : null,
    decorations: Array.isArray(level.decorations)
      ? level.decorations.map((decoration) =>
          decoration && typeof decoration === "object"
            ? normalizeDecoration(decoration as PixelProtocolDecorationLike)
            : decoration
        )
      : [],
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
  DEFAULT_DECORATION_ANIMATION,
  DEFAULT_DECORATION_LAYER,
  DEFAULT_DECORATION_OPACITY,
  DEFAULT_MOVE_AXIS,
  DEFAULT_MOVE_PATTERN,
  DEFAULT_MOVE_RANGE_TILES,
  DEFAULT_MOVE_SPEED,
  DEFAULT_ROTATE_EVERY_MS,
  DEFAULT_WORLD_HEIGHT,
};
