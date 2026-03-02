import type { Response, NextFunction } from "express";
import prisma from "../prisma/client";
import type { AuthRequest } from "./auth.middleware";
import { logger } from "../logger";

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ error: "Acces reserve aux administrateurs" });
    }

    return next();
  } catch (err) {
    logger.error({ err }, "Erreur verification admin");
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
