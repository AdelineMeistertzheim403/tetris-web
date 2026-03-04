import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma/client";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import {
  pixelProtocolLevelSchema,
  pixelProtocolProgressSchema,
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
