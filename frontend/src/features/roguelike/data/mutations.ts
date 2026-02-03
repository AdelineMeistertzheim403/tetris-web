import type { Mutation } from "../types/Mutation";

export const MUTATIONS: Mutation[] = [
  {
    id: "bombardier-plus",
    name: "Bombardier+",
    description: "+1 bombe permanente",
    icon: "bombardier_plus",
    stackable: true,

    apply: ({ addBomb }) => addBomb(1),
  },
  {
    id: "blast-radius-plus",
    name: "Blast Radius+",
    description: "Rayon de bombe +1 (max 9x9)",
    icon: "blast_radius",
    stackable: true,
    maxStacks: 2,

    apply: ({ setBombRadius }) =>
      setBombRadius((v) => Math.min(v + 1, 4)),
  },
  {
    id: "chain-reaction",
    name: "Chain Reaction",
    description: "Une explosion peut en déclencher une autre",
    icon: "chain_reaction",
    unique: true,

    apply: ({ enableChainExplosions }) => enableChainExplosions(),
  },
  {
    id: "gravity-collapse",
    name: "Gravity Collapse",
    description: "Gravité -10% (cumulable)",
    icon: "gravity_collapse",
    stackable: true,
    maxStacks: 5,

    apply: ({ setGravityMultiplier }) =>
      setGravityMultiplier((v) => v * 0.9),
  },
  {
    id: "temporal-echo",
    name: "Écho Temporel",
    description: "Chaque Time Freeze ajoute +1 charge",
    icon: "echo_temporel",
    unique: true,

    apply: ({ addTimeFreezeOnUse }) => addTimeFreezeOnUse(),
  },
  {
    id: "frozen-world",
    name: "Monde Figé",
    description: "Les lignes clear ralentissent la gravité brièvement",
    icon: "monde_figer",
    unique: true,

    apply: ({ enableLineSlow }) => enableLineSlow(),
  },
  {
    id: "greed-engine",
    name: "Moteur de Cupidité",
    description: "Score +50%, gravité +20%",
    icon: "moteur_de_cupidite",
    stackable: true,

    apply: ({ setScoreMultiplier, setGravityMultiplier }) => {
      setScoreMultiplier((v) => v * 1.5);
      setGravityMultiplier((v) => v * 1.2);
    },
  },
  {
    id: "perfect-risk",
    name: "Risque Absolu",
    description: "Bonus score énorme si aucune bombe utilisée",
    icon: "risque_absolu",
    unique: true,

    apply: ({ enableNoBombBonus }) => enableNoBombBonus(),
  },
  {
    id: "precision-mode",
    name: "Mode Précision",
    description: "Rotation plus lente mais score +25%",
    icon: "mode_precision",
    unique: true,

    apply: ({ setRotationSpeed, setScoreMultiplier }) => {
      setRotationSpeed(0.8);
      setScoreMultiplier((v) => v * 1.25);
    },
  },
  {
    id: "fast-brain",
    name: "Cerveau Accéléré",
    description: "Hard Drop recharge le hold",
    icon: "cerveau_accelerer",
    unique: true,

    apply: ({ enableHardDropHoldReset }) => enableHardDropHoldReset(),
  },
  {
    id: "chaos-drift",
    name: "Chaos Drift",
    description: "Les pièces dérivent légèrement",
    icon: "chaos_drift",
    unique: true,

    apply: ({ enableChaosDrift }) => enableChaosDrift(),
  },
  {
    id: "unstable-pieces",
    name: "Pièces Instables",
    description: "Les pièces peuvent muter en tombant",
    icon: "pieces_instable",
    unique: true,

    apply: ({ enablePieceMutation }) => enablePieceMutation(),
  },
  {
    id: "final-protocol",
    name: "Protocole Final",
    description: "À 0 bombe → gain de score x2",
    icon: "protocole_final",
    unique: true,

    apply: ({ enableZeroBombBoost }) => enableZeroBombBoost(),
  },
  {
    id: "undying",
    name: "Immortel",
    description: "Second Chance recharge tous les 10 niveaux",
    icon: "immortel",
    unique: true,

    apply: ({ enableSecondChanceRecharge }) => enableSecondChanceRecharge(10),
  },
  {
    id: "ascension-core",
    name: "Noyau d’Ascension",
    description: "Chaque mutation augmente le score",
    icon: "noyau_d_ascension",
    stackable: true,

    apply: ({ setScoreMultiplier }) =>
      setScoreMultiplier((v) => v * 1.1),
  },
];

// compat pour anciens imports éventuels
export { MUTATIONS as MUTATION };
