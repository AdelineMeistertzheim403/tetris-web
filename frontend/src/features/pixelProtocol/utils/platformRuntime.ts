import {
  MOVING_DEFAULT_AXIS,
  MOVING_DEFAULT_PATTERN,
  MOVING_DEFAULT_RANGE_TILES,
  MOVING_DEFAULT_SPEED,
} from "../constants";
import type { PlatformDef, RuntimePlatform } from "../types";

export function normalizePlatformDefinition(platform: PlatformDef): PlatformDef {
  const normalizedType = platform.type === "gravity" ? "magnetic" : platform.type;
  if (normalizedType !== "moving") {
    return {
      ...platform,
      type: normalizedType,
    };
  }
  return {
    ...platform,
    type: normalizedType,
    moveAxis: platform.moveAxis === "y" ? "y" : MOVING_DEFAULT_AXIS,
    movePattern: platform.movePattern === "loop" ? "loop" : MOVING_DEFAULT_PATTERN,
    moveRangeTiles:
      typeof platform.moveRangeTiles === "number" &&
      Number.isFinite(platform.moveRangeTiles) &&
      platform.moveRangeTiles > 0
        ? Math.round(platform.moveRangeTiles)
        : MOVING_DEFAULT_RANGE_TILES,
    moveSpeed:
      typeof platform.moveSpeed === "number" &&
      Number.isFinite(platform.moveSpeed) &&
      platform.moveSpeed > 0
        ? Math.round(platform.moveSpeed)
        : MOVING_DEFAULT_SPEED,
  };
}

export function createRuntimePlatform(
  platform: PlatformDef,
  options?: { now?: number; yOffsetTiles?: number }
): RuntimePlatform {
  const normalized = normalizePlatformDefinition(platform);
  const yOffsetTiles = options?.yOffsetTiles ?? 0;
  const y = normalized.y + yOffsetTiles;

  return {
    ...normalized,
    y,
    active: true,
    currentRotation: normalized.rotation ?? 0,
    hackedUntil: 0,
    nextRotateAt: normalized.rotateEveryMs
      ? (options?.now ?? performance.now()) + normalized.rotateEveryMs
      : Number.POSITIVE_INFINITY,
    unstableDropAt: 0,
    unstableWakeAt: 0,
    expiresAt: null,
    temporary: false,
    moveOriginX: normalized.x,
    moveOriginY: y,
    moveProgress: 0,
    moveDirection: 1,
    prevX: normalized.x,
    prevY: y,
  };
}
