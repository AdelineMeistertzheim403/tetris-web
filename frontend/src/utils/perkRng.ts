import type { Perk } from "../types/Perk";


const RARITY_WEIGHTS: Record<Perk["rarity"], number> = {
  common: 60,
  rare: 30,
  epic: 10,
};

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

  // fallback (ne devrait jamais arriver)
  return perks[0];
}

export function generatePerkChoices(
  allPerks: Perk[],
  count: number,
  excludedIds: string[] = [],
  rng: () => number
): Perk[] {
  const pool = allPerks.filter(p => !excludedIds.includes(p.id));
  const result: Perk[] = [];

  const available = [...pool];

  while (result.length < count && available.length > 0) {
    const perk = pickWeightedPerk(available, rng);
    result.push(perk);

    // éviter les doublons dans la sélection
    const index = available.findIndex(p => p.id === perk.id);
    if (index !== -1) available.splice(index, 1);
  }

  return result;
}
