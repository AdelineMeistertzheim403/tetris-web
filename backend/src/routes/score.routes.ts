import { Router } from "express";
import { PrismaClient } from "@prisma/client"; // ✅ import enum
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import { GameMode } from "../types/GameMode";

const router = Router();
const prisma = new PrismaClient();
/**
 * 🧠 Enregistrer un nouveau score
 */
router.post("/", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { value, level, lines, mode } = req.body;
    const userId = req.user?.id;
    const prismaMode =
  mode === "SPRINT" ? GameMode.SPRINT : GameMode.CLASSIQUE;


    if (!userId) return res.status(401).json({ error: "Utilisateur non authentifié" });
    if (value === undefined || level === undefined || lines === undefined)
      return res.status(400).json({ error: "Champs manquants" });

    const score = await prisma.score.create({
      data: { value, level, lines, userId, mode: prismaMode  },
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
    const { mode } = req.params; // récupère "CLASSIQUE" ou "SPRINT"

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    const scores = await prisma.score.findMany({
      where: { userId, mode },
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
router.get("/leaderboard/:mode", async (_req, res) => {
  try {
     const { mode } = _req.params;
    const leaderboard = await prisma.score.findMany({
      where: { mode },
      include: { user: { select: { pseudo: true } } },
      orderBy: mode === "SPRINT" ? { value: "asc" } : { value: "desc" },
      take: 10,
    });
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
