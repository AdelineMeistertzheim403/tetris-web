import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import { scoreSchema } from "../utils/validation";
import { GameMode } from "../types/GameMode"; 
import rateLimit from "express-rate-limit";

const router = Router();
const prisma = new PrismaClient();

const scoreLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 secondes
  max: 5, // 5 scores max / 15s par IP
  message: { error: "Trop de scores envoyés, réessaie plus tard." },
});

const leaderboardLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 20,
});

/**
 * 🧠 Enregistrer un nouveau score
 */
router.post("/", verifyToken,scoreLimiter, async (req: AuthRequest, res: Response) => {
  try {
     if (!req.user?.id) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Données de score invalides",
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

    res.status(201).json({ message: "Score enregistré", score });
  } catch (err) {
    console.error("Erreur ajout score:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * 🔍 Récupérer les scores du joueur connecté
 */
router.get("/me/:mode", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { mode } = req.params;

    if (!userId) return res.status(401).json({ error: "Utilisateur non authentifié" });
    if (!Object.values(GameMode).includes(mode as GameMode))
      return res.status(400).json({ error: "Mode de jeu invalide" });

    const scores = await prisma.score.findMany({
      where: { userId, mode: mode as GameMode }, // ✅ conversion explicite
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(scores);
  } catch (err: any) {
    console.error("Erreur récupération des scores:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * 🏆 Classement général
 */
router.get("/leaderboard/:mode", async (req: AuthRequest, res: Response) => {
  try {
    const { mode } = req.params;

    if (!Object.values(GameMode).includes(mode as GameMode))
      return res.status(400).json({ error: "Mode de jeu invalide" });

    const leaderboard = await prisma.score.findMany({
      where: { mode: mode as GameMode },
      include: { user: { select: { pseudo: true } } },
      orderBy:
        mode === GameMode.SPRINT
          ? { value: "asc" }
          : { value: "desc" },
      take: 10,
    });

    res.json(leaderboard);
  } catch (err) {
    console.error("Erreur leaderboard:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
