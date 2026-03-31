import { beforeEach, describe, expect, it } from "vitest";
import { createStoredJsonValue, createStoredValue } from "./localStorageValue";

describe("localStorageValue", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("lit le fallback et ecrit via les parseurs custom", () => {
    const storedValue = createStoredValue<number>({
      storageKey: "score",
      fallback: () => 12,
      parse: (raw) => Number.parseInt(raw, 10),
      serialize: (value) => String(value),
    });

    expect(storedValue.read()).toBe(12);

    storedValue.write(42);
    expect(localStorage.getItem("score")).toBe("42");
    expect(storedValue.read()).toBe(42);

    localStorage.setItem("score", "oops");
    expect(storedValue.read()).toBeNaN();
  });

  it("normalise les valeurs JSON lues et personnalise la serialisation", () => {
    const storedJson = createStoredJsonValue<{ level: number }>({
      storageKey: "progress",
      fallback: { level: 1 },
      normalize: (value) => {
        const level =
          value && typeof value === "object" && typeof (value as { level?: unknown }).level === "number"
            ? (value as { level: number }).level
            : 1;
        return { level: Math.max(1, Math.floor(level)) };
      },
      serialize: (value) => ({ level: value.level, saved: true }),
    });

    expect(storedJson.read()).toEqual({ level: 1 });

    localStorage.setItem("progress", JSON.stringify({ level: 6.9 }));
    expect(storedJson.read()).toEqual({ level: 6 });

    storedJson.write({ level: 9 });
    expect(localStorage.getItem("progress")).toBe('{"level":9,"saved":true}');
  });
});
