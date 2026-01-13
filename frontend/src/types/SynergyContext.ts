import type { Dispatch, SetStateAction } from "react";

export type SynergyContext = {
  setGravityMultiplier: Dispatch<SetStateAction<number>>;
  setScoreMultiplier: Dispatch<SetStateAction<number>>;
  setChaosMode: Dispatch<SetStateAction<boolean>>;
  setTimeFreezeDuration: Dispatch<SetStateAction<number>>;
  addBomb: (count: number) => void;
  setBombRadius: Dispatch<SetStateAction<number>>;

  activePerks: string[];
};
