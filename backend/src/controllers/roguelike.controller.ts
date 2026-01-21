import { Response } from "express";
import { Prisma, RunStatus } from "@prisma/client";
import prisma from "../prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  roguelikeCheckpointSchema,
  roguelikeEndSchema,
  roguelikeStartSchema,
} from "../utils/validation";

const MAX_STATE_BYTES = 50_000; // limite raisonnable pour eviter l'injection de blobs

export async function getMyRoguelikeRuns(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const runs = await prisma.roguelikeRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        seed: true,
        score: true,
        lines: true,
        level: true,
        perks: true,
        mutations: true,
        chaosMode: true,
        status: true,
        createdAt: true,
        endedAt: true,
      },
    });

    res.json(runs);
  } catch (err) {
    console.error("getMyRoguelikeRuns error:", err);
    res.status(500).json({ error: "Impossible de recuperer l'historique" });
  }
}

export async function startRoguelikeRun(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }

    const parsed = roguelikeStartSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const statePayload: Prisma.InputJsonValue = parsed.data.state ?? {};
    const payloadSize = Buffer.byteLength(JSON.stringify(statePayload), "utf8");
    if (payloadSize > MAX_STATE_BYTES) {
      return res.status(413).json({ error: "Etat trop volumineux" });
    }

    const run = await prisma.roguelikeRun.create({
      data: {
        userId,
        seed: parsed.data.seed,
        state: statePayload,
        score: 0,
        lines: 0,
        level: 1,
        perks: [],
        mutations: [],
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
    if (!Number.isInteger(runId) || runId <= 0) {
      return res.status(400).json({ error: "Identifiant de run invalide" });
    }

    const parsed = roguelikeCheckpointSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    }

    const {
      score,
      lines,
      level,
      perks,
      mutations,
      bombs,
      timeFreezeCharges,
      chaosMode,
      gravityMultiplier,
      scoreMultiplier,
    } = parsed.data;

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
        mutations,
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

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifie" });
    }
    if (!Number.isInteger(runId) || runId <= 0) {
      return res.status(400).json({ error: "Identifiant de run invalide" });
    }

    const parsed = roguelikeEndSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Statut invalide", details: parsed.error.flatten() });
    }

    const { status } = parsed.data;

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
      { level: "desc" },
      { lines: "desc" },
      { createdAt: "asc" },
    ],
    take: 20,
    select: {
      score: true,
      level: true,
      lines: true,
      chaosMode: true,
      seed: true,
      createdAt: true,
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
