// Types partages utilises par ce module.
import type { Dispatch, SetStateAction } from "react";

export type SynergyContext = {
  setGravityMultiplier: Dispatch<SetStateAction<number>>;
  setScoreMultiplier: Dispatch<SetStateAction<number>>;
  setChaosMode: Dispatch<SetStateAction<boolean>>;
  setTimeFreezeDuration: (update: number | ((prev: number) => number)) => void;
  addBomb: (count: number) => void;
  setBombRadius: Dispatch<SetStateAction<number>>;

  activePerks: string[];
};
