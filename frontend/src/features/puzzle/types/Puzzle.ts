// Types partages utilises par ce module.
export type PuzzleObjective =
  | { type: "clear_lines"; count: number }
  | { type: "free_zone"; x: number; y: number; width: number; height: number }
  | { type: "survive_pieces"; count: number };

export type PuzzleDefinition = {
  id: string;
  name: string;
  description: string;
  difficulty?: "easy" | "normal" | "hard" | "very hard" | "extreme";
  sortOrder?: number;
  initialBoard: number[][];
  sequence: string[];
  maxMoves?: number;
  allowHold?: boolean;
  optimalMoves?: number;
  contracts?: {
    noLineClears?: boolean;
  };
  objectives: PuzzleObjective[];
};
