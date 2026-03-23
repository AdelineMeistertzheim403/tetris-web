import { getAuthHeader } from "../../auth/services/authService";

const API_URL = import.meta.env.VITE_API_URL;

export type PixelInvasionProgress = {
  highestWave: number;
  currentWave: number;
  bestScore: number;
  totalKills: number;
  totalLineBursts: number;
  victories: number;
  pausedRun: unknown | null;
  updatedAt?: string | null;
};

export type SavePixelInvasionProgressPayload = Partial<
  Omit<PixelInvasionProgress, "updatedAt">
>;

async function parseError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function normalizeProgress(data: Partial<PixelInvasionProgress> | null | undefined): PixelInvasionProgress {
  return {
    highestWave: Math.max(1, Math.floor(data?.highestWave ?? 1)),
    currentWave: Math.max(1, Math.floor(data?.currentWave ?? 1)),
    bestScore: Math.max(0, Math.floor(data?.bestScore ?? 0)),
    totalKills: Math.max(0, Math.floor(data?.totalKills ?? 0)),
    totalLineBursts: Math.max(0, Math.floor(data?.totalLineBursts ?? 0)),
    victories: Math.max(0, Math.floor(data?.victories ?? 0)),
    pausedRun: data?.pausedRun ?? null,
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : null,
  };
}

export async function fetchPixelInvasionProgress(): Promise<PixelInvasionProgress> {
  const res = await fetch(`${API_URL}/pixel-invasion/progress`, {
    headers: {
      ...getAuthHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur chargement progression Pixel Invasion"));
  }

  return normalizeProgress((await res.json()) as Partial<PixelInvasionProgress>);
}

export async function savePixelInvasionProgress(
  payload: SavePixelInvasionProgressPayload
): Promise<PixelInvasionProgress> {
  const body: SavePixelInvasionProgressPayload = {};
  if (payload.highestWave !== undefined) body.highestWave = Math.max(1, Math.floor(payload.highestWave));
  if (payload.currentWave !== undefined) body.currentWave = Math.max(1, Math.floor(payload.currentWave));
  if (payload.bestScore !== undefined) body.bestScore = Math.max(0, Math.floor(payload.bestScore));
  if (payload.totalKills !== undefined) body.totalKills = Math.max(0, Math.floor(payload.totalKills));
  if (payload.totalLineBursts !== undefined) body.totalLineBursts = Math.max(0, Math.floor(payload.totalLineBursts));
  if (payload.victories !== undefined) body.victories = Math.max(0, Math.floor(payload.victories));
  if (Object.prototype.hasOwnProperty.call(payload, "pausedRun")) body.pausedRun = payload.pausedRun ?? null;

  const res = await fetch(`${API_URL}/pixel-invasion/progress`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Erreur sauvegarde progression Pixel Invasion"));
  }

  return normalizeProgress((await res.json()) as Partial<PixelInvasionProgress>);
}
