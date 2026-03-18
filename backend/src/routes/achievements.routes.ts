import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { logger } from "../logger";
import { achievementStatsSchema, achievementUnlockSchema } from "../utils/validation";

// Routes de progression achievements (unlock + statistiques utilisateur).
const router = Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
      orderBy: { unlockedAt: "asc" },
    });

    res.json({
      achievements: achievements.map((entry) => ({
        id: entry.achievementId,
        unlockedAt: entry.unlockedAt.getTime(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement achievements");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/unlock", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = achievementUnlockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Donnees invalides",
        details: parsed.error.flatten(),
      });
    }

    const { achievements } = parsed.data;

    await prisma.$transaction(async (tx) => {
      for (const achievement of achievements) {
        await tx.achievement.upsert({
          where: { id: achievement.id },
          update: {
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            category: achievement.category,
            hidden: achievement.hidden ?? false,
          },
          create: {
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            category: achievement.category,
            hidden: achievement.hidden ?? false,
          },
        });
      }

      await tx.userAchievement.createMany({
        data: achievements.map((achievement) => ({
          userId,
          achievementId: achievement.id,
        })),
        skipDuplicates: true,
      });
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Erreur unlock achievements");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/stats", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const stats = await prisma.userAchievementStats.findUnique({
      where: { userId },
      select: {
        loginDays: true,
        tetrobotProgression: true,
        tetrobotXpLedger: true,
        tetrobotAffinityLedger: true,
        lastTetrobotLevelUp: true,
      },
    });

    res.json({
      loginDays: stats?.loginDays ?? [],
      tetrobotProgression: stats?.tetrobotProgression ?? {},
      tetrobotXpLedger: stats?.tetrobotXpLedger ?? {},
      tetrobotAffinityLedger: stats?.tetrobotAffinityLedger ?? {},
      lastTetrobotLevelUp: stats?.lastTetrobotLevelUp ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement stats achievements");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/stats", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = achievementStatsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Donnees invalides",
        details: parsed.error.flatten(),
      });
    }

    const {
      loginDays,
      tetrobotProgression = {},
      tetrobotXpLedger = {},
      tetrobotAffinityLedger = {},
      lastTetrobotLevelUp = null,
    } = parsed.data;
    const serializedLevelUp =
      lastTetrobotLevelUp === null ? Prisma.JsonNull : lastTetrobotLevelUp;

    await prisma.userAchievementStats.upsert({
      where: { userId },
      update: {
        loginDays,
        tetrobotProgression,
        tetrobotXpLedger,
        tetrobotAffinityLedger,
        lastTetrobotLevelUp: serializedLevelUp,
      },
      create: {
        userId,
        loginDays,
        tetrobotProgression,
        tetrobotXpLedger,
        tetrobotAffinityLedger,
        lastTetrobotLevelUp: serializedLevelUp,
      },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Erreur sauvegarde stats achievements");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
