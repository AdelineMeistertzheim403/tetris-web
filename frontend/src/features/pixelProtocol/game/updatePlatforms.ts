import type { GameRuntime } from "../types";

export function updatePlatforms(game: GameRuntime, now: number) {
  for (const platform of game.platforms) {
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
  }
}
