import type { SynergyContext } from "./SynergyContext";

export type Synergy = {
  id: string;
  name: string;
  description: string;

  requiredPerks: string[];
  minCount?: number; // ex: 2 perks sur 3 possibles

  unique?: boolean; // ne s’active qu’une fois par run
  active?: boolean; // runtime

  apply: (ctx: SynergyContext) => void;
  remove?: (ctx: SynergyContext) => void;
};
