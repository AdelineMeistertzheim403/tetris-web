import "@testing-library/jest-dom/vitest";

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
});

if (typeof globalThis.localStorage?.getItem !== "function") {
  const storage = new Map<string, string>();

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
      setItem: (key: string, value: string) => {
        storage.set(String(key), String(value));
      },
      removeItem: (key: string) => {
        storage.delete(String(key));
      },
      clear: () => {
        storage.clear();
      },
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      get length() {
        return storage.size;
      },
    },
  });
}
