import { PrismaClient, Prisma } from "@prisma/client";
import {
  generateBatch,
  generatedPuzzles,
  loadPuzzles,
  normalizeBoard,
} from "../prisma/puzzleData";

const prisma = new PrismaClient();

async function main() {
  const puzzles = [
    ...(await loadPuzzles()),
    ...generatedPuzzles,
    ...generateBatch(),
  ];

  let upserted = 0;
  for (const puzzle of puzzles) {
    const normalizedBoard = normalizeBoard(puzzle.definition.initialBoard);
    const definition = {
      ...puzzle.definition,
      initialBoard: normalizedBoard,
    } as Prisma.InputJsonValue;

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
    upserted += 1;
  }

  console.log(`[puzzle:sync] Upserted ${upserted} puzzle(s).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("Puzzle sync error:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
