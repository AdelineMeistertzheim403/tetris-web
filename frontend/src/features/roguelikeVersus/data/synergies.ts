// Donnees statiques de reference pour ce module.
import type { RvSynergy } from "../types";

export const RV_SYNERGIES: RvSynergy[] = [
  {
    id: "domination",
    name: "Domination",
    description: "Actif si tu as plus de mutations que l’adversaire.",
    isActive: ({ myMutations, oppMutations }) => myMutations > oppMutations,
    apply: ({ setGarbageMultiplier }) => setGarbageMultiplier((v) => v * 1.2),
  },
  {
    id: "last-stand",
    name: "Dernier Rempart",
    description: "Bonus si tu es à +10 garbage vs l’autre.",
    isActive: ({ myGarbage, oppGarbage }) => myGarbage - oppGarbage >= 10,
    apply: ({ setDamageReduction }) => setDamageReduction(0.35),
  },
  {
    id: "mirror-chaos",
    name: "Chaos Miroir",
    description: "50% des malus reçus sont copiés à l’adversaire.",
    isActive: ({ myMutations, oppMutations }) =>
      myMutations >= 3 && oppMutations >= 3,
    apply: ({ enableMirrorCurse }) => enableMirrorCurse(),
  },
];
