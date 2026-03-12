import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma/client";
import { verifyToken, AuthRequest, attachOptionalUser } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import {
  pixelProtocolLevelSchema,
  pixelProtocolProgressSchema,
  pixelProtocolWorldTemplateSchema,
} from "../utils/validation";
import { normalizePixelProtocolLevelDefinition } from "../utils/pixelProtocol";
import { logger } from "../logger";

const router = Router();

type PixelProtocolRow = {
  id: string;
  name: string;
  world: number;
  sortOrder?: number | null;
  active?: boolean | null;
  definition: Prisma.JsonValue;
  updatedAt?: Date;
};

function getJsonObject(
  value: Prisma.JsonValue
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function serializeLevel(row: PixelProtocolRow, includeAdminMeta = false) {
  const def = getJsonObject(row.definition) ?? {};
  const merged = normalizePixelProtocolLevelDefinition({
    ...def,
    id: row.id,
    name: row.name,
    world: row.world,
  });

  if (!includeAdminMeta) return merged;

  return {
    ...merged,
    active: row.active ?? true,
    sortOrder: row.sortOrder ?? 0,
    updatedAt: row.updatedAt ?? null,
  };
}

function computeSortOrder(id: string, world: number) {
  const match = id.match(/w(\d+)-(\d+)/i);
  const resolvedWorld = match ? Number(match[1]) : world;
  const stage = match ? Number(match[2]) : 0;
  return resolvedWorld * 100 + stage;
}

function clampLevel(value: number) {
  return Math.max(1, Math.min(999, Math.floor(value)));
}

type CommunityLevelRow = {
  id: number;
  levelId: string;
  name: string;
  world: number;
  definition: Prisma.JsonValue;
  updatedAt: Date;
  authorId: number;
  authorPseudo: string;
  likeCount: bigint | number;
  playCount: number;
};

function serializeCommunityLevel(
  row: CommunityLevelRow,
  currentUserId?: number | null,
  likedByMe = false
) {
  const level = normalizePixelProtocolLevelDefinition({
    ...(getJsonObject(row.definition) ?? {}),
    id: row.levelId,
    name: row.name,
    world: row.world,
  });

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

router.get("/levels", async (_req, res: Response) => {
  try {
    const levels = await prisma.pixelProtocolLevel.findMany({
      where: { active: true },
      orderBy: [{ world: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        world: true,
        sortOrder: true,
        definition: true,
      },
    });

    return res.json(levels.map((row) => serializeLevel(row)));
  } catch (err) {
    logger.error({ err }, "Erreur chargement niveaux Pixel Protocol");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/community-levels", attachOptionalUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? null;
    const rows = await prisma.$queryRaw<CommunityLevelRow[]>(Prisma.sql`
      SELECT
        published.id,
        published."levelId",
        published.name,
        published.world,
        published.definition,
        published."updatedAt",
        published."playCount",
        users.id AS "authorId",
        users.pseudo AS "authorPseudo",
        COUNT(likes.id)::int AS "likeCount"
      FROM "PixelProtocolPublishedLevel" AS published
      INNER JOIN "User" AS users ON users.id = published."userId"
      LEFT JOIN "PixelProtocolPublishedLevelLike" AS likes
        ON likes."publishedLevelId" = published.id
      GROUP BY
        published.id,
        published."levelId",
        published.name,
        published.world,
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
        FROM "PixelProtocolPublishedLevelLike"
        WHERE "userId" = ${userId}
          AND "publishedLevelId" IN (${Prisma.join(ids)})
      `);
      for (const row of likedRows) likedIds.add(row.publishedLevelId);
    }

    return res.json({
      levels: rows.map((row) => serializeCommunityLevel(row, userId, likedIds.has(row.id))),
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement niveaux communautaires Pixel Protocol");
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
      const rows = await prisma.$queryRaw<CommunityLevelRow[]>(Prisma.sql`
        SELECT
          published.id,
          published."levelId",
          published.name,
          published.world,
          published.definition,
          published."updatedAt",
          published."playCount",
          users.id AS "authorId",
          users.pseudo AS "authorPseudo",
          COUNT(likes.id)::int AS "likeCount"
        FROM "PixelProtocolPublishedLevel" AS published
        INNER JOIN "User" AS users ON users.id = published."userId"
        LEFT JOIN "PixelProtocolPublishedLevelLike" AS likes
          ON likes."publishedLevelId" = published.id
        WHERE published.id = ${publishedId}
        GROUP BY
          published.id,
          published."levelId",
          published.name,
          published.world,
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
          FROM "PixelProtocolPublishedLevelLike"
          WHERE "publishedLevelId" = ${publishedId}
            AND "userId" = ${userId}
          LIMIT 1
        `);
        likedByMe = likedRows.length > 0;
      }

      return res.json({ level: serializeCommunityLevel(row, userId, likedByMe) });
    } catch (err) {
      logger.error({ err }, "Erreur chargement niveau communautaire Pixel Protocol");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

router.get(
  "/levels/admin",
  verifyToken,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const levels = await prisma.pixelProtocolLevel.findMany({
        orderBy: [{ world: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          world: true,
          sortOrder: true,
          active: true,
          definition: true,
          updatedAt: true,
        },
      });

      return res.json(levels.map((row) => serializeLevel(row, true)));
    } catch (err) {
      logger.error({ err }, "Erreur chargement niveaux admin Pixel Protocol");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

router.get("/progress", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const row = await prisma.pixelProtocolProgress.findUnique({
      where: { userId },
      select: {
        highestLevel: true,
        currentLevel: true,
        updatedAt: true,
      },
    });

    return res.json({
      highestLevel: row?.highestLevel ?? 1,
      currentLevel: row?.currentLevel ?? 1,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement progression Pixel Protocol");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/progress", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = pixelProtocolProgressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const payload = parsed.data;

    const existing = await prisma.pixelProtocolProgress.findUnique({
      where: { userId },
      select: {
        highestLevel: true,
        currentLevel: true,
      },
    });

    const nextHighest = Math.max(
      existing?.highestLevel ?? 1,
      payload.highestLevel ?? 1,
      payload.currentLevel ?? 1
    );

    const nextCurrent = clampLevel(
      payload.currentLevel ?? existing?.currentLevel ?? nextHighest
    );

    const saved = await prisma.pixelProtocolProgress.upsert({
      where: { userId },
      update: {
        highestLevel: { set: nextHighest },
        currentLevel: { set: nextCurrent },
      },
      create: {
        userId,
        highestLevel: nextHighest,
        currentLevel: nextCurrent,
      },
      select: {
        highestLevel: true,
        currentLevel: true,
        updatedAt: true,
      },
    });

    return res.json(saved);
  } catch (err) {
    logger.error({ err }, "Erreur sauvegarde progression Pixel Protocol");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/custom-levels", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const rows = await prisma.pixelProtocolCustomLevel.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { definition: true },
    });

    return res.json({
      levels: rows
        .map((row) => {
          const def = getJsonObject(row.definition);
          return def ? normalizePixelProtocolLevelDefinition(def) : null;
        })
        .filter(Boolean),
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement niveaux custom Pixel Protocol");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/world-templates", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const rows = await prisma.pixelProtocolWorldTemplate.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { templateId: "desc" }],
      select: { definition: true },
    });

    return res.json({
      worlds: rows
        .map((row) => {
          const def = getJsonObject(row.definition);
          return def ? normalizePixelProtocolLevelDefinition(def) : null;
        })
        .filter(Boolean),
    });
  } catch (err) {
    logger.error({ err }, "Erreur chargement mondes custom Pixel Protocol");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/custom-levels", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = pixelProtocolLevelSchema.safeParse(req.body?.level);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Donnees invalides",
        details: parsed.error.flatten(),
      });
    }

    const level = normalizePixelProtocolLevelDefinition(parsed.data);

    const saved = await prisma.pixelProtocolCustomLevel.upsert({
      where: {
        userId_levelId: {
          userId,
          levelId: level.id,
        },
      },
      update: {
        definition: level as Prisma.InputJsonValue,
      },
      create: {
        userId,
        levelId: level.id,
        definition: level as Prisma.InputJsonValue,
      },
      select: {
        definition: true,
        updatedAt: true,
      },
    });

    return res.json({
      level: normalizePixelProtocolLevelDefinition(
        (getJsonObject(saved.definition) ?? {}) as Record<string, unknown>
      ),
      updatedAt: saved.updatedAt,
    });
  } catch (err) {
    logger.error({ err }, "Erreur sauvegarde niveau custom Pixel Protocol");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/world-templates", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = pixelProtocolWorldTemplateSchema.safeParse(req.body?.world);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Donnees invalides",
        details: parsed.error.flatten(),
      });
    }

    const world = normalizePixelProtocolLevelDefinition(parsed.data);

    const saved = await prisma.pixelProtocolWorldTemplate.upsert({
      where: {
        userId_templateId: {
          userId,
          templateId: world.id,
        },
      },
      update: {
        definition: world as Prisma.InputJsonValue,
      },
      create: {
        userId,
        templateId: world.id,
        definition: world as Prisma.InputJsonValue,
      },
      select: {
        definition: true,
        updatedAt: true,
      },
    });

    return res.json({
      world: normalizePixelProtocolLevelDefinition(
        (getJsonObject(saved.definition) ?? {}) as Record<string, unknown>
      ),
      updatedAt: saved.updatedAt,
    });
  } catch (err) {
    logger.error({ err }, "Erreur sauvegarde monde custom Pixel Protocol");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/community-levels", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const levelId =
      typeof req.body?.levelId === "string" ? req.body.levelId.trim() : "";
    if (!levelId) {
      return res.status(400).json({ error: "Identifiant de niveau manquant" });
    }

    const customLevel = await prisma.pixelProtocolCustomLevel.findUnique({
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

    const level = normalizePixelProtocolLevelDefinition(
      (getJsonObject(customLevel.definition) ?? {}) as Record<string, unknown>
    );
    const normalizedLevelId = String(level.id);
    const normalizedLevelName = String(level.name);
    const normalizedLevelWorld = Number(level.world);

    const published = await prisma.pixelProtocolPublishedLevel.upsert({
      where: {
        userId_levelId: {
          userId,
          levelId: normalizedLevelId,
        },
      },
      update: {
        name: normalizedLevelName,
        world: normalizedLevelWorld,
        definition: level as Prisma.InputJsonValue,
      },
      create: {
        userId,
        levelId: normalizedLevelId,
        name: normalizedLevelName,
        world: normalizedLevelWorld,
        definition: level as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        levelId: true,
        name: true,
        world: true,
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
    logger.error({ err }, "Erreur publication niveau communautaire Pixel Protocol");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/community-levels/:publishedId/play", async (req, res: Response) => {
  try {
    const publishedId = Number.parseInt(req.params.publishedId ?? "", 10);
    if (!Number.isFinite(publishedId) || publishedId <= 0) {
      return res.status(400).json({ error: "Identifiant de niveau invalide" });
    }

    const existing = await prisma.pixelProtocolPublishedLevel.findUnique({
      where: { id: publishedId },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Niveau publie introuvable" });
    }

    const updated = await prisma.pixelProtocolPublishedLevel.update({
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
    logger.error({ err }, "Erreur comptage parties niveau communautaire Pixel Protocol");
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
        FROM "PixelProtocolPublishedLevel"
        WHERE id = ${publishedId}
        LIMIT 1
      `);
      if (existing.length === 0) {
        return res.status(404).json({ error: "Niveau publie introuvable" });
      }

      const ownerRows = await prisma.$queryRaw<Array<{ userId: number }>>(Prisma.sql`
        SELECT "userId"
        FROM "PixelProtocolPublishedLevel"
        WHERE id = ${publishedId}
        LIMIT 1
      `);
      if (ownerRows[0]?.userId === userId) {
        return res.status(400).json({ error: "Tu ne peux pas liker ton propre niveau" });
      }

      const likedRow = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT id
        FROM "PixelProtocolPublishedLevelLike"
        WHERE "publishedLevelId" = ${publishedId}
          AND "userId" = ${userId}
        LIMIT 1
      `);

      const liked = likedRow.length === 0;
      if (liked) {
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO "PixelProtocolPublishedLevelLike" ("publishedLevelId", "userId")
          VALUES (${publishedId}, ${userId})
          ON CONFLICT ("publishedLevelId", "userId") DO NOTHING
        `);
      } else {
        await prisma.$executeRaw(Prisma.sql`
          DELETE FROM "PixelProtocolPublishedLevelLike"
          WHERE "publishedLevelId" = ${publishedId}
            AND "userId" = ${userId}
        `);
      }

      const countRows = await prisma.$queryRaw<Array<{ likeCount: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS "likeCount"
        FROM "PixelProtocolPublishedLevelLike"
        WHERE "publishedLevelId" = ${publishedId}
      `);

      return res.json({
        liked,
        likeCount: Number(countRows[0]?.likeCount ?? 0),
      });
    } catch (err) {
      logger.error({ err }, "Erreur like niveau communautaire Pixel Protocol");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

router.post(
  "/levels",
  verifyToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const parsed = pixelProtocolLevelSchema.safeParse(req.body?.level);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Donnees invalides",
          details: parsed.error.flatten(),
        });
      }

      const active = typeof req.body?.active === "boolean" ? req.body.active : true;
      const level = normalizePixelProtocolLevelDefinition(parsed.data);
      const sortOrder = computeSortOrder(level.id, level.world);
      const definition = level as Prisma.InputJsonValue;

      const saved = await prisma.pixelProtocolLevel.upsert({
        where: { id: level.id },
        update: {
          name: level.name,
          world: level.world,
          sortOrder,
          active,
          definition,
        },
        create: {
          id: level.id,
          name: level.name,
          world: level.world,
          sortOrder,
          active,
          definition,
        },
      });

      return res.json(serializeLevel(saved, true));
    } catch (err) {
      logger.error({ err }, "Erreur sauvegarde niveau Pixel Protocol");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

router.delete(
  "/custom-levels/:levelId",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Utilisateur non authentifie" });
      }

      const levelId = (req.params.levelId ?? "").trim();
      if (!levelId) {
        return res.status(400).json({ error: "Identifiant de niveau manquant" });
      }

      await prisma.pixelProtocolCustomLevel.deleteMany({
        where: { userId, levelId },
      });

      return res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "Erreur suppression niveau custom Pixel Protocol");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

router.delete(
  "/world-templates/:templateId",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Utilisateur non authentifie" });
      }

      const templateId = (req.params.templateId ?? "").trim();
      if (!templateId) {
        return res.status(400).json({ error: "Identifiant de monde manquant" });
      }

      await prisma.pixelProtocolWorldTemplate.deleteMany({
        where: { userId, templateId },
      });

      return res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "Erreur suppression monde custom Pixel Protocol");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

router.delete(
  "/levels/:levelId",
  verifyToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const levelId = (req.params.levelId ?? "").trim();
      if (!levelId) {
        return res.status(400).json({ error: "Identifiant de niveau manquant" });
      }

      await prisma.pixelProtocolLevel.deleteMany({
        where: { id: levelId },
      });

      return res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "Erreur suppression niveau Pixel Protocol");
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

export default router;
