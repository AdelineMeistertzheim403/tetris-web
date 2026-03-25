export type CommunityCompletionRecord = {
  levelId: string;
  fingerprint: string;
  completedAt: string;
};

type CommunityCompletionStore = Record<string, CommunityCompletionRecord>;

type CommunityCompletionTrackerOptions<T> = {
  storageKey: string;
  prefix: string;
  getLevelId: (level: T) => string;
  canonicalize: (level: T) => unknown;
};

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

function fingerprintCanonicalValue(prefix: string, value: unknown) {
  const normalized = normalizeForHash(value);
  const json = JSON.stringify(normalized);
  let hash = 2166136261;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(16)}`;
}

function readStore(storageKey: string): CommunityCompletionStore {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed as CommunityCompletionStore;
  } catch {
    return {};
  }
}

function writeStore(storageKey: string, store: CommunityCompletionStore) {
  localStorage.setItem(storageKey, JSON.stringify(store));
}

export function createCommunityCompletionTracker<T>({
  storageKey,
  prefix,
  getLevelId,
  canonicalize,
}: CommunityCompletionTrackerOptions<T>) {
  const fingerprint = (level: T) => fingerprintCanonicalValue(prefix, canonicalize(level));

  const markCompleted = (level: T) => {
    const levelId = getLevelId(level);
    const store = readStore(storageKey);
    store[levelId] = {
      levelId,
      fingerprint: fingerprint(level),
      completedAt: new Date().toISOString(),
    };
    writeStore(storageKey, store);
  };

  const getCompletion = (level: T) => readStore(storageKey)[getLevelId(level)] ?? null;

  const hasCompletedCurrent = (level: T) => {
    const record = getCompletion(level);
    if (!record) {
      return false;
    }
    return record.fingerprint === fingerprint(level);
  };

  return {
    fingerprint,
    markCompleted,
    getCompletion,
    hasCompletedCurrent,
  };
}
