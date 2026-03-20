import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/pixel-invasion.css";

const BOARD_WIDTH = 720;
const BOARD_HEIGHT = 840;
const PLAYER_WIDTH = 144;
const PLAYER_HEIGHT = 104;
const PLAYER_Y = BOARD_HEIGHT - 88;
const PLAYER_HITBOX_WIDTH = 68;
const PLAYER_HITBOX_HEIGHT = 46;
const PLAYER_MUZZLE_OFFSET_X = PLAYER_WIDTH / 2;
const PLAYER_MUZZLE_OFFSET_Y = 14;
const SCRAP_ROWS = 8;
const SCRAP_COLS = 10;
const SCRAP_CELL = 24;
const SCRAP_HEIGHT = SCRAP_ROWS * SCRAP_CELL;
const SCRAP_TOP = BOARD_HEIGHT - SCRAP_HEIGHT - 16;
const GAME_LOOP_MS = 1000 / 60;
const PLAYER_SPEED = 360;
const PLAYER_BULLET_SPEED = 520;
const ENEMY_BULLET_SPEED = 250;
const PLAYER_SHOT_COOLDOWN = 0.16;
const DASH_DISTANCE = 180;
const DASH_COOLDOWN = 1.4;
const BOMB_COOLDOWN = 10;
const MAX_BOMBS = 2;
const MAX_WEAPON_LEVEL = 4;
const TOTAL_WAVES = 24;

type BotId = "rookie" | "pulse" | "apex";
type EnemyKind = "I" | "O" | "T" | "L" | "J" | "S" | "Z" | "APEX";
type MessageTone = "info" | "warning" | "boss" | "success";
type WeaponPowerup = "multi_shot" | "laser" | "piercing" | "charge";
type WaveTheme = "standard" | "rookie" | "pulse" | "apex";

type Bullet = {
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
};

