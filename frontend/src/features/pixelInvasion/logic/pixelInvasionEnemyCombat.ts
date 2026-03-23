import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  ENEMY_BULLET_SPEED,
  clamp,
  createMessage,
} from "../model";
import type { Bullet, Enemy, EnemyKind, GameState, Telegraph } from "../model";
import { createImpact } from "./pixelInvasionCore";

function getFormationOffsets(next: GameState, enemy: Enemy) {
  if (next.waveTheme === "rookie") {
    return { offsetX: 0, offsetY: 0 };
  }

  const boardCenter = BOARD_WIDTH / 2;
  const enemyCenter = enemy.x + enemy.width / 2;
  const side = enemyCenter >= boardCenter ? 1 : -1;
  const normalizedDistance = Math.min(1, Math.abs(enemyCenter - boardCenter) / (BOARD_WIDTH * 0.5));

  if (next.waveTheme === "pulse") {
    const pulse = Math.sin(next.formationPulse * 1.9 + enemy.y * 0.012);
    return {
      offsetX: side * pulse * (18 + normalizedDistance * 12),
      offsetY: Math.cos(next.formationPulse * 1.4 + enemyCenter * 0.004) * 1.6,
    };
  }

  const shear = Math.sin(next.formationPulse * 2.3 + enemy.id * 0.35);
  const stagger = Math.cos(next.formationPulse * 1.7 + enemy.y * 0.018);
  return {
    offsetX: side * shear * (14 + normalizedDistance * 18),
    offsetY: stagger * 3.8,
  };
}

function getFormationPressure(next: GameState) {
  if (next.waveTheme === "rookie") {
    return {
      pressure: 0.2,
      compression: 0,
      skew: 0,
    };
  }

  if (next.waveTheme === "pulse") {
    return {
      pressure: Math.max(0, Math.sin(next.formationPulse * 1.9)),
      compression: Math.abs(Math.sin(next.formationPulse * 1.9)),
      skew: 0,
    };
  }

  return {
    pressure: Math.max(0, Math.sin(next.formationPulse * 2.3 + 0.4)),
    compression: Math.abs(Math.sin(next.formationPulse * 1.7)),
    skew: Math.abs(Math.sin(next.formationPulse * 2.7)),
  };
}

function getTelegraphDuration(kind: EnemyKind) {
  switch (kind) {
    case "I":
      return 0.52;
    case "T":
      return 0.4;
    case "O":
      return 0.44;
    case "S":
    case "Z":
      return 0.34;
    case "L":
    case "J":
      return 0.3;
    case "APEX":
      return 0.24;
    default:
      return 0.32;
  }
}

function createTelegraphForEnemy(enemy: Enemy, playerCenterX: number, id: number): Telegraph[] {
  const anchorX = enemy.x + enemy.width / 2;
  const anchorY = enemy.y + enemy.height + 8;
  const ttl = getTelegraphDuration(enemy.kind);

  switch (enemy.kind) {
    case "I":
      return [
        {
          id,
          enemyId: enemy.id,
          enemyKind: enemy.kind,
          type: "beam",
          x: clamp(anchorX - 90, 18, BOARD_WIDTH - 180),
          y: anchorY,
          width: 180,
          height: 12,
          ttl,
        },
      ];
    case "T":
      return [
        {
          id,
          enemyId: enemy.id,
          enemyKind: enemy.kind,
          type: "fan",
          x: anchorX - 6,
          y: anchorY,
          width: 12,
          height: 64,
          ttl,
          angle: -26,
        },
        {
          id: id + 1,
          enemyId: enemy.id,
          enemyKind: enemy.kind,
          type: "fan",
          x: anchorX - 6,
          y: anchorY,
          width: 12,
          height: 76,
          ttl,
          angle: 0,
        },
        {
          id: id + 2,
          enemyId: enemy.id,
          enemyKind: enemy.kind,
          type: "fan",
          x: anchorX - 6,
          y: anchorY,
          width: 12,
          height: 64,
          ttl,
          angle: 26,
        },
      ];
    case "O":
      return [
        {
          id,
          enemyId: enemy.id,
          enemyKind: enemy.kind,
          type: "heavy",
          x: anchorX - 22,
          y: anchorY - 10,
          width: 44,
          height: 44,
          ttl,
        },
      ];
    case "S":
    case "Z":
      return [
        {
          id,
          enemyId: enemy.id,
          enemyKind: enemy.kind,
          type: "zigzag",
          x: anchorX - 8,
          y: anchorY,
          width: 16,
          height: 86,
          ttl,
          dir: enemy.kind === "S" ? 1 : -1,
        },
      ];
    case "L":
    case "J": {
      const direction = playerCenterX >= anchorX ? 1 : -1;

      return [
        {
          id,
          enemyId: enemy.id,
          enemyKind: enemy.kind,
          type: "dash",
          x: direction > 0 ? anchorX : anchorX - 88,
          y: enemy.y + enemy.height / 2 - 6,
          width: 88,
          height: 12,
          ttl,
          dir: direction,
        },
      ];
    }
    case "APEX":
      return [];
  }
}

