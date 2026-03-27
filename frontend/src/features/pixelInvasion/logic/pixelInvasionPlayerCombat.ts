import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOMB_COOLDOWN,
  MAX_WEAPON_LEVEL,
  PLAYER_BULLET_SPEED,
  PLAYER_MUZZLE_OFFSET_X,
  PLAYER_MUZZLE_OFFSET_Y,
  PLAYER_SHOT_COOLDOWN,
  PLAYER_Y,
  SCRAP_COLS,
  SCRAP_ROWS,
  SHAPES,
  clamp,
  createMessage,
  getPowerupLabel,
} from "../model";
import type { Bullet, Drop, Enemy, EnemyKind, GameState, PickupType } from "../model";
import { createImpact, overlaps } from "./pixelInvasionCore";
import {
  getBombMessage,
  getLineBurstMessage,
  getNextWeaponPowerup,
} from "./pixelInvasionMessages";

function addScrapFromEnemy(
  grid: Array<Array<string | null>>,
  enemy: Enemy
): { grid: Array<Array<string | null>>; clearedRows: number } {
  const next = grid.map((row) => [...row]);
  const blocks =
    enemy.kind === "APEX"
      ? 10
      : SHAPES[enemy.kind as Exclude<EnemyKind, "APEX">]
          .flat()
          .filter(Boolean).length;
  const baseColumn = clamp(
    Math.floor(((enemy.x + enemy.width / 2) / BOARD_WIDTH) * SCRAP_COLS),
    0,
    SCRAP_COLS - 1
  );

  for (let index = 0; index < blocks; index += 1) {
    const column = clamp(baseColumn + ((index % 3) - 1), 0, SCRAP_COLS - 1);
    let placed = false;

    for (let row = SCRAP_ROWS - 1; row >= 0; row -= 1) {
      if (!next[row][column]) {
        next[row][column] = enemy.color;
        placed = true;
        break;
      }
    }

    if (!placed) {
      for (let row = SCRAP_ROWS - 1; row >= 0; row -= 1) {
        const fallbackColumn = (column + row + index) % SCRAP_COLS;
        if (!next[row][fallbackColumn]) {
          next[row][fallbackColumn] = enemy.color;
          break;
        }
      }
    }
  }

  const clearedRows = next.filter((row) => row.every(Boolean)).length;
  const remaining = next.filter((row) => !row.every(Boolean));
  const missingRows = SCRAP_ROWS - remaining.length;
  const rebuilt = [
    ...Array.from({ length: missingRows }, () => Array.from({ length: SCRAP_COLS }, () => null)),
    ...remaining,
  ];

  return { grid: rebuilt, clearedRows: Math.max(0, clearedRows) };
}

const ENEMY_BUCKET = 120;

function bucketKey(x: number, y: number) {
  return `${x}:${y}`;
}

function buildEnemySpatialIndex(enemies: Enemy[]) {
  const buckets = new Map<string, Enemy[]>();

  for (const enemy of enemies) {
    const minX = Math.floor(enemy.x / ENEMY_BUCKET);
    const maxX = Math.floor((enemy.x + enemy.width) / ENEMY_BUCKET);
    const minY = Math.floor(enemy.y / ENEMY_BUCKET);
    const maxY = Math.floor((enemy.y + enemy.height) / ENEMY_BUCKET);

    for (let by = minY; by <= maxY; by += 1) {
      for (let bx = minX; bx <= maxX; bx += 1) {
        const key = bucketKey(bx, by);
        const current = buckets.get(key);
        if (current) {
          current.push(enemy);
        } else {
          buckets.set(key, [enemy]);
        }
      }
    }
  }

  return buckets;
}

function getEnemyCollisionBox(enemy: Enemy) {
  const insetX = Math.min(6, enemy.width * 0.08);
  const insetY = Math.min(6, enemy.height * 0.18);

  return {
    x: enemy.x + insetX,
    y: enemy.y + insetY,
    width: Math.max(8, enemy.width - insetX * 2),
    height: Math.max(8, enemy.height - insetY * 2),
  };
}

