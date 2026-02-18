import { Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";
import { puzzleAttemptSchema, puzzleSolutionSchema } from "../utils/validation";

// Garantit que la définition JSON est un objet exploitable côté API.
function getJsonObject(value: Prisma.JsonValue): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

// Fusionne les métadonnées SQL avec la définition JSON du puzzle.
function serializePuzzle(puzzle: {
  id: string;
  name: string;
  description: string;
  difficulty?: string | null;
  sortOrder?: number | null;
  definition: Prisma.JsonValue;
}) {
  const def = getJsonObject(puzzle.definition) ?? {};
  return {
    ...def,
    id: puzzle.id,
    name: puzzle.name,
    description: puzzle.description,
    difficulty: puzzle.difficulty ?? "normal",
    sortOrder: puzzle.sortOrder ?? 0,
  };
}

/**
 * Liste tous les puzzles actifs.
 */
export async function listPuzzles(_req: AuthRequest, res: Response) {
  try {
    const puzzles = await prisma.puzzle.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        sortOrder: true,
        definition: true,
      },
    });

    res.json(puzzles.map(serializePuzzle));
  } catch (err) {
    console.error("listPuzzles error:", err);
    res.status(500).json({ error: "Impossible de charger les puzzles" });
  }
}

/**
 * Retourne le détail d'un puzzle par identifiant.
 */
export async function getPuzzle(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const puzzle = await prisma.puzzle.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        sortOrder: true,
        definition: true,
        active: true,
      },
    });

    if (!puzzle || !puzzle.active) {
      return res.status(404).json({ error: "Puzzle introuvable" });
    }

    res.json(serializePuzzle(puzzle));
  } catch (err) {
    console.error("getPuzzle error:", err);
    res.status(500).json({ error: "Impossible de charger le puzzle" });
  }
}

/**
 * Résume les tentatives du joueur par puzzle.
 */
export async function listMyPuzzleCompletions(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const attempts = await prisma.puzzleAttempt.findMany({
      where: { userId },
      select: {
        puzzleId: true,
        success: true,
        optimal: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const summary = new Map<
      string,
      { attempts: number; success: boolean; optimal: boolean; lastCompletedAt?: string }
    >();

    attempts.forEach((attempt) => {
      const current = summary.get(attempt.puzzleId) ?? {
        attempts: 0,
        success: false,
        optimal: false,
      };
      current.attempts += 1;
      if (attempt.success) {
        current.success = true;
        current.optimal = current.optimal || attempt.optimal;
        if (!current.lastCompletedAt) {
          current.lastCompletedAt = attempt.createdAt.toISOString();
        }
      }
      summary.set(attempt.puzzleId, current);
    });

    res.json(
      Array.from(summary.entries()).map(([puzzleId, data]) => ({
        puzzleId,
        attempts: data.attempts,
        success: data.success,
        optimal: data.optimal,
        lastCompletedAt: data.lastCompletedAt ?? null,
      }))
    );
  } catch (err) {
    console.error("listMyPuzzleCompletions error:", err);
    res.status(500).json({ error: "Impossible de recuperer les puzzles termines" });
  }
}

/**
 * Enregistre une tentative de puzzle (succès ou échec).
 */
export async function submitPuzzleAttempt(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const { id } = req.params;
    const puzzle = await prisma.puzzle.findUnique({
      where: { id },
      select: { id: true, active: true },
    });
    if (!puzzle || !puzzle.active) {
      return res.status(404).json({ error: "Puzzle introuvable" });
    }

    const parsed = puzzleAttemptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const attempt = await prisma.puzzleAttempt.create({
      data: {
        puzzleId: id,
        userId,
        success: parsed.data.success,
        movesUsed: parsed.data.movesUsed,
        linesCleared: parsed.data.linesCleared,
        piecesPlaced: parsed.data.piecesPlaced,
        holdUsed: parsed.data.holdUsed,
        efficiencyScore: parsed.data.efficiencyScore,
        optimal: parsed.data.optimal ?? false,
      },
    });

    res.status(201).json(attempt);
  } catch (err) {
    console.error("submitPuzzleAttempt error:", err);
    res.status(500).json({ error: "Impossible d'enregistrer la tentative" });
  }
}

/**
 * Enregistre une solution complète (suite de mouvements).
 */
export async function submitPuzzleSolution(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const { id } = req.params;
    const puzzle = await prisma.puzzle.findUnique({
      where: { id },
      select: { id: true, active: true },
    });
    if (!puzzle || !puzzle.active) {
      return res.status(404).json({ error: "Puzzle introuvable" });
    }

    const parsed = puzzleSolutionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const solution = await prisma.puzzleSolution.create({
      data: {
        puzzleId: id,
        userId,
        movesUsed: parsed.data.movesUsed,
        data: parsed.data.data,
        optimal: parsed.data.optimal ?? false,
      },
    });

    res.status(201).json(solution);
  } catch (err) {
    console.error("submitPuzzleSolution error:", err);
    res.status(500).json({ error: "Impossible d'enregistrer la solution" });
  }
}