function spawnEnemyBullets(state: GameState): Bullet[] {
  if (state.enemies.length === 0) return state.enemyBullets;

  const formation = getFormationPressure(state);
  const boardCenter = BOARD_WIDTH / 2;
  const shooters = [...state.enemies]
    .sort((left, right) => {
      const leftCenter = left.x + left.width / 2;
      const rightCenter = right.x + right.width / 2;
      const leftBias =
        state.waveTheme === "pulse"
          ? -Math.abs(leftCenter - boardCenter) * formation.compression
          : state.waveTheme === "apex"
            ? -Math.abs(leftCenter - boardCenter) * 0.2 +
              (left.id % 2 === 0 ? 24 * formation.skew : 0)
            : 0;
      const rightBias =
        state.waveTheme === "pulse"
          ? -Math.abs(rightCenter - boardCenter) * formation.compression
          : state.waveTheme === "apex"
            ? -Math.abs(rightCenter - boardCenter) * 0.2 +
              (right.id % 2 === 0 ? 24 * formation.skew : 0)
            : 0;
      return right.y + rightBias - (left.y + leftBias);
    })
    .slice(0, Math.min(state.waveTheme === "rookie" ? 3 : state.waveTheme === "pulse" ? 4 : 5, state.enemies.length));
  const picked = shooters[Math.floor(Math.random() * shooters.length)];

  if (!picked) return state.enemyBullets;

  const baseId = state.nextEntityId + 10000;

  if (picked.kind === "APEX") {
    const isRookieBoss = picked.bossTheme === "rookie";
    const isPulseBoss = picked.bossTheme === "pulse";
    const isSplitBoss = (picked.bossSplitGeneration ?? 0) > 0;
    const spread = isRookieBoss ? (isSplitBoss ? 56 : 48) : isPulseBoss ? (isSplitBoss ? 76 : 64) : isSplitBoss ? 92 : 82;
    const baseVy = isRookieBoss
      ? ENEMY_BULLET_SPEED + (isSplitBoss ? 36 : 22)
      : isPulseBoss
        ? ENEMY_BULLET_SPEED + (isSplitBoss ? 72 : 56)
        : ENEMY_BULLET_SPEED + (isSplitBoss ? 92 : 74);

    return [
      ...state.enemyBullets,
      {
        id: baseId,
        x: picked.x + picked.width / 2 - 6,
        y: picked.y + picked.height + 8,
        vx: -spread,
        vy: baseVy,
        width: isSplitBoss ? 12 : 10,
        height: isSplitBoss ? 24 : 22,
        damage: isSplitBoss ? 2 : 1,
        age: 0,
        sourceKind: "APEX",
      },
      ...(isRookieBoss
        ? [
            {
              id: baseId + 1,
              x: picked.x + picked.width / 2 - 6,
              y: picked.y + picked.height + 8,
              vx: spread,
              vy: baseVy,
              width: isSplitBoss ? 12 : 10,
              height: isSplitBoss ? 24 : 22,
              damage: isSplitBoss ? 2 : 1,
              age: 0,
              sourceKind: "APEX" as const,
            },
          ]
        : [
            {
              id: baseId + 1,
              x: picked.x + picked.width / 2 - 6,
              y: picked.y + picked.height + 8,
              vx: 0,
              vy: isPulseBoss ? baseVy + 34 : baseVy + 42,
              width: isSplitBoss ? 14 : 12,
              height: isSplitBoss ? 28 : 26,
              damage: isSplitBoss ? 2 : 1,
              age: 0,
              sourceKind: "APEX" as const,
            },
            {
              id: baseId + 2,
              x: picked.x + picked.width / 2 - 6,
              y: picked.y + picked.height + 8,
              vx: spread,
              vy: baseVy,
              width: isSplitBoss ? 12 : 10,
              height: isSplitBoss ? 24 : 22,
              damage: isSplitBoss ? 2 : 1,
              age: 0,
              sourceKind: "APEX" as const,
            },
            ...(picked.bossTheme === "apex"
              ? [
                  {
                    id: baseId + 3,
                    x: picked.x + picked.width / 2 - 6,
                    y: picked.y + picked.height + 8,
                    vx: -36,
                    vy: baseVy + 58,
                    width: 8,
                    height: 20,
                    damage: isSplitBoss ? 2 : 1,
                    age: 0,
                    sourceKind: "APEX" as const,
                  },
                  {
                    id: baseId + 4,
                    x: picked.x + picked.width / 2 - 6,
                    y: picked.y + picked.height + 8,
                    vx: 36,
                    vy: baseVy + 58,
                    width: 8,
                    height: 20,
                    damage: isSplitBoss ? 2 : 1,
                    age: 0,
                    sourceKind: "APEX" as const,
                  },
                ]
              : []),
          ]),
    ];
  }

  const anchorX = picked.x + picked.width / 2;
  const anchorY = picked.y + picked.height + 8;
  const speedBoost = picked.shootBias * 12;

  switch (picked.kind) {
    case "I":
      return [
        ...state.enemyBullets,
        {
          id: baseId,
          x: clamp(anchorX - 68, 18, BOARD_WIDTH - 154),
          y: anchorY,
          vx: 0,
          vy: 150,
          width: 136,
          height: 10,
          damage: 1,
          age: 0,
          sourceKind: "I",
        },
      ];
    case "T":
      return [
        ...state.enemyBullets,
        {
          id: baseId,
          x: anchorX - 5,
          y: anchorY,
          vx: -92,
          vy: ENEMY_BULLET_SPEED + 8,
          width: 10,
          height: 18,
          damage: 1,
          age: 0,
          sourceKind: "T",
        },
        {
          id: baseId + 1,
          x: anchorX - 6,
          y: anchorY - 2,
          vx: 0,
          vy: ENEMY_BULLET_SPEED + 28,
          width: 12,
          height: 22,
          damage: 1,
          age: 0,
          sourceKind: "T",
        },
        {
          id: baseId + 2,
          x: anchorX - 5,
          y: anchorY,
          vx: 92,
          vy: ENEMY_BULLET_SPEED + 8,
          width: 10,
          height: 18,
          damage: 1,
          age: 0,
          sourceKind: "T",
        },
      ];
    case "O":
      return [
        ...state.enemyBullets,
        {
          id: baseId,
          x: anchorX - 8,
          y: anchorY,
          vx: 0,
          vy: 155,
          width: 16,
          height: 26,
          damage: 2,
          age: 0,
          sourceKind: "O",
        },
      ];
    case "S":
    case "Z":
      return [
        ...state.enemyBullets,
        {
          id: baseId,
          x: anchorX - 6,
          y: anchorY,
          vx: picked.kind === "S" ? 28 : -28,
          vy: ENEMY_BULLET_SPEED - 10,
          width: 12,
          height: 18,
          damage: 1,
          age: 0,
          sourceKind: picked.kind,
          pattern: "zigzag",
          curveDir: picked.kind === "S" ? 1 : -1,
        },
      ];
    default:
      return [
        ...state.enemyBullets,
        {
          id: baseId,
          x: anchorX - 5,
          y: anchorY,
          vx: picked.kind === "L" ? 36 : picked.kind === "J" ? -36 : 0,
          vy: ENEMY_BULLET_SPEED + speedBoost,
          width: 10,
          height: 18,
          damage: 1,
          age: 0,
          sourceKind: picked.kind,
        },
      ];
  }
}