function getOverlapCenter(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  if (right <= left || bottom <= top) {
    return null;
  }

  return {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
  };
}

function findBulletCollision(
  bullet: Bullet,
  buckets: Map<string, Enemy[]>,
  enemiesById: Map<number, Enemy>,
  consumedEnemyIds: Set<number>
) {
  const minX = Math.floor(bullet.x / ENEMY_BUCKET);
  const maxX = Math.floor((bullet.x + bullet.width) / ENEMY_BUCKET);
  const minY = Math.floor(bullet.y / ENEMY_BUCKET);
  const maxY = Math.floor((bullet.y + bullet.height) / ENEMY_BUCKET);
  const seen = new Set<number>();

  for (let by = minY; by <= maxY; by += 1) {
    for (let bx = minX; bx <= maxX; bx += 1) {
      const candidates = buckets.get(bucketKey(bx, by));
      if (!candidates) continue;

      for (const candidate of candidates) {
        if (seen.has(candidate.id) || consumedEnemyIds.has(candidate.id)) continue;
        seen.add(candidate.id);

        const liveEnemy = enemiesById.get(candidate.id);
        if (!liveEnemy) continue;
        if (overlaps(bullet, getEnemyCollisionBox(liveEnemy))) {
          return liveEnemy;
        }
      }
    }
  }

  return null;
}

function createSplitBossChildren(enemy: Enemy, nextId: number): Enemy[] {
  if (enemy.kind !== "APEX" || enemy.bossSplitGeneration !== 0 || !enemy.bossTheme) return [];

  return [
    {
      ...enemy,
      id: nextId,
      bossSplitGeneration: 1,
      width: 92,
      height: 62,
      hp: Math.max(18, enemy.maxHp * 0.54),
      maxHp: Math.max(18, enemy.maxHp * 0.54),
      points: Math.floor(enemy.points * 0.58),
      shootBias: enemy.shootBias + 0.6,
      x: clamp(enemy.x - 34, 18, BOARD_WIDTH - 92 - 18),
      y: Math.max(54, enemy.y + 8),
    },
    {
      ...enemy,
      id: nextId + 1,
      bossSplitGeneration: 1,
      width: 92,
      height: 62,
      hp: Math.max(18, enemy.maxHp * 0.54),
      maxHp: Math.max(18, enemy.maxHp * 0.54),
      points: Math.floor(enemy.points * 0.58),
      shootBias: enemy.shootBias + 0.6,
      x: clamp(enemy.x + enemy.width - 58, 18, BOARD_WIDTH - 92 - 18),
      y: Math.max(54, enemy.y + 8),
    },
  ];
}

function addMissedDropToScrap(
  grid: Array<Array<string | null>>,
  drop: Drop
): Array<Array<string | null>> {
  const next = grid.map((row) => [...row]);
  const column = clamp(
    Math.floor(((drop.x + drop.width / 2) / BOARD_WIDTH) * SCRAP_COLS),
    0,
    SCRAP_COLS - 1
  );

  for (let row = SCRAP_ROWS - 1; row >= 0; row -= 1) {
    if (!next[row][column]) {
      next[row][column] = drop.type === "slow_field" ? "#50e985" : "#93b7ff";
      return next;
    }
  }

  return next;
}

