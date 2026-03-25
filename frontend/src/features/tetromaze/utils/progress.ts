import { createStoredJsonValue } from "../../app/logic/localStorageValue";
import { TETROMAZE_TOTAL_LEVELS } from "../data/campaignLevels";
import type {
  SaveTetromazeProgressPayload,
  TetromazeProgress,
} from "../services/tetromazeService";

const STORAGE_KEY = "tetromaze-campaign-progress-v1";

function defaultTetromazeProgress(): TetromazeProgress {
  return { highestLevel: 1, currentLevel: 1, levelScores: {} };
}

export function clampTetromazeCampaignLevel(level: number) {
  const normalized = Number.isFinite(level) ? Math.floor(level) : 1;
  return Math.max(1, Math.min(TETROMAZE_TOTAL_LEVELS, normalized));
}

function normalizeLevelScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const scores: Record<string, number> = {};
  for (const [key, rawScore] of Object.entries(value as Record<string, unknown>)) {
    const level = Number.parseInt(key, 10);
    const score = Number.isFinite(rawScore)
      ? Math.max(0, Math.floor(rawScore as number))
      : Number.parseInt(String(rawScore), 10);
    if (!Number.isFinite(level) || level < 1 || !Number.isFinite(score) || score < 0) {
      continue;
    }
    scores[String(level)] = score;
  }

  return scores;
}

export function normalizeTetromazeProgress(value: unknown): TetromazeProgress {
  if (!value || typeof value !== "object") {
    return defaultTetromazeProgress();
  }

  const progress = value as Partial<TetromazeProgress>;
  return {
    highestLevel: clampTetromazeCampaignLevel(Number(progress.highestLevel) || 1),
    currentLevel: clampTetromazeCampaignLevel(Number(progress.currentLevel) || 1),
    levelScores: normalizeLevelScores(progress.levelScores),
  };
}

const progressStore = createStoredJsonValue<TetromazeProgress>({
  storageKey: STORAGE_KEY,
  fallback: defaultTetromazeProgress,
  normalize: normalizeTetromazeProgress,
});

export const readLocalTetromazeProgress = progressStore.read;
export const writeLocalTetromazeProgress = progressStore.write;

export function mergeTetromazeProgress(
  base: TetromazeProgress,
  incoming: Partial<TetromazeProgress>
): TetromazeProgress {
  const current = normalizeTetromazeProgress(base);
  const next = normalizeTetromazeProgress(incoming);
  return {
    highestLevel: Math.max(current.highestLevel, next.highestLevel),
    currentLevel: Math.max(current.currentLevel, next.currentLevel),
    levelScores: { ...current.levelScores, ...next.levelScores },
  };
}

export function applyTetromazeProgressUpdate(
  current: TetromazeProgress,
  payload: SaveTetromazeProgressPayload
): TetromazeProgress {
  const next = mergeTetromazeProgress(current, payload);

  if (payload.levelIndex !== undefined && payload.score !== undefined) {
    const key = String(clampTetromazeCampaignLevel(payload.levelIndex));
    const score = Math.max(0, Math.floor(payload.score));
    next.levelScores = {
      ...next.levelScores,
      [key]: Math.max(next.levelScores[key] ?? 0, score),
    };
  }

  return next;
}