function getTelegraphImpactType(telegraphType: Telegraph["type"]) {
  return telegraphType === "beam"
    ? "laser"
    : telegraphType === "fan"
      ? "fan"
      : telegraphType === "heavy"
        ? "heavy"
        : "zigzag";
}

/**
 * Planifie un dash offensif d'un ennemi latéral et son télégraphe associé.
 */
export function queueEnemyDashAttack(next: GameState, playerCenterX: number) {
  if (next.waveTransition !== 0 || next.enemyDashCooldown !== 0) return;

  const formation = getFormationPressure(next);
  if (next.waveTheme === "rookie" && formation.pressure < 0.45) return;

  const dashers = next.enemies.filter((enemy) => enemy.kind === "L" || enemy.kind === "J");
  const pickedDasher = dashers[Math.floor(Math.random() * dashers.length)];

  if (!pickedDasher) return;

  next.telegraphs = [
    ...next.telegraphs,
    ...createTelegraphForEnemy(pickedDasher, playerCenterX, next.nextEntityId),
  ];
  next.nextEntityId += 1;
  next.enemyDashCooldown =
    next.waveTheme === "rookie"
      ? Math.max(1.6, 2.7 - next.wave * 0.035)
      : next.waveTheme === "pulse"
        ? Math.max(1.05, 2.1 - next.wave * 0.04)
        : Math.max(0.92, 1.85 - next.wave * 0.038);
  next.message = createMessage("pulse", "warning", "Dash offensif detecte. Decale-toi maintenant.");
  next.messageTimer = 2;
}

