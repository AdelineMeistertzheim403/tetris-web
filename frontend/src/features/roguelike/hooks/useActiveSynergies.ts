// hooks/useActiveSynergies.ts
import { type Synergy } from "../types/Synergy";

export function useActiveSynergies(
  perks: { id: string }[],
  synergies: Synergy[]
) {
  const perkIds = perks.map(p => p.id);

  return synergies.filter(synergy =>
    synergy.requiredPerks.every(p => perkIds.includes(p))
  );
}
