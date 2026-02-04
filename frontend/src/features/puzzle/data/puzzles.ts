import type { PuzzleDefinition } from "../types/Puzzle";

const EMPTY_ROW = "..........";

const boardFromStrings = (rows: string[]): number[][] => {
  const normalized = [...rows];
  while (normalized.length < 20) {
    normalized.unshift(EMPTY_ROW);
  }
  const trimmed = normalized.slice(-20);
  return trimmed.map((row) =>
    row
      .padEnd(10, ".")
      .slice(0, 10)
      .split("")
      .map((cell) => (cell === "." ? 0 : 1))
  );
};

export const PUZZLES: PuzzleDefinition[] = [
  {
    id: "puzzle-001",
    name: "Ligne Unique",
    description: "Complète la dernière ligne en un seul coup.",
    initialBoard: boardFromStrings([
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      "######....",
    ]),
    sequence: ["I"],
    maxMoves: 1,
    allowHold: false,
    optimalMoves: 1,
    objectives: [{ type: "clear_lines", count: 1 }],
  },
  {
    id: "puzzle-002",
    name: "Survie Express",
    description: "Survis à une courte séquence sans utiliser de Hold.",
    initialBoard: boardFromStrings([
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
      EMPTY_ROW,
    ]),
    sequence: ["S", "Z", "T", "O"],
    maxMoves: 4,
    allowHold: false,
    optimalMoves: 4,
    objectives: [{ type: "survive_pieces", count: 4 }],
  },
];
