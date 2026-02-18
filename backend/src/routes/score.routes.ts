import { Router, Response } from "express";
import { createHmac } from "crypto";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { verifyToken, AuthRequest } from "../middleware/auth.middleware";
import {
  scoreSchema,
  versusMatchSchema,
  roguelikeVersusMatchSchema,
  brickfallVersusMatchSchema,
  botProfileUpdateSchema,
} from "../utils/validation";
import { GameMode } from "../types/GameMode";
import prisma from "../prisma/client";
import { logger } from "../logger";
import { env } from "../config";

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

const TETROBOTS_PSEUDO_PREFIX = "Tetrobots";
const TETROBOTS_EMAIL_DOMAIN = "bots.tetris.local";
const TETROBOTS_PASSWORD_HASH = bcrypt.hashSync(`${env.jwtSecret}:tetrobots-bot`, 10);
const PROFILE_SMOOTH_ALPHA = 0.15;

type PlayerStyle =
  | "aggressive"
  | "defensive"
  | "clean"
  | "messy"
  | "panic"
  | "balanced";

type BotProfilePayload = {
  avgHeight: number;
  holes: number;
  comboAvg: number;
  tetrisRate: number;
  linesSent: number;
  linesSurvived: number;
  redZoneTime: number;
  leftBias?: number;
  usedHold?: boolean;
  botPersonality?: "rookie" | "balanced" | "apex";
};

function isTetrobotsPseudo(pseudo: string): boolean {
  return pseudo.trim().startsWith(TETROBOTS_PSEUDO_PREFIX);
}

function toBotEmail(pseudo: string): string {
  const slug = pseudo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const localPart = slug || "tetrobots";
  return `${localPart}@${TETROBOTS_EMAIL_DOMAIN}`;
}

async function ensureTetrobotsUserId(pseudo: string): Promise<number> {
  const created = await prisma.user.upsert({
    where: { pseudo },
    update: {},
    create: {
      pseudo,
      email: toBotEmail(pseudo),
      password: TETROBOTS_PASSWORD_HASH,
    },
    select: { id: true },
  });
  return created.id;
}

function computeScoreToken(userId: number, mode: GameMode, matchId?: string | null) {
  const payload = `${userId}:${mode}:${matchId ?? ""}`;
  return createHmac("sha256", env.runTokenSecret).update(payload).digest("hex");
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const lerp = (from: number, to: number, alpha: number) => from + (to - from) * alpha;

function detectPlayerStyle(profile: {
  aggressionScore: number;
  defensiveScore: number;
  avgHoles: number;
  panicRate: number;
}): PlayerStyle {
  if (profile.aggressionScore > 30) return "aggressive";
  if (profile.defensiveScore > 45) return "defensive";
  if (profile.avgHoles < 2) return "clean";
  if (profile.panicRate > 0.4) return "panic";
  if (profile.avgHoles > 6) return "messy";
  return "balanced";
}

function normalizeProfileUpdate(payload: BotProfilePayload) {
  return {
    avgHeight: clamp(payload.avgHeight, 0, 40),
    holes: clamp(payload.holes, 0, 60),
    comboAvg: clamp(payload.comboAvg, 0, 20),
    tetrisRate: clamp(payload.tetrisRate, 0, 1),
    linesSent: clamp(payload.linesSent, 0, 500),
    linesSurvived: clamp(payload.linesSurvived, 0, 500),
    redZoneTime: clamp(payload.redZoneTime, 0, 1),
    leftBias: clamp(payload.leftBias ?? 0.5, 0, 1),
    noHoldSample: payload.usedHold === false ? 1 : 0,
  };
}

function extractRunToken(req: AuthRequest): string | null {
  const header = req.headers["x-run-token"];
  if (typeof header === "string" && header.trim()) return header.trim();
  if (Array.isArray(header) && header[0]?.trim()) return header[0].trim();
  if (req.body && typeof req.body.runToken === "string" && req.body.runToken.trim()) {
    return req.body.runToken.trim();
  }
  return null;
}

router.post("/token", verifyToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Utilisateur non authentifie" });
  }

  const mode = req.body?.mode as GameMode | undefined;
  const matchId = req.body?.matchId as string | undefined;

  if (!mode || !Object.values(GameMode).includes(mode)) {
    return res.status(400).json({ error: "Mode de jeu invalide" });
  }

  const token = computeScoreToken(userId, mode, matchId);
  res.json({ runToken: token });
});

