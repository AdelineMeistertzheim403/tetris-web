import { type Synergy } from "../types/Synergy";

export function useActiveSynergies(
  perks: { id: string }[],
  synergies: Synergy[]
) {
  // Convertit la liste en ids pour un test rapide d'inclusion.
  const perkIds = perks.map(p => p.id);

  // Renvoie uniquement les synergies dont tous les prérequis sont présents.
  return synergies.filter(synergy =>
    synergy.requiredPerks.every(p => perkIds.includes(p))
  );
}
