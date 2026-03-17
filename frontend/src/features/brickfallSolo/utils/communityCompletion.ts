import type { BrickfallLevel } from "../types/levels";

const STORAGE_KEY = "brickfall-solo-community-completion-v1";

type CommunityCompletionRecord = {
  levelId: string;
  fingerprint: string;
  completedAt: string;
};

type CommunityCompletionStore = Record<string, CommunityCompletionRecord>;

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForHash(item));
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeForHash((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function canonicalBrickfallLevel(level: BrickfallLevel) {
  return {
    id: level.id,
    name: level.name,
    width: Math.round(level.width),
    height: Math.round(level.height),
    boss: Boolean(level.boss),
    bricks: [...level.bricks]
      .map((brick) => ({
        x: Math.round(brick.x),
        y: Math.round(brick.y),
        type: brick.type,
        hp: typeof brick.hp === "number" ? Math.round(brick.hp) : null,
        drop: brick.drop ?? null,
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x || a.type.localeCompare(b.type, "fr")),
  };
}

function readStore(): CommunityCompletionStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as CommunityCompletionStore;
  } catch {
    return {};
  }
}

function writeStore(store: CommunityCompletionStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function fingerprintBrickfallSoloLevel(level: BrickfallLevel): string {
  const normalized = normalizeForHash(canonicalBrickfallLevel(level));
  const json = JSON.stringify(normalized);
  let hash = 2166136261;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `bf-${(hash >>> 0).toString(16)}`;
}

export function markBrickfallSoloCustomLevelCompleted(level: BrickfallLevel) {
  const store = readStore();
  store[level.id] = {
    levelId: level.id,
    fingerprint: fingerprintBrickfallSoloLevel(level),
    completedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function getBrickfallSoloCustomLevelCompletion(level: BrickfallLevel) {
  return readStore()[level.id] ?? null;
}

export function hasCompletedCurrentBrickfallSoloLevel(level: BrickfallLevel) {
  const record = getBrickfallSoloCustomLevelCompletion(level);
  if (!record) return false;
  return record.fingerprint === fingerprintBrickfallSoloLevel(level);
}
