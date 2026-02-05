import type { RvEffect } from "../types";

export type RvEvent = {
  id: string;
  name: string;
  description: string;
  buildEffect: () => RvEffect;
};

export const RV_EVENTS: RvEvent[] = [
  {
    id: "blackout",
    name: "Blackout",
    description: "Preview off pour tout le monde.",
    buildEffect: () => ({ type: "blackout", durationMs: 7000 }),
  },
  {
    id: "double-vision",
    name: "Double Vision",
    description: "Choix rapide du prochain tetromino.",
    buildEffect: () => ({ type: "double_vision", durationMs: 12000 }),
  },
  {
    id: "time-rift",
    name: "Time Rift",
    description: "Le joueur en retard joue au ralenti.",
    buildEffect: () => ({ type: "time_rift", durationMs: 9000, slowMultiplier: 0.7 }),
  },
  {
    id: "garbage-storm",
    name: "Garbage Storm",
    description: "Garbage partagé entre les joueurs.",
    buildEffect: () => ({ type: "garbage_storm", durationMs: 12000 }),
  },
  {
    id: "mutation-surge",
    name: "Mutation Surge",
    description: "Nouvelle mutation forcée.",
    buildEffect: () => ({ type: "bonus", durationMs: 0, id: "mutation_surge" }),
  },
  {
    id: "double-garbage",
    name: "Overclock",
    description: "Double garbage temporaire.",
    buildEffect: () => ({ type: "double_garbage", durationMs: 10000 }),
  },
];
