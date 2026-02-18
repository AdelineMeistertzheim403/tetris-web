import { Router, Response } from "express";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { logger } from "../logger";
import {
  brickfallSoloLevelSchema,
  brickfallSoloProgressSchema,
} from "../utils/validation";

// Routes de persistance Brickfall Solo: progression et niveaux custom.
const router = Router();

router.get("/progress", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const progress = await prisma.brickfallSoloProgress.findUnique({
      where: { userId },
      select: { highestLevel: true, updatedAt: true },
    });

    return res.json({
      highestLevel: progress?.highestLevel ?? 1,
      updatedAt: progress?.updatedAt ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement progression brickfall solo");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/progress", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = brickfallSoloProgressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const { highestLevel } = parsed.data;

    const existing = await prisma.brickfallSoloProgress.findUnique({
      where: { userId },
      select: { highestLevel: true },
    });
    const nextHighest = Math.max(existing?.highestLevel ?? 1, highestLevel);

    const saved = await prisma.brickfallSoloProgress.upsert({
      where: { userId },
      update: {
        highestLevel: {
          set: nextHighest,
        },
      },
      create: {
        userId,
        highestLevel: nextHighest,
      },
      select: { highestLevel: true, updatedAt: true },
    });

    return res.json(saved);
  } catch (err) {
    logger.error({ err }, "Erreur sauvegarde progression brickfall solo");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/custom-levels", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const rows = await prisma.brickfallSoloCustomLevel.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { definition: true },
    });

    return res.json({ levels: rows.map((row) => row.definition) });
  } catch (err) {
    logger.error({ err }, "Erreur chargement niveaux custom brickfall solo");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/custom-levels", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = brickfallSoloLevelSchema.safeParse(req.body?.level);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const level = parsed.data;

    const saved = await prisma.brickfallSoloCustomLevel.upsert({
      where: {
        userId_levelId: {
          userId,
          levelId: level.id,
        },
      },
      update: {
        definition: level,
      },
      create: {
        userId,
        levelId: level.id,
        definition: level,
      },
      select: { definition: true, updatedAt: true },
    });

    return res.json({ level: saved.definition, updatedAt: saved.updatedAt });
  } catch (err) {
    logger.error({ err }, "Erreur sauvegarde niveau custom brickfall solo");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/custom-levels/:levelId", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const levelId = (req.params.levelId ?? "").trim();
    if (!levelId) {
      return res.status(400).json({ error: "Identifiant de niveau manquant" });
    }

    await prisma.brickfallSoloCustomLevel.deleteMany({
      where: { userId, levelId },
    });

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Erreur suppression niveau custom brickfall solo");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
