import type { TetromazeLevel } from "../types";

const STORAGE_KEY = "tetromaze-community-completion-v1";

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

function canonicalTetromazeLevel(level: TetromazeLevel) {
  return {
    id: level.id,
    name: level.name ?? "",
    grid: [...level.grid],
    playerSpawn: {
      x: Math.round(level.playerSpawn.x),
      y: Math.round(level.playerSpawn.y),
    },
    botSpawns: [...level.botSpawns]
      .map((spawn) => ({
        x: Math.round(spawn.x),
        y: Math.round(spawn.y),
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x),
    botKinds: [...(level.botKinds ?? ["rookie", "balanced", "apex"])],
    botHome: level.botHome
      ? {
          x: Math.round(level.botHome.x),
          y: Math.round(level.botHome.y),
          width: Math.round(level.botHome.width),
          height: Math.round(level.botHome.height),
          gate: level.botHome.gate
            ? {
                x: Math.round(level.botHome.gate.x),
                y: Math.round(level.botHome.gate.y),
                width: Math.round(level.botHome.gate.width),
              }
            : null,
        }
      : null,
    powerOrbs: [...level.powerOrbs]
      .map((orb) => ({
        x: Math.round(orb.x),
        y: Math.round(orb.y),
        type: orb.type,
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x || a.type.localeCompare(b.type, "fr")),
    loopPairs: [...(level.loopPairs ?? [])]
      .map((pair) => ({
        a: {
          x: Math.round(pair.a.x),
          y: Math.round(pair.a.y),
        },
        b: {
          x: Math.round(pair.b.x),
          y: Math.round(pair.b.y),
        },
      }))
      .sort((a, b) => a.a.y - b.a.y || a.a.x - b.a.x || a.b.y - b.b.y || a.b.x - b.b.x),
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

export function fingerprintTetromazeLevel(level: TetromazeLevel): string {
  const normalized = normalizeForHash(canonicalTetromazeLevel(level));
  const json = JSON.stringify(normalized);
  let hash = 2166136261;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `tmz-${(hash >>> 0).toString(16)}`;
}

export function markTetromazeCustomLevelCompleted(level: TetromazeLevel) {
  const store = readStore();
  store[level.id] = {
    levelId: level.id,
    fingerprint: fingerprintTetromazeLevel(level),
    completedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function getTetromazeCustomLevelCompletion(level: TetromazeLevel) {
  return readStore()[level.id] ?? null;
}

export function hasCompletedCurrentTetromazeLevel(level: TetromazeLevel) {
  const record = getTetromazeCustomLevelCompletion(level);
  if (!record) return false;
  return record.fingerprint === fingerprintTetromazeLevel(level);
}
