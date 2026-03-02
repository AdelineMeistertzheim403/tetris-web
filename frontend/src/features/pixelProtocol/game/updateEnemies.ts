import { JUMP } from "../constants";
import { clamp, findSupportTop, rectIntersects } from "../logic";
import type { AbilityFlags, GameRuntime, Rect } from "../types";
import { respawnPlayer } from "./updatePlayer";

export function updateEnemies({
  ability,
  blocks,
  dt,
  game,
  now,
}: {
  ability: AbilityFlags;
  blocks: Rect[];
  dt: number;
  game: GameRuntime;
  now: number;
}) {
  const player = game.player;
  const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };

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
        if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
          enemy.vx *= -1;
        }
      }
    } else {
      const supportAtCurrent = findSupportTop(blocks, enemy.x, enemy.y, 26, 26);
      if (supportAtCurrent !== null) enemy.y = supportAtCurrent - 26;
    }

    const enemyRect: Rect = { x: enemy.x, y: enemy.y, w: 26, h: 26 };
    if (rectIntersects(playerRect, enemyRect) && now > player.invulnUntil) {
      const stomp = player.vy > 80 && player.y + player.h - 6 < enemy.y;
      if (stomp) {
        enemy.stunnedUntil = now + 1400;
        player.vy = -JUMP * 0.65;
        game.message = "Tetrobot neutralise.";
      } else {
        player.hp -= ability.shield ? 0 : 1;
        respawnPlayer(game, now, 1600);
        game.message = ability.shield ? "Bouclier actif." : "Impact critique.";
      }
    }
  }
}
