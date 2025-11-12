import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import { GameMode } from "../types/GameMode"; // ton enum local

const router = Router();
const prisma = new PrismaClient();

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
    if (!Object.values(GameMode).includes(mode))
      return res.status(400).json({ error: "Mode de jeu invalide" });

    const score = await prisma.score.create({
      data: {
        value,
        level,
        lines,
        userId,
        mode: mode as GameMode, // ✅ conversion explicite
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
router.get("/me/:mode", verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { mode } = req.params;

    if (!userId) return res.status(401).json({ error: "Utilisateur non authentifié" });
    if (!Object.values(GameMode).includes(mode as GameMode))
      return res.status(400).json({ error: "Mode de jeu invalide" });

    const scores = await prisma.score.findMany({
      where: { userId, mode: mode as GameMode }, // ✅ conversion explicite
      orderBy: { createdAt: "desc" },
    });

    res.json(scores);
  } catch (err) {
    console.error("Erreur récupération des scores:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * 🏆 Classement général
 */
router.get("/leaderboard/:mode", async (req, res) => {
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
