import {
  MOVING_DEFAULT_RANGE_TILES,
  MOVING_DEFAULT_SPEED,
  TILE,
} from "../constants";
import type { GameRuntime, RuntimePlatform } from "../types";

function updateMovingPlatform(platform: RuntimePlatform, dt: number) {
  const axis = platform.moveAxis === "y" ? "y" : "x";
  const pattern = platform.movePattern === "loop" ? "loop" : "pingpong";
  const rangeTiles =
    typeof platform.moveRangeTiles === "number" &&
    Number.isFinite(platform.moveRangeTiles) &&
    platform.moveRangeTiles > 0
      ? Math.round(platform.moveRangeTiles)
      : MOVING_DEFAULT_RANGE_TILES;
  const speed =
    typeof platform.moveSpeed === "number" &&
    Number.isFinite(platform.moveSpeed) &&
    platform.moveSpeed > 0
      ? platform.moveSpeed
      : MOVING_DEFAULT_SPEED;
  const rangePx = Math.max(TILE, rangeTiles * TILE);

  if (pattern === "loop") {
    platform.moveProgress = (platform.moveProgress + speed * dt) % rangePx;
  } else {
    platform.moveProgress += platform.moveDirection * speed * dt;
    if (platform.moveProgress >= rangePx) {
      platform.moveProgress = rangePx;
      platform.moveDirection = -1;
    } else if (platform.moveProgress <= 0) {
      platform.moveProgress = 0;
      platform.moveDirection = 1;
    }
  }

  const offsetTiles = platform.moveProgress / TILE;
  platform.x = axis === "x" ? platform.moveOriginX + offsetTiles : platform.moveOriginX;
  platform.y = axis === "y" ? platform.moveOriginY + offsetTiles : platform.moveOriginY;
}

export function updatePlatforms(game: GameRuntime, now: number, dt: number) {
  game.platforms = game.platforms.filter(
    (platform) => platform.expiresAt === null || platform.expiresAt > now
  );

  for (const platform of game.platforms) {
    platform.prevX = platform.x;
    platform.prevY = platform.y;

    if (platform.type === "unstable" && !platform.active && now >= platform.unstableWakeAt) {
      platform.active = true;
    }
    if (
      platform.type === "unstable" &&
      platform.active &&
      platform.unstableDropAt > 0 &&
      now >= platform.unstableDropAt
    ) {
      platform.active = false;
      platform.unstableDropAt = 0;
      platform.unstableWakeAt = now + 3000;
    }
    if (platform.type === "hackable" && platform.hackedUntil > 0 && now >= platform.hackedUntil) {
      platform.hackedUntil = 0;
    }
    if (platform.type === "rotating" && platform.rotateEveryMs && now >= platform.nextRotateAt) {
      platform.currentRotation = ((platform.currentRotation + 1) % 4) as 0 | 1 | 2 | 3;
      platform.nextRotateAt = now + platform.rotateEveryMs;
    }
    if (platform.type === "moving") {
      updateMovingPlatform(platform, dt);
    }
  }

  if (game.player.grounded && game.player.groundPlatformId) {
    const support = game.platforms.find(
      (platform) => platform.id === game.player.groundPlatformId
    );
    if (support && support.type === "moving") {
      const dx = (support.x - support.prevX) * TILE;
      const dy = (support.y - support.prevY) * TILE;
      if (dx !== 0 || dy !== 0) {
        game.player.x += dx;
        game.player.y += dy;
      }
    }
  }
}
