import {
  BOARD_WIDTH,
  ENEMY_COLORS,
  MAX_BOMBS,
  MAX_LIVES,
  MAX_SHIELD,
  PLAYER_WIDTH,
  SHAPES,
  TETROMINO_ORDER,
  TOTAL_WAVES,
  createEmptyScrapGrid,
} from "../model";
import type { Enemy, EnemyKind, GameState, WaveTheme } from "../model";
import { getVictoryMessage, getWaveStartMessage } from "./pixelInvasionMessages";

function createEnemy(kind: EnemyKind, x: number, y: number, id: number, hpBoost: number): Enemy {
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

/** Construit la composition d'une vague complète à partir de son index. */
export function createWave(wave: number, startId: number) {
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

/** Crée l'état initial prêt à être consommé par la boucle de jeu. */
export function createInitialState(): GameState {
  const wave = createWave(1, 1);

  return {
    running: true,
    gameOver: false,
    victory: false,
    playerX: BOARD_WIDTH / 2 - PLAYER_WIDTH / 2,
    lives: MAX_LIVES,
    shield: MAX_SHIELD,
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

/** Prépare soit la vague suivante, soit l'état terminal de victoire. */
export function resolveWaveCompletion(next: GameState): GameState {
  const nextWave = next.wave + 1;

  if (nextWave > TOTAL_WAVES) {
    return {
      ...next,
      running: false,
      victory: true,
      message: getVictoryMessage(),
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
