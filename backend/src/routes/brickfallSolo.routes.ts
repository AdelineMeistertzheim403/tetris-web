import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import { verifyToken, AuthRequest, attachOptionalUser } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { logger } from "../logger";
import {
  brickfallSoloLevelSchema,
  brickfallSoloProgressSchema,
} from "../utils/validation";

const router = Router();

type BrickfallSoloCommunityLevelRow = {
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

function normalizeBrickfallSoloLevelDefinition(value: Prisma.JsonValue) {
  const parsed = brickfallSoloLevelSchema.safeParse(getJsonObject(value) ?? {});
  if (!parsed.success) {
    throw new Error("Definition Brickfall Solo invalide");
  }
  return parsed.data;
}

function serializeCommunityLevel(
  row: BrickfallSoloCommunityLevelRow,
  currentUserId?: number | null,
  likedByMe = false
) {
  const level = normalizeBrickfallSoloLevelDefinition({
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

router.get("/community-levels", attachOptionalUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? null;
    const rows = await prisma.$queryRaw<BrickfallSoloCommunityLevelRow[]>(Prisma.sql`
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
      FROM "BrickfallSoloPublishedLevel" AS published
      INNER JOIN "User" AS users ON users.id = published."userId"
      LEFT JOIN "BrickfallSoloPublishedLevelLike" AS likes
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
        FROM "BrickfallSoloPublishedLevelLike"
        WHERE "userId" = ${userId}
          AND "publishedLevelId" IN (${Prisma.join(ids)})
      `);
      for (const row of likedRows) likedIds.add(row.publishedLevelId);
    }

    return res.json({
      levels: rows.map((row) => serializeCommunityLevel(row, userId, likedIds.has(row.id))),
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement niveaux communautaires brickfall solo");
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
      const rows = await prisma.$queryRaw<BrickfallSoloCommunityLevelRow[]>(Prisma.sql`
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
        FROM "BrickfallSoloPublishedLevel" AS published
        INNER JOIN "User" AS users ON users.id = published."userId"
        LEFT JOIN "BrickfallSoloPublishedLevelLike" AS likes
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
          FROM "BrickfallSoloPublishedLevelLike"
          WHERE "publishedLevelId" = ${publishedId}
            AND "userId" = ${userId}
          LIMIT 1
        `);
        likedByMe = likedRows.length > 0;
      }

      return res.json({ level: serializeCommunityLevel(row, userId, likedByMe) });
    } catch (err) {
      logger.error({ err }, "Erreur chargement niveau communautaire brickfall solo");
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

    const customLevel = await prisma.brickfallSoloCustomLevel.findUnique({
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

    const level = normalizeBrickfallSoloLevelDefinition(customLevel.definition);

    const published = await prisma.brickfallSoloPublishedLevel.upsert({
      where: {
        userId_levelId: {
          userId,
          levelId: level.id,
        },
      },
      update: {
        name: level.name,
        definition: level as Prisma.InputJsonValue,
      },
      create: {
        userId,
        levelId: level.id,
        name: level.name,
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
    logger.error({ err }, "Erreur publication niveau communautaire brickfall solo");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/community-levels/:publishedId/play", async (req, res: Response) => {
  try {
    const publishedId = Number.parseInt(req.params.publishedId ?? "", 10);
    if (!Number.isFinite(publishedId) || publishedId <= 0) {
      return res.status(400).json({ error: "Identifiant de niveau invalide" });
    }

    const existing = await prisma.brickfallSoloPublishedLevel.findUnique({
      where: { id: publishedId },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Niveau publie introuvable" });
    }

    const updated = await prisma.brickfallSoloPublishedLevel.update({
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
    logger.error({ err }, "Erreur comptage parties niveau communautaire brickfall solo");
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
        FROM "BrickfallSoloPublishedLevel"
        WHERE id = ${publishedId}
        LIMIT 1
      `);
      if (existing.length === 0) {
        return res.status(404).json({ error: "Niveau publie introuvable" });
      }

      const ownerRows = await prisma.$queryRaw<Array<{ userId: number }>>(Prisma.sql`
        SELECT "userId"
        FROM "BrickfallSoloPublishedLevel"
        WHERE id = ${publishedId}
        LIMIT 1
      `);
      if (ownerRows[0]?.userId === userId) {
        return res.status(400).json({ error: "Tu ne peux pas liker ton propre niveau" });
      }

      const likedRow = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT id
        FROM "BrickfallSoloPublishedLevelLike"
        WHERE "publishedLevelId" = ${publishedId}
          AND "userId" = ${userId}
        LIMIT 1
      `);

      const liked = likedRow.length === 0;
      if (liked) {
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO "BrickfallSoloPublishedLevelLike" ("publishedLevelId", "userId")
          VALUES (${publishedId}, ${userId})
          ON CONFLICT ("publishedLevelId", "userId") DO NOTHING
        `);
      } else {
        await prisma.$executeRaw(Prisma.sql`
          DELETE FROM "BrickfallSoloPublishedLevelLike"
          WHERE "publishedLevelId" = ${publishedId}
            AND "userId" = ${userId}
        `);
      }

      const countRows = await prisma.$queryRaw<Array<{ likeCount: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS "likeCount"
        FROM "BrickfallSoloPublishedLevelLike"
        WHERE "publishedLevelId" = ${publishedId}
      `);

      return res.json({
        liked,
        likeCount: Number(countRows[0]?.likeCount ?? 0),
      });
    } catch (err) {
      logger.error({ err }, "Erreur like niveau communautaire brickfall solo");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

export default router;
