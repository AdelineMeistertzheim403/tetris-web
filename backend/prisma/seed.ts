import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  generateBatch,
  generatedPuzzles,
  loadPuzzles,
  normalizeBoard,
} from "./puzzleData";

const prisma = new PrismaClient();

type SeedPixelLevelDef = {
  id: string;
  name: string;
  world: number;
};

const seedIfEmpty =
  process.env.SEED_IF_EMPTY === "1" || process.env.SEED_IF_EMPTY === "true";
const seedPixelLevels =
  process.env.SEED_PIXEL_LEVELS === "1" ||
  process.env.SEED_PIXEL_LEVELS === "true";
const pixelLevelsDefaultActive =
  process.env.PIXEL_LEVELS_DEFAULT_ACTIVE === "1" ||
  process.env.PIXEL_LEVELS_DEFAULT_ACTIVE === "true";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function computePixelSortOrder(level: SeedPixelLevelDef) {
  const match = level.id.match(/w(\d+)-(\d+)/i);
  const world = match ? Number(match[1]) : level.world;
  const stage = match ? Number(match[2]) : 0;
  return world * 100 + stage;
}

async function loadPixelProtocolLevels(): Promise<SeedPixelLevelDef[] | null> {
  try {
    const levelsPath = path.resolve(process.cwd(), "prisma/pixelProtocolLevels.json");
    await access(levelsPath);
    const raw = await readFile(levelsPath, "utf8");
    const parsed = JSON.parse(raw) as SeedPixelLevelDef[];
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.warn(
      "[seed] Pixel Protocol levels skipped: prisma/pixelProtocolLevels.json unavailable."
    );
    return null;
  }
}

async function seedAdminUser() {
  const adminEmailRaw = process.env.ADMIN_EMAIL?.trim() ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  const adminPseudo = process.env.ADMIN_PSEUDO?.trim() || "Admin";

  if (!adminEmailRaw || !adminPassword) {
    console.log(
      "[seed] Admin: skipped (set ADMIN_EMAIL and ADMIN_PASSWORD to create or update the admin user)."
    );
    return;
  }

  const adminEmail = normalizeEmail(adminEmailRaw);
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, pseudo: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "ADMIN",
        password: hashedPassword,
      },
    });
    console.log(`[seed] Admin updated (${adminEmail}).`);
    return;
  }

  await prisma.user.create({
    data: {
      pseudo: adminPseudo,
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log(`[seed] Admin created (${adminEmail}).`);
}

async function seedPuzzles() {
  if (seedIfEmpty) {
    const existingCount = await prisma.puzzle.count();
    if (existingCount > 0) {
      console.log(
        `[seed] Skip puzzles: ${existingCount} puzzle(s) already exist (SEED_IF_EMPTY=1).`
      );
      return;
    }
  }

  const puzzles = [
    ...(await loadPuzzles()),
    ...generatedPuzzles,
    ...generateBatch(),
  ];
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
  }
}

async function seedPixelProtocolLevels() {
  const pixelProtocolLevels = await loadPixelProtocolLevels();
  if (!pixelProtocolLevels) {
    return;
  }

  const existingCount = await prisma.pixelProtocolLevel.count();
  if (!seedPixelLevels && existingCount > 0) {
    console.log(
      `[seed] Skip Pixel Protocol levels: ${existingCount} level(s) already exist.`
    );
    return;
  }

  for (const level of pixelProtocolLevels) {
    const sortOrder = computePixelSortOrder(level);
    const definition = level as Prisma.InputJsonValue;
    await prisma.pixelProtocolLevel.upsert({
      where: { id: level.id },
      update: {
        name: level.name,
        world: level.world,
        sortOrder,
        definition,
      },
      create: {
        id: level.id,
        name: level.name,
        world: level.world,
        sortOrder,
        definition,
        active: pixelLevelsDefaultActive,
      },
    });
  }
  console.log(`[seed] Pixel Protocol levels upserted (${pixelProtocolLevels.length}).`);
}

async function main() {
  await seedAdminUser();
  await seedPuzzles();
  await seedPixelProtocolLevels();
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