function getRewardDropType(next: GameState, sequence: number): PickupType {
  const rookieTable: PickupType[] = ["multi_shot", "multi_shot", "laser", "slow_field"];
  const pulseTable: PickupType[] = ["laser", "piercing", "laser", "charge"];
  const apexTable: PickupType[] = ["piercing", "charge", "laser", "charge", "slow_field"];
  const standardTable: PickupType[] = ["multi_shot", "laser", "piercing", "charge", "slow_field"];

  const themedDrop =
    next.waveTheme === "rookie"
      ? rookieTable[(next.lineBursts + sequence - 1) % rookieTable.length]
      : next.waveTheme === "pulse"
        ? pulseTable[(next.lineBursts + sequence - 1) % pulseTable.length]
        : next.waveTheme === "apex"
          ? apexTable[(next.lineBursts + sequence - 1) % apexTable.length]
          : standardTable[(next.lineBursts + sequence - 1) % standardTable.length];
  const rotated = themedDrop ?? getNextWeaponPowerup(next.lineBursts + sequence);

  if (rotated === "slow_field" && (next.wave < 6 || next.waveTheme === "rookie")) {
    return "multi_shot";
  }

  if (rotated === "charge" && next.wave < 4) {
    return "laser";
  }

  if (rotated === "multi_shot" && next.weaponLevel >= 3 && next.waveTheme === "pulse") {
    return "piercing";
  }

  if (rotated === "laser" && next.waveTheme === "apex" && next.wave >= 18) {
    return "charge";
  }

  return rotated;
}

function getDropImpactType(dropType: PickupType) {
  switch (dropType) {
    case "multi_shot":
      return "fan";
    case "laser":
      return "laser";
    case "piercing":
      return "heavy";
    case "charge":
      return "dash";
    case "slow_field":
      return "zigzag";
  }
}

function getPlayerShotImpactType(bullet: Bullet) {
  switch (bullet.visualType) {
    case "laser":
      return "player-laser";
    case "piercing":
      return "player-piercing";
    case "charge":
      return "player-charge";
    default:
      return "player-standard";
  }
}

function createDrop(id: number, type: PickupType, x: number, y: number): Drop {
  return {
    id,
    type,
    x: clamp(x - 16, 18, BOARD_WIDTH - 50),
    y: clamp(y - 16, 18, BOARD_HEIGHT - 220),
    width: 32,
    height: 32,
    vy: 92,
  };
}

function maybeReleaseQueuedDrop(next: GameState) {
  if (next.drops.length > 0 || next.queuedDrops.length === 0) return;

  const [queued, ...rest] = next.queuedDrops;
  next.drops = [createDrop(next.nextEntityId, queued.type, queued.x, queued.y)];
  next.queuedDrops = rest;
  next.nextEntityId += 1;
}

function spawnRewardDrops(
  next: GameState,
  count: number,
  x: number,
  y: number
): PickupType | null {
  let latestDrop: PickupType | null = null;
  const queuedDrops = [...next.queuedDrops];

  for (let index = 0; index < count; index += 1) {
    const nextDrop = getRewardDropType(next, index + 1);
    queuedDrops.push({
      type: nextDrop,
      x: x + (index - (count - 1) / 2) * 36,
      y: y - Math.min(28, index * 10),
    });
    latestDrop = nextDrop;
  }

  next.queuedDrops = queuedDrops;
  maybeReleaseQueuedDrop(next);
  return latestDrop;
}

