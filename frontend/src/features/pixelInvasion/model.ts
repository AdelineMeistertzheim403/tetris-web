import type { CSSProperties } from "react";

/** Dimensions et réglages de base du terrain de jeu Pixel Invasion. */
export const BOARD_WIDTH = 1440;
export const BOARD_HEIGHT = 750;
export const PLAYER_WIDTH = 144;
export const PLAYER_HEIGHT = 104;
export const PLAYER_Y = BOARD_HEIGHT - 118;
export const PLAYER_HITBOX_WIDTH = 68;
export const PLAYER_HITBOX_HEIGHT = 46;
export const PLAYER_MUZZLE_OFFSET_X = PLAYER_WIDTH / 2;
export const PLAYER_MUZZLE_OFFSET_Y = 14;
export const SCRAP_ROWS = 8;
export const SCRAP_COLS = 10;
export const SCRAP_CELL = 22;
export const SCRAP_HEIGHT = SCRAP_ROWS * SCRAP_CELL;
export const SCRAP_TOP = BOARD_HEIGHT - SCRAP_HEIGHT - 16;
export const GAME_LOOP_MS = 1000 / 60;
export const PLAYER_SPEED = 520;
export const PLAYER_BULLET_SPEED = 620;
export const ENEMY_BULLET_SPEED = 280;
export const PLAYER_SHOT_COOLDOWN = 0.22;
export const DASH_DISTANCE = 260;
export const DASH_COOLDOWN = 1.4;
export const BOMB_COOLDOWN = 10;
export const MAX_BOMBS = 2;
export const MAX_WEAPON_LEVEL = 4;
export const TOTAL_WAVES = 100;
export const MAX_SHIELD = 5;
export const MAX_LIVES = 3;

export type BotId = "rookie" | "pulse" | "apex";
export type EnemyKind = "I" | "O" | "T" | "L" | "J" | "S" | "Z" | "APEX";
export type MessageTone = "info" | "warning" | "boss" | "success";
export type WeaponPowerup = "multi_shot" | "laser" | "piercing" | "charge";
export type PickupType = WeaponPowerup | "slow_field";
export type WaveTheme = "standard" | "rookie" | "pulse" | "apex";

export type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  age: number;
  sourceKind: EnemyKind | "PLAYER";
  pattern?: "zigzag";
  curveDir?: number;
  remainingHits?: number;
  visualType?: WeaponPowerup | "standard";
};

export type Telegraph = {
  id: number;
  enemyId: number;
  enemyKind: EnemyKind;
  type: "beam" | "fan" | "heavy" | "zigzag" | "dash";
  x: number;
  y: number;
  width: number;
  height: number;
  ttl: number;
  angle?: number;
  dir?: number;
};

export type Impact = {
  id: number;
  x: number;
  y: number;
  size: number;
  ttl: number;
  type:
    | "laser"
    | "fan"
    | "heavy"
    | "zigzag"
    | "dash"
    | "player-hit"
    | "enemy-break"
    | "player-standard"
    | "player-laser"
    | "player-piercing"
    | "player-charge";
};

export type Drop = {
  id: number;
  type: PickupType;
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
};

export type QueuedDrop = {
  type: PickupType;
  x: number;
  y: number;
};

export type Enemy = {
  id: number;
  kind: EnemyKind;
  bossTheme?: Exclude<WaveTheme, "standard">;
  bossSplitGeneration?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  points: number;
  color: string;
  shootBias: number;
};

export type Message = {
  bot: BotId;
  tone: MessageTone;
  text: string;
};

/**
 * État canonique de la simulation.
 * Toutes les phases du tick lisent et mutent cette structure.
 */
export type GameState = {
  running: boolean;
  gameOver: boolean;
  victory: boolean;
  playerX: number;
  lives: number;
  shield: number;
  score: number;
  wave: number;
  waveTheme: WaveTheme;
  weaponLevel: number;
  weaponPowerup: WeaponPowerup;
  chargeCounter: number;
  kills: number;
  lineBursts: number;
  maxCombo: number;
  combo: number;
  comboTimer: number;
  bombs: number;
  bombCooldown: number;
  dashCooldown: number;
  shotCooldown: number;
  enemyShotCooldown: number;
  enemyDashCooldown: number;
  formationDir: number;
  formationSpeed: number;
  formationPulse: number;
  enemies: Enemy[];
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  drops: Drop[];
  queuedDrops: QueuedDrop[];
  telegraphs: Telegraph[];
  impacts: Impact[];
  scrapGrid: Array<Array<string | null>>;
  flashTimer: number;
  hitStopTimer: number;
  boardShakeTimer: number;
  lineBurstFxTimer: number;
  message: Message;
  messageTimer: number;
  lastHorizontalDir: number;
  playerTilt: number;
  playerDriftX: number;
  playerThrust: number;
  playerDashFx: number;
  slowFieldTimer: number;
  waveTransition: number;
  nextEntityId: number;
  recentDanger: boolean;
};

export type InputState = {
  left: boolean;
  right: boolean;
  shoot: boolean;
  dash: boolean;
  bomb: boolean;
};

/** Métadonnées purement visuelles pour le décor étoilé du board. */
export type PixelInvasionStar = {
  id: number;
  left: string;
  top: string;
  delay: string;
};

