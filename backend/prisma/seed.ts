import { readFile } from "fs/promises";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

type PuzzleSeedRow = {
  id: string;
  name: string;
  description: string;
  difficulty?: string;
  sortOrder?: number;
  active?: boolean;
  definition: {
    initialBoard: string[] | number[][];
    sequence: string[];
    maxMoves?: number;
    allowHold?: boolean;
    optimalMoves?: number;
    contracts?: {
      noLineClears?: boolean;
    };
    objectives: Array<Record<string, unknown>>;
  };
};

const prisma = new PrismaClient();
const EMPTY_ROW = "..........";

const normalizeBoard = (input: string[] | number[][]): number[][] => {
  if (Array.isArray(input) && typeof input[0] === "string") {
    const rows = input as string[];
    const normalized = [...rows];
    while (normalized.length < 20) normalized.unshift(EMPTY_ROW);
    const trimmed = normalized.slice(-20);
    return trimmed.map((row) =>
      row
        .padEnd(10, ".")
        .slice(0, 10)
        .split("")
        .map((cell) => (cell === "." ? 0 : 1))
    );
  }
  const rows = input as number[][];
  const base = Array.from({ length: 20 }, () => Array(10).fill(0));
  return base.map((row, y) =>
    row.map((_, x) => (typeof rows[y]?.[x] === "number" ? rows[y][x] : 0))
  );
};

async function loadPuzzles(): Promise<PuzzleSeedRow[]> {
  const path = resolve(__dirname, "puzzles.json");
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as PuzzleSeedRow[];
}

