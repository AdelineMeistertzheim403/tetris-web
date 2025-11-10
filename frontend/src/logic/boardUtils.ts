import type { ShapeMatrix } from "./shapes";
import { SHAPES, COLORS } from "./shapes";

export function rotateMatrix(matrix: ShapeMatrix): ShapeMatrix {
  const size = matrix.length;
  const rotated = matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
  return rotated;
}

export function getRandomPiece() {
  const keys = Object.keys(SHAPES);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const shape = SHAPES[randomKey];
  const color = COLORS[randomKey];

  return {
    shape,
    color,
    x: 3, // position initiale
    y: 0,
    type: randomKey,
  };
}

export function checkCollision(
  board: number[][],
  shape: ShapeMatrix,
  posX: number,
  posY: number
): boolean {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const newY = posY + y;
        const newX = posX + x;

        // Si on sort des limites verticales ou horizontales
        if (newY >= board.length || newX < 0 || newX >= board[0].length) {
          return true;
        }

        // Si on touche un bloc déjà existant
        if (newY >= 0 && board[newY][newX]) {
          return true;
        }
      }
    }
  }
  return false;
}

export function mergePiece(
  board: number[][],
  shape: ShapeMatrix,
  posX: number,
  posY: number
): number[][] {
  const newBoard = board.map((row) => [...row]);
  shape.forEach((row, y) => {
    row.forEach((val, x) => {
      if (val && posY + y >= 0 && posY + y < newBoard.length) {
        newBoard[posY + y][posX + x] = 1;
      }
    });
  });
  return newBoard;
}

export function canRotate(
  board: number[][],
  shape: number[][],
  posX: number,
  posY: number
) {
  return !checkCollision(board, shape, posX, posY);
}

export function clearFullLines(board: number[][]) {
  const newBoard = board.filter((row) => row.some((cell) => cell === 0));
  const linesCleared = board.length - newBoard.length;

  // Ajoute des lignes vides en haut
  while (newBoard.length < board.length) {
    newBoard.unshift(Array(board[0].length).fill(0));
  }

  return { newBoard, linesCleared };
}