export const SHAPES: Record<Exclude<EnemyKind, "APEX">, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0],
  ],
  L: [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  J: [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

export const ENEMY_COLORS: Record<EnemyKind, string> = {
  I: "#41f0ff",
  O: "#ffe066",
  T: "#b56cff",
  L: "#ff9b54",
  J: "#5ba5ff",
  S: "#5eff9d",
  Z: "#ff6481",
  APEX: "#ff7a4a",
};

export const TETROMINO_ORDER: Array<Exclude<EnemyKind, "APEX">> = ["I", "T", "L", "O", "J", "S", "Z"];
export const POWERUP_ROTATION: PickupType[] = [
  "multi_shot",
  "laser",
  "piercing",
  "charge",
  "slow_field",
];

type EnemyCellTemplate = {
  key: string;
  filled: boolean;
};

type EnemySpriteTemplate = {
  cells: EnemyCellTemplate[];
  columns: number;
  rows: number;
  coreStyle: CSSProperties;
};

function buildEnemySpriteTemplate(kind: EnemyKind): EnemySpriteTemplate {
  const cells = getEnemyCells(kind);
  const filledCoords: Array<{ row: number; col: number }> = [];
  const flatCells = cells.flatMap((row, rowIndex) =>
    row.map((value, columnIndex) => {
      if (value) {
        filledCoords.push({ row: rowIndex, col: columnIndex });
      }

      return {
        key: `${rowIndex}-${columnIndex}`,
        filled: Boolean(value),
      };
    })
  );

  if (filledCoords.length === 0) {
    return {
      cells: flatCells,
      columns: cells[0]?.length ?? 1,
      rows: cells.length,
      coreStyle: { left: "50%", top: "50%" },
    };
  }

  const rowCount = cells.length || 1;
  const colCount = cells[0]?.length || 1;
  const averageRow =
    filledCoords.reduce((sum, cell) => sum + cell.row + 0.5, 0) / filledCoords.length;
  const averageCol =
    filledCoords.reduce((sum, cell) => sum + cell.col + 0.5, 0) / filledCoords.length;

  return {
    cells: flatCells,
    columns: colCount,
    rows: rowCount,
    coreStyle: {
      left: `${(averageCol / colCount) * 100}%`,
      top: `${(averageRow / rowCount) * 100}%`,
    },
  };
}

/** Clamp numérique générique utilisé dans tout le moteur. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Crée la grille de scrap vide qui sert de sous-système de scoring secondaire. */
export function createEmptyScrapGrid() {
  return Array.from({ length: SCRAP_ROWS }, () => Array.from({ length: SCRAP_COLS }, () => null));
}

/** Normalise la création de messages radio pour les différents bots. */
export function createMessage(bot: BotId, tone: MessageTone, text: string): Message {
  return { bot, tone, text };
}

/** Libellé UI du power-up actuellement actif. */
export function getPowerupLabel(powerup: PickupType) {
  switch (powerup) {
    case "multi_shot":
      return "Tir multiple";
    case "laser":
      return "Laser";
    case "piercing":
      return "Perforant";
    case "charge":
      return "Tir charge";
    case "slow_field":
      return "Champ ralenti";
  }
}

export function getWaveThemeLabel(theme: WaveTheme) {
  switch (theme) {
    case "standard":
      return "Mixte";
    case "rookie":
      return "Rookie";
    case "pulse":
      return "Pulse";
    case "apex":
      return "Apex";
  }
}

export function renderPercent(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

/** Cellules remplies à afficher pour un ennemi donné. */
export function getEnemyCells(kind: EnemyKind) {
  if (kind === "APEX") {
    return [
      [1, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1],
      [0, 1, 0, 0, 1, 0],
    ];
  }

  return SHAPES[kind];
}

const ENEMY_SPRITE_TEMPLATES: Record<EnemyKind, EnemySpriteTemplate> = {
  I: buildEnemySpriteTemplate("I"),
  O: buildEnemySpriteTemplate("O"),
  T: buildEnemySpriteTemplate("T"),
  L: buildEnemySpriteTemplate("L"),
  J: buildEnemySpriteTemplate("J"),
  S: buildEnemySpriteTemplate("S"),
  Z: buildEnemySpriteTemplate("Z"),
  APEX: buildEnemySpriteTemplate("APEX"),
};

export function getEnemySpriteTemplate(kind: EnemyKind) {
  return ENEMY_SPRITE_TEMPLATES[kind];
}

/** Convertit un ennemi simulé en style CSS positionné pour le board. */
export function getEnemyGridStyle(enemy: Enemy): CSSProperties {
  const template = getEnemySpriteTemplate(enemy.kind);

  return {
    left: renderPercent(enemy.x, BOARD_WIDTH),
    top: renderPercent(enemy.y, BOARD_HEIGHT),
    width: renderPercent(enemy.width, BOARD_WIDTH),
    height: renderPercent(enemy.height, BOARD_HEIGHT),
    "--enemy-color": enemy.color,
    "--enemy-columns": String(template.columns),
    "--enemy-rows": String(template.rows),
  } as CSSProperties;
}

/**
 * Positionne le noyau robotique au barycentre des cellules remplies,
 * pour éviter un simple centrage de bounding-box.
 */
export function getEnemyCoreStyle(enemy: Enemy): CSSProperties {
  return getEnemySpriteTemplate(enemy.kind).coreStyle;
}

/** Génère un fond étoilé stable sans dépendre d'un état runtime. */
export function createStars(count = 20): PixelInvasionStar[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    top: `${(index * 19) % 100}%`,
    delay: `${(index % 7) * 0.6}s`,
  }));
}
