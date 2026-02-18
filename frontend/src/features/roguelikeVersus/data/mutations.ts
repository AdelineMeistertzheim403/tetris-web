// Donnees statiques de reference pour ce module.
import type { RvMutation } from "../types";

export const RV_MUTATIONS: RvMutation[] = [
  {
    id: "berserker",
    name: "Berserker",
    description: "+50% score, gravité +50%.",
    icon: "berserker",
    apply: ({ setGravityMultiplier, setScoreMultiplier }) => {
      setScoreMultiplier((v) => v + 0.5);
      setGravityMultiplier((v) => v * 1.5);
    },
  },
  {
    id: "line-thief",
    name: "Voleur de lignes",
    description: "+20% score (compense l'absence de garbage).",
    icon: "line_thief",
    apply: ({ setScoreMultiplier }) => {
      setScoreMultiplier((v) => v + 0.2);
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
