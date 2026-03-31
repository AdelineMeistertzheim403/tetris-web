import { beforeEach, describe, expect, it } from "vitest";
import {
  createStoredCollection,
  exportStoredItemJson,
  parseStoredItemsFromJson,
} from "./localStorageCollection";

type Item = {
  id: string;
  value: number;
};

const normalizeItem = (value: unknown): Item | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Item>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.value !== "number" ||
    !Number.isFinite(candidate.value)
  ) {
    return null;
  }
  return {
    id: candidate.id,
    value: candidate.value,
  };
};

describe("localStorageCollection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("replace et list normalisent, filtrent et trient les elements", () => {
    const collection = createStoredCollection<Item>({
      storageKey: "test-items",
      getId: (item) => item.id,
      normalize: normalizeItem,
      sort: (items) => [...items].sort((a, b) => a.value - b.value),
    });

    const next = collection.replace([
      { id: "b", value: 3 },
      { id: "a", value: 1 },
      { id: "bad", value: Number.NaN },
    ] as Item[]);

    expect(next).toEqual([
      { id: "a", value: 1 },
      { id: "b", value: 3 },
    ]);
    expect(collection.list()).toEqual(next);
  });

  it("merge, upsert, find et remove respectent les ids et la fusion custom", () => {
    const collection = createStoredCollection<Item>({
      storageKey: "test-items",
      getId: (item) => item.id,
      normalize: normalizeItem,
      mergeItem: (existing, incoming) => ({
        id: incoming.id,
        value: (existing?.value ?? 0) + incoming.value,
      }),
    });

    collection.replace([
      { id: "alpha", value: 2 },
      { id: "beta", value: 4 },
    ]);

    expect(collection.merge([{ id: "alpha", value: 3 }, { id: "gamma", value: 1 }])).toEqual([
      { id: "gamma", value: 1 },
      { id: "alpha", value: 5 },
      { id: "beta", value: 4 },
    ]);

    expect(collection.upsert({ id: "gamma", value: 2 })).toEqual([
      { id: "gamma", value: 3 },
      { id: "alpha", value: 5 },
      { id: "beta", value: 4 },
    ]);
    expect(collection.find("alpha")).toEqual({ id: "alpha", value: 5 });
    expect(collection.remove("beta")).toEqual([
      { id: "gamma", value: 3 },
      { id: "alpha", value: 5 },
    ]);
    expect(collection.find("beta")).toBeNull();
  });

  it("exporte et parse le JSON d'items simples ou de collections", () => {
    expect(exportStoredItemJson({ id: "delta", value: 7 })).toContain('"id": "delta"');

    expect(
      parseStoredItemsFromJson(
        JSON.stringify([{ id: "delta", value: 7 }, { id: "ignored" }]),
        normalizeItem
      )
    ).toEqual([{ id: "delta", value: 7 }]);

    expect(
      parseStoredItemsFromJson(JSON.stringify({ id: "solo", value: 5 }), normalizeItem)
    ).toEqual([{ id: "solo", value: 5 }]);
  });
});