/**
 * Déplace la formation horizontale et gère la descente lorsqu'un bord est touché.
 */
export function advanceEnemyFormation(next: GameState, dt: number, slowMultiplier: number) {
  const canAdvanceFormation = next.waveTransition === 0;
  let touchedEdge = false;
  const enemyStep = next.formationSpeed * slowMultiplier * dt * next.formationDir;

  next.enemies = next.enemies.map((enemy) => {
    const { offsetX, offsetY } = getFormationOffsets(next, enemy);
    const futureX = enemy.x + (canAdvanceFormation ? enemyStep + offsetX * dt : 0);
    const futureY = enemy.y + (canAdvanceFormation ? offsetY * dt : 0);
    if (futureX <= 18 || futureX + enemy.width >= BOARD_WIDTH - 18) {
      touchedEdge = true;
    }

    return {
      ...enemy,
      x: canAdvanceFormation ? futureX : enemy.x,
      y: canAdvanceFormation ? futureY : enemy.y,
    };
  });

  if (!canAdvanceFormation || !touchedEdge) return;

  next.formationDir *= -1;
  next.enemies = next.enemies.map((enemy) => ({
    ...enemy,
    x: clamp(enemy.x, 18, BOARD_WIDTH - enemy.width - 18),
    y: enemy.y + (enemy.kind === "APEX" ? 18 : 22),
  }));
}

/**
 * Avance les projectiles ennemis, y compris les trajectoires zigzag.
 */
export function advanceEnemyProjectiles(next: GameState, dt: number, slowMultiplier: number) {
  next.enemyBullets = next.enemyBullets
    .map((bullet) => ({
      ...bullet,
      age: bullet.age + dt,
      x:
        bullet.x +
        bullet.vx * slowMultiplier * dt +
        (bullet.pattern === "zigzag"
          ? Math.sin((bullet.age + dt) * 11) * (bullet.curveDir ?? 1) * 90 * slowMultiplier * dt
          : 0),
      y: bullet.y + bullet.vy * slowMultiplier * dt,
    }))
    .filter((bullet) => bullet.y < BOARD_HEIGHT + 20);
}

