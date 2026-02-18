import { checkCollision, clearFullLines, mergePiece, rotateMatrix } from "../logic/boardUtils";
import type { Piece } from "../types/Piece";

/**
 * Tetrobots AI (V1)
 *
 * Pipeline de décision (à chaque pièce):
 * 1) Générer les rotations uniques de la pièce courante.
 * 2) Énumérer les positions horizontales valides et simuler la chute.
 * 3) Évaluer le board obtenu via une heuristique (lignes, trous, hauteur, bumpiness).
 * 4) Choisir le meilleur placement (ou un "blunder" contrôlé selon la personnalité).
 *
 * Réglage de difficulté:
 * - `reactionMs`: vitesse d'action perçue.
 * - `mistakeRate`: fréquence d'erreurs simulées.
 * - `weights`: style de jeu (survie vs agressivité line clear).
 */
type HeuristicWeights = {
  // Plus la valeur est élevée, plus le bot pénalise/récompense ce critère.
  totalHeight: number;
  holes: number;
  bumpiness: number;
  maxHeight: number;
  linesCleared: number;
};

export type BotStrategy =
  | "neutral"
  | "aggressive"
  | "defensive"
  | "pressure"
  | "panic";

export type TetrobotsAdaptiveContext = {
  playerAvgStackHeight: number;
  playerAggressionScore: number;
};
type TetrobotsPersonalityId = TetrobotsPersonality["id"];

export type TetrobotsPersonality = {
  id: "rookie" | "balanced" | "apex";
  name: string;
  difficultyLabel: "Facile" | "Normal" | "Difficile";
  description: string;
  reactionMs: number;
  mistakeRate: number;
  tone: "friendly" | "neutral" | "aggressive";
  egoLevel: number;
  weights: HeuristicWeights;
};

export type TetrobotsPlan = {
  targetX: number;
  targetShape: number[][];
  isBlunder?: boolean;
  strategy: BotStrategy;
};

const PERSONALITIES: TetrobotsPersonality[] = [
  // Les personnalités combinent vitesse de réaction + tendance à l'erreur + pondérations.
  {
    id: "rookie",
    name: "Tetrobots Rookie",
    difficultyLabel: "Facile",
    description: "Calme mais imprécis. Il survit, sans trop optimiser.",
    reactionMs: 170,
    mistakeRate: 0.2,
    tone: "friendly",
    egoLevel: 20,
    weights: {
      totalHeight: 0.43,
      holes: 0.88,
      bumpiness: 0.22,
      maxHeight: 0.45,
      linesCleared: 0.72,
    },
  },
  {
    id: "balanced",
    name: "Tetrobots Pulse",
    difficultyLabel: "Normal",
    description: "Profil polyvalent, bon en attaque et en stabilité.",
    reactionMs: 105,
    mistakeRate: 0.08,
    tone: "neutral",
    egoLevel: 55,
    weights: {
      totalHeight: 0.49,
      holes: 0.95,
      bumpiness: 0.24,
      maxHeight: 0.53,
      linesCleared: 1.1,
    },
  },
  {
    id: "apex",
    name: "Tetrobots Apex",
    difficultyLabel: "Difficile",
    description: "Très agressif et rapide, minimise les erreurs.",
    reactionMs: 56,
    mistakeRate: 0.01,
    tone: "aggressive",
    egoLevel: 90,
    weights: {
      totalHeight: 0.57,
      holes: 1.15,
      bumpiness: 0.28,
      maxHeight: 0.65,
      linesCleared: 1.62,
    },
  },
];

const matrixKey = (shape: number[][]) => shape.map((row) => row.join("")).join("|");

const getUniqueRotations = (shape: number[][]) => {
  // Évite d'évaluer deux fois la même rotation (ex: pièce O).
  const rotations: number[][][] = [];
  const seen = new Set<string>();
  let current = shape;
  for (let i = 0; i < 4; i += 1) {
    const key = matrixKey(current);
    if (!seen.has(key)) {
      seen.add(key);
      rotations.push(current);
    }
    current = rotateMatrix(current);
  }
  return rotations;
};

const getColumnHeights = (board: number[][]) => {
  // Hauteur de chaque colonne mesurée depuis le bas.
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const heights = Array(cols).fill(0);

  for (let x = 0; x < cols; x += 1) {
    let y = 0;
    while (y < rows && board[y][x] === 0) y += 1;
    heights[x] = rows - y;
  }

  return heights;
};

const getHoleCount = (board: number[][]) => {
  // Un trou = case vide sous au moins un bloc dans la même colonne.
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  let holes = 0;

  for (let x = 0; x < cols; x += 1) {
    let seenBlock = false;
    for (let y = 0; y < rows; y += 1) {
      if (board[y][x] !== 0) {
        seenBlock = true;
      } else if (seenBlock) {
        holes += 1;
      }
    }
  }

  return holes;
};

