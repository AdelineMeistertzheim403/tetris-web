import {
  DASH_MS,
  DASH_SPEED,
  GROUND_Y,
  JUMP,
  GRAVITY,
  SPEED,
  TILE,
  WORLD_H,
} from "../constants";
import { clamp, grappleAnchors, rectIntersects, updateCameraY } from "../logic";
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

export function applyUnlockedSkills({
  ability,
  game,
  input,
  now,
}: Pick<UpdatePlayerParams, "ability" | "game" | "input" | "now">) {
  const player = game.player;

  if (input.wantPhaseShift) {
    if (!ability.phaseShift) {
      game.message = "Phase Shift non debloque.";
    } else if (now < player.phaseShiftCooldownUntil) {
      game.message = "Phase Shift en recharge.";
    } else {
      player.phaseShiftUntil = now + 1600;
      player.phaseShiftCooldownUntil = now + 5200;
      game.message = "Phase Shift active.";
    }
  }

  if (input.wantGrapple) {
    if (!ability.dataGrapple) {
      game.message = "Data Grapple non debloque.";
    } else if (now < player.grappleCooldownUntil) {
      game.message = "Data Grapple en recharge.";
    } else {
      const anchors = grappleAnchors(game.platforms);
      const playerCenterX = player.x + player.w / 2;
      const playerCenterY = player.y + player.h / 2;
      const candidates = anchors
        .map((anchor) => ({
          ...anchor,
          distance:
            Math.abs(anchor.x - playerCenterX) +
            Math.abs(anchor.y - playerCenterY),
        }))
        .filter(
          (anchor) =>
            anchor.distance < 360 &&
            anchor.y < player.y + 80
        )
        .sort((a, b) => a.distance - b.distance);

      const target = candidates[0];
      if (!target) {
        game.message = "Aucun point d'accroche a portee.";
      } else {
        player.grappleUntil = now + 900;
        player.grappleCooldownUntil = now + 2400;
        player.grappleTargetX = target.x;
        player.grappleTargetY = target.y;
        player.grappleLandY = target.landY;
        player.grounded = false;
        game.message = "Data Grapple engage.";
      }
    }
  }

  if (input.wantPulseShock) {
    if (!ability.pulseShock) {
      game.message = "Pulse Shock non debloque.";
    } else if (now < player.pulseShockCooldownUntil) {
      game.message = "Pulse Shock en recharge.";
    } else {
      let stunned = 0;
      for (const enemy of game.enemies) {
        if (Math.abs(enemy.x - player.x) < 180 && Math.abs(enemy.y - player.y) < 100) {
          enemy.stunnedUntil = now + 1900;
          enemy.vx *= -1;
          stunned += 1;
        }
      }
      player.pulseShockCooldownUntil = now + 4200;
      game.message = stunned > 0 ? "Pulse Shock declenche." : "Pulse Shock sans cible.";
    }
  }

  if (input.wantOverclock) {
    if (!ability.overclockMode) {
      game.message = "Overclock Mode non debloque.";
    } else if (now < player.overclockCooldownUntil) {
      game.message = "Overclock en recharge.";
    } else {
      player.overclockUntil = now + 4000;
      player.overclockCooldownUntil = now + 8500;
      game.message = "Overclock Mode active.";
    }
  }

  if (input.wantTimeBuffer) {
    if (!ability.timeBuffer) {
      game.message = "Time Buffer non debloque.";
    } else if (now < player.timeBufferCooldownUntil) {
      game.message = "Time Buffer en recharge.";
    } else {
      const target = [...game.history]
        .reverse()
        .find((entry) => now - entry.at >= 1800);
      if (!target) {
        game.message = "Time Buffer indisponible.";
      } else {
        player.x = target.x;
        player.y = target.y;
        player.vx = target.vx;
        player.vy = target.vy;
        player.facing = target.facing;
        player.grounded = target.grounded;
        player.jumpsLeft = target.jumpsLeft;
        player.hp = Math.max(player.hp, target.hp);
        player.invulnUntil = now + 900;
        player.timeBufferCooldownUntil = now + 7000;
        game.message = "Time Buffer active.";
      }
    }
  }

  if (input.wantPlatformSpawn) {
    if (!ability.platformSpawn) {
      game.message = "Platform Spawn non debloque.";
    } else if (now < player.platformSpawnCooldownUntil) {
      game.message = "Platform Spawn en recharge.";
    } else {
      const direction = player.facing >= 0 ? 1 : -1;
      const tileX = Math.round((player.x + direction * (TILE + 16)) / TILE);
      const tileY = Math.min(15, Math.max(4, Math.round((player.y + player.h + 28) / TILE)));
      game.platforms.push({
        id: `tmp-${Math.floor(now)}`,
        tetromino: "O",
        x: tileX,
        y: tileY,
        type: "stable",
        currentRotation: 0,
        active: true,
        unstableWakeAt: 0,
        unstableDropAt: 0,
        hackedUntil: 0,
        nextRotateAt: Number.POSITIVE_INFINITY,
        expiresAt: now + 3000,
        temporary: true,
      });
      player.platformSpawnCooldownUntil = now + 5200;
      game.message = "Plateforme compilee.";
    }
  }
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
  const isOverclocked = now < player.overclockUntil;
  const isGrappling =
    player.grappleTargetX !== null &&
    player.grappleTargetY !== null &&
    player.grappleLandY !== null &&
    now < player.grappleUntil;
  const moveSpeed = isOverclocked ? SPEED * 1.5 : SPEED;
  const jumpStrength = isOverclocked ? JUMP * 1.12 : JUMP;

  if (isGrappling) {
    const targetX = player.grappleTargetX;
    const targetY = player.grappleTargetY;
    const landY = player.grappleLandY;
    if (targetX === null || targetY === null || landY === null) {
      player.grappleUntil = 0;
      return;
    }

    const dx = targetX - (player.x + player.w / 2);
    const dy = targetY - (player.y + player.h / 2);
    const distance = Math.hypot(dx, dy);

    if (distance < 18) {
      player.x = targetX - player.w / 2;
      player.y = landY - player.h;
      player.vx = 0;
      player.vy = 0;
      player.grounded = true;
      player.jumpsLeft = ability.extraAirJumps;
      player.grappleUntil = 0;
      player.grappleTargetX = null;
      player.grappleTargetY = null;
      player.grappleLandY = null;
      game.message = "Accroche validee.";
      updateCameraY(game, viewportHeight);
      return;
    }

    const pullSpeed = 820;
    player.vx = (dx / Math.max(distance, 1)) * pullSpeed;
    player.vy = (dy / Math.max(distance, 1)) * pullSpeed;
    player.grounded = false;
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
    return;
  }

  let targetVx = 0;
  if (input.left) targetVx -= moveSpeed;
  if (input.right) targetVx += moveSpeed;
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
      player.vy = -jumpStrength;
      player.grounded = false;
      player.jumpsLeft = ability.extraAirJumps;
    } else if (player.jumpsLeft > 0) {
      player.vy = -jumpStrength * 0.92;
      player.jumpsLeft -= 1;
      player.grappleUntil = 0;
      player.grappleTargetX = null;
      player.grappleTargetY = null;
      player.grappleLandY = null;
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
  const phaseShiftActive = now < player.phaseShiftUntil;

  const moveAxis = (axis: "x" | "y", amount: number) => {
    if (axis === "x") player.x += amount;
    else player.y += amount;

    const playerRect: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };

    for (const block of blocks) {
      if (
        phaseShiftActive &&
        block.platformId !== "ground" &&
        (block.type === "armored" || block.type === "hackable")
      ) {
        continue;
      }
      if (!rectIntersects(playerRect, block)) continue;

      if (axis === "x") {
        if (amount > 0) player.x = block.x - player.w;
        else player.x = block.x + block.w;
        player.vx = 0;
      } else if (amount > 0) {
        player.y = block.y - player.h;
        player.vy = 0;
        player.grounded = true;
        player.jumpsLeft = ability.extraAirJumps;
        if (block.type === "bounce") player.vy = -(now < player.overclockUntil ? JUMP * 1.28 : JUMP * 1.16);
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