function createPlayerShotPattern(
  state: GameState
): { bullets: Bullet[]; nextId: number; cooldown: number } {
  const anchorX = state.playerX + PLAYER_MUZZLE_OFFSET_X;
  const anchorY = PLAYER_Y + PLAYER_MUZZLE_OFFSET_Y;
  const isCharged = state.weaponPowerup === "charge" && state.chargeCounter >= 3;
  const specs =
    state.weaponPowerup === "laser"
      ? [
          {
            offsetX: 0,
            vx: 0,
            damage: 2 + (state.weaponLevel >= 3 ? 1 : 0),
            width: 12,
            height: 32,
            remainingHits: 0,
          },
        ]
      : state.weaponPowerup === "piercing"
        ? [
            {
              offsetX: 0,
              vx: 0,
              damage: 1 + (state.weaponLevel >= 4 ? 1 : 0),
              width: 10,
              height: 24,
              remainingHits: 2 + Math.floor(state.weaponLevel / 2),
            },
          ]
        : state.weaponPowerup === "charge"
          ? [
              {
                offsetX: 0,
                vx: 0,
                damage: isCharged ? 4 : 1 + (state.weaponLevel >= 3 ? 1 : 0),
                width: isCharged ? 18 : 10,
                height: isCharged ? 34 : 22,
                remainingHits: isCharged ? 1 : 0,
              },
            ]
          : state.weaponLevel >= MAX_WEAPON_LEVEL
            ? [
                { offsetX: -18, vx: -60, damage: 1, width: 8, height: 20, remainingHits: 0 },
                { offsetX: -6, vx: -18, damage: 1, width: 8, height: 20, remainingHits: 0 },
                { offsetX: 6, vx: 18, damage: 1, width: 8, height: 20, remainingHits: 0 },
                { offsetX: 18, vx: 60, damage: 1, width: 8, height: 20, remainingHits: 0 },
              ]
            : state.weaponLevel === 3
              ? [
                  { offsetX: -14, vx: -48, damage: 1, width: 8, height: 20, remainingHits: 0 },
                  { offsetX: 0, vx: 0, damage: 2, width: 8, height: 20, remainingHits: 0 },
                  { offsetX: 14, vx: 48, damage: 1, width: 8, height: 20, remainingHits: 0 },
                ]
              : state.weaponLevel === 2
                ? [
                    { offsetX: -8, vx: -12, damage: 1, width: 8, height: 20, remainingHits: 0 },
                    { offsetX: 8, vx: 12, damage: 1, width: 8, height: 20, remainingHits: 0 },
                  ]
                : [{ offsetX: 0, vx: 0, damage: 1, width: 8, height: 20, remainingHits: 0 }];

  return {
    bullets: specs.map((spec, index) => ({
      id: state.nextEntityId + index,
      x: anchorX + spec.offsetX - 4,
      y: anchorY,
      vx: spec.vx,
      vy: -PLAYER_BULLET_SPEED,
      width: spec.width,
      height: spec.height,
      damage: spec.damage,
      age: 0,
      sourceKind: "PLAYER",
      remainingHits: spec.remainingHits,
      visualType:
        state.weaponPowerup === "multi_shot" ? "standard" : state.weaponPowerup,
    })),
    nextId: state.nextEntityId + specs.length,
    cooldown:
      state.weaponPowerup === "laser"
        ? Math.max(0.16, PLAYER_SHOT_COOLDOWN - (state.weaponLevel - 1) * 0.015)
        : state.weaponPowerup === "charge"
          ? (isCharged ? 0.36 : 0.24)
          : Math.max(0.18, PLAYER_SHOT_COOLDOWN - (state.weaponLevel - 1) * 0.01),
  };
}

/**
 * Avance uniquement les projectiles du joueur.
 * La résolution des collisions est volontairement séparée pour garder un tick lisible.
 */
export function advancePlayerProjectiles(next: GameState, dt: number) {
  maybeReleaseQueuedDrop(next);
  next.playerBullets = next.playerBullets
    .map((bullet) => ({
      ...bullet,
      age: bullet.age + dt,
      x: bullet.x + bullet.vx * dt,
      y: bullet.y + bullet.vy * dt,
    }))
    .filter((bullet) => bullet.y + bullet.height > 0);
  const movedDrops = next.drops.map((drop) => ({
    ...drop,
    y: drop.y + drop.vy * dt,
  }));

  const keptDrops: Drop[] = [];

  for (const drop of movedDrops) {
    if (drop.y >= BOARD_HEIGHT + 16) {
      next.scrapGrid = addMissedDropToScrap(next.scrapGrid, drop);
      next.impacts = [
        ...next.impacts,
        createImpact(
          next.nextEntityId,
          drop.x + drop.width / 2,
          Math.min(BOARD_HEIGHT - 18, drop.y + drop.height / 2),
          getDropImpactType(drop.type),
          22,
          0.22
        ),
      ];
      next.nextEntityId += 1;
      next.flashTimer = Math.max(next.flashTimer, 0.12);
      next.message = createMessage(
        "rookie",
        "warning",
        `Module ${getPowerupLabel(drop.type)} perdu. Il tombe dans la scrap grid.`
      );
      next.messageTimer = 2.4;
      continue;
    }

    if (drop.y < BOARD_HEIGHT + 48) {
      keptDrops.push(drop);
    }
  }

  next.drops = keptDrops;
  maybeReleaseQueuedDrop(next);
}