const evaluateBoard = (
  board: number[][],
  linesCleared: number,
  weights: HeuristicWeights
) => {
  // Score heuristique classique: on récompense les lignes, on pénalise instabilité/risque.
  const heights = getColumnHeights(board);
  const totalHeight = heights.reduce((sum, h) => sum + h, 0);
  const maxHeight = heights.reduce((max, h) => (h > max ? h : max), 0);
  const bumpiness = heights
    .slice(1)
    .reduce((sum, h, idx) => sum + Math.abs(h - heights[idx]), 0);
  const holes = getHoleCount(board);

  return (
    linesCleared * weights.linesCleared -
    totalHeight * weights.totalHeight -
    holes * weights.holes -
    bumpiness * weights.bumpiness -
    maxHeight * weights.maxHeight
  );
};

const computeBotMaxHeight = (board: number[][]) => {
  const heights = getColumnHeights(board);
  return heights.reduce((max, h) => (h > max ? h : max), 0);
};

type StrategyThresholds = {
  pressureHeight: number;
  panicHeight: number;
  defensiveAggression: number;
  aggressiveHeight: number;
  aggressiveAggressionCap: number;
};

type LineClearBias = {
  safeHeightCap: number;
  singlePenalty: number;
  doublePenalty: number;
  tripleBonus: number;
  tetrisBonus: number;
};

const LINE_CLEAR_BIAS: Record<TetrobotsPersonalityId, LineClearBias> = {
  rookie: {
    safeHeightCap: 9,
    singlePenalty: 0.08,
    doublePenalty: 0.04,
    tripleBonus: 0.9,
    tetrisBonus: 1.4,
  },
  balanced: {
    safeHeightCap: 10,
    singlePenalty: 0.18,
    doublePenalty: 0.12,
    tripleBonus: 1.7,
    tetrisBonus: 2.9,
  },
  apex: {
    safeHeightCap: 11,
    singlePenalty: 0.3,
    doublePenalty: 0.22,
    tripleBonus: 2.35,
    tetrisBonus: 4.6,
  },
};

const getLineClearStrategyMultiplier = (strategy: BotStrategy) => {
  if (strategy === "pressure") return 1.45;
  if (strategy === "aggressive") return 1.3;
  if (strategy === "defensive") return 0.9;
  if (strategy === "panic") return 0.6;
  return 1;
};

const getLineClearBiasScore = (
  personalityId: TetrobotsPersonalityId,
  strategy: BotStrategy,
  linesCleared: number,
  postMaxHeight: number
) => {
  if (linesCleared <= 0) return 0;
  const bias = LINE_CLEAR_BIAS[personalityId];
  const strategyMult = getLineClearStrategyMultiplier(strategy);
  const isUnsafeStack = postMaxHeight >= bias.safeHeightCap;
  const penaltyMult = isUnsafeStack || strategy === "panic" ? 0.2 : 1;

  if (linesCleared === 1) return -bias.singlePenalty * penaltyMult;
  if (linesCleared === 2) return -bias.doublePenalty * penaltyMult;
  if (linesCleared === 3) return bias.tripleBonus * strategyMult;
  if (linesCleared >= 4) return bias.tetrisBonus * strategyMult;
  return 0;
};

const STRATEGY_THRESHOLDS: Record<TetrobotsPersonalityId, StrategyThresholds> = {
  rookie: {
    pressureHeight: 18.3,
    panicHeight: 17,
    defensiveAggression: 34,
    aggressiveHeight: 7,
    aggressiveAggressionCap: 7,
  },
  balanced: {
    pressureHeight: 17.2,
    panicHeight: 18,
    defensiveAggression: 22,
    aggressiveHeight: 8,
    aggressiveAggressionCap: 9,
  },
  apex: {
    pressureHeight: 15.8,
    panicHeight: 19,
    defensiveAggression: 30,
    aggressiveHeight: 9.5,
    aggressiveAggressionCap: 14,
  },
};

const STRATEGY_WEIGHT_DELTAS: Record<
  TetrobotsPersonalityId,
  Partial<Record<BotStrategy, Partial<HeuristicWeights>>>
> = {
  rookie: {
    aggressive: { linesCleared: 0.25, holes: -0.03 },
    pressure: { linesCleared: 0.35, maxHeight: -0.03 },
    defensive: { holes: 0.25, maxHeight: 0.2, totalHeight: 0.05 },
    panic: { holes: 0.35, maxHeight: 0.35, totalHeight: 0.18, linesCleared: -0.08 },
  },
  balanced: {
    aggressive: { linesCleared: 0.45, bumpiness: -0.02 },
    pressure: { linesCleared: 0.6, maxHeight: -0.05 },
    defensive: { holes: 0.3, maxHeight: 0.25, totalHeight: 0.08 },
    panic: { holes: 0.45, maxHeight: 0.4, totalHeight: 0.2 },
  },
  apex: {
    aggressive: { linesCleared: 1.0, holes: -0.08, totalHeight: -0.04 },
    pressure: { linesCleared: 1.25, maxHeight: -0.12 },
    defensive: { holes: 0.2, maxHeight: 0.12 },
    panic: { holes: 0.32, maxHeight: 0.25, totalHeight: 0.12, linesCleared: 0.05 },
  },
};

