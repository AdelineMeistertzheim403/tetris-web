import {
  BOOST_HORIZONTAL_PUSH,
  BOOST_JUMP_MULTIPLIER,
  BOOST_OVERCLOCK_MULTIPLIER,
  CORRUPTED_DAMAGE_COOLDOWN_MS,
  CORRUPTED_DURATION_MS,
  CORRUPTED_SPEED_FACTOR,
  DASH_MS,
  DASH_SPEED,
  GRAVITY,
  GRAVITY_FLIP_DURATION_MS,
  ICE_GROUND_ACCEL,
  JUMP,
  MAGNETIC_PULL_ACCEL,
  MAGNETIC_PULL_RADIUS,
  SPEED,
  TILE,
} from "../constants";
import {
  clamp,
  levelGroundY,
  levelWorldHeight,
  platformBlocks,
  rectIntersects,
  selectGrappleTarget,
  updateCameraY,
} from "../logic";
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

function gravityDirection(player: GameRuntime["player"], now: number) {
  return now < player.gravityInvertedUntil ? -1 : 1;
}

function applyMagneticPull(player: GameRuntime["player"], blocks: Rect[], dt: number) {
  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;
  let best: { dx: number; dy: number; distance: number } | null = null;

  for (const block of blocks) {
    if (block.type !== "magnetic") continue;
    const dx = block.x + block.w / 2 - playerCenterX;
    const dy = block.y + block.h / 2 - playerCenterY;
    const distance = Math.hypot(dx, dy);
    if (distance <= 1 || distance > MAGNETIC_PULL_RADIUS) continue;
    if (!best || distance < best.distance) {
      best = { dx, dy, distance };
    }
  }

  if (!best) return;
  const strength = (1 - best.distance / MAGNETIC_PULL_RADIUS) * MAGNETIC_PULL_ACCEL;
  player.vx += (best.dx / best.distance) * strength * dt;
  player.vy += (best.dy / best.distance) * strength * dt * 0.78;
}

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
      const aimX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const aimY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const target = selectGrappleTarget({
        platforms: game.platforms,
        player,
        aimX,
        aimY,
      });
      if (!target) {
        game.message = aimX !== 0 || aimY !== 0
          ? "Aucun point d'accroche dans cette direction."
          : "Aucun point d'accroche a portee.";
      } else {
        player.grappleUntil = now + 900;
        player.grappleCooldownUntil = now + 2400;
        player.grappleTargetX = target.x;
        player.grappleTargetY = target.y;
        player.grappleLandY = target.landY;
        player.grapplePlatformId = target.platformId;
        player.grappleAttachSide = target.attachSide === "top" ? null : target.attachSide;
        player.grounded = false;
        player.groundPlatformId = null;
        player.groundedSurface = null;
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
        player.groundPlatformId = null;
        player.groundedSurface = null;
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
        moveAxis: "x",
        movePattern: "pingpong",
        moveRangeTiles: 1,
        moveSpeed: 0,
        moveOriginX: tileX,
        moveOriginY: tileY,
        moveProgress: 0,
        moveDirection: 1,
        prevX: tileX,
        prevY: tileY,
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
  const corruptedActive = now < player.corruptedUntil;
  const gravDir = gravityDirection(player, now);
  const isGrappling =
    player.grappleTargetX !== null &&
    player.grappleTargetY !== null &&
    player.grappleLandY !== null &&
    now < player.grappleUntil;
  const moveSpeedBase = isOverclocked ? SPEED * 1.5 : SPEED;
  const moveSpeed = moveSpeedBase * (corruptedActive ? CORRUPTED_SPEED_FACTOR : 1);
  const jumpStrength = isOverclocked ? JUMP * 1.12 : JUMP;

  if (isGrappling) {
    const targetX = player.grappleTargetX;
    const targetY = player.grappleTargetY;
    const landY = player.grappleLandY;
    const grapplePlatformId = player.grapplePlatformId;
    const grappleAttachSide = player.grappleAttachSide;
    if (targetX === null || targetY === null || landY === null) {
      player.grappleUntil = 0;
      player.grappleTargetX = null;
      player.grappleTargetY = null;
      player.grappleLandY = null;
      player.grapplePlatformId = null;
      player.grappleAttachSide = null;
      return;
    }

    const dx = targetX - (player.x + player.w / 2);
    const dy = targetY - (player.y + player.h / 2);
    const distance = Math.hypot(dx, dy);

    if (distance < 18) {
      if (grappleAttachSide === "left") {
        player.x = targetX - player.w / 2;
        player.y = landY - player.h / 2;
        player.grounded = false;
      } else if (grappleAttachSide === "right") {
        player.x = targetX - player.w / 2;
        player.y = landY - player.h / 2;
        player.grounded = false;
      } else {
        player.x = targetX - player.w / 2;
        player.y = landY - player.h;
        player.grounded = true;
      }
      player.vx = 0;
      player.vy = 0;
      player.jumpsLeft = ability.extraAirJumps;
      player.grappleUntil = 0;
      player.grappleTargetX = null;
      player.grappleTargetY = null;
      player.grappleLandY = null;
      player.grapplePlatformId = null;
      player.grappleAttachSide = grappleAttachSide;
      player.groundPlatformId = grapplePlatformId;
      player.groundedSurface = "grapplable";
      game.message = "Accroche validee.";
      updateCameraY(game, viewportHeight, level);
      return;
    }

    const pullSpeed = 820;
    player.vx = (dx / Math.max(distance, 1)) * pullSpeed;
    player.vy = (dy / Math.max(distance, 1)) * pullSpeed;
    player.grounded = false;
    player.groundPlatformId = null;
    player.groundedSurface = null;
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
  if (player.grappleAttachSide) {
    const attachedPlatform = game.platforms.find((platform) => platform.id === player.groundPlatformId);
    if (!attachedPlatform) {
      player.grappleAttachSide = null;
      player.groundPlatformId = null;
      player.groundedSurface = null;
    } else {
      const platformRects = platformBlocks(attachedPlatform);
      const left = Math.min(...platformRects.map((block) => block.x));
      const right = Math.max(...platformRects.map((block) => block.x + block.w));
      const top = Math.min(...platformRects.map((block) => block.y));
      const bottom = Math.max(...platformRects.map((block) => block.y + block.h));
      player.vx = 0;
      player.vy = 0;
      player.grounded = false;
      player.groundedSurface = "grapplable";
      player.x = player.grappleAttachSide === "left" ? left - player.w : right;
      player.y = clamp(player.y, top - 6, bottom - player.h + 6);
      updateCameraY(game, viewportHeight, level);
      return;
    }
  }

  if (input.left) targetVx -= moveSpeed;
  if (input.right) targetVx += moveSpeed;
  if (targetVx > 0) player.facing = 1;
  if (targetVx < 0) player.facing = -1;

  const isDashing = now < player.dashUntil;
  const onIce = player.grounded && player.groundedSurface === "ice";
  if (isDashing) {
    player.vx = player.vx > 0 ? DASH_SPEED : -DASH_SPEED;
    player.vy = gravDir > 0 ? Math.max(player.vy, -70) : Math.min(player.vy, 70);
  } else {
    const accel = player.grounded ? (onIce ? ICE_GROUND_ACCEL : 1800) : 1200;
    if (Math.abs(targetVx - player.vx) <= accel * dt) {
      player.vx = targetVx;
    } else {
      player.vx += Math.sign(targetVx - player.vx) * accel * dt;
    }
  }

  if (input.wantDash && ability.airDash && now > player.dashCooldownUntil) {
    const dir = input.right ? 1 : input.left ? -1 : player.vx >= 0 ? 1 : -1;
      player.vx = dir * DASH_SPEED;
      player.vy = -gravDir * 20;
      player.dashUntil = now + DASH_MS;
      player.dashCooldownUntil = now + 1100;
  } else if (input.wantDash && !ability.airDash) {
    game.message = "Dash verrouille jusqu'au monde 3.";
  }

  if (input.wantJump) {
    if (player.grounded) {
      player.vy = -gravDir * jumpStrength;
      player.grounded = false;
      player.groundPlatformId = null;
      player.groundedSurface = null;
      player.jumpsLeft = ability.extraAirJumps;
    } else if (player.jumpsLeft > 0) {
      player.vy = -gravDir * jumpStrength * 0.92;
      player.jumpsLeft -= 1;
      player.grappleUntil = 0;
      player.grappleTargetX = null;
      player.grappleTargetY = null;
      player.grappleLandY = null;
      player.grapplePlatformId = null;
      player.grappleAttachSide = null;
    }
  }

  applyMagneticPull(player, blocks, dt);
  player.vy += GRAVITY * gravDir * dt;
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
  const gravDir = gravityDirection(player, now);

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
      if (
        player.grapplePlatformId &&
        now < player.grappleUntil &&
        block.platformId === player.grapplePlatformId
      ) {
        continue;
      }
      if (!rectIntersects(playerRect, block)) continue;

      if (axis === "x") {
        if (amount > 0) player.x = block.x - player.w;
        else player.x = block.x + block.w;
        playerRect.x = player.x;
        player.vx = 0;
      } else {
        const movingTowardGravity = amount * gravDir > 0;
        if (movingTowardGravity) {
          if (gravDir > 0) player.y = block.y - player.h;
          else player.y = block.y + block.h;
          playerRect.y = player.y;
          player.vy = 0;
          player.grounded = true;
          player.groundPlatformId = block.platformId ?? null;
          player.groundedSurface = block.type ?? null;
          player.jumpsLeft = ability.extraAirJumps;

          const launchDir = -gravDir;
          if (block.type === "bounce") {
            player.vy = launchDir * (now < player.overclockUntil ? JUMP * 1.28 : JUMP * 1.16);
            player.grounded = false;
            player.groundPlatformId = null;
            player.groundedSurface = null;
          }
          if (block.type === "boost") {
            player.vy =
              launchDir *
              (now < player.overclockUntil
                ? JUMP * BOOST_OVERCLOCK_MULTIPLIER
                : JUMP * BOOST_JUMP_MULTIPLIER);
            player.vx += player.facing * BOOST_HORIZONTAL_PUSH;
            player.grounded = false;
            player.groundPlatformId = null;
            player.groundedSurface = null;
            game.message = "Boost vectoriel active.";
          }
          if (block.type === "glitch" && !wasGrounded) {
            player.x += Math.random() < 0.5 ? -14 : 14;
          }
          if (block.type === "corrupted") {
            player.corruptedUntil = now + CORRUPTED_DURATION_MS;
            if (now >= player.corruptedDamageCooldownUntil) {
              player.hp = Math.max(0, player.hp - 1);
              player.corruptedDamageCooldownUntil = now + CORRUPTED_DAMAGE_COOLDOWN_MS;
            }
            game.message = "Corruption active: performances degradees.";
          }
          if (block.type === "gravity") {
            const nextGravityInverted = gravDir > 0;
            player.gravityInvertedUntil = nextGravityInverted
              ? now + GRAVITY_FLIP_DURATION_MS
              : 0;
            player.vy = 0;
            player.grounded = true;
            player.groundPlatformId = block.platformId ?? null;
            player.groundedSurface = block.type ?? null;
            player.jumpsLeft = ability.extraAirJumps;
            if (nextGravityInverted) {
              player.y = block.y + block.h;
            } else {
              player.y = block.y - player.h;
            }
            playerRect.y = player.y;
            game.message = nextGravityInverted
              ? "Polarite gravitationnelle inversee."
              : "Polarite gravitationnelle restauree.";
          }
          if (block.type === "unstable") {
            const platform = game.platforms.find(
              (candidate) => candidate.id === block.platformId
            );
            if (platform && platform.unstableDropAt === 0) {
              platform.unstableDropAt = now + 850;
            }
          }
        } else {
          if (gravDir > 0) {
            player.y = block.y + block.h;
            player.vy = Math.max(0, player.vy);
          } else {
            player.y = block.y - player.h;
            player.vy = Math.min(0, player.vy);
          }
          playerRect.y = player.y;
        }
      }
    }
  };

  player.grounded = false;
  player.groundPlatformId = null;
  player.groundedSurface = null;
  moveAxis("x", player.vx * dt);
  moveAxis("y", player.vy * dt);
  player.x = clamp(player.x, 0, level.worldWidth - player.w);
  const playerCenterX = player.x + player.w / 2;
  const maxCameraX = Math.max(0, level.worldWidth - viewportWidth);
  game.cameraX = clamp(
    playerCenterX - viewportWidth * 0.45,
    0,
    maxCameraX
  );
  updateCameraY(game, viewportHeight, level);
}

export function handleFloorAndRespawn(
  game: GameRuntime,
  wantRespawn: boolean,
  now: number,
  level: LevelDef
) {
  const player = game.player;
  const groundY = levelGroundY(level);
  const worldHeight = levelWorldHeight(level);
  const onGroundFloor = player.y + player.h >= groundY - 1;

  if (onGroundFloor) {
    game.message = "Tu es tombe. Appuie sur R pour reprendre au checkpoint.";
    if (wantRespawn) {
      respawnPlayer(game, now, 900);
      game.message = "Retour checkpoint.";
    }
  }

  if (player.y > worldHeight + 120 || player.y + player.h < -120) {
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
  player.grappleUntil = 0;
  player.grappleTargetX = null;
  player.grappleTargetY = null;
  player.grappleLandY = null;
  player.grapplePlatformId = null;
  player.grappleAttachSide = null;
  player.grounded = false;
  player.groundPlatformId = null;
  player.groundedSurface = null;
  player.gravityInvertedUntil = 0;
  player.corruptedUntil = 0;
  player.corruptedDamageCooldownUntil = 0;
  player.invulnUntil = now + invulnMs;
}
