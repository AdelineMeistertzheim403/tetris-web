// Hook React useAutoClearRecentAchievements.ts pour la logique d'etat/effets.
import { useEffect } from "react";

export function useAutoClearRecentAchievements(
  recentUnlocks: unknown[],
  clearRecent: () => void,
  delayMs: number = 3500
) {
  useEffect(() => {
    if (recentUnlocks.length === 0) return;
    const timeout = setTimeout(() => clearRecent(), delayMs);
    return () => clearTimeout(timeout);
  }, [recentUnlocks, clearRecent, delayMs]);
}