/**
 * Sélectionne un tireur ennemi, émet un télégraphe puis prépare la salve réelle.
 */
export function queueEnemyFire(next: GameState, playerCenterX: number, slowMultiplier: number) {
  if (next.enemyShotCooldown !== 0 || next.enemies.length === 0 || next.waveTransition !== 0) return;

  const formation = getFormationPressure(next);
  const bosses = next.enemies.filter((enemy) => enemy.kind === "APEX");

  const shooters =
    bosses.length > 0
      ? bosses
      : next.enemies
          .filter((enemy) => enemy.kind !== "L" && enemy.kind !== "J")
          .sort((left, right) => right.y - left.y)
          .slice(
            0,
            Math.min(
              next.waveTheme === "rookie" ? 3 : next.waveTheme === "pulse" ? 4 : 5,
              next.enemies.length
            )
          );
  const pickedShooter = shooters[Math.floor(Math.random() * shooters.length)];

  if (pickedShooter) {
    const telegraphs = createTelegraphForEnemy(pickedShooter, playerCenterX, next.nextEntityId);
    next.telegraphs = [...next.telegraphs, ...telegraphs];
    next.nextEntityId += telegraphs.length;
  } else {
    next.enemyBullets = spawnEnemyBullets(next);
  }

  const baseCooldown =
    bosses.length > 0
      ? Math.max(
          0.14,
          (pickedShooter?.bossTheme === "rookie"
            ? 0.52
            : pickedShooter?.bossTheme === "pulse"
              ? 0.38
              : 0.28) -
            (pickedShooter?.bossSplitGeneration === 0 ? 0 : 0.08)
        )
      : next.waveTheme === "rookie"
        ? Math.max(0.72, 1.95 - next.wave * 0.028)
        : next.waveTheme === "pulse"
          ? Math.max(0.46, 1.62 - next.wave * 0.04 - formation.compression * 0.2)
          : Math.max(0.34, 1.36 - next.wave * 0.038 - formation.skew * 0.24);
  next.enemyShotCooldown = baseCooldown / slowMultiplier;
}

/**
 * Convertit les télégraphes expirés en vraies attaques et en effets d'impact.
 */
export function applyReadyTelegraphs(next: GameState, playerCenterX: number) {
  const readyTelegraphs = next.telegraphs.filter((telegraph) => telegraph.ttl <= 0);
  if (readyTelegraphs.length === 0) return;

  next.telegraphs = next.telegraphs.filter((telegraph) => telegraph.ttl > 0);

  for (const telegraph of readyTelegraphs) {
    const enemy = next.enemies.find((candidate) => candidate.id === telegraph.enemyId);
    if (!enemy) continue;

    if (telegraph.type === "dash") {
      const enemyCenterX = enemy.x + enemy.width / 2;
      const direction = telegraph.dir ?? (playerCenterX >= enemyCenterX ? 1 : -1);
      const dashDistance = enemy.kind === "L" ? 28 : 22;
      next.enemies = next.enemies.map((candidate) =>
        candidate.id !== enemy.id
          ? candidate
          : {
              ...candidate,
              x: clamp(candidate.x + direction * dashDistance, 18, BOARD_WIDTH - candidate.width - 18),
              y: candidate.y + 8,
            }
      );
      next.impacts = [
        ...next.impacts,
        createImpact(
          next.nextEntityId,
          enemyCenterX + direction * 36,
          enemy.y + enemy.height / 2,
          "dash",
          54,
          0.24
        ),
      ];
      next.nextEntityId += 1;
      continue;
    }

    next.enemyBullets = spawnEnemyBullets({ ...next, enemies: [enemy] });
    next.impacts = [
      ...next.impacts,
      createImpact(
        next.nextEntityId,
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height + 10,
        getTelegraphImpactType(telegraph.type),
        telegraph.type === "heavy" ? 42 : telegraph.type === "beam" ? 72 : 30,
        0.22
      ),
    ];
    next.nextEntityId += 1;
  }
}
