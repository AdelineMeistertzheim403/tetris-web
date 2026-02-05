import type { RvPerk } from "../types";

export const RV_PERKS: RvPerk[] = [
  {
    id: "rv-extra-hold",
    name: "Hold+",
    description: "Ajoute un slot de Hold.",
    icon: "extra-hold",
    apply: ({ addHoldSlot }) => addHoldSlot(),
  },
  {
    id: "rv-time-freeze",
    name: "Time Freeze",
    description: "+1 charge de time freeze.",
    icon: "time-freeze",
    apply: ({ addTimeFreeze }) => addTimeFreeze(1),
  },
  {
    id: "rv-score-boost",
    name: "Boost Score",
    description: "+30% score.",
    icon: "score-boost",
    apply: ({ addScoreBoost }) => addScoreBoost(0.3),
  },
  {
    id: "rv-tactical-bomb",
    name: "Bombe tactique",
    description: "Envoie une bombe tactique à l’adversaire.",
    icon: "tactical-bomb",
    apply: ({ sendTacticalBomb }) => sendTacticalBomb(),
  },
];
