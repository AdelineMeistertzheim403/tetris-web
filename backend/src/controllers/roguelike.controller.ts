import { Response } from "express";
import { createHmac } from "crypto";
import { Prisma, RunStatus } from "@prisma/client";
import prisma from "../prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  roguelikeCheckpointSchema,
  roguelikeEndSchema,
  roguelikeStartSchema,
} from "../utils/validation";
import { env } from "../config";

const MAX_STATE_BYTES = 50_000; // limite raisonnable pour eviter l'injection de blobs
const MAX_DB_BIGINT = BigInt("9223372036854775807");
const MIN_DB_BIGINT = 0n;

function clampBigInt(value: bigint): bigint {
  if (value < MIN_DB_BIGINT) return MIN_DB_BIGINT;
  if (value > MAX_DB_BIGINT) return MAX_DB_BIGINT;
  return value;
}

function serializeRoguelikeScore(score: bigint): string {
  return score.toString();
}

function serializeRoguelikeRun<T extends { score: bigint }>(run: T) {
  return { ...run, score: serializeRoguelikeScore(run.score) };
}

function computeRunToken(run: { id: number; userId: number; seed: string }) {
  // On se limite à des champs stables pour éviter tout décalage de sérialisation
  const payload = `${run.id}:${run.userId}:${run.seed}`;
  return createHmac("sha256", env.runTokenSecret).update(payload).digest("hex");
}

function getProvidedRunToken(req: AuthRequest): string | null {
  const header = req.headers["x-run-token"];
  if (typeof header === "string" && header.trim()) return header.trim();
  if (Array.isArray(header) && header[0]?.trim()) return header[0].trim();
  if (req.body && typeof req.body.runToken === "string" && req.body.runToken.trim()) {
    return req.body.runToken.trim();
  }
  return null;
}

function getJsonObject(value: Prisma.JsonValue): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getJsonNumber(value: Prisma.JsonValue, key: string): number | null {
  const obj = getJsonObject(value);
  if (!obj) return null;
  const raw = obj[key];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

function hasMutation(value: Prisma.JsonValue, id: string): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    return (entry as Record<string, unknown>).id === id;
  });
}

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

    res.json(runs.map(serializeRoguelikeRun));
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

    const baseState = parsed.data.state ?? {};
    const statePayload: Prisma.InputJsonValue = { ...baseState, bombsUsed: 0 };
    const payloadSize = Buffer.byteLength(JSON.stringify(statePayload), "utf8");
    if (payloadSize > MAX_STATE_BYTES) {
      return res.status(413).json({ error: "Etat trop volumineux" });
    }

    const run = await prisma.roguelikeRun.create({
      data: {
        userId,
        seed: parsed.data.seed,
        state: statePayload,
        score: 0n,
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

    const runToken = computeRunToken(run);

    const runJson = serializeRoguelikeRun(run);
    res.status(201).json({ ...runJson, runToken });
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

    if (!run) {
      return res.json(null);
    }

    const runToken = computeRunToken(run);
    const runJson = serializeRoguelikeRun(run);
    res.json({ ...runJson, runToken });
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

    const run = await prisma.roguelikeRun.findFirst({
      where: {
        id: runId,
        userId,
        status: RunStatus.IN_PROGRESS,
      },
    });

    if (!run) {
      return res.status(404).json({ error: "Run introuvable ou terminee" });
    }

    const providedToken = getProvidedRunToken(req);
    const expectedToken = computeRunToken(run);
    if (!providedToken || providedToken !== expectedToken) {
      return res.status(403).json({ error: "Token de run invalide" });
    }

    const {
      lines,
      perks,
      mutations,
      bombs,
      bombsUsed,
      timeFreezeCharges,
      chaosMode,
      gravityMultiplier,
      scoreMultiplier,
    } = parsed.data;

    const storedBombsUsed = getJsonNumber(run.state, "bombsUsed") ?? 0;
    const safeBombsUsed = Math.max(storedBombsUsed, bombsUsed);
    const nextState = { ...(getJsonObject(run.state) ?? {}), bombsUsed: safeBombsUsed };
    const hasZeroBombBoost = mutations.some((mutation) =>
      mutation.id === "final-protocol" || mutation.id === "protocole_final"
    );
    const effectiveScoreMultiplier =
      scoreMultiplier * (hasZeroBombBoost && bombs === 0 ? 2 : 1);

    // Recalcul server-side pour éviter la triche : score et niveau dérivés des lignes
    const safeLines = Math.max(run.lines, lines);
    const deltaLines = Math.max(0, safeLines - run.lines);
    const increment = BigInt(
      Math.round(deltaLines * 100 * effectiveScoreMultiplier)
    );
    const computedScore = clampBigInt(run.score + increment);
    const computedLevel = Math.max(1, Math.floor(safeLines / 10) + 1);

    await prisma.roguelikeRun.update({
      where: { id: run.id },
      data: {
        score: computedScore,
        lines: safeLines,
        level: computedLevel,
        perks,
        mutations,
        bombs,
        state: nextState,
        timeFreezeCharges,
        chaosMode,
        gravityMultiplier,
        scoreMultiplier,
      },
    });

    res.json({
      success: true,
      score: serializeRoguelikeScore(computedScore),
      lines: safeLines,
      level: computedLevel,
    });
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

    const run = await prisma.roguelikeRun.findFirst({
      where: {
        id: runId,
        userId,
        status: RunStatus.IN_PROGRESS,
      },
    });

    if (!run) {
      return res.status(404).json({ error: "Run introuvable ou deja terminee" });
    }

    const providedToken = getProvidedRunToken(req);
    const expectedToken = computeRunToken(run);
    if (!providedToken || providedToken !== expectedToken) {
      return res.status(403).json({ error: "Token de run invalide" });
    }

    const { status } = parsed.data;

    const bombsUsed = getJsonNumber(run.state, "bombsUsed");
    const hasNoBombBonus = hasMutation(run.mutations, "perfect-risk");
    const shouldApplyNoBombBonus =
      status === RunStatus.FINISHED && hasNoBombBonus && bombsUsed === 0;
    const rawFinalScore = shouldApplyNoBombBonus ? run.score * 2n : run.score;
    const finalScore = clampBigInt(rawFinalScore);

    await prisma.roguelikeRun.update({
      where: { id: run.id },
      data: {
        status,
        endedAt: new Date(),
        score: finalScore,
      },
    });

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

  res.json(leaderboard.map(serializeRoguelikeRun));
  } catch (err) {
    console.error("getRoguelikeLeaderboard error:", err);
    res.status(500).json({ error: "Impossible de recuperer le classement" });
  }
}