router.get("/tetrobots-profile", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const profile = await prisma.botPlayerProfile.findUnique({ where: { userId } });
    if (!profile) {
      return res.json({
        profile: {
          totalMatches: 0,
          avgStackHeight: 0,
          avgHoles: 0,
          avgCombo: 0,
          tetrisRate: 0,
          aggressionScore: 0,
          defensiveScore: 0,
          panicRate: 0,
          leftBias: 0.5,
          noHoldRate: 0,
          matchesVsRookie: 0,
          matchesVsBalanced: 0,
          matchesVsApex: 0,
        },
        style: "balanced",
      });
    }

    return res.json({ profile, style: detectPlayerStyle(profile) });
  } catch (err) {
    logger.error({ err }, "Erreur lecture profil tetrobots");
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/tetrobots-profile", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = botProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const update = normalizeProfileUpdate(parsed.data);
    const existing = await prisma.botPlayerProfile.findUnique({ where: { userId } });
    const current = existing ?? {
      userId,
      totalMatches: 0,
      avgStackHeight: 0,
      avgHoles: 0,
      avgCombo: 0,
      tetrisRate: 0,
      aggressionScore: 0,
      defensiveScore: 0,
      panicRate: 0,
      leftBias: 0.5,
      noHoldRate: 0,
      matchesVsRookie: 0,
      matchesVsBalanced: 0,
      matchesVsApex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const next = {
      totalMatches: current.totalMatches + 1,
      avgStackHeight: lerp(current.avgStackHeight, update.avgHeight, PROFILE_SMOOTH_ALPHA),
      avgHoles: lerp(current.avgHoles, update.holes, PROFILE_SMOOTH_ALPHA),
      avgCombo: lerp(current.avgCombo, update.comboAvg, PROFILE_SMOOTH_ALPHA),
      tetrisRate: lerp(current.tetrisRate, update.tetrisRate, PROFILE_SMOOTH_ALPHA),
      aggressionScore: lerp(current.aggressionScore, update.linesSent, PROFILE_SMOOTH_ALPHA),
      defensiveScore: lerp(current.defensiveScore, update.linesSurvived, PROFILE_SMOOTH_ALPHA),
      panicRate: lerp(current.panicRate, update.redZoneTime, PROFILE_SMOOTH_ALPHA),
      leftBias: lerp(current.leftBias, update.leftBias, PROFILE_SMOOTH_ALPHA),
      noHoldRate: lerp(current.noHoldRate, update.noHoldSample, PROFILE_SMOOTH_ALPHA),
      matchesVsRookie:
        current.matchesVsRookie + (parsed.data.botPersonality === "rookie" ? 1 : 0),
      matchesVsBalanced:
        current.matchesVsBalanced + (parsed.data.botPersonality === "balanced" ? 1 : 0),
      matchesVsApex: current.matchesVsApex + (parsed.data.botPersonality === "apex" ? 1 : 0),
    };

    const profile = await prisma.botPlayerProfile.upsert({
      where: { userId },
      update: next,
      create: {
        userId,
        ...next,
      },
    });

    return res.json({ profile, style: detectPlayerStyle(profile) });
  } catch (err) {
    logger.error({ err }, "Erreur mise a jour profil tetrobots");
    return res.status(500).json({ error: "Erreur serveur" });
  }
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

    const providedToken = extractRunToken(req);
    const expectedToken = computeScoreToken(req.user.id, mode);
    if (!providedToken || providedToken !== expectedToken) {
      return res.status(403).json({ error: "Token de run invalide" });
    }

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

    const matchId = parsed.data.matchId ?? null;
    const providedToken = extractRunToken(req);
    const expectedToken = computeScoreToken(userId, GameMode.VERSUS, matchId ?? undefined);
    if (!providedToken || providedToken !== expectedToken) {
      return res.status(403).json({ error: "Token de run invalide" });
    }

    const players = await Promise.all(
      parsed.data.players.map(async (p) => {
        const pseudo = p.pseudo.trim();
        if (p.userId) {
          return { ...p, pseudo };
        }
        if (!isTetrobotsPseudo(pseudo)) {
          return { ...p, pseudo };
        }
        const botUserId = await ensureTetrobotsUserId(pseudo);
        return { ...p, pseudo, userId: botUserId };
      })
    );

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
 * Enregistrer un résultat de match Roguelike Versus (2 joueurs, une seule ligne)
 */
router.post("/roguelike-versus-match", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = roguelikeVersusMatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const matchId = parsed.data.matchId ?? null;
    const providedToken = extractRunToken(req);
    const expectedToken = computeScoreToken(userId, GameMode.ROGUELIKE_VERSUS, matchId ?? undefined);
    if (!providedToken || providedToken !== expectedToken) {
      return res.status(403).json({ error: "Token de run invalide" });
    }

    const players = await Promise.all(
      parsed.data.players.map(async (p) => {
        const pseudo = p.pseudo.trim();
        if (p.userId) {
          return { ...p, pseudo };
        }
        if (!isTetrobotsPseudo(pseudo)) {
          return { ...p, pseudo };
        }
        const botUserId = await ensureTetrobotsUserId(pseudo);
        return { ...p, pseudo, userId: botUserId };
      })
    );

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

    const existing = await prisma.roguelikeVersusMatch.findFirst({
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

    const created = await prisma.roguelikeVersusMatch.create({
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
    logger.error({ err }, "Erreur enregistrement match roguelike versus");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Enregistrer un résultat de match Brickfall Versus (2 joueurs, une seule ligne)
 */
router.post("/brickfall-versus-match", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = brickfallVersusMatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const matchId = parsed.data.matchId ?? null;
    const providedToken = extractRunToken(req);
    const expectedToken = computeScoreToken(userId, GameMode.BRICKFALL_VERSUS, matchId ?? undefined);
    if (!providedToken || providedToken !== expectedToken) {
      return res.status(403).json({ error: "Token de run invalide" });
    }

    const players = await Promise.all(
      parsed.data.players.map(async (p) => {
        const pseudo = p.pseudo.trim();
        if (p.userId) {
          return { ...p, pseudo };
        }
        if (!isTetrobotsPseudo(pseudo)) {
          return { ...p, pseudo };
        }
        const botUserId = await ensureTetrobotsUserId(pseudo);
        return { ...p, pseudo, userId: botUserId };
      })
    );

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

    const existing = await prisma.brickfallVersusMatch.findFirst({
      where: {
        matchId: parsed.data.matchId,
        player1Pseudo: p1.pseudo,
        player2Pseudo: p2.pseudo,
        player1Role: p1.role,
        player2Role: p2.role,
        player1Score: p1.score,
        player2Score: p2.score,
      },
    });

    if (existing) {
      return res.json(existing);
    }

    const created = await prisma.brickfallVersusMatch.create({
      data: {
        matchId: parsed.data.matchId,
        player1Id: p1.userId,
        player1Pseudo: p1.pseudo,
        player1Role: p1.role,
        player1Score: p1.score,
        player1Lines: p1.lines,
        player2Id: p2.userId,
        player2Pseudo: p2.pseudo,
        player2Role: p2.role,
        player2Score: p2.score,
        player2Lines: p2.lines,
        winnerId,
        winnerPseudo,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "Erreur enregistrement match brickfall versus");
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

    if (mode === GameMode.BRICKFALL_VERSUS) {
      const matches = await prisma.brickfallVersusMatch.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 500,
      });

      type PlayerStats = {
        userId: number | null;
        pseudo: string;
        wins: number;
        losses: number;
        architectGames: number;
        demolisherGames: number;
        architectWins: number;
        demolisherWins: number;
      };
      const byPlayer = new Map<string, PlayerStats>();
      const upsert = (
        userId: number | null,
        pseudo: string,
        role: "ARCHITECT" | "DEMOLISHER",
        won: boolean
      ) => {
        const key = userId ? `id:${userId}` : `pseudo:${pseudo}`;
        const current = byPlayer.get(key) ?? {
          userId,
          pseudo,
          wins: 0,
          losses: 0,
          architectGames: 0,
          demolisherGames: 0,
          architectWins: 0,
          demolisherWins: 0,
        };
        if (won) current.wins += 1;
        else current.losses += 1;
        if (role === "ARCHITECT") {
          current.architectGames += 1;
          if (won) current.architectWins += 1;
        } else {
          current.demolisherGames += 1;
          if (won) current.demolisherWins += 1;
        }
        byPlayer.set(key, current);
      };

      matches.forEach((m) => {
        if (!m.winnerId && !m.winnerPseudo) return;
        const p1Won =
          (m.winnerId !== null && m.winnerId === m.player1Id) ||
          (m.winnerId === null && m.winnerPseudo === m.player1Pseudo);
        const p2Won =
          (m.winnerId !== null && m.winnerId === m.player2Id) ||
          (m.winnerId === null && m.winnerPseudo === m.player2Pseudo);
        upsert(m.player1Id ?? null, m.player1Pseudo, m.player1Role, p1Won);
        upsert(m.player2Id ?? null, m.player2Pseudo, m.player2Role, p2Won);
      });

      const leaderboard = Array.from(byPlayer.values())
        .map((p) => ({
          ...p,
          rankScore: p.wins - p.losses,
          winRate: p.wins + p.losses > 0 ? p.wins / (p.wins + p.losses) : 0,
        }))
        .sort((a, b) => {
          if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.winRate - a.winRate;
        })
        .slice(0, 20);

      return res.json(leaderboard);
    }

    if (mode === GameMode.VERSUS || mode === GameMode.ROGUELIKE_VERSUS) {
      const isRoguelikeVersus = mode === GameMode.ROGUELIKE_VERSUS;
      const sourceMatches = isRoguelikeVersus
        ? await prisma.roguelikeVersusMatch.findMany({
            orderBy: [{ createdAt: "desc" }],
            take: 400,
          })
        : await prisma.versusMatch.findMany({
            orderBy: [{ createdAt: "desc" }],
            take: 400,
          });

      const toPlayerKey = (userId: number | null, pseudo: string) =>
        userId ? `id:${userId}` : `pseudo:${pseudo.trim().toLowerCase()}`;

      const latestMatchIdByPlayer = new Map<string, number>();
      for (const m of sourceMatches) {
        const p1Key = toPlayerKey(m.player1Id ?? null, m.player1Pseudo);
        if (!latestMatchIdByPlayer.has(p1Key)) latestMatchIdByPlayer.set(p1Key, m.id);

        const p2Key = toPlayerKey(m.player2Id ?? null, m.player2Pseudo);
        if (!latestMatchIdByPlayer.has(p2Key)) latestMatchIdByPlayer.set(p2Key, m.id);
      }
      const latestMatchIds = new Set(Array.from(latestMatchIdByPlayer.values()));
      const filteredMatches = sourceMatches.filter((m) => latestMatchIds.has(m.id));

      const stats = new Map<number, { wins: number; losses: number }>();
      const bump = (id: number | null | undefined, type: "wins" | "losses") => {
        if (!id) return;
        const current = stats.get(id) ?? { wins: 0, losses: 0 };
        current[type] += 1;
        stats.set(id, current);
      };

      sourceMatches.forEach((m) => {
        if (!m.winnerId) return;
        bump(m.winnerId, "wins");
        const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
        bump(loserId, "losses");
      });

      const decorated = filteredMatches.map((m) => {
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
          const ratio = (wins: number, losses: number) =>
            wins + losses > 0 ? wins / (wins + losses) : 0;

          const aP1Ratio = ratio(a.player1.wins, a.player1.losses);
          const aP2Ratio = ratio(a.player2.wins, a.player2.losses);
          const bP1Ratio = ratio(b.player1.wins, b.player1.losses);
          const bP2Ratio = ratio(b.player2.wins, b.player2.losses);

          const aBestRatio = Math.max(aP1Ratio, aP2Ratio);
          const bBestRatio = Math.max(bP1Ratio, bP2Ratio);
          if (bBestRatio !== aBestRatio) return bBestRatio - aBestRatio;

          const aBestWins = Math.max(a.player1.wins, a.player2.wins);
          const bBestWins = Math.max(b.player1.wins, b.player2.wins);
          if (bBestWins !== aBestWins) return bBestWins - aBestWins;

          const aBestLosses = Math.min(a.player1.losses, a.player2.losses);
          const bBestLosses = Math.min(b.player1.losses, b.player2.losses);
          if (aBestLosses !== bBestLosses) return aBestLosses - bBestLosses;

          return b.createdAt.getTime() - a.createdAt.getTime();
        })
        .slice(0, 20);

      return res.json(ordered);
    }

    const targetMode = mode as GameMode;
    if (targetMode === GameMode.SPRINT) {
      const bestByUser = await prisma.score.groupBy({
        by: ["userId"],
        where: { mode: targetMode },
        _min: { value: true },
        orderBy: { _min: { value: "asc" } },
        take: 10,
      });

      const leaderboard = await Promise.all(
        bestByUser.map((entry) =>
          prisma.score.findFirst({
            where: { userId: entry.userId, mode: targetMode, value: entry._min.value ?? undefined },
            include: { user: { select: { pseudo: true } } },
            orderBy: { createdAt: "asc" },
          })
        )
      );

      return res.json(leaderboard.filter((row): row is NonNullable<typeof row> => Boolean(row)));
    }

    const bestByUser = await prisma.score.groupBy({
      by: ["userId"],
      where: { mode: targetMode },
      _max: { value: true },
      orderBy: { _max: { value: "desc" } },
      take: 10,
    });

    const leaderboard = await Promise.all(
      bestByUser.map((entry) =>
        prisma.score.findFirst({
          where: { userId: entry.userId, mode: targetMode, value: entry._max.value ?? undefined },
          include: { user: { select: { pseudo: true } } },
          orderBy: { createdAt: "asc" },
        })
      )
    );

    return res.json(leaderboard.filter((row): row is NonNullable<typeof row> => Boolean(row)));
  } catch (err) {
    logger.error({ err }, "Erreur leaderboard");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
