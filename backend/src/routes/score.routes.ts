import { Router, Response } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import { scoreSchema, versusMatchSchema } from "../utils/validation";
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
 * Enregistrer un rÇ¸sultat de match Versus (2 joueurs, une seule ligne)
 */
router.post("/versus-match", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = versusMatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const players = parsed.data.players.map((p) => ({
      ...p,
      pseudo: p.pseudo.trim(),
    }));

    if (new Set(players.map((p) => p.slot)).size !== players.length) {
      return res.status(400).json({ error: "Les slots doivent etre uniques" });
    }

    if (!players.some((p) => p.userId === userId)) {
      return res.status(403).json({ error: "Le match doit inclure le joueur connecte" });
    }

    const playerIds = Array.from(new Set(players.map((p) => p.userId).filter(Boolean))) as number[];
    const userRecords = playerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, pseudo: true },
        })
      : [];

    if (userRecords.length !== playerIds.length) {
      return res.status(400).json({ error: "Un des joueurs references est introuvable" });
    }

    const usersById = new Map(userRecords.map((u) => [u.id, u]));

    const normalizedPlayers = players.map((p) => {
      if (!p.userId) return p;
      const found = usersById.get(p.userId);
      return { ...p, pseudo: found?.pseudo ?? p.pseudo };
    });

    const [p1, p2] = [...normalizedPlayers].sort((a, b) => a.slot - b.slot);
    const winner = p1.score === p2.score ? null : p1.score > p2.score ? p1 : p2;
    const winnerId = winner?.userId ?? null;
    const winnerPseudo =
      winnerId !== null && usersById.get(winnerId)
        ? usersById.get(winnerId)?.pseudo ?? null
        : winner?.pseudo ?? null;

    // DÇ¸doublonnage basique pour Ç¸viter deux Ã©critures pour le mÃªme match
    const existing = await prisma.versusMatch.findFirst({
      where: {
        matchId: parsed.data.matchId,
        player1Pseudo: p1.pseudo,
        player2Pseudo: p2.pseudo,
        player1Score: p1.score,
        player2Score: p2.score,
      },
    });

    if (existing) {
      return res.json(existing);
    }

    const created = await prisma.versusMatch.create({
      data: {
        matchId: parsed.data.matchId,
        player1Id: p1.userId,
        player1Pseudo: p1.pseudo,
        player1Score: p1.score,
        player1Lines: p1.lines,
        player2Id: p2.userId,
        player2Pseudo: p2.pseudo,
        player2Score: p2.score,
        player2Lines: p2.lines,
        winnerId,
        winnerPseudo,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "Erreur enregistrement match versus");
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

    if (mode === GameMode.VERSUS) {
      const matches = await prisma.versusMatch.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 200,
      });

      const stats = new Map<number, { wins: number; losses: number }>();
      const bump = (id: number | null | undefined, type: "wins" | "losses") => {
        if (!id) return;
        const current = stats.get(id) ?? { wins: 0, losses: 0 };
        current[type] += 1;
        stats.set(id, current);
      };

      matches.forEach((m) => {
        if (!m.winnerId) return;
        bump(m.winnerId, "wins");
        const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
        bump(loserId, "losses");
      });

      const decorated = matches.map((m) => {
        const p1Stats = m.player1Id ? stats.get(m.player1Id) ?? { wins: 0, losses: 0 } : { wins: 0, losses: 0 };
        const p2Stats = m.player2Id ? stats.get(m.player2Id) ?? { wins: 0, losses: 0 } : { wins: 0, losses: 0 };
        const winnerStats =
          m.winnerId && m.winnerId === m.player1Id
            ? p1Stats
            : m.winnerId && m.winnerId === m.player2Id
              ? p2Stats
              : { wins: 0, losses: 0 };

        return {
          id: m.id,
          matchId: m.matchId,
          createdAt: m.createdAt,
          winnerId: m.winnerId,
          winnerPseudo:
            m.winnerPseudo ??
            (m.winnerId === m.player1Id
              ? m.player1Pseudo
              : m.winnerId === m.player2Id
                ? m.player2Pseudo
                : null),
          player1: {
            userId: m.player1Id,
            pseudo: m.player1Pseudo,
            score: m.player1Score,
            lines: m.player1Lines,
            wins: p1Stats.wins,
            losses: p1Stats.losses,
          },
          player2: {
            userId: m.player2Id,
            pseudo: m.player2Pseudo,
            score: m.player2Score,
            lines: m.player2Lines,
            wins: p2Stats.wins,
            losses: p2Stats.losses,
          },
          rankScore: winnerStats.wins - winnerStats.losses,
        };
      });

      const ordered = decorated
        .sort((a, b) => {
          if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
          const bWins = b.winnerId === b.player1.userId ? b.player1.wins : b.player2.wins;
          const aWins = a.winnerId === a.player1.userId ? a.player1.wins : a.player2.wins;
          return bWins - aWins;
        })
        .slice(0, 10);

      return res.json(ordered);
    }

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
