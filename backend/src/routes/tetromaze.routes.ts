import { Router, Response } from "express";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { logger } from "../logger";
import { tetromazeProgressSchema } from "../utils/validation";

const router = Router();

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function sanitizeLevelScores(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const level = Number.parseInt(key, 10);
    if (!Number.isFinite(level) || level < 1) continue;
    const score = typeof value === "number" ? Math.floor(value) : Number.parseInt(String(value), 10);
    if (!Number.isFinite(score) || score < 0) continue;
    out[String(level)] = clamp(score, 0, 9_999_999);
  }
  return out;
}

router.get("/progress", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const row = await prisma.tetromazeProgress.findUnique({
      where: { userId },
      select: {
        highestLevel: true,
        currentLevel: true,
        levelScores: true,
        updatedAt: true,
      },
    });

    return res.json({
      highestLevel: row?.highestLevel ?? 1,
      currentLevel: row?.currentLevel ?? 1,
      levelScores: sanitizeLevelScores(row?.levelScores),
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement progression tetromaze");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/progress", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = tetromazeProgressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const payload = parsed.data;

    const existing = await prisma.tetromazeProgress.findUnique({
      where: { userId },
      select: {
        highestLevel: true,
        currentLevel: true,
        levelScores: true,
      },
    });

    const previousScores = sanitizeLevelScores(existing?.levelScores);

    if (
      payload.levelIndex !== undefined &&
      payload.score !== undefined
    ) {
      const key = String(payload.levelIndex);
      const previous = previousScores[key] ?? 0;
      previousScores[key] = Math.max(previous, payload.score);
    }

    const nextHighest = Math.max(
      existing?.highestLevel ?? 1,
      payload.highestLevel ?? 1,
      payload.currentLevel ?? 1,
      payload.levelIndex ?? 1
    );

    const nextCurrent = Math.max(
      1,
      payload.currentLevel ?? existing?.currentLevel ?? 1
    );

    const saved = await prisma.tetromazeProgress.upsert({
      where: { userId },
      update: {
        highestLevel: { set: nextHighest },
        currentLevel: { set: nextCurrent },
        levelScores: { set: previousScores },
      },
      create: {
        userId,
        highestLevel: nextHighest,
        currentLevel: nextCurrent,
        levelScores: previousScores,
      },
      select: {
        highestLevel: true,
        currentLevel: true,
        levelScores: true,
        updatedAt: true,
      },
    });

    return res.json({
      highestLevel: saved.highestLevel,
      currentLevel: saved.currentLevel,
      levelScores: sanitizeLevelScores(saved.levelScores),
      updatedAt: saved.updatedAt,
    });
  } catch (err) {
    logger.error({ err }, "Erreur sauvegarde progression tetromaze");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
