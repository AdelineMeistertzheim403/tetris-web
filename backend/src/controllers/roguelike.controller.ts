import { Response } from "express";
import { RunStatus } from "@prisma/client";
import prisma from "../prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

export async function startRoguelikeRun(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

     const { seed, state } = req.body;

    const run = await prisma.roguelikeRun.create({
      data: {
        userId,
        seed,
        state,
        score: 0,
        lines: 0,
        level: 1,
        perks: [],
        bombs: 0,
        timeFreezeCharges: 0,
        chaosMode: false,
        gravityMultiplier: 1,
        scoreMultiplier: 1,
        status: RunStatus.IN_PROGRESS,
      },
    });

    res.status(201).json(run);
  } catch (err) {
    console.error("startRoguelikeRun error:", err);
    res.status(500).json({ error: "Impossible de demarrer la run" });
  }
}

export async function getCurrentRoguelikeRun(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const run = await prisma.roguelikeRun.findFirst({
      where: {
        userId,
        status: RunStatus.IN_PROGRESS,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(run ?? null);
  } catch (err) {
    console.error("getCurrentRoguelikeRun error:", err);
    res.status(500).json({ error: "Impossible de recuperer la run" });
  }
}

export async function checkpointRoguelikeRun(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const runId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const {
      score,
      lines,
      level,
      perks,
      bombs,
      timeFreezeCharges,
      chaosMode,
      gravityMultiplier,
      scoreMultiplier,
    } = req.body;

    const run = await prisma.roguelikeRun.updateMany({
      where: {
        id: runId,
        userId,
        status: RunStatus.IN_PROGRESS,
      },
      data: {
        score,
        lines,
        level,
        perks,
        bombs,
        timeFreezeCharges,
        chaosMode,
        gravityMultiplier,
        scoreMultiplier,
      },
    });

    if (run.count === 0) {
      return res.status(404).json({ error: "Run introuvable ou terminee" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("checkpointRoguelikeRun error:", err);
    res.status(500).json({ error: "Impossible de sauvegarder la run" });
  }
}

export async function endRoguelikeRun(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const runId = Number(req.params.id);
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    if (![RunStatus.FINISHED, RunStatus.ABANDONED].includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const run = await prisma.roguelikeRun.updateMany({
      where: {
        id: runId,
        userId,
        status: RunStatus.IN_PROGRESS,
      },
      data: {
        status,
        endedAt: new Date(),
      },
    });

    if (run.count === 0) {
      return res.status(404).json({ error: "Run introuvable ou deja terminee" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("endRoguelikeRun error:", err);
    res.status(500).json({ error: "Impossible de terminer la run" });
  }
}

export async function getRoguelikeLeaderboard(
  req: AuthRequest,
  res: Response
) {
  try {
    const leaderboard = await prisma.roguelikeRun.findMany({
      where: {
        status: RunStatus.FINISHED,
      },
      orderBy: [
        { score: "desc" },
        { lines: "desc" },
      ],
      take: 20,
      include: {
        user: {
          select: { pseudo: true },
        },
      },
    });

    res.json(leaderboard);
  } catch (err) {
    console.error("getRoguelikeLeaderboard error:", err);
    res.status(500).json({ error: "Impossible de recuperer le classement" });
  }
}
