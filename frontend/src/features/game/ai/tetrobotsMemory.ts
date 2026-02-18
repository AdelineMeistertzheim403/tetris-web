export type TetrobotsMemoryMode = "VERSUS" | "ROGUELIKE_VERSUS";

/**
 * Guide de tuning Tetrobots (mémoire + adaptatif)
 *
 * `TETROBOTS_MEMORY_TIMING`
 * - `adaptiveMinMatchMs`: délai mini avant d'autoriser les répliques adaptatives.
 * - `adaptiveEventCooldownMs`: cooldown global entre deux événements adaptatifs.
 * - `adaptiveMinLines`: volume de jeu minimum avant analyse.
 * - `trollCooldownMs`: fréquence max des répliques de score/troll.
 *
 * `TETROBOTS_ADAPTIVE_THRESHOLDS`
 * - `comboSpam`: sensibilité à un style combo offensif.
 * - `highRisk`: détection des situations où les deux joueurs sont proches du danger.
 * - `failedAdaptation`: seuil de blunder considéré comme échec d'adaptation.
 * - `strategyShift`: fréquence minimale des annonces de changement de stratégie.
 * - `panicMode` / `recovered`: entrée/sortie de panique du bot.
 * - `detectAggressive` / `detectDefensive`: classification du style joueur.
 * - `exploitPattern`: détection d'un pattern exploitable.
 * - `analysisComplete`: seuil à partir duquel le bot considère son modèle stabilisé.
 *
 * Recommandation pratique:
 * - Diminuer `minMatchMs`/`minLines` => bot plus bavard et réactif.
 * - Augmenter `minAggression`/`minComboStreak` => détections plus strictes.
 * - Augmenter `minIntervalMs` => moins de spam vocal.
 *
 * Mini tableau presets:
 *
 * | Preset      | But UX                      | Ajustements recommandés |
 * |-------------|-----------------------------|--------------------------|
 * | Arcade      | Bot expressif et vivant     | `adaptiveMinMatchMs` -20%, `adaptiveMinLines` -2, `minIntervalMs` -15% |
 * | Compétitif  | Bot discret et pertinent    | `adaptiveMinMatchMs` +20%, `adaptiveMinLines` +2, `minAggression` +15%, `minComboStreak` +1 |
 * | Narratif    | Dialogues plus scénarisés   | `trollCooldownMs` +25%, `analysisComplete.minMatchMs` -15% |
 */
type TetrobotsMemoryTiming = {
  adaptiveMinMatchMs: number;
  adaptiveEventCooldownMs: number;
  adaptiveMinLines: number;
  trollCooldownMs: number;
};

type AdaptiveEventGate = {
  minMatchMs: number;
  minLines: number;
  minIntervalMs?: number;
};

type TetrobotsAdaptiveThresholds = {
  comboSpam: AdaptiveEventGate & {
    minComboStreak: number;
    minAggression: number;
    minChain?: number;
  };
  highRisk: AdaptiveEventGate & {
    botDangerBuffer: number;
  };
  failedAdaptation: AdaptiveEventGate & {
    minStrategyShifts: number;
  };
  strategyShift: AdaptiveEventGate;
  panicMode: AdaptiveEventGate;
  recovered: AdaptiveEventGate;
  detectAggressive: AdaptiveEventGate & {
    minAggression: number;
  };
  detectDefensive: AdaptiveEventGate & {
    maxAvgHeight: number;
    maxAggression: number;
  };
  exploitPattern: AdaptiveEventGate & {
    minStrategyShifts: number;
    minSamples: number;
  };
  analysisComplete: AdaptiveEventGate & {
    minStrategyShifts: number;
  };
};

export const TETROBOTS_MEMORY_TIMING: Record<
  TetrobotsMemoryMode,
  TetrobotsMemoryTiming
> = {
  VERSUS: {
    adaptiveMinMatchMs: 12_000,
    adaptiveEventCooldownMs: 4_800,
    adaptiveMinLines: 8,
    trollCooldownMs: 12_000,
  },
  ROGUELIKE_VERSUS: {
    adaptiveMinMatchMs: 15_000,
    adaptiveEventCooldownMs: 5_200,
    adaptiveMinLines: 10,
    trollCooldownMs: 12_000,
  },
};

