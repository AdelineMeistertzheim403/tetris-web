import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  ENEMY_COLORS,
  MAX_BOMBS,
  MAX_LIVES,
  MAX_SHIELD,
  PLAYER_WIDTH,
  SCRAP_TOP,
  SHAPES,
  TOTAL_WAVES,
  createEmptyScrapGrid,
} from "../model";
import type { Enemy, EnemyKind, GameState, WaveTheme } from "../model";
import { getVictoryMessage, getWaveStartMessage } from "./pixelInvasionMessages";

type BossTheme = Exclude<WaveTheme, "standard">;

type WaveDefinition = {
  enemies: Enemy[];
  nextId: number;
  formationSpeed: number;
  theme: BossTheme;
  bossCount: number;
  bossTheme?: BossTheme;
  finale: boolean;
};

type FormationProfile = "line" | "arc" | "vee" | "flanks";

function createRegularEnemy(
  kind: Exclude<EnemyKind, "APEX">,
  x: number,
  y: number,
  id: number,
  hpBoost: number
): Enemy {
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
    points: kind === "O" ? 220 + hpBoost * 10 : kind === "T" ? 180 + hpBoost * 8 : 150 + hpBoost * 7,
    color: ENEMY_COLORS[kind],
    shootBias: kind === "I" ? 1.5 : kind === "T" ? 1.3 : kind === "L" ? 1.15 : 1,
  };
}

function createBossEnemy(
  theme: BossTheme,
  cycle: number,
  id: number,
  x: number,
  finalBoss = false
): Enemy {
  const hpBase = theme === "rookie" ? 16 : theme === "pulse" ? 24 : 34;
  const hp = hpBase + cycle * (theme === "rookie" ? 7 : theme === "pulse" ? 9 : 12) + (finalBoss ? 16 : 0);
  const color =
    theme === "rookie" ? "#7fd8ff" : theme === "pulse" ? "#df96ff" : ENEMY_COLORS.APEX;

  return {
    id,
    kind: "APEX",
    bossTheme: theme,
    x,
    y: 92,
    width: 144,
    height: 96,
    hp,
    maxHp: hp,
    points: (theme === "rookie" ? 1200 : theme === "pulse" ? 1650 : 2200) + cycle * 220 + (finalBoss ? 800 : 0),
    color,
    shootBias: theme === "rookie" ? 1.8 : theme === "pulse" ? 2.4 : 3.1,
  };
}

function getBlockTheme(blockIndex: number): BossTheme {
  return blockIndex % 3 === 0 ? "rookie" : blockIndex % 3 === 1 ? "pulse" : "apex";
}

function getCycle(blockIndex: number) {
  return Math.floor(blockIndex / 3) + 1;
}

function createBossWave(
  theme: BossTheme,
  cycle: number,
  startId: number,
  bossCount: number,
  finalBoss = false
): WaveDefinition {
  const enemies: Enemy[] = [];
  let nextId = startId;

  for (let index = 0; index < bossCount; index += 1) {
    const spread = bossCount === 1 ? 0 : bossCount === 2 ? 180 : 230;
    const centerOffset = (index - (bossCount - 1) / 2) * spread;
    const x = BOARD_WIDTH / 2 - 72 + centerOffset;
    enemies.push(createBossEnemy(theme, cycle, nextId, x, finalBoss));
    nextId += 1;
  }

  return {
    enemies,
    nextId,
    formationSpeed: (theme === "rookie" ? 62 : theme === "pulse" ? 72 : 82) + cycle * 7,
    theme,
    bossCount,
    bossTheme: theme,
    finale: finalBoss,
  };
}

function createFormationWave(
  wave: number,
  theme: BossTheme,
  cycle: number,
  waveInBlock: number,
  startId: number
): WaveDefinition {
  const rows =
    theme === "rookie"
      ? Math.min(3 + cycle, 4)
      : theme === "pulse"
        ? Math.min(3 + cycle, 5)
        : Math.min(4 + cycle, 5);
  const cols =
    theme === "rookie"
      ? Math.min(7 + cycle, 9)
      : theme === "pulse"
        ? Math.min(8 + cycle, 10)
        : Math.min(9 + cycle, 11);
  const pool: Array<Exclude<EnemyKind, "APEX">> =
    theme === "rookie"
      ? ["O", "L", "J", "T"]
      : theme === "pulse"
        ? ["I", "T", "S", "Z", "J", "L"]
        : ["I", "T", "L", "O", "J", "S", "Z"];
  const hpBoost =
    theme === "rookie"
      ? cycle + Math.max(0, waveInBlock - 3)
      : theme === "pulse"
        ? cycle * 2 + waveInBlock
        : cycle * 3 + waveInBlock;
  const profile = getFormationProfile(theme, wave, waveInBlock);
  const maxEnemyHeight = Math.max(...pool.map((kind) => SHAPES[kind].length * 18));
  const startY = 52;
  const safeBottom = Math.min(BOARD_HEIGHT * 0.62, SCRAP_TOP - 62);
  const spacingY = Math.max(
    42,
    Math.min(
      theme === "apex" ? 62 : 66,
      (safeBottom - startY - maxEnemyHeight) / Math.max(1, rows - 1)
    )
  );
  const sidePadding = 86;
  const availableWidth = BOARD_WIDTH - sidePadding * 2;
  const spacingX = Math.max(
    96,
    Math.min(128, cols > 1 ? availableWidth / (cols - 1) : availableWidth)
  );
  const formationWidth = cols > 1 ? (cols - 1) * spacingX : 0;
  const startX = Math.max(sidePadding - 28, BOARD_WIDTH / 2 - formationWidth / 2 - 28);
  const enemies: Enemy[] = [];
  let nextId = startId;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const kind = pool[(wave + row * cols + col + cycle) % pool.length];
      const baseX = startX + col * spacingX + (row % 2) * 8;
      const baseY = startY + row * spacingY;
      const { x, y } = applyFormationProfile(baseX, baseY, col, row, cols, rows, profile);
      enemies.push(createRegularEnemy(kind, x, y, nextId, hpBoost));
      nextId += 1;
    }
  }

  return {
    enemies,
    nextId,
    formationSpeed:
      theme === "rookie"
        ? 50 + cycle * 6 + waveInBlock * 2
        : theme === "pulse"
          ? 60 + cycle * 8 + waveInBlock * 3
          : 68 + cycle * 9 + waveInBlock * 3,
    theme,
    bossCount: 0,
    finale: false,
  };
}

