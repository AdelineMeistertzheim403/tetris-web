import {
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
} from "../model";
import type { Bullet, Enemy, EnemyKind, GameState } from "../model";
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
    })),
    nextId: state.nextEntityId + specs.length,
    cooldown:
      state.weaponPowerup === "laser"
        ? Math.max(0.07, PLAYER_SHOT_COOLDOWN - (state.weaponLevel - 1) * 0.025)
        : state.weaponPowerup === "charge"
          ? (isCharged ? 0.28 : 0.18)
          : Math.max(0.09, PLAYER_SHOT_COOLDOWN - (state.weaponLevel - 1) * 0.015),
  };
}

/**
 * Avance uniquement les projectiles du joueur.
 * La résolution des collisions est volontairement séparée pour garder un tick lisible.
 */
export function advancePlayerProjectiles(next: GameState, dt: number) {
  next.playerBullets = next.playerBullets
    .map((bullet) => ({
      ...bullet,
      age: bullet.age + dt,
      x: bullet.x + bullet.vx * dt,
      y: bullet.y + bullet.vy * dt,
    }))
    .filter((bullet) => bullet.y + bullet.height > 0);
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
  next.lineBursts += lineGain;
  next.weaponLevel = Math.min(MAX_WEAPON_LEVEL, next.weaponLevel + lineGain);
  if (lineGain > 0) {
    next.weaponPowerup = getNextWeaponPowerup(next.lineBursts + lineGain);
    next.slowFieldTimer = Math.max(next.slowFieldTimer, 4 + lineGain * 1.5);
    next.chargeCounter = 0;
  }
  next.flashTimer = 0.35;
  next.message = createMessage("pulse", "success", getBombMessage(next.weaponPowerup, lineGain));
  next.messageTimer = 3.2;
}

/**
 * Résout les collisions entre tirs joueurs et ennemis,
 * puis applique score, combo, scrap grid et progression d'arme.
 */
export function resolvePlayerHits(next: GameState) {
  const damagedEnemies = new Map<number, Enemy>();
  const consumedEnemyIds = new Set<number>();
  let scrapGrid = next.scrapGrid;
  let lineBursts = next.lineBursts;
  let score = next.score;
  let weaponLevel = next.weaponLevel;
  let weaponPowerup = next.weaponPowerup;
  let kills = next.kills;
  let combo = next.combo;
  let comboTimer = next.comboTimer;
  let maxCombo = next.maxCombo;
  const bulletsToKeep: Bullet[] = [];

  for (const bullet of next.playerBullets) {
    const hitEnemyIndex = next.enemies.findIndex((enemy) => overlaps(bullet, enemy));

    if (hitEnemyIndex === -1) {
      bulletsToKeep.push(bullet);
      continue;
    }

    const enemy = next.enemies[hitEnemyIndex];
    consumedEnemyIds.add(enemy.id);
    const damaged = { ...enemy, hp: enemy.hp - bullet.damage };

    if (damaged.hp > 0) {
      damagedEnemies.set(enemy.id, damaged);
      if ((bullet.remainingHits ?? 0) > 0) {
        bulletsToKeep.push({
          ...bullet,
          remainingHits: (bullet.remainingHits ?? 0) - 1,
        });
      }
      continue;
    }

    score += enemy.points;
    kills += 1;
    combo += 1;
    comboTimer = 2.1;
    maxCombo = Math.max(maxCombo, combo);
    const outcome = addScrapFromEnemy(scrapGrid, enemy);
    scrapGrid = outcome.grid;
    if (outcome.clearedRows > 0) {
      lineBursts += outcome.clearedRows;
      weaponLevel = Math.min(MAX_WEAPON_LEVEL, weaponLevel + outcome.clearedRows);
      weaponPowerup = getNextWeaponPowerup(lineBursts);
      next.slowFieldTimer = Math.max(next.slowFieldTimer, 4 + outcome.clearedRows * 1.5);
      next.chargeCounter = 0;
      score += outcome.clearedRows * 500 + combo * 35;
      next.flashTimer = 0.28;
      next.message = createMessage("pulse", "success", getLineBurstMessage(weaponPowerup, outcome.clearedRows));
      next.messageTimer = 3.3;
    } else if (enemy.kind === "APEX") {
      next.message = createMessage("apex", "boss", "Pas mal. La coque du boss vient de ceder.");
      next.messageTimer = 2.4;
    }
    next.impacts = [
      ...next.impacts,
      createImpact(
        next.nextEntityId,
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        "enemy-break",
        34,
        0.32
      ),
    ];
    next.nextEntityId += 1;
  }

  next.playerBullets = bulletsToKeep;
  next.enemies = next.enemies
    .filter((enemy) => !consumedEnemyIds.has(enemy.id))
    .concat(Array.from(damagedEnemies.values()))
    .filter((enemy) => enemy.hp > 0);
  next.scrapGrid = scrapGrid;
  next.lineBursts = lineBursts;
  next.score = score;
  next.weaponLevel = weaponLevel;
  next.weaponPowerup = weaponPowerup;
  next.kills = kills;
  next.combo = combo;
  next.comboTimer = comboTimer;
  next.maxCombo = maxCombo;
}
