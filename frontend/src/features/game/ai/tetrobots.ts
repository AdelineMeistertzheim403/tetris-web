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
    reactionMs: 62,
    mistakeRate: 0.02,
    tone: "aggressive",
    egoLevel: 90,
    weights: {
      totalHeight: 0.57,
      holes: 1.15,
      bumpiness: 0.28,
      maxHeight: 0.65,
      linesCleared: 1.42,
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
  rng: () => number = Math.random
): TetrobotsPlan | null {
  // 1) Génère tous les placements atteignables (x + rotation),
  // 2) Simule la chute + clear,
  // 3) Score chaque board,
  // 4) Choisit le meilleur (ou une mauvaise option simulée selon la difficulté).
  const rotations = getUniqueRotations(piece.shape);
  const cols = board[0]?.length ?? 10;
  const candidates: Array<{ score: number; plan: TetrobotsPlan }> = [];

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
      const score = evaluateBoard(newBoard, linesCleared, personality.weights);
      candidates.push({ score, plan: { targetX: x, targetShape: shape } });
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