const generatedPuzzles: PuzzleSeedRow[] = [
  {
    id: "puzzle-gen-001",
    name: "No I / Double Zone",
    description: "Sans I, sans Hold, deux zones à libérer.",
    difficulty: "very hard",
    sortOrder: 20,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "##########",
        "##..##..##",
        "##..##..##",
        "##########"
      ],
      sequence: ["T", "S", "Z", "L", "J", "O"],
      maxMoves: 6,
      allowHold: false,
      optimalMoves: 6,
      objectives: [
        { type: "free_zone", x: 2, y: 17, width: 2, height: 2 },
        { type: "free_zone", x: 6, y: 17, width: 2, height: 2 }
      ]
    },
  },
  {
    id: "puzzle-gen-002",
    name: "No I / Triple Clear",
    description: "Sans I, sans Hold, clear 3 lignes.",
    difficulty: "very hard",
    sortOrder: 21,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "###.######",
        "###.######",
        "###.######",
        "###.######"
      ],
      sequence: ["T", "L", "J", "S", "Z", "O"],
      maxMoves: 6,
      allowHold: false,
      optimalMoves: 6,
      objectives: [{ type: "clear_lines", count: 3 }]
    },
  },
  {
    id: "puzzle-gen-003",
    name: "No I / Double Objective",
    description: "Sans I, sans Hold, clear 2 lignes + libérer une zone.",
    difficulty: "very hard",
    sortOrder: 22,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "#######..#",
        "#######..#",
        "#######..#",
        "#######..#"
      ],
      sequence: ["T", "L", "J", "S", "Z", "O"],
      maxMoves: 6,
      allowHold: false,
      optimalMoves: 6,
      objectives: [
        { type: "clear_lines", count: 2 },
        { type: "free_zone", x: 7, y: 16, width: 2, height: 2 }
      ]
    },
  },
  {
    id: "puzzle-gen-004",
    name: "Double Zone Serrée",
    description: "Sans I, sans Hold, deux zones 2x3.",
    difficulty: "very hard",
    sortOrder: 23,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "##########",
        "##..##..##",
        "##..##..##",
        "##..##..##",
        "##########"
      ],
      sequence: ["T", "S", "Z", "L", "J", "O", "T"],
      maxMoves: 7,
      allowHold: false,
      optimalMoves: 7,
      objectives: [
        { type: "free_zone", x: 2, y: 16, width: 2, height: 3 },
        { type: "free_zone", x: 6, y: 16, width: 2, height: 3 }
      ]
    },
  },
  {
    id: "puzzle-gen-005",
    name: "Sans I / Double Clear",
    description: "Sans I, sans Hold, clear 2 lignes.",
    difficulty: "very hard",
    sortOrder: 24,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "####.#####",
        "####.#####",
        "####.#####",
        "####.#####"
      ],
      sequence: ["T", "L", "J", "S", "Z", "O"],
      maxMoves: 6,
      allowHold: false,
      optimalMoves: 6,
      objectives: [{ type: "clear_lines", count: 2 }]
    },
  },
  {
    id: "puzzle-gen-006",
    name: "Sans I / Mixte",
    description: "Sans I, sans Hold, clear 1 ligne + libérer une zone.",
    difficulty: "very hard",
    sortOrder: 25,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "#####.####",
        "#####.####",
        "#####..###",
        "#####..###"
      ],
      sequence: ["T", "L", "J", "S", "Z", "O", "T"],
      maxMoves: 7,
      allowHold: false,
      optimalMoves: 7,
      objectives: [
        { type: "clear_lines", count: 1 },
        { type: "free_zone", x: 6, y: 18, width: 2, height: 2 }
      ]
    },
  },
  {
    id: "puzzle-gen-007",
    name: "Sans I / Survie 9",
    description: "Sans I, pas de Hold, survie longue.",
    difficulty: "very hard",
    sortOrder: 26,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "....##....",
        "...###....",
        "...###....",
        "..####...."
      ],
      sequence: ["J", "L", "S", "Z", "T", "O", "T", "S", "Z"],
      maxMoves: 9,
      allowHold: false,
      optimalMoves: 9,
      objectives: [{ type: "survive_pieces", count: 9 }]
    },
  },
  {
    id: "puzzle-gen-008",
    name: "Sans I / Double Fenêtre",
    description: "Sans I, pas de Hold, double fenêtre 2x2.",
    difficulty: "very hard",
    sortOrder: 27,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "##########",
        "##..##..##",
        "##..##..##",
        "##########"
      ],
      sequence: ["T", "S", "Z", "L", "J", "O", "T", "S"],
      maxMoves: 8,
      allowHold: false,
      optimalMoves: 8,
      objectives: [
        { type: "free_zone", x: 2, y: 17, width: 2, height: 2 },
        { type: "free_zone", x: 6, y: 17, width: 2, height: 2 }
      ]
    },
  },
  {
    id: "puzzle-gen-009",
    name: "Sans I / Triple Clear",
    description: "Sans I, pas de Hold, clear 3 lignes.",
    difficulty: "very hard",
    sortOrder: 28,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "###.######",
        "###.######",
        "###.######",
        "###.######"
      ],
      sequence: ["T", "L", "J", "S", "Z", "O", "T"],
      maxMoves: 7,
      allowHold: false,
      optimalMoves: 7,
      objectives: [{ type: "clear_lines", count: 3 }]
    },
  },
  {
    id: "puzzle-gen-010",
    name: "Sans I / Double Objectif",
    description: "Sans I, pas de Hold, clear 2 lignes + libérer une zone.",
    difficulty: "very hard",
    sortOrder: 29,
    active: true,
    definition: {
      initialBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "#######..#",
        "#######..#",
        "#######..#",
        "#######..#"
      ],
      sequence: ["T", "L", "J", "S", "Z", "O", "T"],
      maxMoves: 7,
      allowHold: false,
      optimalMoves: 7,
      objectives: [
        { type: "clear_lines", count: 2 },
        { type: "free_zone", x: 7, y: 16, width: 2, height: 2 }
      ]
    },
  },
];

const patternBoards: Record<string, string[]> = {
  trench: [
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "#####.####",
    "#####.####",
    "#####.####",
    "#####.####",
  ],
  doubleWindow: [
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "##########",
    "##..##..##",
    "##..##..##",
    "##########",
  ],
  zigzag: [
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    ".#........",
    "##........",
    ".###......",
    "####......",
  ],
  pitRight: [
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "#######..#",
    "#######..#",
    "#######..#",
    "#######..#",
  ],
};

