import type { LevelDef } from "../types";

const STORAGE_KEY = "pixel-protocol-community-completion-v1";

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

function canonicalGameplayLevel(level: LevelDef) {
  return {
    id: level.id,
    world: level.world,
    worldWidth: Math.round(level.worldWidth),
    worldHeight:
      typeof level.worldHeight === "number" ? Math.round(level.worldHeight) : null,
    worldTopPadding:
      typeof level.worldTopPadding === "number" ? Math.round(level.worldTopPadding) : 0,
    requiredOrbs: Math.round(level.requiredOrbs),
    spawn: {
      x: Math.round(level.spawn.x),
      y: Math.round(level.spawn.y),
    },
    portal: {
      x: Math.round(level.portal.x),
      y: Math.round(level.portal.y),
    },
    platforms: [...level.platforms]
      .map((platform) => ({
        id: platform.id,
        tetromino: platform.tetromino,
        x: Math.round(platform.x),
        y: Math.round(platform.y),
        rotation: platform.rotation ?? 0,
        type: platform.type,
        rotateEveryMs:
          typeof platform.rotateEveryMs === "number"
            ? Math.round(platform.rotateEveryMs)
            : null,
        moveAxis: platform.moveAxis ?? null,
        movePattern: platform.movePattern ?? null,
        moveRangeTiles:
          typeof platform.moveRangeTiles === "number"
            ? Math.round(platform.moveRangeTiles)
            : null,
        moveSpeed:
          typeof platform.moveSpeed === "number"
            ? Math.round(platform.moveSpeed)
            : null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id, "fr")),
    checkpoints: [...level.checkpoints]
      .map((checkpoint) => ({
        id: checkpoint.id,
        x: Math.round(checkpoint.x),
        y: Math.round(checkpoint.y),
        spawnX: Math.round(checkpoint.spawnX),
        spawnY: Math.round(checkpoint.spawnY),
      }))
      .sort((a, b) => a.id.localeCompare(b.id, "fr")),
    orbs: [...level.orbs]
      .map((orb) => ({
        id: orb.id,
        x: Math.round(orb.x),
        y: Math.round(orb.y),
        affinity: orb.affinity ?? "standard",
        grantsSkill: orb.grantsSkill ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id, "fr")),
    enemies: [...level.enemies]
      .map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        vx: Math.round(enemy.vx),
        minX: Math.round(enemy.minX),
        maxX: Math.round(enemy.maxX),
      }))
      .sort((a, b) => a.id.localeCompare(b.id, "fr")),
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

export function fingerprintPixelProtocolLevel(level: LevelDef): string {
  const normalized = normalizeForHash(canonicalGameplayLevel(level));
  const json = JSON.stringify(normalized);
  let hash = 2166136261;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `pp-${(hash >>> 0).toString(16)}`;
}

export function markPixelProtocolCustomLevelCompleted(level: LevelDef) {
  const store = readStore();
  store[level.id] = {
    levelId: level.id,
    fingerprint: fingerprintPixelProtocolLevel(level),
    completedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function getPixelProtocolCustomLevelCompletion(level: LevelDef) {
  const record = readStore()[level.id];
  if (!record) return null;
  return record;
}

export function hasCompletedCurrentPixelProtocolLevel(level: LevelDef) {
  const record = getPixelProtocolCustomLevelCompletion(level);
  if (!record) return false;
  return record.fingerprint === fingerprintPixelProtocolLevel(level);
}
