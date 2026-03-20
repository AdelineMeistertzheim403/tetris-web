import {
  BOARD_WIDTH,
  DASH_COOLDOWN,
  DASH_DISTANCE,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  clamp,
} from "../model";
import type { GameState, InputState } from "../model";
import {
  advanceEnemyFormation,
  advanceEnemyProjectiles,
  applyReadyTelegraphs,
  queueEnemyDashAttack,
  queueEnemyFire,
} from "./pixelInvasionEnemyCombat";
import { resolveIncomingDamage } from "./pixelInvasionDamage";
import {
  escalateMessage,
  getAmbientCombatMessage,
  getGameOverMessage,
} from "./pixelInvasionMessages";
import {
  advancePlayerProjectiles,
  applyBomb,
  firePlayerWeapon,
  resolvePlayerHits,
} from "./pixelInvasionPlayerCombat";
import {
  createInitialState as createWaveInitialState,
  resolveWaveCompletion,
} from "./pixelInvasionWaves";

function tickTransientState(state: GameState, dt: number): GameState {
  return {
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
}

/** Re-export de l'état initial pour garder une API stable côté hook/UI. */
export const createInitialState = createWaveInitialState;

/** Convertit l'état brut du clavier en direction horizontale normalisée. */
function getHorizontalInput(input: InputState) {
  let horizontal = 0;

  if (input.left) horizontal -= 1;
  if (input.right) horizontal += 1;

  return horizontal;
}

/** Applique l'inertie visuelle du vaisseau et le déplacement horizontal réel. */
function updatePlayerMovement(next: GameState, horizontal: number, dt: number) {
  if (horizontal !== 0) {
    next.lastHorizontalDir = horizontal;
  }

  const targetTilt = horizontal * 10;
  const targetDriftX = horizontal * 6;
  const targetThrust = horizontal !== 0 ? 1 : 0;

  next.playerTilt += (targetTilt - next.playerTilt) * Math.min(1, dt * 10);
  next.playerDriftX += (targetDriftX - next.playerDriftX) * Math.min(1, dt * 12);
  next.playerThrust += (targetThrust - next.playerThrust) * Math.min(1, dt * 12);
  next.playerX = clamp(next.playerX + horizontal * PLAYER_SPEED * dt, 14, BOARD_WIDTH - PLAYER_WIDTH - 14);
}

/** Déclenche un dash instantané sur le dernier axe horizontal connu. */
function maybeApplyPlayerDash(next: GameState, input: InputState, horizontal: number) {
  if (!input.dash || next.dashCooldown !== 0) return;

  const dashDir = horizontal !== 0 ? horizontal : next.lastHorizontalDir;
  next.playerX = clamp(next.playerX + dashDir * DASH_DISTANCE, 14, BOARD_WIDTH - PLAYER_WIDTH - 14);
  next.dashCooldown = DASH_COOLDOWN;
  next.playerDashFx = 0.22;
}

/** Réinitialise la combo quand la fenêtre de continuation a expiré. */
function maybeResetCombo(next: GameState) {
  if (next.comboTimer === 0 && next.combo !== 0) {
    next.combo = 0;
  }
}

/** Réinjecte un message d'ambiance quand le combat devient calme. */
function maybeSetAmbientMessage(next: GameState) {
  if (next.messageTimer === 0 && next.waveTransition === 0) {
    next.message = getAmbientCombatMessage(next.wave);
    next.messageTimer = 4.2;
  }
}

/** Normalise l'état terminal de défaite pour éviter les branches dupliquées. */
function createDefeatState(next: GameState): GameState {
  return {
    ...next,
    running: false,
    gameOver: true,
    shield: 0,
    message: getGameOverMessage(),
    messageTimer: 99,
  };
}

/**
 * Tick principal de Pixel Invasion.
 * La fonction orchestre les phases de simulation sans embarquer les détails métier
 * de chaque sous-système.
 */
export function stepGame(state: GameState, input: InputState, deltaMs: number): GameState {
  if (!state.running || state.gameOver || state.victory) return state;

  const dt = deltaMs / 1000;
  const next = tickTransientState(state, dt);

  maybeResetCombo(next);

  const horizontal = getHorizontalInput(input);
  updatePlayerMovement(next, horizontal, dt);
  maybeApplyPlayerDash(next, input, horizontal);

  if (input.shoot && next.shotCooldown === 0) {
    firePlayerWeapon(next);
  }

  if (input.bomb && next.bombs > 0 && next.bombCooldown === 0) {
    applyBomb(next);
  }

  const playerCenterX = next.playerX + PLAYER_WIDTH / 2;
  const slowMultiplier = next.slowFieldTimer > 0 ? 0.58 : 1;

  queueEnemyDashAttack(next, playerCenterX);
  advanceEnemyFormation(next, dt, slowMultiplier);
  advancePlayerProjectiles(next, dt);
  advanceEnemyProjectiles(next, dt, slowMultiplier);
  queueEnemyFire(next, playerCenterX, slowMultiplier);
  applyReadyTelegraphs(next, playerCenterX);
  resolvePlayerHits(next);

  const tookDamage = resolveIncomingDamage(next);
  if (tookDamage) {
    next.flashTimer = 0.22;
    next.recentDanger = true;
    next.message = escalateMessage(next);
    next.messageTimer = 2.8;
  } else {
    maybeSetAmbientMessage(next);
  }

  if (next.lives <= 0) {
    return createDefeatState(next);
  }

  if (next.enemies.length === 0) {
    return resolveWaveCompletion(next);
  }

  return next;
}
