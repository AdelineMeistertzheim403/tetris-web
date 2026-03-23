import { Router, Response } from "express";
import prisma from "../prisma/client";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import { logger } from "../logger";
import { pixelInvasionProgressSchema } from "../utils/validation";

const router = Router();
const pixelInvasionProgress = (prisma as any).pixelInvasionProgress;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

router.get("/progress", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const row = await pixelInvasionProgress.findUnique({
      where: { userId },
      select: {
        highestWave: true,
        currentWave: true,
        bestScore: true,
        totalKills: true,
        totalLineBursts: true,
        victories: true,
        updatedAt: true,
      },
    });

    return res.json({
      highestWave: row?.highestWave ?? 1,
      currentWave: row?.currentWave ?? 1,
      bestScore: row?.bestScore ?? 0,
      totalKills: row?.totalKills ?? 0,
      totalLineBursts: row?.totalLineBursts ?? 0,
      victories: row?.victories ?? 0,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement progression pixel invasion");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/progress", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = pixelInvasionProgressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const payload = parsed.data;
    const existing = await pixelInvasionProgress.findUnique({
      where: { userId },
      select: {
        highestWave: true,
        currentWave: true,
        bestScore: true,
        totalKills: true,
        totalLineBursts: true,
        victories: true,
      },
    });

    const nextHighestWave = Math.max(existing?.highestWave ?? 1, payload.highestWave ?? 1);
    const nextCurrentWave = clamp(payload.currentWave ?? existing?.currentWave ?? 1, 1, 999);
    const nextBestScore = Math.max(existing?.bestScore ?? 0, payload.bestScore ?? 0);
    const nextTotalKills = Math.max(existing?.totalKills ?? 0, payload.totalKills ?? 0);
    const nextTotalLineBursts = Math.max(
      existing?.totalLineBursts ?? 0,
      payload.totalLineBursts ?? 0
    );
    const nextVictories = Math.max(existing?.victories ?? 0, payload.victories ?? 0);

    const saved = await pixelInvasionProgress.upsert({
      where: { userId },
      update: {
        highestWave: { set: nextHighestWave },
        currentWave: { set: nextCurrentWave },
        bestScore: { set: nextBestScore },
        totalKills: { set: nextTotalKills },
        totalLineBursts: { set: nextTotalLineBursts },
        victories: { set: nextVictories },
      },
      create: {
        userId,
        highestWave: nextHighestWave,
        currentWave: nextCurrentWave,
        bestScore: nextBestScore,
        totalKills: nextTotalKills,
        totalLineBursts: nextTotalLineBursts,
        victories: nextVictories,
      },
      select: {
        highestWave: true,
        currentWave: true,
        bestScore: true,
        totalKills: true,
        totalLineBursts: true,
        victories: true,
        updatedAt: true,
      },
    });

    return res.json(saved);
  } catch (err) {
    logger.error({ err }, "Erreur sauvegarde progression pixel invasion");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
