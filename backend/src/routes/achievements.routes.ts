import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { logger } from "../logger";
import { achievementStatsSchema, achievementUnlockSchema } from "../utils/validation";

// Routes de progression achievements (unlock + statistiques utilisateur).
const router = Router();

const normalizeLoginDays = (loginDays: string[]) =>
  Array.from(new Set(loginDays.filter(Boolean))).sort();

const readLoginDays = (value: Prisma.JsonValue | null | undefined) =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

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
        playerLongTermMemory: true,
        tetrobotMemories: true,
        lastTetrobotLevelUp: true,
        activeTetrobotChallenge: true,
      },
    });

    res.json({
      loginDays: stats?.loginDays ?? [],
      tetrobotProgression: stats?.tetrobotProgression ?? {},
      tetrobotXpLedger: stats?.tetrobotXpLedger ?? {},
      tetrobotAffinityLedger: stats?.tetrobotAffinityLedger ?? {},
      playerLongTermMemory: stats?.playerLongTermMemory ?? {},
      tetrobotMemories: stats?.tetrobotMemories ?? {},
      lastTetrobotLevelUp: stats?.lastTetrobotLevelUp ?? null,
      activeTetrobotChallenge: stats?.activeTetrobotChallenge ?? null,
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

    const existingStats = await prisma.userAchievementStats.findUnique({
      where: { userId },
      select: {
        loginDays: true,
        tetrobotProgression: true,
        tetrobotXpLedger: true,
        tetrobotAffinityLedger: true,
        playerLongTermMemory: true,
        tetrobotMemories: true,
        lastTetrobotLevelUp: true,
        activeTetrobotChallenge: true,
      },
    });

    const payload = parsed.data;
    const loginDays = normalizeLoginDays([
      ...readLoginDays(existingStats?.loginDays),
      ...(payload.loginDays ?? []),
    ]);
    const tetrobotProgression =
      payload.tetrobotProgression ?? existingStats?.tetrobotProgression ?? {};
    const tetrobotXpLedger =
      payload.tetrobotXpLedger ?? existingStats?.tetrobotXpLedger ?? {};
    const tetrobotAffinityLedger =
      payload.tetrobotAffinityLedger ?? existingStats?.tetrobotAffinityLedger ?? {};
    const playerLongTermMemory =
      payload.playerLongTermMemory ?? existingStats?.playerLongTermMemory ?? {};
    const tetrobotMemories =
      payload.tetrobotMemories ?? existingStats?.tetrobotMemories ?? {};
    const nextLevelUp = Object.prototype.hasOwnProperty.call(payload, "lastTetrobotLevelUp")
      ? payload.lastTetrobotLevelUp
      : existingStats?.lastTetrobotLevelUp ?? null;
    const nextChallenge = Object.prototype.hasOwnProperty.call(
      payload,
      "activeTetrobotChallenge"
    )
      ? payload.activeTetrobotChallenge
      : existingStats?.activeTetrobotChallenge ?? null;
    const serializedLevelUp =
      nextLevelUp === null ? Prisma.JsonNull : nextLevelUp;
    const serializedChallenge =
      nextChallenge === null ? Prisma.JsonNull : nextChallenge;

    await prisma.userAchievementStats.upsert({
      where: { userId },
      update: {
        loginDays,
        tetrobotProgression,
        tetrobotXpLedger,
        tetrobotAffinityLedger,
        playerLongTermMemory,
        tetrobotMemories,
        lastTetrobotLevelUp: serializedLevelUp,
        activeTetrobotChallenge: serializedChallenge,
      },
      create: {
        userId,
        loginDays,
        tetrobotProgression,
        tetrobotXpLedger,
        tetrobotAffinityLedger,
        playerLongTermMemory,
        tetrobotMemories,
        lastTetrobotLevelUp: serializedLevelUp,
        activeTetrobotChallenge: serializedChallenge,
      },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Erreur sauvegarde stats achievements");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
