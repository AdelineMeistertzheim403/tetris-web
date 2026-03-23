import {
  MAX_SHIELD,
  PLAYER_HEIGHT,
  PLAYER_HITBOX_HEIGHT,
  PLAYER_HITBOX_WIDTH,
  PLAYER_WIDTH,
  PLAYER_Y,
  SCRAP_TOP,
} from "../model";
import type { GameState } from "../model";
import { createImpact, overlaps } from "./pixelInvasionCore";

function getPlayerHitImpactType(sourceKind: GameState["enemyBullets"][number]["sourceKind"]) {
  return sourceKind === "I"
    ? "laser"
    : sourceKind === "T"
      ? "fan"
      : sourceKind === "O"
        ? "heavy"
        : sourceKind === "S" || sourceKind === "Z"
          ? "zigzag"
          : "player-hit";
}

/**
 * Résout tous les dégâts entrants côté joueur :
 * tirs reçus, collisions avec la ligne de scrap, décrément des vies.
 */
export function resolveIncomingDamage(next: GameState) {
  let shield = next.shield;
  let lives = next.lives;
  let tookDamage = false;
  const playerBox = {
    x: next.playerX + (PLAYER_WIDTH - PLAYER_HITBOX_WIDTH) / 2,
    y: PLAYER_Y + (PLAYER_HEIGHT - PLAYER_HITBOX_HEIGHT) / 2 + 6,
    width: PLAYER_HITBOX_WIDTH,
    height: PLAYER_HITBOX_HEIGHT,
  };

  next.enemyBullets = next.enemyBullets.filter((bullet) => {
    if (!overlaps(bullet, playerBox)) return true;

    shield -= bullet.damage;
    tookDamage = true;
    next.impacts = [
      ...next.impacts,
      createImpact(
        next.nextEntityId,
        playerBox.x + playerBox.width / 2,
        playerBox.y + playerBox.height / 2,
        getPlayerHitImpactType(bullet.sourceKind),
        bullet.sourceKind === "O" ? 42 : 28,
        0.26
      ),
    ];
    next.nextEntityId += 1;
    next.hitStopTimer = Math.max(next.hitStopTimer, bullet.sourceKind === "O" ? 0.05 : 0.03);
    next.boardShakeTimer = Math.max(next.boardShakeTimer, bullet.sourceKind === "O" ? 0.22 : 0.14);
    return false;
  });

  next.enemies = next.enemies.filter((enemy) => {
    if (enemy.y + enemy.height < SCRAP_TOP - 16) return true;

    shield -= enemy.kind === "APEX" ? 3 : 1;
    tookDamage = true;
    next.hitStopTimer = Math.max(next.hitStopTimer, enemy.kind === "APEX" ? 0.06 : 0.035);
    next.boardShakeTimer = Math.max(next.boardShakeTimer, enemy.kind === "APEX" ? 0.28 : 0.18);
    return false;
  });

  while (shield <= 0 && lives > 0) {
    lives -= 1;
    if (lives > 0) {
      shield += MAX_SHIELD;
    }
  }

  next.shield = shield;
  next.lives = lives;

  if (tookDamage) {
    next.combo = 0;
    next.comboTimer = 0;
  }

  return tookDamage;
}