type Telegraph = {
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

type Impact = {
  id: number;
  x: number;
  y: number;
  size: number;
  ttl: number;
  type: "laser" | "fan" | "heavy" | "zigzag" | "dash" | "player-hit" | "enemy-break";
};

type Enemy = {
  id: number;
  kind: EnemyKind;
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

type Message = {
  bot: BotId;
  tone: MessageTone;
  text: string;
};

type GameState = {
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
  enemies: Enemy[];
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  telegraphs: Telegraph[];
  impacts: Impact[];
  scrapGrid: Array<Array<string | null>>;
  flashTimer: number;
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

type InputState = {
  left: boolean;
  right: boolean;
  shoot: boolean;
  dash: boolean;
  bomb: boolean;
};

const SHAPES: Record<Exclude<EnemyKind, "APEX">, number[][]> = {
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

const ENEMY_COLORS: Record<EnemyKind, string> = {
  I: "#41f0ff",
  O: "#ffe066",
  T: "#b56cff",
  L: "#ff9b54",
  J: "#5ba5ff",
  S: "#5eff9d",
  Z: "#ff6481",
  APEX: "#ff7a4a",
};

const TETROMINO_ORDER: Array<Exclude<EnemyKind, "APEX">> = ["I", "T", "L", "O", "J", "S", "Z"];
const POWERUP_ROTATION: WeaponPowerup[] = ["multi_shot", "laser", "piercing", "charge"];

function createEmptyScrapGrid() {
  return Array.from({ length: SCRAP_ROWS }, () => Array.from({ length: SCRAP_COLS }, () => null));
}

function createMessage(bot: BotId, tone: MessageTone, text: string): Message {
  return { bot, tone, text };
}

function getPowerupLabel(powerup: WeaponPowerup) {
  switch (powerup) {
    case "multi_shot":
      return "Multi-shot";
    case "laser":
      return "Laser";
    case "piercing":
      return "Perforant";
    case "charge":
      return "Charge shot";
  }
}

function getWaveStartMessage(wave: number, theme: WaveTheme, apexCount = 0): Message {
  if (theme === "apex") {
    return createMessage(
      "apex",
      "boss",
      apexCount > 1
        ? `Escouade Apex detectee. ${apexCount} elites descendent.`
        : "Protocole Apex actif. Tiens la ligne."
    );
  }
  if (theme === "pulse") {
    return createMessage("pulse", "info", `Vague Pulse ${wave}. Formation precise, cadence en hausse.`);
  }
  if (theme === "rookie") {
    return createMessage("rookie", "info", `Vague Rookie ${wave}. Beaucoup de cibles, reste propre.`);
  }
  if (wave >= 3) {
    return createMessage("pulse", "info", "Formation mise a jour. Surveille le flanc gauche.");
  }
  return createMessage("rookie", "info", "Pixel, reste mobile. La premiere vague est legere.");
}

function createEnemy(
  kind: EnemyKind,
  x: number,
  y: number,
  id: number,
  hpBoost: number
): Enemy {
  if (kind === "APEX") {
    const apexHp = 22 + hpBoost * 3;
    return {
      id,
      kind,
      x,
      y,
      width: 144,
      height: 96,
      hp: apexHp,
      maxHp: apexHp,
      points: 1400,
      color: ENEMY_COLORS.APEX,
      shootBias: 2.8,
    };
  }

  const shape = SHAPES[kind];
  const baseHp =
    kind === "O"
      ? 3 + Math.floor(hpBoost / 2)
      : kind === "T"
        ? 2 + Math.floor((hpBoost + 1) / 2)
        : 1 + Math.floor((hpBoost + 1) / 3);
  return {
    id,
    kind,
    x,
    y,
    width: shape[0].length * 18,
    height: shape.length * 18,
    hp: baseHp,
    maxHp: baseHp,
    points: kind === "O" ? 220 : kind === "T" ? 180 : 150,
    color: ENEMY_COLORS[kind],
    shootBias: kind === "I" ? 1.5 : kind === "T" ? 1.3 : kind === "L" ? 1.15 : 1,
  };
}

function createWave(wave: number, startId: number) {
  const isApexWave = wave % 9 === 0 || wave === TOTAL_WAVES;
  const isPulseWave = !isApexWave && wave % 6 === 0;
  const isRookieWave = !isApexWave && !isPulseWave && wave % 4 === 0;
  const theme: WaveTheme = isApexWave
    ? "apex"
    : isPulseWave
      ? "pulse"
      : isRookieWave
        ? "rookie"
        : "standard";

  if (isApexWave) {
    const apexCount = wave >= 18 ? 2 : 1;
    const enemies: Enemy[] = [];
    let nextId = startId;
    for (let index = 0; index < apexCount; index += 1) {
      enemies.push(
        createEnemy(
          "APEX",
          apexCount === 1 ? BOARD_WIDTH / 2 - 72 : 170 + index * 220,
          92,
          nextId,
          Math.max(1, Math.floor(wave / 4))
        )
      );
      nextId += 1;
    }
    return {
      enemies,
      nextId,
      formationSpeed: 68 + wave * 5,
      theme,
      apexCount,
    };
  }

  const rows =
    theme === "rookie"
      ? Math.min(5, 3 + Math.floor(wave / 5))
      : Math.min(4, 2 + Math.floor(wave / 2));
  const cols = theme === "pulse" ? 5 : 6;
  const pool: Array<Exclude<EnemyKind, "APEX">> =
    theme === "pulse"
      ? ["I", "T", "S", "Z", "J"]
      : theme === "rookie"
        ? ["O", "L", "J", "T"]
        : TETROMINO_ORDER;
  const enemies: Enemy[] = [];
  let nextId = startId;
  const hpBoost =
    theme === "pulse"
      ? Math.max(1, wave - 1)
      : theme === "rookie"
        ? Math.max(0, wave - 2)
        : Math.max(0, wave - 1);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const kind = pool[(row * cols + col + wave) % pool.length];
      const x = 82 + col * 92 + (row % 2) * 10;
      const y = 86 + row * 72;
      enemies.push(createEnemy(kind, x, y, nextId, hpBoost));
      nextId += 1;
    }
  }

  return {
    enemies,
    nextId,
    formationSpeed:
      theme === "pulse"
        ? 68 + wave * 7
        : theme === "rookie"
          ? 54 + wave * 5
          : 58 + wave * 6,
    theme,
    apexCount: 0,
  };
}

function createInitialState(): GameState {
  const wave = createWave(1, 1);

  return {
    running: true,
    gameOver: false,
    victory: false,
    playerX: BOARD_WIDTH / 2 - PLAYER_WIDTH / 2,
    lives: 3,
    shield: 5,
    score: 0,
    wave: 1,
    waveTheme: wave.theme,
    weaponLevel: 1,
    weaponPowerup: "multi_shot",
    chargeCounter: 0,
    kills: 0,
    lineBursts: 0,
    maxCombo: 0,
    combo: 0,
    comboTimer: 0,
    bombs: 1,
    bombCooldown: 0,
    dashCooldown: 0,
    shotCooldown: 0,
    enemyShotCooldown: 0.7,
    enemyDashCooldown: 1.8,
    formationDir: 1,
    formationSpeed: wave.formationSpeed,
    enemies: wave.enemies,
    playerBullets: [],
    enemyBullets: [],
    telegraphs: [],
    impacts: [],
    scrapGrid: createEmptyScrapGrid(),
    flashTimer: 0,
    message: getWaveStartMessage(1, wave.theme, wave.apexCount),
    messageTimer: 4,
    lastHorizontalDir: 1,
    playerTilt: 0,
    playerDriftX: 0,
    playerThrust: 0,
    playerDashFx: 0,
    slowFieldTimer: 0,
    waveTransition: 1.4,
    nextEntityId: wave.nextId,
    recentDanger: false,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function createImpact(
  id: number,
  x: number,
  y: number,
  type: Impact["type"],
  size: number,
  ttl = 0.3
): Impact {
  return { id, x, y, type, size, ttl };
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

function createTelegraphForEnemy(
  enemy: Enemy,
  playerCenterX: number,
  id: number
): Telegraph[] {
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

  const shooters = [...state.enemies]
    .sort((left, right) => right.y - left.y)
    .slice(0, Math.min(4, state.enemies.length));

  const picked = shooters[Math.floor(Math.random() * shooters.length)];
  if (!picked) return state.enemyBullets;

  const baseId = state.nextEntityId + 10000;
  if (picked.kind === "APEX") {
    return [
      ...state.enemyBullets,
      {
        id: baseId,
        x: picked.x + picked.width / 2 - 6,
        y: picked.y + picked.height + 8,
        vx: -58,
        vy: ENEMY_BULLET_SPEED + 30,
        width: 10,
        height: 22,
        damage: 1,
        age: 0,
        sourceKind: "APEX",
      },
      {
        id: baseId + 1,
        x: picked.x + picked.width / 2 - 6,
        y: picked.y + picked.height + 8,
        vx: 0,
        vy: ENEMY_BULLET_SPEED + 50,
        width: 12,
        height: 26,
        damage: 1,
        age: 0,
        sourceKind: "APEX",
      },
      {
        id: baseId + 2,
        x: picked.x + picked.width / 2 - 6,
        y: picked.y + picked.height + 8,
        vx: 58,
        vy: ENEMY_BULLET_SPEED + 30,
        width: 10,
        height: 22,
        damage: 1,
        age: 0,
        sourceKind: "APEX",
      },
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
          : state.weaponLevel >= 4
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

function escalateMessage(state: GameState): Message {
  if (state.wave % 5 === 0) {
    return createMessage("apex", "boss", "N'echange pas des degats. Apex lit deja ton rythme.");
  }
  if (state.shield <= 2 || state.lives === 1) {
    return createMessage("rookie", "warning", "Bouclier critique. Dash d'abord, tire ensuite.");
  }
  return createMessage("pulse", "info", "Anticipe le balayage, puis casse le centre.");
}

function stepGame(state: GameState, input: InputState, deltaMs: number): GameState {
  if (!state.running || state.gameOver || state.victory) return state;

  const dt = deltaMs / 1000;
  let next: GameState = {
    ...state,
    shotCooldown: Math.max(0, state.shotCooldown - dt),
    enemyShotCooldown: Math.max(0, state.enemyShotCooldown - dt),
    enemyDashCooldown: Math.max(0, state.enemyDashCooldown - dt),
    dashCooldown: Math.max(0, state.dashCooldown - dt),
    bombCooldown: Math.max(0, state.bombCooldown - dt),
    comboTimer: Math.max(0, state.comboTimer - dt),
    flashTimer: Math.max(0, state.flashTimer - dt),
    messageTimer: Math.max(0, state.messageTimer - dt),
    playerDashFx: Math.max(0, state.playerDashFx - dt),
    slowFieldTimer: Math.max(0, state.slowFieldTimer - dt),
    waveTransition: Math.max(0, state.waveTransition - dt),
    telegraphs: state.telegraphs
      .map((telegraph) => ({ ...telegraph, ttl: telegraph.ttl - dt }))
      .filter((telegraph) => telegraph.ttl > -0.01),
    impacts: state.impacts
      .map((impact) => ({ ...impact, ttl: impact.ttl - dt }))
      .filter((impact) => impact.ttl > 0),
    recentDanger: false,
  };

  if (next.comboTimer === 0 && next.combo !== 0) {
    next.combo = 0;
  }

  let horizontal = 0;
  if (input.left) horizontal -= 1;
  if (input.right) horizontal += 1;
  if (horizontal !== 0) {
    next.lastHorizontalDir = horizontal;
  }

  const targetTilt = horizontal * 10;
  const targetDriftX = horizontal * 6;
  const targetThrust = horizontal !== 0 ? 1 : 0;
  next.playerTilt += (targetTilt - next.playerTilt) * Math.min(1, dt * 10);
  next.playerDriftX += (targetDriftX - next.playerDriftX) * Math.min(1, dt * 12);
  next.playerThrust += (targetThrust - next.playerThrust) * Math.min(1, dt * 12);

  next.playerX = clamp(
    next.playerX + horizontal * PLAYER_SPEED * dt,
    14,
    BOARD_WIDTH - PLAYER_WIDTH - 14
  );

  if (input.dash && next.dashCooldown === 0) {
    const dashDir = horizontal !== 0 ? horizontal : next.lastHorizontalDir;
    next.playerX = clamp(
      next.playerX + dashDir * DASH_DISTANCE,
      14,
      BOARD_WIDTH - PLAYER_WIDTH - 14
    );
    next.dashCooldown = DASH_COOLDOWN;
    next.playerDashFx = 0.22;
  }

  if (input.shoot && next.shotCooldown === 0) {
    const shotPattern = createPlayerShotPattern(next);
    next.playerBullets = [...next.playerBullets, ...shotPattern.bullets];
    next.nextEntityId = shotPattern.nextId;
    next.shotCooldown = shotPattern.cooldown;
    if (next.weaponPowerup === "charge") {
      next.chargeCounter = next.chargeCounter >= 3 ? 0 : next.chargeCounter + 1;
    }
  }

  if (input.bomb && next.bombs > 0 && next.bombCooldown === 0) {
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
      next.weaponPowerup =
        POWERUP_ROTATION[(next.lineBursts + lineGain - 1) % POWERUP_ROTATION.length];
      next.slowFieldTimer = Math.max(next.slowFieldTimer, 4 + lineGain * 1.5);
      next.chargeCounter = 0;
    }
    next.flashTimer = 0.35;
    next.message = createMessage(
      "pulse",
      "success",
      lineGain > 0
        ? `Bombe declenchee. ${getPowerupLabel(next.weaponPowerup)} active.`
        : "Bombe declenchee. Zone temporairement nettoyee."
    );
    next.messageTimer = 3.2;
  }

  const canAdvanceFormation = next.waveTransition === 0;
  const playerCenterX = next.playerX + PLAYER_WIDTH / 2;
  const slowMultiplier = next.slowFieldTimer > 0 ? 0.58 : 1;

  if (canAdvanceFormation && next.enemyDashCooldown === 0) {
    const dashers = next.enemies.filter((enemy) => enemy.kind === "L" || enemy.kind === "J");
    const pickedDasher = dashers[Math.floor(Math.random() * dashers.length)];
    if (pickedDasher) {
      next.telegraphs = [
        ...next.telegraphs,
        ...createTelegraphForEnemy(pickedDasher, playerCenterX, next.nextEntityId),
      ];
      next.nextEntityId += 1;
      next.enemyDashCooldown = Math.max(1.15, 2.45 - next.wave * 0.045);
      next.message = createMessage("pulse", "warning", "Dash offensif detecte. Decale-toi maintenant.");
      next.messageTimer = 2;
    }
  }

  let touchedEdge = false;
  const enemyStep = next.formationSpeed * slowMultiplier * dt * next.formationDir;
  next.enemies = next.enemies.map((enemy) => {
    const futureX = enemy.x + (canAdvanceFormation ? enemyStep : 0);
    if (futureX <= 18 || futureX + enemy.width >= BOARD_WIDTH - 18) {
      touchedEdge = true;
    }
    return {
      ...enemy,
      x: canAdvanceFormation ? futureX : enemy.x,
    };
  });

  if (canAdvanceFormation && touchedEdge) {
    next.formationDir *= -1;
    next.enemies = next.enemies.map((enemy) => ({
      ...enemy,
      x: clamp(enemy.x, 18, BOARD_WIDTH - enemy.width - 18),
      y: enemy.y + (enemy.kind === "APEX" ? 18 : 22),
    }));
  }

  next.playerBullets = next.playerBullets
    .map((bullet) => ({
      ...bullet,
      age: bullet.age + dt,
      x: bullet.x + bullet.vx * dt,
      y: bullet.y + bullet.vy * dt,
    }))
    .filter((bullet) => bullet.y + bullet.height > 0);

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

  if (next.enemyShotCooldown === 0 && next.enemies.length > 0 && next.waveTransition === 0) {
    const shooters = next.enemies
      .filter((enemy) => enemy.kind !== "L" && enemy.kind !== "J")
      .sort((left, right) => right.y - left.y)
      .slice(0, Math.min(4, next.enemies.length));
    const pickedShooter = shooters[Math.floor(Math.random() * shooters.length)];

    if (pickedShooter) {
      const telegraphs = createTelegraphForEnemy(pickedShooter, playerCenterX, next.nextEntityId);
      next.telegraphs = [...next.telegraphs, ...telegraphs];
      next.nextEntityId += telegraphs.length;
    } else {
      next.enemyBullets = spawnEnemyBullets(next);
    }

    next.enemyShotCooldown = (Math.max(0.48, 1.78 - next.wave * 0.045)) / slowMultiplier;
  }

  const readyTelegraphs = next.telegraphs.filter((telegraph) => telegraph.ttl <= 0);
  if (readyTelegraphs.length > 0) {
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
          telegraph.type === "beam"
            ? "laser"
            : telegraph.type === "fan"
              ? "fan"
              : telegraph.type === "heavy"
                ? "heavy"
                : "zigzag",
          telegraph.type === "heavy" ? 42 : telegraph.type === "beam" ? 72 : 30,
          0.22
        ),
      ];
      next.nextEntityId += 1;
    }
  }

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
    const hitEnemyIndex = next.enemies.findIndex((enemy) =>
      overlaps(bullet, enemy)
    );

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
    } else {
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
        weaponPowerup = POWERUP_ROTATION[(lineBursts - 1) % POWERUP_ROTATION.length];
        next.slowFieldTimer = Math.max(next.slowFieldTimer, 4 + outcome.clearedRows * 1.5);
        next.chargeCounter = 0;
        score += outcome.clearedRows * 500 + combo * 35;
        next.flashTimer = 0.28;
        next.message = createMessage(
          "pulse",
          "success",
          outcome.clearedRows > 1
            ? `Explosion multi-lignes. ${getPowerupLabel(weaponPowerup)} active.`
            : `Ligne explosive. ${getPowerupLabel(weaponPowerup)} active.`
        );
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
  }

  const survivingEnemies = next.enemies
    .filter((enemy) => !consumedEnemyIds.has(enemy.id))
    .concat(Array.from(damagedEnemies.values()))
    .filter((enemy) => enemy.hp > 0);
  next.playerBullets = bulletsToKeep;
  next.enemies = survivingEnemies;
  next.scrapGrid = scrapGrid;
  next.lineBursts = lineBursts;
  next.score = score;
  next.weaponLevel = weaponLevel;
  next.weaponPowerup = weaponPowerup;
  next.kills = kills;
  next.combo = combo;
  next.comboTimer = comboTimer;
  next.maxCombo = maxCombo;

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
          bullet.sourceKind === "I"
            ? "laser"
            : bullet.sourceKind === "T"
            ? "fan"
            : bullet.sourceKind === "O"
              ? "heavy"
              : bullet.sourceKind === "S" || bullet.sourceKind === "Z"
                ? "zigzag"
                : "player-hit",
        bullet.sourceKind === "O" ? 42 : 28,
        0.26
      ),
    ];
    next.nextEntityId += 1;
    return false;
  });

  next.enemies = next.enemies.filter((enemy) => {
    if (enemy.y + enemy.height < SCRAP_TOP - 16) return true;
    shield -= enemy.kind === "APEX" ? 3 : 1;
    tookDamage = true;
    return false;
  });

  while (shield <= 0 && lives > 0) {
    lives -= 1;
    if (lives > 0) {
      shield += 5;
    }
  }

  next.shield = shield;
  next.lives = lives;

  if (tookDamage) {
    next.flashTimer = 0.22;
    next.recentDanger = true;
    next.message = escalateMessage(next);
    next.messageTimer = 2.8;
  } else if (next.messageTimer === 0 && next.waveTransition === 0) {
    next.message = next.wave % 5 === 0
      ? createMessage("apex", "boss", "Tu tires trop tot. Lis les ouvertures.")
      : next.wave >= 3
        ? createMessage("pulse", "info", "Pattern stable. Brise les cellules exterieures.")
        : createMessage("rookie", "info", "Continue de bouger, Pixel. La voie est encore libre.");
    next.messageTimer = 4.2;
  }

  if (next.lives <= 0) {
    return {
      ...next,
      running: false,
      gameOver: true,
      shield: 0,
      message: createMessage("rookie", "warning", "On s'est fait submerger. Redemarre le secteur."),
      messageTimer: 99,
    };
  }

  if (next.enemies.length === 0) {
    const nextWave = next.wave + 1;
    if (nextWave > TOTAL_WAVES) {
      return {
        ...next,
        running: false,
        victory: true,
        message: createMessage("apex", "success", "Secteur nettoye. Tu as survecu au soulevement."),
        messageTimer: 99,
      };
    }

    const wave = createWave(nextWave, next.nextEntityId);
    return {
      ...next,
      wave: nextWave,
      waveTheme: wave.theme,
      enemies: wave.enemies,
      nextEntityId: wave.nextId,
      formationSpeed: wave.formationSpeed,
      formationDir: nextWave % 2 === 0 ? -1 : 1,
      enemyShotCooldown: 1.25,
      enemyDashCooldown: 1.5,
      playerBullets: [],
      enemyBullets: [],
      telegraphs: [],
      bombs: Math.min(MAX_BOMBS, next.bombs + 1),
      waveTransition: 1.8,
      message: getWaveStartMessage(nextWave, wave.theme, wave.apexCount),
      messageTimer: 4,
    };
  }

  return next;
}

