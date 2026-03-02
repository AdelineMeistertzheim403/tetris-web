import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma/client";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import { pixelProtocolLevelSchema } from "../utils/validation";
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
  const merged = {
    ...def,
    id: row.id,
    name: row.name,
    world: row.world,
  };

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
      const level = parsed.data;
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
