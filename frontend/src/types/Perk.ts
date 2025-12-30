export type PerkRarity = "common" | "rare" | "epic";

export type Perk = {
  id: string;
  name: string;
  description: string;
  rarity: PerkRarity;
};
