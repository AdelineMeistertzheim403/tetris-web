import type { Perk } from "../types/Perk";

// Poids de rareté utilisés pour les tirages biaisés.
const RARITY_WEIGHTS: Record<Perk["rarity"], number> = {
  common: 60,
  rare: 30,
  epic: 10,
};

// Tirage pondéré sur une liste déjà filtrée.
function pickWeightedPerk(perks: Perk[], rng: () => number): Perk {
  const totalWeight = perks.reduce(
    (sum, p) => sum + RARITY_WEIGHTS[p.rarity],
    0
  );

  let roll = rng() * totalWeight;

  for (const perk of perks) {
    roll -= RARITY_WEIGHTS[perk.rarity];
    if (roll <= 0) return perk;
  }

  // Fallback (ne devrait jamais arriver si les poids sont corrects).
  return perks[0];
}

export function generatePerkChoices(
  allPerks: Perk[],
  count: number,
  excludedIds: string[] = [],
  rng: () => number
): Perk[] {
  // Évite de proposer des perks déjà acquis (ou exclus par règle métier).
  const pool = allPerks.filter(p => !excludedIds.includes(p.id));
  const result: Perk[] = [];

  const available = [...pool];

  // Tire sans doublon dans la sélection affichée.
  while (result.length < count && available.length > 0) {
    const perk = pickWeightedPerk(available, rng);
    result.push(perk);

    const index = available.findIndex(p => p.id === perk.id);
    if (index !== -1) available.splice(index, 1);
  }

  return result;
}
