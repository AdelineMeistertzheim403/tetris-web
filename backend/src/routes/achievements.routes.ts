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

const readJsonObject = (value: Prisma.JsonValue | null | undefined) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Prisma.JsonObject)
    : {};

const buildLegacyStatsSnapshot = (stats: {
  loginDays: Prisma.JsonValue | null;
  tetrobotProgression: Prisma.JsonValue | null;
  tetrobotXpLedger: Prisma.JsonValue | null;
  tetrobotAffinityLedger: Prisma.JsonValue | null;
  playerLongTermMemory: Prisma.JsonValue | null;
  tetrobotMemories: Prisma.JsonValue | null;
  lastTetrobotLevelUp: Prisma.JsonValue | null;
  activeTetrobotChallenge: Prisma.JsonValue | null;
  statsSnapshot?: Prisma.JsonValue | null;
}) => {
  const snapshot = readJsonObject(stats.statsSnapshot);
  return {
    ...snapshot,
    loginDays: Array.isArray(snapshot.loginDays)
      ? snapshot.loginDays
      : readLoginDays(stats.loginDays),
    tetrobotProgression:
      Object.keys(readJsonObject(stats.tetrobotProgression)).length > 0
        ? readJsonObject(stats.tetrobotProgression)
        : readJsonObject(snapshot.tetrobotProgression as Prisma.JsonValue),
    tetrobotXpLedger:
      Object.keys(readJsonObject(stats.tetrobotXpLedger)).length > 0
        ? readJsonObject(stats.tetrobotXpLedger)
        : readJsonObject(snapshot.tetrobotXpLedger as Prisma.JsonValue),
    tetrobotAffinityLedger:
      Object.keys(readJsonObject(stats.tetrobotAffinityLedger)).length > 0
        ? readJsonObject(stats.tetrobotAffinityLedger)
        : readJsonObject(snapshot.tetrobotAffinityLedger as Prisma.JsonValue),
    playerLongTermMemory:
      Object.keys(readJsonObject(stats.playerLongTermMemory)).length > 0
        ? readJsonObject(stats.playerLongTermMemory)
        : readJsonObject(snapshot.playerLongTermMemory as Prisma.JsonValue),
    tetrobotMemories:
      Object.keys(readJsonObject(stats.tetrobotMemories)).length > 0
        ? readJsonObject(stats.tetrobotMemories)
        : readJsonObject(snapshot.tetrobotMemories as Prisma.JsonValue),
    lastTetrobotLevelUp:
      stats.lastTetrobotLevelUp ?? snapshot.lastTetrobotLevelUp ?? null,
    activeTetrobotChallenge:
      stats.activeTetrobotChallenge ?? snapshot.activeTetrobotChallenge ?? null,
  };
};

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
        statsSnapshot: true,
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
      stats: stats ? buildLegacyStatsSnapshot(stats) : {},
      loginDays: stats ? readLoginDays(stats.loginDays) : [],
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
        statsSnapshot: true,
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
    const statsSnapshot =
      payload.stats ?? buildLegacyStatsSnapshot(existingStats ?? {
        loginDays: [],
        tetrobotProgression: {},
        tetrobotXpLedger: {},
        tetrobotAffinityLedger: {},
        playerLongTermMemory: {},
        tetrobotMemories: {},
        lastTetrobotLevelUp: null,
        activeTetrobotChallenge: null,
        statsSnapshot: {},
      });
    const loginDays = normalizeLoginDays([
      ...readLoginDays(existingStats?.loginDays),
      ...(payload.loginDays ?? []),
      ...readLoginDays((payload.stats?.loginDays as Prisma.JsonValue | undefined) ?? []),
    ]);
    const tetrobotProgression =
      payload.tetrobotProgression ??
      (payload.stats?.tetrobotProgression as Prisma.JsonObject | undefined) ??
      existingStats?.tetrobotProgression ??
      {};
    const tetrobotXpLedger =
      payload.tetrobotXpLedger ??
      (payload.stats?.tetrobotXpLedger as Prisma.JsonObject | undefined) ??
      existingStats?.tetrobotXpLedger ??
      {};
    const tetrobotAffinityLedger =
      payload.tetrobotAffinityLedger ??
      (payload.stats?.tetrobotAffinityLedger as Prisma.JsonObject | undefined) ??
      existingStats?.tetrobotAffinityLedger ??
      {};
    const playerLongTermMemory =
      payload.playerLongTermMemory ??
      (payload.stats?.playerLongTermMemory as Prisma.JsonObject | undefined) ??
      existingStats?.playerLongTermMemory ??
      {};
    const tetrobotMemories =
      payload.tetrobotMemories ??
      (payload.stats?.tetrobotMemories as Prisma.JsonObject | undefined) ??
      existingStats?.tetrobotMemories ??
      {};
    const nextLevelUp = Object.prototype.hasOwnProperty.call(payload, "lastTetrobotLevelUp")
      ? payload.lastTetrobotLevelUp
      : Object.prototype.hasOwnProperty.call(payload.stats ?? {}, "lastTetrobotLevelUp")
        ? payload.stats?.lastTetrobotLevelUp ?? null
      : existingStats?.lastTetrobotLevelUp ?? null;
    const nextChallenge = Object.prototype.hasOwnProperty.call(
      payload,
      "activeTetrobotChallenge"
    )
      ? payload.activeTetrobotChallenge
      : Object.prototype.hasOwnProperty.call(payload.stats ?? {}, "activeTetrobotChallenge")
        ? payload.stats?.activeTetrobotChallenge ?? null
      : existingStats?.activeTetrobotChallenge ?? null;
    const serializedLevelUp =
      nextLevelUp === null ? Prisma.JsonNull : nextLevelUp;
    const serializedChallenge =
      nextChallenge === null ? Prisma.JsonNull : nextChallenge;

    await prisma.userAchievementStats.upsert({
      where: { userId },
      update: {
        statsSnapshot,
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
        statsSnapshot,
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
