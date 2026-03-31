import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCommunityCompletionTracker } from "./communityCompletionTracker";

type CommunityLevel = {
  id: string;
  meta: {
    name: string;
    difficulty: number;
  };
  layout: number[][];
};

const STORAGE_KEY = "community-completion-test";

const createTracker = () =>
  createCommunityCompletionTracker<CommunityLevel>({
    storageKey: STORAGE_KEY,
    prefix: "community",
    getLevelId: (level) => level.id,
    canonicalize: (level) => ({
      meta: level.meta,
      layout: level.layout,
    }),
  });

describe("communityCompletionTracker", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("fingerprint les niveaux de maniere stable puis persiste la completion", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T15:00:00.000Z"));

    const tracker = createTracker();
    const level = {
      id: "alpha",
      meta: { name: "Alpha", difficulty: 2 },
      layout: [
        [0, 1],
        [1, 0],
      ],
    };
    const sameContentDifferentOrder = {
      id: "alpha",
      meta: { difficulty: 2, name: "Alpha" },
      layout: [
        [0, 1],
        [1, 0],
      ],
    };

    expect(tracker.hasCompletedCurrent(level)).toBe(false);
    expect(tracker.fingerprint(level)).toBe(tracker.fingerprint(sameContentDifferentOrder));

    tracker.markCompleted(level);

    expect(tracker.hasCompletedCurrent(sameContentDifferentOrder)).toBe(true);
    expect(tracker.getCompletion(level)).toEqual({
      levelId: "alpha",
      fingerprint: tracker.fingerprint(level),
      completedAt: "2026-03-30T15:00:00.000Z",
    });
  });

  it("ignore les stores invalides et detecte les changements de contenu", () => {
    const tracker = createTracker();
    const level = {
      id: "beta",
      meta: { name: "Beta", difficulty: 4 },
      layout: [
        [1, 1],
        [0, 0],
      ],
    };

    localStorage.setItem(STORAGE_KEY, "{invalid");
    expect(tracker.getCompletion(level)).toBeNull();

    tracker.markCompleted(level);
    expect(tracker.hasCompletedCurrent(level)).toBe(true);

    const updatedLevel = {
      ...level,
      layout: [
        [1, 0],
        [0, 1],
      ],
    };
    expect(tracker.hasCompletedCurrent(updatedLevel)).toBe(false);

    localStorage.setItem(STORAGE_KEY, JSON.stringify("bad-store"));
    expect(tracker.getCompletion(level)).toBeNull();
  });
});
