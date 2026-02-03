export function applyBomb(
  board: number[][],
  centerX: number,
  centerY: number,
  radius = 1 // 1 → zone 3x3
) {
  const newBoard = board.map(row => [...row]);

  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      if (y >= 0 && y < newBoard.length && x >= 0 && x < newBoard[0].length) {
        newBoard[y][x] = 0;
      }
    }
  }

  return newBoard;
}
