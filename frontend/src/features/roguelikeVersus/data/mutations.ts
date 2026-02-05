import type { RvMutation } from "../types";

export const RV_MUTATIONS: RvMutation[] = [
  {
    id: "berserker",
    name: "Berserker",
    description: "+50% garbage envoyé, gravité +50%.",
    icon: "berserker",
    apply: ({ setGarbageMultiplier, setGravityMultiplier }) => {
      setGarbageMultiplier((v) => v * 1.5);
      setGravityMultiplier((v) => v * 1.5);
    },
  },
  {
    id: "line-thief",
    name: "Voleur de lignes",
    description: "20% du garbage envoyé devient un bouclier.",
    icon: "line_thief",
    apply: ({ setGarbageShieldRatio }) => {
      setGarbageShieldRatio(0.2);
    },
  },
  {
    id: "unstable",
    name: "Instable",
    description: "Bonus ou malus aléatoire toutes les 15s.",
    icon: "unstable",
    apply: ({ enableInstable }) => {
      enableInstable();
    },
  },
];