export function attractDrops(
  next: GameState,
  playerBox: { x: number; y: number; width: number; height: number },
  dt: number
) {
  const playerCenterX = playerBox.x + playerBox.width / 2;
  const playerCenterY = playerBox.y + playerBox.height / 2;

  next.drops = next.drops.map((drop) => {
    const dropCenterX = drop.x + drop.width / 2;
    const dropCenterY = drop.y + drop.height / 2;
    const dx = playerCenterX - dropCenterX;
    const dy = playerCenterY - dropCenterY;
    const distance = Math.hypot(dx, dy);

    if (distance > 168) return drop;

    const pull = distance < 72 ? 340 : 190;
    const normalizedDistance = Math.max(0.2, 1 - distance / 168);
    const strength = pull * normalizedDistance * dt;

    return {
      ...drop,
      x: drop.x + (dx / Math.max(distance, 1)) * strength,
      y: drop.y + (dy / Math.max(distance, 1)) * strength,
    };
  });
}

/**
 * Construit la salve active selon le power-up, le niveau d'arme et l'état de charge.
 */
export function firePlayerWeapon(next: GameState) {
  const shotPattern = createPlayerShotPattern(next);
  next.playerBullets = [...next.playerBullets, ...shotPattern.bullets];
  next.nextEntityId = shotPattern.nextId;
  next.shotCooldown = shotPattern.cooldown;
  if (next.weaponPowerup === "charge") {
    next.chargeCounter = next.chargeCounter >= 3 ? 0 : next.chargeCounter + 1;
  }
}

/**
 * Déclenche la bombe écran du joueur, nettoie la plupart des ennemis
 * et applique les récompenses issues des lignes remplies.
 */
export function applyBomb(next: GameState) {
  const survivors = next.enemies.filter((enemy) => enemy.kind === "APEX").map((enemy) => ({
    ...enemy,
    hp: Math.max(1, enemy.hp - 6),
  }));
  const removed = next.enemies.filter((enemy) => enemy.kind !== "APEX");
  let scoreGain = 0;
  let lineGain = 0;
  let scrap = next.scrapGrid;

  for (const enemy of removed) {
    scoreGain += enemy.points;
    const outcome = addScrapFromEnemy(scrap, enemy);
    scrap = outcome.grid;
    lineGain += outcome.clearedRows;
  }

  next.enemies = survivors;
  next.enemyBullets = [];
  next.playerBullets = [];
  next.bombs -= 1;
  next.bombCooldown = BOMB_COOLDOWN;
  next.score += scoreGain + lineGain * 450;
  const dropType =
    lineGain > 0 ? spawnRewardDrops(next, lineGain, BOARD_WIDTH / 2, BOARD_HEIGHT * 0.54) : null;
  next.lineBursts += lineGain;
  if (lineGain > 0) {
    next.flashTimer = 0.35;
    next.hitStopTimer = Math.max(next.hitStopTimer, 0.045);
    next.boardShakeTimer = Math.max(next.boardShakeTimer, 0.22);
    next.lineBurstFxTimer = Math.max(next.lineBurstFxTimer, 0.24);
    next.message = createMessage(
      "pulse",
      "success",
      getBombMessage(dropType ?? "multi_shot", lineGain)
    );
    next.messageTimer = 3.2;
  } else {
    next.flashTimer = 0.35;
    next.message = createMessage("pulse", "success", getBombMessage("multi_shot", lineGain));
    next.messageTimer = 3.2;
  }
}

