import type { ShapeMatrix } from "./shapes";

export function rotateMatrix(matrix: ShapeMatrix): ShapeMatrix {
  const rotated = matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
  return rotated;
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

        if (newY >= board.length || newX < 0 || newX >= board[0].length) {
          return true;
        }

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

export function clearFullLines(board: number[][]) {
  const newBoard = board.filter((row) => row.some((cell) => cell === 0));
  const linesCleared = board.length - newBoard.length;

  while (newBoard.length < board.length) {
    newBoard.unshift(Array(board[0].length).fill(0));
  }

  return { newBoard, linesCleared };
}
