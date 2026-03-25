type StoredValueFallback<T> = T | (() => T);

type StoredValueOptions<T> = {
  storageKey: string;
  fallback: StoredValueFallback<T>;
  parse: (raw: string) => T;
  serialize: (value: T) => string;
};

type StoredJsonValueOptions<T> = {
  storageKey: string;
  fallback: StoredValueFallback<T>;
  normalize: (value: unknown) => T;
  serialize?: (value: T) => unknown;
};

function resolveFallback<T>(fallback: StoredValueFallback<T>) {
  return typeof fallback === "function" ? (fallback as () => T)() : fallback;
}

export function createStoredValue<T>({
  storageKey,
  fallback,
  parse,
  serialize,
}: StoredValueOptions<T>) {
  const read = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) {
        return resolveFallback(fallback);
      }
      return parse(raw);
    } catch {
      return resolveFallback(fallback);
    }
  };

  const write = (value: T) => {
    try {
      localStorage.setItem(storageKey, serialize(value));
    } catch {
      // no-op
    }
  };

  return {
    read,
    write,
  };
}

export function createStoredJsonValue<T>({
  storageKey,
  fallback,
  normalize,
  serialize,
}: StoredJsonValueOptions<T>) {
  return createStoredValue<T>({
    storageKey,
    fallback,
    parse: (raw) => normalize(JSON.parse(raw) as unknown),
    serialize: (value) => JSON.stringify(serialize ? serialize(value) : value),
  });
}
