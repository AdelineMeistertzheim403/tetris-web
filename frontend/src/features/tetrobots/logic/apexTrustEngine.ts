import {
  getApexTrustState,
} from "../../achievements/lib/tetrobotAchievementLogic";
import type {
  ApexTrustState,
  PlayerLongTermMemory,
} from "../../achievements/types/tetrobots";

export { getApexTrustState };
export type { ApexTrustState, PlayerLongTermMemory };

export function getApexRequirement(
  memory: PlayerLongTermMemory,
  trustState: ApexTrustState
) {
  if (trustState === "refusing") {
    const avoidedRoguelike = memory.avoidedModes.ROGUELIKE ?? 0;
    if (avoidedRoguelike >= 5) {
      return "Joue 3 parties en Roguelike sans abandonner.";
    }
    if (memory.rageQuitCount >= 3) {
      return "Termine 3 sessions completes sans rage quit.";
    }
    return "Affronte ton mode faible pendant plusieurs sessions d'affilee.";
  }

  if (trustState === "cold") {
    return "Retourne travailler le mode que tu evites.";
  }

  if (trustState === "warning") {
    return "Prouve ta discipline avec une session complete et utile.";
  }

  return "Apex est pret a te juger, et parfois a t'aider.";
}
