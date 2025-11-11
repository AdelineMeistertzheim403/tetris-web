import { Router } from "express";
import prisma from "../prisma/client";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

/**
 * 🧠 Enregistrer un nouveau score
 */
router.post("/", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { value, level, lines, mode } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Utilisateur non authentifié" });
    if (value === undefined || level === undefined || lines === undefined)
      return res.status(400).json({ error: "Champs manquants" });

    const score = await prisma.score.create({
      data: { value, level, lines, userId, mode },
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
router.get("/me", verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const scores = await prisma.score.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * 🏆 Classement général
 */
router.get("/leaderboard", async (_req, res) => {
  try {
    const leaderboard = await prisma.score.findMany({
      include: { user: { select: { pseudo: true } } },
      orderBy: { value: "desc" },
      take: 10,
    });
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
