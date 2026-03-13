import { PLAYER_LEVEL_HEAL, PLAYER_ORB_HEAL } from "../constants";
import { levelTopPadding, rectIntersects } from "../logic";
import type { GameRuntime, LevelDef, Rect } from "../types";
import { healPlayer } from "./updatePlayer";

export function collectCheckpoints(game: GameRuntime) {
  const playerRect: Rect = {
    x: game.player.x,
    y: game.player.y,
    w: game.player.w,
    h: game.player.h,
  };

  for (const checkpoint of game.checkpoints) {
    const cpRect: Rect = { x: checkpoint.x, y: checkpoint.y, w: 12, h: 42 };
    if (!checkpoint.activated && rectIntersects(playerRect, cpRect)) {
      checkpoint.activated = true;
      game.respawn.x = checkpoint.spawnX;
      game.respawn.y = checkpoint.spawnY;
      game.message = "Checkpoint active.";
    }
  }
}

export function collectOrbs(game: GameRuntime) {
  const playerRect: Rect = {
    x: game.player.x,
    y: game.player.y,
    w: game.player.w,
    h: game.player.h,
  };

  for (const orb of game.orbs) {
    if (orb.taken) continue;
    const orbRect: Rect = { x: orb.x, y: orb.y, w: 18, h: 18 };
    if (rectIntersects(playerRect, orbRect)) {
      orb.taken = true;
      game.collected += 1;
      healPlayer(game, PLAYER_ORB_HEAL);
      game.message = "Data-Orb capture. Integrite restauree.";
    }
  }
}

export function handlePortal({
  game,
  level,
  onAdvanceLevel,
}: {
  game: GameRuntime;
  level: LevelDef;
  onAdvanceLevel: () => void;
}) {
  const portalRect: Rect = {
    x: level.portal.x,
    y: level.portal.y + levelTopPadding(level),
    w: 34,
    h: 44,
  };
  const playerRect: Rect = {
    x: game.player.x,
    y: game.player.y,
    w: game.player.w,
    h: game.player.h,
  };

  if (!rectIntersects(playerRect, portalRect)) return;

  if (game.collected < level.requiredOrbs) {
    game.message = `Portail verrouille: ${game.collected}/${level.requiredOrbs} Data-Orbs`;
  } else {
    healPlayer(game, PLAYER_LEVEL_HEAL);
    onAdvanceLevel();
  }
}
