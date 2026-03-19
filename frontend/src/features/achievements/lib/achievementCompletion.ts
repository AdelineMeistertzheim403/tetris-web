import type { Achievement } from "../data/achievements";

const COMPLETIONIST_ID = "global-completionist";

export function getCompletionTargetCount(achievements: Achievement[]): number {
  return achievements.filter((achievement) => achievement.id !== COMPLETIONIST_ID).length;
}

export function getUnlockedTowardCompletionCount(
  achievements: Achievement[],
  unlockedIds: Iterable<string>
): number {
  const unlockedSet = new Set(unlockedIds);
  return achievements.filter(
    (achievement) =>
      achievement.id !== COMPLETIONIST_ID && unlockedSet.has(achievement.id)
  ).length;
}

export function hasReachedAchievementCompletionThreshold(
  achievements: Achievement[],
  unlockedIds: Iterable<string>,
  threshold: number
): boolean {
  const total = Math.max(1, getCompletionTargetCount(achievements));
  const unlocked = getUnlockedTowardCompletionCount(achievements, unlockedIds);
  return unlocked / total >= threshold;
}
