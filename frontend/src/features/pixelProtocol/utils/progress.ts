import type { PixelProtocolProgress } from "../services/pixelProtocolService";

const STORAGE_KEY = "pixel-protocol-progress-v1";

export function readLocalPixelProtocolProgress(): PixelProtocolProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { highestLevel: 1, currentLevel: 1, updatedAt: null };
    }
    const parsed = JSON.parse(raw) as Partial<PixelProtocolProgress>;
    return {
      highestLevel: Number.isFinite(parsed.highestLevel)
        ? Math.max(1, Math.floor(parsed.highestLevel as number))
        : 1,
      currentLevel: Number.isFinite(parsed.currentLevel)
        ? Math.max(1, Math.floor(parsed.currentLevel as number))
        : 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return { highestLevel: 1, currentLevel: 1, updatedAt: null };
  }
}

export function writeLocalPixelProtocolProgress(progress: PixelProtocolProgress) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      highestLevel: Math.max(1, Math.floor(progress.highestLevel)),
      currentLevel: Math.max(1, Math.floor(progress.currentLevel)),
      updatedAt: progress.updatedAt ?? null,
    })
  );
}
