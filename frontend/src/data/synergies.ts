import type { Synergy } from "../types/Synergy";

export const SYNERGIES: Synergy[] = [
  {
    id: "bombardier",
    name: "Bombardier",
    description: "Bombes + Mega Bomb → +1 bombe à chaque perk",

    requiredPerks: ["bomb", "mega-bomb"],
    unique: true,

    apply: ({ addBomb }) => {
      addBomb(1);
    },
  },

  {
    id: "time-lord",
    name: "Seigneur du Temps",
    description: "Time Freeze + Slow Gravity → durée +50%",

    requiredPerks: ["time-freeze", "slow-gravity"],
    unique: true,

    apply: ({ setTimeFreezeDuration }) => {
      setTimeFreezeDuration((v) => v * 1.5);
    },
  },

  {
    id: "chaos-engine",
    name: "Moteur du Chaos",
    description: "Chaos Mode + Score Boost → score x2",

    requiredPerks: ["chaos-mode", "score-boost"],
    unique: true,

    apply: ({ setScoreMultiplier }) => {
      setScoreMultiplier((v) => v * 2);
    },
  },

  {
  id: "last-resort",
  name: "Last Resort",
  description: "Second Chance + Last Stand → survie critique",

  requiredPerks: ["second-chance", "last-stand"],
  unique: true,

  apply: ({ setScoreMultiplier }) => {
    setScoreMultiplier(v => v * 1.5);
  },
},

{
  id: "nuclear-core",
  name: "Nuclear Core",
  description: "Double Bomb + Mega Bomb → bombes 7x7",

  requiredPerks: ["double-bomb", "mega-bomb"],
  unique: true,

  apply: ({ setBombRadius }) => {
    setBombRadius(3); // 3 = 7x7
  },
},

{
  id: "gravity-well",
  name: "Gravity Well",
  description: "Soft + Slow Gravity → chute ultra lente",

  requiredPerks: ["soft-gravity", "slow-gravity"],
  unique: true,

  apply: ({ setGravityMultiplier, setScoreMultiplier }) => {
    setGravityMultiplier(0.15);
    setScoreMultiplier(v => v * 0.75);
  },
}
];
