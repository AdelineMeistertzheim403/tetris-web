// Liste canonique des modes supportés côté frontend.
export type GameMode =
  | "CLASSIQUE"
  | "SPRINT"
  | "VERSUS"
  | "BRICKFALL_SOLO"
  | "BRICKFALL_VERSUS"
  | "ROGUELIKE"
  | "ROGUELIKE_VERSUS"
  | "PUZZLE"
  | "TETROMAZE";

export const GAME_MODES: GameMode[] = [
  "CLASSIQUE",
  "SPRINT",
  "VERSUS",
  "BRICKFALL_SOLO",
  "BRICKFALL_VERSUS",
  "ROGUELIKE",
  "ROGUELIKE_VERSUS",
  "PUZZLE",
  "TETROMAZE",
];

export const TOTAL_GAME_MODES = GAME_MODES.length;

// Tous les modes qui publient un score.
export const SCORED_GAME_MODES: GameMode[] = GAME_MODES.filter(
  (mode) => mode !== "PUZZLE" && mode !== "TETROMAZE"
);
export const TOTAL_SCORED_MODES = SCORED_GAME_MODES.length;
