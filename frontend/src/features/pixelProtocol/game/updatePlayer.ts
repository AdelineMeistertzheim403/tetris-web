import {
  DASH_MS,
  DASH_SPEED,
  GROUND_Y,
  GRAVITY,
  JUMP,
  SPEED,
  WORLD_H,
} from "../constants";
import { clamp, rectIntersects, updateCameraY } from "../logic";
import type {
  AbilityFlags,
  GameRuntime,
  InputSnapshot,
  LevelDef,
  Rect,
} from "../types";

type UpdatePlayerParams = {
  ability: AbilityFlags;
  blocks: Rect[];
  dt: number;
  game: GameRuntime;
  input: InputSnapshot;
  level: LevelDef;
  now: number;
  viewportHeight: number;
  viewportWidth: number;
};

export function applyHackPulse({
  ability,
  game,
  input,
  now,
}: Pick<UpdatePlayerParams, "ability" | "game" | "input" | "now">) {
  if (!input.wantHack) return;
  if (!ability.hackWave) {
    game.message = "Hack verrouille jusqu'au monde 3.";
    return;
  }

  const player = game.player;
  for (const enemy of game.enemies) {
    if (Math.abs(enemy.x - player.x) < 150 && Math.abs(enemy.y - player.y) < 90) {
      enemy.stunnedUntil = now + 1700;
    }
  }
  for (const platform of game.platforms) {
    if (platform.type === "hackable") {
      platform.hackedUntil = now + 3500;
    }
  }
  game.message = "Hack pulse execute.";
}

export function updatePlayer({
  ability,
  blocks,
  dt,
  game,
  input,
  level,
  now,
  viewportHeight,
  viewportWidth,
}: UpdatePlayerParams) {
  const player = game.player;

  let targetVx = 0;
  if (input.left) targetVx -= SPEED;
  if (input.right) targetVx += SPEED;
  if (targetVx > 0) player.facing = 1;
  if (targetVx < 0) player.facing = -1;

  const isDashing = now < player.dashUntil;
  if (isDashing) {
    player.vx = player.vx > 0 ? DASH_SPEED : -DASH_SPEED;
    player.vy = Math.max(player.vy, -70);
  } else {
    const accel = player.grounded ? 1800 : 1200;
    if (Math.abs(targetVx - player.vx) <= accel * dt) {
      player.vx = targetVx;
    } else {
      player.vx += Math.sign(targetVx - player.vx) * accel * dt;
    }
  }

  if (input.wantDash && ability.airDash && now > player.dashCooldownUntil) {
    const dir = input.right ? 1 : input.left ? -1 : player.vx >= 0 ? 1 : -1;
    player.vx = dir * DASH_SPEED;
    player.vy = -20;
    player.dashUntil = now + DASH_MS;
    player.dashCooldownUntil = now + 1100;
  } else if (input.wantDash && !ability.airDash) {
    game.message = "Dash verrouille jusqu'au monde 3.";
  }

  if (input.wantJump) {
    if (player.grounded) {
      player.vy = -JUMP;
      player.grounded = false;
      player.jumpsLeft = ability.doubleJump ? 1 : 0;
    } else if (player.jumpsLeft > 0) {
      player.vy = -JUMP * 0.92;
      player.jumpsLeft -= 1;
    }
  }

  player.vy += GRAVITY * dt;
  resolvePlayerMovement({
    ability,
    blocks,
    dt,
    game,
    level,
    now,
    viewportHeight,
    viewportWidth,
  });
}

function resolvePlayerMovement({
  ability,
  blocks,
  dt,
  game,
  level,
  now,
  viewportHeight,
  viewportWidth,
}: Omit<UpdatePlayerParams, "input">) {
  const player = game.player;
  const wasGrounded = player.grounded;

  const moveAxis = (axis: "x" | "y", amount: number) => {
    if (axis === "x") player.x += amount;
    else player.y += amount;

    const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };

    for (const block of blocks) {
      if (!rectIntersects(playerRect, block)) continue;

      if (axis === "x") {
        if (amount > 0) player.x = block.x - player.w;
        else player.x = block.x + block.w;
        player.vx = 0;
      } else if (amount > 0) {
        player.y = block.y - player.h;
        player.vy = 0;
        player.grounded = true;
        if (ability.doubleJump) player.jumpsLeft = 1;
        if (block.type === "bounce") player.vy = -JUMP * 1.16;
        if (block.type === "glitch" && !wasGrounded) {
          player.x += Math.random() < 0.5 ? -14 : 14;
        }
        if (block.type === "unstable") {
          const platform = game.platforms.find((candidate) => candidate.id === block.platformId);
          if (platform && platform.unstableDropAt === 0) {
            platform.unstableDropAt = now + 850;
          }
        }
      } else {
        player.y = block.y + block.h;
        player.vy = Math.max(0, player.vy);
      }
    }
  };

  player.grounded = false;
  moveAxis("x", player.vx * dt);
  moveAxis("y", player.vy * dt);
  player.x = clamp(player.x, 0, level.worldWidth - player.w);
  game.cameraX = clamp(
    player.x - viewportWidth * 0.4,
    0,
    Math.max(0, level.worldWidth - viewportWidth)
  );
  updateCameraY(game, viewportHeight);
}

export function handleFloorAndRespawn(
  game: GameRuntime,
  wantRespawn: boolean,
  now: number
) {
  const player = game.player;
  const onGroundFloor = player.y + player.h >= GROUND_Y - 1;

  if (onGroundFloor) {
    game.message = "Tu es tombe. Appuie sur R pour reprendre au checkpoint.";
    if (wantRespawn) {
      respawnPlayer(game, now, 900);
      game.message = "Retour checkpoint.";
    }
  }

  if (player.y > WORLD_H + 120) {
    player.hp -= 1;
    respawnPlayer(game, now, 1500);
    game.message = "Recompilation du noyau...";
  }
}

export function respawnPlayer(game: GameRuntime, now: number, invulnMs: number) {
  const player = game.player;
  player.x = game.respawn.x;
  player.y = game.respawn.y;
  player.vx = 0;
  player.vy = 0;
  player.invulnUntil = now + invulnMs;
}
