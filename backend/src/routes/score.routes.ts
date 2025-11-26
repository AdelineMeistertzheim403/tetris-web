import { Router, Response } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import { scoreSchema } from "../utils/validation";
import { GameMode } from "../types/GameMode";
import prisma from "../prisma/client";
import { logger } from "../logger";

const router = Router();

const scoreLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 secondes
  max: 5,
  message: { error: "Trop de scores envoyes, reessaie plus tard." },
});

const leaderboardLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 20,
});

/**
 * Enregistrer un nouveau score
 */
router.post("/", verifyToken, scoreLimiter, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Donnees de score invalides",
        details: parsed.error.flatten(),
      });
    }
    const { value, level, lines, mode } = parsed.data;

    const score = await prisma.score.create({
      data: {
        value,
        level,
        lines,
        userId: req.user.id,
        mode,
      },
    });

    res.status(201).json({ message: "Score enregistre", score });
  } catch (err) {
    logger.error({ err }, "Erreur ajout score");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Recuperer les scores du joueur connecte
 */
router.get("/me/:mode", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { mode } = req.params;

    if (!userId) return res.status(401).json({ error: "Utilisateur non authentifie" });
    if (!Object.values(GameMode).includes(mode as GameMode))
      return res.status(400).json({ error: "Mode de jeu invalide" });

    const scores = await prisma.score.findMany({
      where: { userId, mode: mode as GameMode },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(scores);
  } catch (err: any) {
    logger.error({ err }, "Erreur recuperation des scores");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Classement general
 */
router.get("/leaderboard/:mode", leaderboardLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { mode } = req.params;

    if (!Object.values(GameMode).includes(mode as GameMode))
      return res.status(400).json({ error: "Mode de jeu invalide" });

    const leaderboard = await prisma.score.findMany({
      where: { mode: mode as GameMode },
      include: { user: { select: { pseudo: true } } },
      orderBy: mode === GameMode.SPRINT ? { value: "asc" } : { value: "desc" },
      take: 10,
    });

    res.json(leaderboard);
  } catch (err) {
    logger.error({ err }, "Erreur leaderboard");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