export const TETROBOTS_ADAPTIVE_THRESHOLDS: Record<
  TetrobotsMemoryMode,
  TetrobotsAdaptiveThresholds
> = {
  VERSUS: {
    comboSpam: {
      minMatchMs: 16_000,
      minLines: 10,
      minComboStreak: 6,
      minAggression: 18,
      minChain: 3,
    },
    highRisk: {
      minMatchMs: 20_000,
      minLines: 12,
      botDangerBuffer: 2,
    },
    failedAdaptation: {
      minMatchMs: 26_000,
      minLines: 14,
      minStrategyShifts: 2,
    },
    strategyShift: {
      minMatchMs: 14_000,
      minLines: 10,
    },
    panicMode: {
      minMatchMs: 18_000,
      minLines: 12,
      minIntervalMs: 6_000,
    },
    recovered: {
      minMatchMs: 18_000,
      minLines: 12,
      minIntervalMs: 5_000,
    },
    detectAggressive: {
      minMatchMs: 18_000,
      minLines: 12,
      minAggression: 22,
    },
    detectDefensive: {
      minMatchMs: 18_000,
      minLines: 10,
      maxAvgHeight: 8,
      maxAggression: 12,
    },
    exploitPattern: {
      minMatchMs: 24_000,
      minLines: 14,
      minStrategyShifts: 2,
      minSamples: 30,
    },
    analysisComplete: {
      minMatchMs: 45_000,
      minLines: 20,
      minIntervalMs: 8_000,
      minStrategyShifts: 4,
    },
  },
  ROGUELIKE_VERSUS: {
    comboSpam: {
      minMatchMs: 20_000,
      minLines: 14,
      minComboStreak: 6,
      minAggression: 20,
    },
    highRisk: {
      minMatchMs: 24_000,
      minLines: 16,
      botDangerBuffer: 2,
    },
    failedAdaptation: {
      minMatchMs: 28_000,
      minLines: 18,
      minStrategyShifts: 2,
    },
    strategyShift: {
      minMatchMs: 18_000,
      minLines: 12,
    },
    panicMode: {
      minMatchMs: 22_000,
      minLines: 14,
      minIntervalMs: 6_500,
    },
    recovered: {
      minMatchMs: 22_000,
      minLines: 14,
      minIntervalMs: 5_500,
    },
    detectAggressive: {
      minMatchMs: 22_000,
      minLines: 14,
      minAggression: 24,
    },
    detectDefensive: {
      minMatchMs: 22_000,
      minLines: 12,
      maxAvgHeight: 8,
      maxAggression: 12,
    },
    exploitPattern: {
      minMatchMs: 28_000,
      minLines: 18,
      minStrategyShifts: 2,
      minSamples: 36,
    },
    analysisComplete: {
      minMatchMs: 55_000,
      minLines: 24,
      minIntervalMs: 8_500,
      minStrategyShifts: 4,
    },
  },
};

/**
 * Nombre de trous (cases vides sous un bloc) sur un board.
 */
export function countBoardHoles(board: number[][] | null): number {
  if (!board || board.length === 0 || board[0].length === 0) return 0;
  const rows = board.length;
  const cols = board[0].length;
  let holes = 0;
  for (let x = 0; x < cols; x += 1) {
    let seen = false;
    for (let y = 0; y < rows; y += 1) {
      if (board[y][x] !== 0) seen = true;
      else if (seen) holes += 1;
    }
  }
  return holes;
}

/**
 * Ratio d'occupation de la moitié gauche (0: droite, 1: gauche).
 */
export function getLeftBias(board: number[][] | null): number {
  if (!board || board.length === 0 || board[0].length === 0) return 0.5;
  const cols = board[0].length;
  const split = Math.floor(cols / 2);
  let left = 0;
  let total = 0;
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!board[y][x]) continue;
      total += 1;
      if (x < split) left += 1;
    }
  }
  if (total === 0) return 0.5;
  return left / total;
}
