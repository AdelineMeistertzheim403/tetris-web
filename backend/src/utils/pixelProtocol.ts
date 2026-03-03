const DEFAULT_ROTATE_EVERY_MS = 1800;

type PixelProtocolPlatformLike = {
  type?: unknown;
  rotateEveryMs?: unknown;
};

type PixelProtocolLevelLike = {
  platforms?: unknown;
} & Record<string, unknown>;

function normalizePlatform(platform: PixelProtocolPlatformLike) {
  if (platform.type !== "rotating") {
    return platform;
  }

  if (
    typeof platform.rotateEveryMs === "number" &&
    Number.isFinite(platform.rotateEveryMs) &&
    platform.rotateEveryMs > 0
  ) {
    return platform;
  }

  return {
    ...platform,
    rotateEveryMs: DEFAULT_ROTATE_EVERY_MS,
  };
}

export function normalizePixelProtocolLevelDefinition<T extends PixelProtocolLevelLike>(
  level: T
): T {
  if (!Array.isArray(level.platforms)) {
    return level;
  }

  return {
    ...level,
    platforms: level.platforms.map((platform) =>
      platform && typeof platform === "object"
        ? normalizePlatform(platform as PixelProtocolPlatformLike)
        : platform
    ),
  };
}

export { DEFAULT_ROTATE_EVERY_MS };