export function computeStrategy(
  personalityId: TetrobotsPersonalityId,
  player: TetrobotsAdaptiveContext,
  bot: { maxHeight: number }
): BotStrategy {
  const thresholds = STRATEGY_THRESHOLDS[personalityId];
  const aggression = Math.max(0, Math.min(60, player.playerAggressionScore));
  if (bot.maxHeight >= thresholds.panicHeight) return "panic";
  if (player.playerAvgStackHeight >= thresholds.pressureHeight) return "pressure";
  if (aggression >= thresholds.defensiveAggression) return "defensive";
  if (
    player.playerAvgStackHeight <= thresholds.aggressiveHeight &&
    aggression <= thresholds.aggressiveAggressionCap
  ) {
    return "aggressive";
  }
  return "neutral";
}

const getStrategyWeights = (
  personalityId: TetrobotsPersonalityId,
  baseWeights: HeuristicWeights,
  strategy: BotStrategy
): HeuristicWeights => {
  const weights = { ...baseWeights };
  const delta = STRATEGY_WEIGHT_DELTAS[personalityId][strategy];
  if (!delta) return weights;
  if (delta.totalHeight) weights.totalHeight += delta.totalHeight;
  if (delta.holes) weights.holes += delta.holes;
  if (delta.bumpiness) weights.bumpiness += delta.bumpiness;
  if (delta.maxHeight) weights.maxHeight += delta.maxHeight;
  if (delta.linesCleared) weights.linesCleared += delta.linesCleared;
  weights.totalHeight = Math.max(0.05, weights.totalHeight);
  weights.holes = Math.max(0.05, weights.holes);
  weights.bumpiness = Math.max(0.02, weights.bumpiness);
  weights.maxHeight = Math.max(0.05, weights.maxHeight);
  weights.linesCleared = Math.max(0.2, weights.linesCleared);
  return weights;
};

export const TETROBOTS_PERSONALITIES = PERSONALITIES;

export function getTetrobotsPersonality(
  id: TetrobotsPersonality["id"] | null | undefined
): TetrobotsPersonality {
  if (!id) return PERSONALITIES[1];
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[1];
}

export function computeTetrobotsPlan(
  board: number[][],
  piece: Piece,
  personality: TetrobotsPersonality,
  adaptiveContext?: TetrobotsAdaptiveContext,
  rng: () => number = Math.random
): TetrobotsPlan | null {
  // 1) Génère tous les placements atteignables (x + rotation),
  // 2) Simule la chute + clear,
  // 3) Score chaque board,
  // 4) Choisit le meilleur (ou une mauvaise option simulée selon la difficulté).
  const rotations = getUniqueRotations(piece.shape);
  const cols = board[0]?.length ?? 10;
  const candidates: Array<{ score: number; plan: TetrobotsPlan }> = [];
  const strategy = adaptiveContext
    ? computeStrategy(personality.id, adaptiveContext, { maxHeight: computeBotMaxHeight(board) })
    : "neutral";
  const dynamicWeights = getStrategyWeights(personality.id, personality.weights, strategy);

  rotations.forEach((shape) => {
    const shapeWidth = shape[0]?.length ?? 0;
    const minX = -shapeWidth + 1;
    const maxX = cols - 1;

    for (let x = minX; x <= maxX; x += 1) {
      if (checkCollision(board, shape, x, piece.y)) continue;

      let dropY = piece.y;
      while (!checkCollision(board, shape, x, dropY + 1)) {
        dropY += 1;
      }

      const merged = mergePiece(board, shape, x, dropY);
      const { newBoard, linesCleared } = clearFullLines(merged);
      const postMaxHeight = computeBotMaxHeight(newBoard);
      const score =
        evaluateBoard(newBoard, linesCleared, dynamicWeights) +
        getLineClearBiasScore(personality.id, strategy, linesCleared, postMaxHeight);
      candidates.push({ score, plan: { targetX: x, targetShape: shape, strategy } });
    }
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);
  const topCount = Math.min(3, candidates.length);
  const shouldBlunder = rng() < personality.mistakeRate;
  // Les erreurs du bot restent contrôlées: il choisit parmi le top 3 plutôt qu'au hasard total.
  if (shouldBlunder && topCount > 1) {
    const pick = 1 + Math.floor(rng() * (topCount - 1));
    return { ...candidates[pick].plan, isBlunder: true };
  }
  return { ...candidates[0].plan, isBlunder: false };
}

export function getShapeSignature(shape: number[][]) {
  return matrixKey(shape);
}
