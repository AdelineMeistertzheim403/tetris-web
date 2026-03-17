import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma/client";
import {
  verifyToken,
  AuthRequest,
  attachOptionalUser,
} from "../middleware/auth.middleware";
import { logger } from "../logger";
import { tetromazeLevelSchema, tetromazeProgressSchema } from "../utils/validation";

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
    const score =
      typeof value === "number" ? Math.floor(value) : Number.parseInt(String(value), 10);
    if (!Number.isFinite(score) || score < 0) continue;
    out[String(level)] = clamp(score, 0, 9_999_999);
  }
  return out;
}

type TetromazeCommunityLevelRow = {
  id: number;
  levelId: string;
  name: string;
  definition: Prisma.JsonValue;
  updatedAt: Date;
  authorId: number;
  authorPseudo: string;
  likeCount: bigint | number;
  playCount: number;
};

function getJsonObject(value: Prisma.JsonValue): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeTetromazeLevelDefinition(value: Prisma.JsonValue) {
  const parsed = tetromazeLevelSchema.safeParse(getJsonObject(value) ?? {});
  if (!parsed.success) {
    throw new Error("Definition Tetromaze invalide");
  }
  return parsed.data;
}

function serializeCommunityLevel(
  row: TetromazeCommunityLevelRow,
  currentUserId?: number | null,
  likedByMe = false
) {
  const level = normalizeTetromazeLevelDefinition({
    ...(getJsonObject(row.definition) ?? {}),
    id: row.levelId,
    name: row.name,
  } as Prisma.JsonValue);

  return {
    id: row.id,
    level,
    authorId: row.authorId,
    authorPseudo: row.authorPseudo,
    isOwn: currentUserId ? row.authorId === currentUserId : false,
    likeCount: Number(row.likeCount ?? 0),
    playCount: Number(row.playCount ?? 0),
    likedByMe,
    updatedAt: row.updatedAt ?? null,
  };
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
      return res
        .status(400)
        .json({ error: "Donnees invalides", details: parsed.error.flatten() });
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

    if (payload.levelIndex !== undefined && payload.score !== undefined) {
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

    const nextCurrent = Math.max(1, payload.currentLevel ?? existing?.currentLevel ?? 1);

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

router.get("/custom-levels", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const rows = await prisma.tetromazeCustomLevel.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { definition: true },
    });

    return res.json({ levels: rows.map((row) => row.definition) });
  } catch (err) {
    logger.error({ err }, "Erreur chargement niveaux custom tetromaze");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/custom-levels", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = tetromazeLevelSchema.safeParse(req.body?.level);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const level = parsed.data;

    const saved = await prisma.tetromazeCustomLevel.upsert({
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
    logger.error({ err }, "Erreur sauvegarde niveau custom tetromaze");
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

    await prisma.tetromazeCustomLevel.deleteMany({
      where: { userId, levelId },
    });

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Erreur suppression niveau custom tetromaze");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/community-levels", attachOptionalUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? null;
    const rows = await prisma.$queryRaw<TetromazeCommunityLevelRow[]>(Prisma.sql`
      SELECT
        published.id,
        published."levelId",
        published.name,
        published.definition,
        published."updatedAt",
        published."playCount",
        users.id AS "authorId",
        users.pseudo AS "authorPseudo",
        COUNT(likes.id)::int AS "likeCount"
      FROM "TetromazePublishedLevel" AS published
      INNER JOIN "User" AS users ON users.id = published."userId"
      LEFT JOIN "TetromazePublishedLevelLike" AS likes
        ON likes."publishedLevelId" = published.id
      GROUP BY
        published.id,
        published."levelId",
        published.name,
        published.definition,
        published."updatedAt",
        published."playCount",
        users.id,
        users.pseudo
      ORDER BY COUNT(likes.id) DESC, published."updatedAt" DESC, published.id DESC
    `);

    const likedIds = new Set<number>();
    if (userId && rows.length > 0) {
      const ids = rows.map((row) => row.id);
      const likedRows = await prisma.$queryRaw<Array<{ publishedLevelId: number }>>(Prisma.sql`
        SELECT "publishedLevelId"
        FROM "TetromazePublishedLevelLike"
        WHERE "userId" = ${userId}
          AND "publishedLevelId" IN (${Prisma.join(ids)})
      `);
      for (const row of likedRows) likedIds.add(row.publishedLevelId);
    }

    return res.json({
      levels: rows.map((row) => serializeCommunityLevel(row, userId, likedIds.has(row.id))),
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement niveaux communautaires tetromaze");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get(
  "/community-levels/:publishedId",
  attachOptionalUser,
  async (req: AuthRequest, res: Response) => {
    try {
      const publishedId = Number.parseInt(req.params.publishedId ?? "", 10);
      if (!Number.isFinite(publishedId) || publishedId <= 0) {
        return res.status(400).json({ error: "Identifiant de niveau invalide" });
      }

      const userId = req.user?.id ?? null;
      const rows = await prisma.$queryRaw<TetromazeCommunityLevelRow[]>(Prisma.sql`
        SELECT
          published.id,
          published."levelId",
          published.name,
          published.definition,
          published."updatedAt",
          published."playCount",
          users.id AS "authorId",
          users.pseudo AS "authorPseudo",
          COUNT(likes.id)::int AS "likeCount"
        FROM "TetromazePublishedLevel" AS published
        INNER JOIN "User" AS users ON users.id = published."userId"
        LEFT JOIN "TetromazePublishedLevelLike" AS likes
          ON likes."publishedLevelId" = published.id
        WHERE published.id = ${publishedId}
        GROUP BY
          published.id,
          published."levelId",
          published.name,
          published.definition,
          published."updatedAt",
          published."playCount",
          users.id,
          users.pseudo
      `);

      const row = rows[0];
      if (!row) {
        return res.status(404).json({ error: "Niveau publie introuvable" });
      }

      let likedByMe = false;
      if (userId) {
        const likedRows = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
          SELECT id
          FROM "TetromazePublishedLevelLike"
          WHERE "publishedLevelId" = ${publishedId}
            AND "userId" = ${userId}
          LIMIT 1
        `);
        likedByMe = likedRows.length > 0;
      }

      return res.json({ level: serializeCommunityLevel(row, userId, likedByMe) });
    } catch (err) {
      logger.error({ err }, "Erreur chargement niveau communautaire tetromaze");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

router.post("/community-levels", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const levelId = typeof req.body?.levelId === "string" ? req.body.levelId.trim() : "";
    if (!levelId) {
      return res.status(400).json({ error: "Identifiant de niveau manquant" });
    }

    const customLevel = await prisma.tetromazeCustomLevel.findUnique({
      where: {
        userId_levelId: {
          userId,
          levelId,
        },
      },
      select: {
        definition: true,
      },
    });

    if (!customLevel) {
      return res.status(404).json({ error: "Sauvegarde custom introuvable pour ce niveau" });
    }

    const level = normalizeTetromazeLevelDefinition(customLevel.definition);

    const published = await prisma.tetromazePublishedLevel.upsert({
      where: {
        userId_levelId: {
          userId,
          levelId: level.id,
        },
      },
      update: {
        name: level.name ?? level.id,
        definition: level as Prisma.InputJsonValue,
      },
      create: {
        userId,
        levelId: level.id,
        name: level.name ?? level.id,
        definition: level as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        levelId: true,
        name: true,
        definition: true,
        updatedAt: true,
        playCount: true,
      },
    });

    const pseudoRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { pseudo: true },
    });

    return res.json({
      level: serializeCommunityLevel(
        {
          ...published,
          authorId: userId,
          authorPseudo: pseudoRow?.pseudo ?? "unknown",
          likeCount: 0,
          playCount: published.playCount ?? 0,
        },
        userId,
        false
      ),
    });
  } catch (err) {
    logger.error({ err }, "Erreur publication niveau communautaire tetromaze");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/community-levels/:publishedId/play", async (req, res: Response) => {
  try {
    const publishedId = Number.parseInt(req.params.publishedId ?? "", 10);
    if (!Number.isFinite(publishedId) || publishedId <= 0) {
      return res.status(400).json({ error: "Identifiant de niveau invalide" });
    }

    const existing = await prisma.tetromazePublishedLevel.findUnique({
      where: { id: publishedId },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Niveau publie introuvable" });
    }

    const updated = await prisma.tetromazePublishedLevel.update({
      where: { id: publishedId },
      data: {
        playCount: {
          increment: 1,
        },
      },
      select: {
        playCount: true,
      },
    });

    return res.json({ playCount: updated.playCount });
  } catch (err) {
    logger.error({ err }, "Erreur comptage parties niveau communautaire tetromaze");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post(
  "/community-levels/:publishedId/like",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Utilisateur non authentifie" });
      }

      const publishedId = Number.parseInt(req.params.publishedId ?? "", 10);
      if (!Number.isFinite(publishedId) || publishedId <= 0) {
        return res.status(400).json({ error: "Identifiant de niveau invalide" });
      }

      const existing = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT id
        FROM "TetromazePublishedLevel"
        WHERE id = ${publishedId}
        LIMIT 1
      `);
      if (existing.length === 0) {
        return res.status(404).json({ error: "Niveau publie introuvable" });
      }

      const ownerRows = await prisma.$queryRaw<Array<{ userId: number }>>(Prisma.sql`
        SELECT "userId"
        FROM "TetromazePublishedLevel"
        WHERE id = ${publishedId}
        LIMIT 1
      `);
      if (ownerRows[0]?.userId === userId) {
        return res.status(400).json({ error: "Tu ne peux pas liker ton propre niveau" });
      }

      const likedRow = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT id
        FROM "TetromazePublishedLevelLike"
        WHERE "publishedLevelId" = ${publishedId}
          AND "userId" = ${userId}
        LIMIT 1
      `);

      const liked = likedRow.length === 0;
      if (liked) {
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO "TetromazePublishedLevelLike" ("publishedLevelId", "userId")
          VALUES (${publishedId}, ${userId})
          ON CONFLICT ("publishedLevelId", "userId") DO NOTHING
        `);
      } else {
        await prisma.$executeRaw(Prisma.sql`
          DELETE FROM "TetromazePublishedLevelLike"
          WHERE "publishedLevelId" = ${publishedId}
            AND "userId" = ${userId}
        `);
      }

      const countRows = await prisma.$queryRaw<Array<{ likeCount: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS "likeCount"
        FROM "TetromazePublishedLevelLike"
        WHERE "publishedLevelId" = ${publishedId}
      `);

      return res.json({
        liked,
        likeCount: Number(countRows[0]?.likeCount ?? 0),
      });
    } catch (err) {
      logger.error({ err }, "Erreur like niveau communautaire tetromaze");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

export default router;