const hardSequences = [
  ["T", "S", "Z", "L", "J", "O", "T", "S", "Z", "L"],
  ["L", "J", "T", "S", "Z", "O", "T", "L", "J", "S"],
  ["S", "Z", "T", "L", "J", "O", "S", "Z", "T", "L"],
  ["J", "L", "S", "Z", "T", "O", "J", "L", "S", "Z"],
];

const extremeSequences = [
  ["T", "S", "Z", "L", "J", "O", "T", "S", "Z", "L", "J", "O"],
  ["L", "J", "T", "S", "Z", "O", "L", "J", "T", "S", "Z", "O"],
  ["S", "Z", "T", "L", "J", "O", "S", "Z", "T", "L", "J", "O"],
  ["J", "L", "S", "Z", "T", "O", "J", "L", "S", "Z", "T", "O"],
];

const generateBatch = (): PuzzleSeedRow[] => {
  const puzzles: PuzzleSeedRow[] = [];
  let order = 30;

  const templates = [
    { key: "trench", objective: { type: "clear_lines", count: 3 } },
    {
      key: "doubleWindow",
      objective: [
        { type: "free_zone", x: 2, y: 17, width: 2, height: 2 },
        { type: "free_zone", x: 6, y: 17, width: 2, height: 2 },
      ],
    },
    { key: "zigzag", objective: { type: "survive_pieces", count: 10 } },
    {
      key: "pitRight",
      objective: [
        { type: "clear_lines", count: 2 },
        { type: "free_zone", x: 7, y: 16, width: 2, height: 2 },
      ],
    },
  ];

  templates.forEach((tpl, idx) => {
    hardSequences.forEach((seq, seqIdx) => {
      puzzles.push({
        id: `puzzle-gen-h-${idx + 1}-${seqIdx + 1}`,
        name: `Technique ${idx + 1}.${seqIdx + 1}`,
        description: "Sans I, pas de Hold.",
        difficulty: "very hard",
        sortOrder: order++,
        active: true,
        definition: {
          initialBoard: patternBoards[tpl.key],
          sequence: seq,
          maxMoves: seq.length,
          allowHold: false,
          optimalMoves: seq.length,
          objectives: Array.isArray(tpl.objective) ? tpl.objective : [tpl.objective],
        },
      });
    });
  });

  extremeSequences.forEach((seq, idx) => {
    puzzles.push({
      id: `puzzle-gen-x-${idx + 1}`,
      name: `Extrême ${idx + 1}`,
      description: "Très longue séquence, sans I, sans Hold.",
      difficulty: "extreme",
      sortOrder: order++,
      active: true,
      definition: {
        initialBoard: patternBoards.zigzag,
        sequence: seq,
        maxMoves: seq.length,
        allowHold: false,
        optimalMoves: seq.length,
        contracts: { noLineClears: true },
        objectives: [{ type: "survive_pieces", count: seq.length }],
      },
    });
  });

  return puzzles;
};

async function main() {
  const seedIfEmpty =
    process.env.SEED_IF_EMPTY === "1" ||
    process.env.SEED_IF_EMPTY === "true";
  if (seedIfEmpty) {
    const existingCount = await prisma.puzzle.count();
    if (existingCount > 0) {
      console.log(
        `[seed] Skip: ${existingCount} puzzle(s) already exist (SEED_IF_EMPTY=1).`
      );
      return;
    }
  }
  const puzzles = [...(await loadPuzzles()), ...generatedPuzzles, ...generateBatch()];
  for (const puzzle of puzzles) {
    const normalizedBoard = normalizeBoard(puzzle.definition.initialBoard);
    const definition = {
      ...puzzle.definition,
      initialBoard: normalizedBoard,
    };
    await prisma.puzzle.upsert({
      where: { id: puzzle.id },
      update: {
        name: puzzle.name,
        description: puzzle.description,
        difficulty: puzzle.difficulty ?? "normal",
        definition,
        sortOrder: puzzle.sortOrder ?? 0,
        active: puzzle.active ?? true,
      },
      create: {
        id: puzzle.id,
        name: puzzle.name,
        description: puzzle.description,
        difficulty: puzzle.difficulty ?? "normal",
        definition,
        sortOrder: puzzle.sortOrder ?? 0,
        active: puzzle.active ?? true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("Seed error:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
