import type { Perk } from "../types/Perk";

export const ALL_PERKS: Perk[] = [
  {
    id: "extra-hold",
    name: "+1 HOLD",
    description: "Stockez une pièce supplémentaire",
    rarity: "common",
  },
  {
    id: "slow-gravity",
    name: "GRAVITÉ LENTE",
    description: "La vitesse de chute est réduite",
    rarity: "rare",
  },
  {
    id: "bomb",
    name: "BOMBE",
    description: "Détruit une zone 3x3",
    rarity: "epic",
  },
];