/**
 * Résout les collisions entre tirs joueurs et ennemis,
 * puis applique score, combo, scrap grid et progression d'arme.
 */
export function resolvePlayerHits(next: GameState) {
  const damagedEnemies = new Map<number, Enemy>();
  const consumedEnemyIds = new Set<number>();
  const liveEnemiesById = new Map(next.enemies.map((enemy) => [enemy.id, enemy]));
  const spatialIndex = buildEnemySpatialIndex(next.enemies);
  const spawnedEnemies: Enemy[] = [];
  let scrapGrid = next.scrapGrid;
  let lineBursts = next.lineBursts;
  let score = next.score;
  let kills = next.kills;
  let combo = next.combo;
  let comboTimer = next.comboTimer;
  let maxCombo = next.maxCombo;
  const bulletsToKeep: Bullet[] = [];
  const impacts = [...next.impacts];

  for (const bullet of next.playerBullets) {
    const enemy = findBulletCollision(bullet, spatialIndex, liveEnemiesById, consumedEnemyIds);

    if (!enemy) {
      bulletsToKeep.push(bullet);
      continue;
    }

    consumedEnemyIds.add(enemy.id);
    const enemyCollisionBox = getEnemyCollisionBox(enemy);
    const overlapCenter = getOverlapCenter(bullet, enemyCollisionBox);
    const appliedDamage = enemy.kind === "APEX" ? bullet.damage * 0.42 : bullet.damage;
    const damaged = { ...enemy, hp: enemy.hp - appliedDamage };
    impacts.push(
      createImpact(
        next.nextEntityId,
        overlapCenter?.x ?? enemy.x + enemy.width / 2,
        overlapCenter?.y ?? enemy.y + enemy.height / 2,
        getPlayerShotImpactType(bullet),
        bullet.visualType === "charge" ? 30 : bullet.visualType === "laser" ? 24 : 20,
        bullet.visualType === "charge" ? 0.28 : 0.2
      )
    );
    next.nextEntityId += 1;

    if (damaged.hp > 0) {
      damagedEnemies.set(enemy.id, damaged);
      liveEnemiesById.set(enemy.id, damaged);
      if ((bullet.remainingHits ?? 0) > 0) {
        bulletsToKeep.push({
          ...bullet,
          remainingHits: (bullet.remainingHits ?? 0) - 1,
        });
      }
      continue;
    }

    liveEnemiesById.delete(enemy.id);

    if (enemy.kind === "APEX" && enemy.bossSplitGeneration === 0) {
      const splitChildren = createSplitBossChildren(enemy, next.nextEntityId);
      if (splitChildren.length > 0) {
        next.nextEntityId += splitChildren.length;
        spawnedEnemies.push(...splitChildren);
        impacts.push(
          createImpact(
            next.nextEntityId,
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            "dash",
            42,
            0.26
          )
        );
        next.nextEntityId += 1;
        next.hitStopTimer = Math.max(next.hitStopTimer, 0.028);
        next.boardShakeTimer = Math.max(next.boardShakeTimer, 0.14);
        next.flashTimer = Math.max(next.flashTimer, 0.16);
        next.message = createMessage(
          enemy.bossTheme === "rookie" ? "rookie" : enemy.bossTheme === "pulse" ? "pulse" : "apex",
          "warning",
          "Le boss se scinde. Deux signatures secondaires detectees."
        );
        next.messageTimer = 2.8;
        continue;
      }
    }

    score += enemy.points;
    kills += 1;
    combo += 1;
    comboTimer = 2.1;
    maxCombo = Math.max(maxCombo, combo);
    const outcome = addScrapFromEnemy(scrapGrid, enemy);
    scrapGrid = outcome.grid;
    if (outcome.clearedRows > 0) {
      const latestDrop = spawnRewardDrops(
        next,
        outcome.clearedRows,
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2
      );
      lineBursts += outcome.clearedRows;
      score += outcome.clearedRows * 500 + combo * 35;
      next.flashTimer = Math.max(next.flashTimer, 0.18);
      next.hitStopTimer = Math.max(next.hitStopTimer, 0.018);
      next.boardShakeTimer = Math.max(next.boardShakeTimer, 0.1);
      next.lineBurstFxTimer = Math.max(next.lineBurstFxTimer, 0.16);
      next.message = createMessage(
        "pulse",
        "success",
        getLineBurstMessage(latestDrop ?? "multi_shot", outcome.clearedRows)
      );
      next.messageTimer = 3.3;
    } else if (enemy.kind === "APEX") {
      next.message = createMessage("apex", "boss", "Pas mal. La coque du boss vient de ceder.");
      next.messageTimer = 2.4;
    }
    next.hitStopTimer = Math.max(next.hitStopTimer, enemy.kind === "APEX" ? 0.045 : 0.022);
    next.boardShakeTimer = Math.max(next.boardShakeTimer, enemy.kind === "APEX" ? 0.2 : 0.1);
    impacts.push(
      createImpact(
        next.nextEntityId,
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        "enemy-break",
        34,
        0.32
      )
    );
    next.nextEntityId += 1;
  }

  next.playerBullets = bulletsToKeep;
  next.impacts = impacts;
  next.enemies = next.enemies
    .filter((enemy) => !consumedEnemyIds.has(enemy.id))
    .concat(Array.from(damagedEnemies.values()))
    .concat(spawnedEnemies)
    .filter((enemy) => enemy.hp > 0);
  next.scrapGrid = scrapGrid;
  next.lineBursts = lineBursts;
  next.score = score;
  next.kills = kills;
  next.combo = combo;
  next.comboTimer = comboTimer;
  next.maxCombo = maxCombo;
}

