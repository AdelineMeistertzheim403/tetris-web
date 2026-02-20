import type { TetromazeLevel } from "../types";

// Niveau de référence du mode Tetromaze.
// La grille utilise:
// - '#' = mur
// - '.' = couloir avec data orb potentiel
// - autres caractères = décor/repères visuels
export const defaultTetromazeLevel: TetromazeLevel = {
  id: "tmz-001",
  grid: [
    "###################",
    "#........#........#",
    "#.###.##.#.##.###.#",
    "#.#...#..#..#...#.#",
    "#.#.####.#.####.#.#",
    "#.#.............#.#",
    "#.#####.#.#.#####.#",
    "#.....#.#.#.#.....#",
    "###.#.#.#.#.#.#.###",
    "#...#...#...#...#.#",
    "#.###.#####.###.#.#",
    "#.#.....#.....#.#.#",
    "#.#.###.#.###.#.#.#",
    "#...#.......#...#.#",
    "#.#.#.#####.#.#.#.#",
    "#.#.#...#...#.#.#.#",
    "#.#.###.#.###.#.#.#",
    "#.....#...#...#...#",
    "#.###.#####.###.#.#",
    "#........P........#",
    "###################",
  ],
  playerSpawn: { x: 9, y: 19 },
  botSpawns: [
    { x: 8, y: 3 },
    { x: 9, y: 3 },
    { x: 10, y: 3 },
  ],
  botHome: {
    x: 7,
    y: 2,
    width: 5,
    height: 4,
    gate: { x: 8, y: 5, width: 3 },
  },
  powerOrbs: [
    { x: 1, y: 1, type: "OVERCLOCK" },
    { x: 17, y: 1, type: "GLITCH" },
    { x: 1, y: 19, type: "HACK" },
    { x: 17, y: 19, type: "LOOP" },
  ],
  loopPairs: [{ a: { x: 1, y: 10 }, b: { x: 17, y: 10 } }],
};