function renderPercent(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

function getEnemyCells(kind: EnemyKind) {
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

function getEnemyGridStyle(enemy: Enemy): CSSProperties {
  const cells = getEnemyCells(enemy.kind);
  return {
    left: renderPercent(enemy.x, BOARD_WIDTH),
    top: renderPercent(enemy.y, BOARD_HEIGHT),
    width: renderPercent(enemy.width, BOARD_WIDTH),
    height: renderPercent(enemy.height, BOARD_HEIGHT),
    "--enemy-color": enemy.color,
    "--enemy-columns": String(cells[0]?.length ?? 1),
    "--enemy-rows": String(cells.length),
  } as CSSProperties;
}

export default function PixelInvasionPage() {
  const navigate = useNavigate();
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    shoot: false,
    dash: false,
    bomb: false,
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) {
        if (event.code === "Space") {
          event.preventDefault();
        }
      }

      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = true;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = true;
      if (event.code === "Space") {
        inputRef.current.shoot = true;
        event.preventDefault();
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        inputRef.current.dash = true;
        event.preventDefault();
      }
      if (event.code === "KeyB") inputRef.current.bomb = true;
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "ArrowLeft" || event.code === "KeyA") inputRef.current.left = false;
      if (event.code === "ArrowRight" || event.code === "KeyD") inputRef.current.right = false;
      if (event.code === "Space") inputRef.current.shoot = false;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGame((current) => {
        const next = stepGame(current, inputRef.current, GAME_LOOP_MS);
        inputRef.current.dash = false;
        inputRef.current.bomb = false;
        return next;
      });
    }, GAME_LOOP_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const shieldRatio = useMemo(() => clamp(game.shield / 5, 0, 1), [game.shield]);
  const activeBotLabel = game.message.bot.toUpperCase();
  const stars = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        top: `${(index * 19) % 100}%`,
        delay: `${(index % 7) * 0.6}s`,
      })),
    []
  );

  return (
    <div className="pixel-invasion-page font-['Press_Start_2P']">
      <div className="pixel-invasion-shell">
        <header className="pixel-invasion-header">
          <div>
            <p className="pixel-invasion-kicker">Nouveau mode</p>
            <h1>Pixel Invasion</h1>
            <p className="pixel-invasion-subtitle">
              Un shooter arcade dans le Tetroverse: Pixel defend la ligne, les Tetrobots tombent,
              et chaque destruction nourrit une grille explosive.
            </p>
          </div>

          <div className="pixel-invasion-actions">
            <button type="button" className="retro-btn" onClick={() => setGame(createInitialState())}>
              Relancer
            </button>
            <button type="button" className="retro-btn" onClick={() => navigate("/tetris-hub")}>
              Retour hub
            </button>
          </div>
        </header>

        <div className="pixel-invasion-layout">
          <section className="pixel-invasion-board-panel">
            <div
              className={`pixel-invasion-board ${
                game.flashTimer > 0 ? "pixel-invasion-board--flash" : ""
              }`}
            >
              <div className="pixel-invasion-scanlines" />
              {stars.map((star) => (
                <span
                  key={star.id}
                  className="pixel-invasion-star"
                  style={{ left: star.left, top: star.top, animationDelay: star.delay }}
                />
              ))}

              <div className="pixel-invasion-lane pixel-invasion-lane--enemy" />
              <div className="pixel-invasion-lane pixel-invasion-lane--scrap" />

              {game.telegraphs.map((telegraph) => (
                <span
                  key={telegraph.id}
                  className={`pixel-invasion-telegraph pixel-invasion-telegraph--${telegraph.type}`}
                  style={{
                    left: renderPercent(telegraph.x, BOARD_WIDTH),
                    top: renderPercent(telegraph.y, BOARD_HEIGHT),
                    width: renderPercent(telegraph.width, BOARD_WIDTH),
                    height: renderPercent(telegraph.height, BOARD_HEIGHT),
                    transform: telegraph.angle ? `rotate(${telegraph.angle}deg)` : undefined,
                  }}
                />
              ))}

              {game.impacts.map((impact) => (
                <span
                  key={impact.id}
                  className={`pixel-invasion-impact pixel-invasion-impact--${impact.type}`}
                  style={{
                    left: renderPercent(impact.x - impact.size / 2, BOARD_WIDTH),
                    top: renderPercent(impact.y - impact.size / 2, BOARD_HEIGHT),
                    width: renderPercent(impact.size, BOARD_WIDTH),
                    height: renderPercent(impact.size, BOARD_HEIGHT),
                    opacity: Math.max(0.2, impact.ttl / 0.32),
                  }}
                />
              ))}

              <div className="pixel-invasion-scrap-grid">
                {game.scrapGrid.map((row, rowIndex) =>
                  row.map((cell, columnIndex) => (
                    <span
                      key={`${rowIndex}-${columnIndex}`}
                      className={`pixel-invasion-scrap-cell ${
                        cell ? "pixel-invasion-scrap-cell--filled" : ""
                      }`}
                      style={{ background: cell ?? undefined }}
                    />
                  ))
                )}
              </div>

              {game.enemies.map((enemy) => (
                <div
                  key={enemy.id}
                  className={`pixel-invasion-enemy pixel-invasion-enemy--${enemy.kind.toLowerCase()}`}
                  style={getEnemyGridStyle(enemy)}
                >
                  <div className="pixel-invasion-enemy-grid">
                    {getEnemyCells(enemy.kind).flatMap((row, rowIndex) =>
                      row.map((value, columnIndex) => (
                        <span
                          key={`${enemy.id}-${rowIndex}-${columnIndex}`}
                          className={`pixel-invasion-enemy-cell ${
                            value ? "pixel-invasion-enemy-cell--filled" : ""
                          }`}
                        />
                      ))
                    )}
                  </div>
                  <div className="pixel-invasion-enemy-hp">
                    <span style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                  </div>
                </div>
              ))}

              {game.playerBullets.map((bullet) => (
                <span
                  key={bullet.id}
                  className="pixel-invasion-bullet pixel-invasion-bullet--player"
                  style={{
                    left: renderPercent(bullet.x, BOARD_WIDTH),
                    top: renderPercent(bullet.y, BOARD_HEIGHT),
                    width: renderPercent(bullet.width, BOARD_WIDTH),
                    height: renderPercent(bullet.height, BOARD_HEIGHT),
                  }}
                />
              ))}

              {game.enemyBullets.map((bullet) => (
                <span
                  key={bullet.id}
                  className="pixel-invasion-bullet pixel-invasion-bullet--enemy"
                  style={{
                    left: renderPercent(bullet.x, BOARD_WIDTH),
                    top: renderPercent(bullet.y, BOARD_HEIGHT),
                    width: renderPercent(bullet.width, BOARD_WIDTH),
                    height: renderPercent(bullet.height, BOARD_HEIGHT),
                  }}
                />
              ))}

              <div
                className="pixel-invasion-player"
                style={{
                  left: renderPercent(game.playerX, BOARD_WIDTH),
                  top: renderPercent(PLAYER_Y, BOARD_HEIGHT),
                  width: renderPercent(PLAYER_WIDTH, BOARD_WIDTH),
                  height: renderPercent(PLAYER_HEIGHT, BOARD_HEIGHT),
                  transform: `translateX(${game.playerDriftX}px) rotate(${game.playerTilt}deg)`,
                }}
              >
                <span
                  className={`pixel-invasion-player-thruster ${
                    game.playerThrust > 0
                      ? game.lastHorizontalDir < 0
                        ? "pixel-invasion-player-thruster--right"
                        : "pixel-invasion-player-thruster--left"
                      : "pixel-invasion-player-thruster--center"
                  } ${
                    game.playerDashFx > 0 ? "pixel-invasion-player-thruster--dash" : ""
                  }`}
                  style={{
                    opacity: Math.max(game.playerThrust * 0.9, game.playerDashFx * 2.6),
                    transform: `scaleY(${1 + game.playerThrust * 0.45 + game.playerDashFx * 1.2})`,
                  }}
                />
                {game.playerDashFx > 0 && (
                  <span
                    className="pixel-invasion-player-afterimage"
                    style={{
                      opacity: Math.min(0.7, game.playerDashFx * 3.2),
                      transform: `translateX(${-game.lastHorizontalDir * 16}px) scale(${1 + game.playerDashFx * 0.8})`,
                    }}
                  />
                )}
                <img
                  src="/Pixel_invasion/vaisseau_pixel.png"
                  alt="Vaisseau de Pixel"
                  className="pixel-invasion-player-sprite"
                  draggable={false}
                />
              </div>

              {(game.gameOver || game.victory) && (
                <div className="pixel-invasion-overlay">
                  <h2>{game.victory ? "Secteur securise" : "Secteur perdu"}</h2>
                  <p>
                    {game.victory
                      ? "Pixel a tenu la ligne et stoppe le soulevement des Tetrobots."
                      : "L'invasion a perce la ligne defensive."}
                  </p>
                  <div className="pixel-invasion-overlay-stats">
                    <span>Score {game.score}</span>
                    <span>Vague {game.wave}</span>
                    <span>Lignes explosives {game.lineBursts}</span>
                  </div>
                  <button type="button" className="retro-btn" onClick={() => setGame(createInitialState())}>
                    Rejouer
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="pixel-invasion-sidebar">
            <section className="pixel-invasion-card pixel-invasion-card--stats">
              <div className="pixel-invasion-card-title">Flux combat</div>
              <div className="pixel-invasion-stat-grid">
                <div>
                  <span>Score</span>
                  <strong>{game.score}</strong>
                </div>
                <div>
                  <span>Vague</span>
                  <strong>{game.wave}/{TOTAL_WAVES}</strong>
                </div>
                <div>
                  <span>Tir</span>
                  <strong>Niv. {game.weaponLevel}</strong>
                </div>
                <div>
                  <span>Power-up</span>
                  <strong>{getPowerupLabel(game.weaponPowerup)}</strong>
                </div>
                <div>
                  <span>Eliminations</span>
                  <strong>{game.kills}</strong>
                </div>
                <div>
                  <span>Lignes explosives</span>
                  <strong>{game.lineBursts}</strong>
                </div>
                <div>
                  <span>Combo max</span>
                  <strong>x{game.maxCombo}</strong>
                </div>
                <div>
                  <span>Bombes</span>
                  <strong>{game.bombs}</strong>
                </div>
              </div>

              <div className="pixel-invasion-bars">
                <div>
                  <span>Bouclier</span>
                  <div className="pixel-invasion-bar">
                    <i style={{ width: `${shieldRatio * 100}%` }} />
                  </div>
                </div>
                <div>
                  <span>Vies</span>
                  <div className="pixel-invasion-life-row">
                    {Array.from({ length: 3 }, (_, index) => (
                      <span
                        key={index}
                        className={index < game.lives ? "pixel-invasion-life pixel-invasion-life--active" : "pixel-invasion-life"}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <span>Dash</span>
                  <div className="pixel-invasion-bar pixel-invasion-bar--secondary">
                    <i style={{ width: `${(1 - game.dashCooldown / DASH_COOLDOWN) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <span>Slow field</span>
                  <div className="pixel-invasion-bar">
                    <i style={{ width: `${Math.min(100, (game.slowFieldTimer / 6) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <section className={`pixel-invasion-card pixel-invasion-card--message pixel-invasion-card--${game.message.tone}`}>
              <div className="pixel-invasion-card-title">Canal Tetrobots</div>
              <div className="pixel-invasion-message-bot">{activeBotLabel}</div>
              <p>{game.message.text}</p>
            </section>

            <section className="pixel-invasion-card">
              <div className="pixel-invasion-card-title">MVP livre</div>
              <ul className="pixel-invasion-list">
                <li>Pixel tire, dash et lance une bombe.</li>
                <li>Les Tetrobots descendent en formations de tetrominos.</li>
                <li>Les ennemis detruits alimentent une scrap grid.</li>
                <li>Une ligne pleine explose et donne un bonus massif.</li>
                <li>Apex apparait comme boss sur les vagues 5 et 10.</li>
              </ul>
            </section>

            <section className="pixel-invasion-card">
              <div className="pixel-invasion-card-title">Controles</div>
              <ul className="pixel-invasion-list">
                <li>`A` / `D` ou fleches : deplacement</li>
                <li>`Space`: tir</li>
                <li>`Shift`: dash</li>
                <li>`B`: bombe de nettoyage</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