/**
 * Active les drops touchés par le vaisseau. L'effet n'est appliqué
 * qu'au moment de la récupération visuelle.
 */
export function resolveDropCollection(
  next: GameState,
  playerBox: { x: number; y: number; width: number; height: number }
) {
  next.drops = next.drops.filter((drop) => {
    if (!overlaps(drop, playerBox)) return true;

    if (drop.type === "slow_field") {
      next.slowFieldTimer = Math.max(next.slowFieldTimer, 6);
      next.flashTimer = Math.max(next.flashTimer, 0.2);
      next.message = createMessage(
        "pulse",
        "success",
        "Champ ralenti recupere. Les Tetrobots perdent du rythme."
      );
      next.messageTimer = 2.8;
    } else {
      next.weaponPowerup = drop.type;
      next.weaponLevel = Math.min(MAX_WEAPON_LEVEL, next.weaponLevel + 1);
      next.chargeCounter = 0;
      next.message = createMessage(
        drop.type === "charge" ? "apex" : drop.type === "multi_shot" ? "rookie" : "pulse",
        "success",
        `${getPowerupLabel(drop.type)} recupere. Tir niveau ${next.weaponLevel}.`
      );
      next.messageTimer = 2.8;
      next.flashTimer = Math.max(
        next.flashTimer,
        drop.type === "charge" ? 0.34 : drop.type === "piercing" ? 0.26 : 0.18
      );
    }

    next.impacts = [
      ...next.impacts,
      createImpact(
        next.nextEntityId,
        drop.x + drop.width / 2,
        drop.y + drop.height / 2,
        getDropImpactType(drop.type),
        drop.type === "charge" ? 30 : drop.type === "piercing" ? 28 : 24,
        0.24
      ),
    ];
    next.nextEntityId += 1;
    return false;
  });
  maybeReleaseQueuedDrop(next);
}
