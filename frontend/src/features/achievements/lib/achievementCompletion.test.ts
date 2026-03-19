import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "../data/achievements";
import {
  getCompletionTargetCount,
  getUnlockedTowardCompletionCount,
  hasReachedAchievementCompletionThreshold,
} from "./achievementCompletion";

describe("achievementCompletion", () => {
  it("exclut le completionniste de sa propre cible", () => {
    expect(getCompletionTargetCount(ACHIEVEMENTS)).toBe(ACHIEVEMENTS.length - 1);
  });

  it("n'ajoute pas completionniste au numerateur", () => {
    const unlockedIds = ACHIEVEMENTS.map((achievement) => achievement.id);
    expect(getUnlockedTowardCompletionCount(ACHIEVEMENTS, unlockedIds)).toBe(
      ACHIEVEMENTS.length - 1
    );
  });

  it("valide le 100% seulement quand tous les autres succes sont debloques", () => {
    const unlockedIds = ACHIEVEMENTS
      .filter((achievement) => achievement.id !== "global-completionist")
      .map((achievement) => achievement.id);

    expect(
      hasReachedAchievementCompletionThreshold(ACHIEVEMENTS, unlockedIds, 1)
    ).toBe(true);
    expect(
      hasReachedAchievementCompletionThreshold(
        ACHIEVEMENTS,
        unlockedIds.slice(0, -1),
        1
      )
    ).toBe(false);
  });
});