function getFormationProfile(theme: BossTheme, wave: number, waveInBlock: number): FormationProfile {
  const rotation =
    theme === "rookie"
      ? ["line", "arc", "flanks"]
      : theme === "pulse"
        ? ["line", "vee", "arc", "flanks"]
        : ["vee", "arc", "flanks", "line"];

  return rotation[(wave + waveInBlock) % rotation.length] as FormationProfile;
}

function applyFormationProfile(
  baseX: number,
  baseY: number,
  col: number,
  row: number,
  cols: number,
  rows: number,
  profile: FormationProfile
) {
  const centerCol = (cols - 1) / 2;
  const centerRow = (rows - 1) / 2;
  const dx = col - centerCol;
  const dy = row - centerRow;

  if (profile === "arc") {
    return {
      x: baseX,
      y: baseY + Math.abs(dx) * 10 - row * 2,
    };
  }

  if (profile === "vee") {
    return {
      x: baseX,
      y: baseY + Math.abs(dx) * 12 + Math.max(0, dy) * 2,
    };
  }

  if (profile === "flanks") {
    return {
      x: baseX + Math.sign(dx || 1) * Math.min(26, Math.abs(dx) * 6),
      y: baseY + (Math.abs(dx) >= centerCol - 1 ? -14 : 8),
    };
  }

  return {
    x: baseX,
    y: baseY,
  };
}

function createFinalePreludeWave(wave: number, startId: number): WaveDefinition {
  const theme = wave === 95 ? "rookie" : wave === 96 ? "pulse" : wave === 97 ? "apex" : "apex";
  const cycle = 4;
  const waveInBlock = wave - 94;
  return createFormationWave(wave, theme, cycle, waveInBlock + 6, startId);
}

/** Construit la composition d'une vague complète à partir de son index. */
export function createWave(wave: number, startId: number): WaveDefinition {
  if (wave >= 98) {
    const theme = wave === 98 ? "rookie" : wave === 99 ? "pulse" : "apex";
    return createBossWave(theme, 4, startId, 1, true);
  }

  if (wave >= 95) {
    return createFinalePreludeWave(wave, startId);
  }

  const blockIndex = Math.floor((wave - 1) / 10);
  const waveInBlock = ((wave - 1) % 10) + 1;
  const theme = getBlockTheme(blockIndex);
  const cycle = getCycle(blockIndex);

  if (waveInBlock === 10) {
    return createBossWave(theme, cycle, startId, cycle);
  }

  return createFormationWave(wave, theme, cycle, waveInBlock, startId);
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
    formationPulse: 0,
    enemies: wave.enemies,
    playerBullets: [],
    enemyBullets: [],
    drops: [],
    queuedDrops: [],
    telegraphs: [],
    impacts: [],
    scrapGrid: createEmptyScrapGrid(),
    flashTimer: 0,
    hitStopTimer: 0,
    boardShakeTimer: 0,
    lineBurstFxTimer: 0,
    message: getWaveStartMessage(1, wave.theme, wave.bossCount, wave.bossTheme, wave.finale),
    messageTimer: 4,
    lastHorizontalDir: 1,
    playerTilt: 0,
    playerDriftX: 0,
    playerThrust: 0,
    playerDashFx: 0,
    slowFieldTimer: 0,
    waveTransition: 5.2,
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
  const isChapterStart = nextWave === 1 || [11, 21, 31, 41, 51, 61, 71, 81, 91, 95, 98].includes(nextWave);

  return {
    ...next,
    wave: nextWave,
    waveTheme: wave.theme,
    enemies: wave.enemies,
    nextEntityId: wave.nextId,
    formationSpeed: wave.formationSpeed,
    formationDir: nextWave % 2 === 0 ? -1 : 1,
    formationPulse: 0,
    enemyShotCooldown: wave.bossCount > 0 ? 1.05 : 1.25,
    enemyDashCooldown: wave.theme === "rookie" ? 1.8 : wave.theme === "pulse" ? 1.45 : 1.25,
    playerBullets: [],
    enemyBullets: [],
    drops: [],
    queuedDrops: [],
    telegraphs: [],
    bombs: Math.min(MAX_BOMBS, next.bombs + 1),
    hitStopTimer: 0,
    boardShakeTimer: 0,
    lineBurstFxTimer: 0,
    waveTransition: isChapterStart ? 5.2 : wave.bossCount > 0 ? 4.2 : 3,
    message: getWaveStartMessage(nextWave, wave.theme, wave.bossCount, wave.bossTheme, wave.finale),
    messageTimer: 4,
  };
}
