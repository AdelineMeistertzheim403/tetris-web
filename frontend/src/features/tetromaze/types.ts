// Types de power orbs disponibles dans Tetromaze.
export type TetromazeOrbType = "OVERCLOCK" | "GLITCH" | "HACK" | "LOOP";

// Contrat d'un niveau Tetromaze:
// - `grid` encode les murs/couloirs
// - spawns joueur/bots
// - objets spéciaux (orbs, loops, maison des bots)
export type TetromazeLevel = {
  id: string;
  name?: string;
  grid: string[];
  playerSpawn: { x: number; y: number };
  botSpawns: { x: number; y: number }[];
  botKinds?: TetrobotKind[];
  botHome?: {
    x: number;
    y: number;
    width: number;
    height: number;
    gate?: { x: number; y: number; width: number };
  };
  powerOrbs: { x: number; y: number; type: TetromazeOrbType }[];
  loopPairs?: Array<{ a: { x: number; y: number }; b: { x: number; y: number } }>;
};

// Directions cardinales utilisées par le joueur et les bots.
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

// Profils de comportement des 3 Tetrobots.
export type TetrobotKind = "rookie" | "balanced" | "apex";
