export type PerkRarity = "common" | "rare" | "epic";

export type Perk = {
  id: string;
  name: string;
  description: string;
  rarity: PerkRarity;
  icon?: string;          // emoji ou nom d’icône
  durationMs?: number;
};
