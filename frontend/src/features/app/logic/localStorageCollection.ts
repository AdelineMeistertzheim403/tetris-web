type NormalizeItem<T> = (value: unknown) => T | null;

type StoredCollectionOptions<T> = {
  storageKey: string;
  getId: (item: T) => string;
  normalize: NormalizeItem<T>;
  mergeItem?: (existing: T | undefined, incoming: T) => T;
  sort?: (items: T[]) => T[];
};

function normalizeItems<T>(values: readonly unknown[], normalize: NormalizeItem<T>) {
  return values
    .map((value) => normalize(value))
    .filter((item): item is T => item !== null);
}

export function createStoredCollection<T>({
  storageKey,
  getId,
  normalize,
  mergeItem,
  sort,
}: StoredCollectionOptions<T>) {
  const finalize = (items: T[]) => (sort ? sort(items) : items);

  const persist = (items: T[]) => {
    const next = finalize(items);
    localStorage.setItem(storageKey, JSON.stringify(next));
    return next;
  };

  const list = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return finalize(normalizeItems(parsed, normalize));
    } catch {
      return [];
    }
  };

  const replace = (items: T[]) => persist(normalizeItems(items, normalize));

  const merge = (items: T[]) => {
    const merged = [...list()];
    for (const item of items) {
      const normalized = normalize(item);
      if (!normalized) {
        continue;
      }

      const index = merged.findIndex((existing) => getId(existing) === getId(normalized));
      if (index >= 0) {
        merged[index] = mergeItem ? mergeItem(merged[index], normalized) : normalized;
      } else {
        merged.unshift(normalized);
      }
    }
    return persist(merged);
  };

  const upsert = (item: T) => {
    const normalized = normalize(item);
    if (!normalized) {
      return list();
    }

    const items = list();
    const index = items.findIndex((existing) => getId(existing) === getId(normalized));
    if (index >= 0) {
      items[index] = mergeItem ? mergeItem(items[index], normalized) : normalized;
    } else {
      items.unshift(normalized);
    }
    return persist(items);
  };

  const remove = (id: string) => persist(list().filter((item) => getId(item) !== id));

  const find = (id: string) => list().find((item) => getId(item) === id) ?? null;

  return {
    list,
    replace,
    merge,
    upsert,
    remove,
    find,
  };
}

export function exportStoredItemJson<T>(
  item: T,
  serialize: (value: T) => unknown = (value) => value
) {
  return JSON.stringify(serialize(item), null, 2);
}

export function parseStoredItemsFromJson<T>(json: string, normalize: NormalizeItem<T>) {
  const parsed = JSON.parse(json) as unknown;
  if (Array.isArray(parsed)) {
    return normalizeItems(parsed, normalize);
  }

  const item = normalize(parsed);
  return item ? [item] : [];
}
