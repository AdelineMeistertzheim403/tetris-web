import { createStoredJsonValue } from "../../app/logic/localStorageValue";
import type { PixelProtocolProgress } from "../services/pixelProtocolService";

const STORAGE_KEY = "pixel-protocol-progress-v1";

function defaultPixelProtocolProgress(): PixelProtocolProgress {
  return { highestLevel: 1, currentLevel: 1, updatedAt: null };
}

export function normalizePixelProtocolProgress(value: unknown): PixelProtocolProgress {
  if (!value || typeof value !== "object") {
    return defaultPixelProtocolProgress();
  }

  const progress = value as Partial<PixelProtocolProgress>;
  return {
    highestLevel: Number.isFinite(progress.highestLevel)
      ? Math.max(1, Math.floor(progress.highestLevel as number))
      : 1,
    currentLevel: Number.isFinite(progress.currentLevel)
      ? Math.max(1, Math.floor(progress.currentLevel as number))
      : 1,
    updatedAt: typeof progress.updatedAt === "string" ? progress.updatedAt : null,
  };
}

const progressStore = createStoredJsonValue<PixelProtocolProgress>({
  storageKey: STORAGE_KEY,
  fallback: defaultPixelProtocolProgress,
  normalize: normalizePixelProtocolProgress,
});

export const readLocalPixelProtocolProgress = progressStore.read;
export const writeLocalPixelProtocolProgress = progressStore.write;

export function mergePixelProtocolProgress(
  base: PixelProtocolProgress,
  incoming: Partial<PixelProtocolProgress>
): PixelProtocolProgress {
  const current = normalizePixelProtocolProgress(base);
  const next = normalizePixelProtocolProgress(incoming);
  return {
    highestLevel: Math.max(current.highestLevel, next.highestLevel),
    currentLevel: Math.max(current.currentLevel, next.currentLevel),
    updatedAt: next.updatedAt ?? current.updatedAt ?? null,
  };
}
