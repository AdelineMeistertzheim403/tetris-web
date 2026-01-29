import type { GameMode } from "../types/GameMode";

export type AchievementCondition =
  | { type: "runs_played"; count: number }
  | { type: "score_reached"; score: number }
  | { type: "seed_score"; seed: string; score: number }
  | { type: "level_reached"; level: number }
  | { type: "lines_cleared"; lines: number }
  | { type: "tetris_cleared" }
  | { type: "bombs_used"; count: number }
  | { type: "no_bomb_run" }
  | { type: "perk_count"; count: number }
  | { type: "synergy_activated"; id: string }
  | { type: "synergy_count"; count: number }
  | { type: "mutation_count"; count: number }
  | { type: "chaos_mode_run" }
  | { type: "second_chance_used" }
  | { type: "seed_used"; seed: string }
  | { type: "same_seed_runs"; count: number }
  | { type: "history_viewed"; count: number }
  | { type: "custom"; key: string }; // pour les cas ultra spécifiques

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;

  secret?: boolean;
  mode?: GameMode | "ALL";

  condition: AchievementCondition;
};

export const ACHIEVEMENTS: Achievement[] = [
  // ─────────────────────────────
  // DÉCOUVERTE
  // ─────────────────────────────
  {
    id: "first-run",
    name: "Premier Pas",
    description: "Terminer une run",
    icon: "premier_pas",
    condition: { type: "runs_played", count: 1 },
  },
  {
    id: "addicted",
    name: "Accro",
    description: "Lancer 25 runs",
    icon: "accro",
    condition: { type: "runs_played", count: 25 },
  },

  // ─────────────────────────────
  // SCORE
  // ─────────────────────────────
  {
    id: "score-100k",
    name: "Scoreur",
    description: "Atteindre 100 000 points",
    icon: "scoreur",
    condition: { type: "score_reached", score: 100_000 },
  },
  {
    id: "millionnaire",
    name: "Millionnaire",
    description: "Atteindre 1 000 000 points",
    icon: "millionnaire",
    condition: { type: "score_reached", score: 1_000_000 },
  },

  // ─────────────────────────────
  // PROGRESSION
  // ─────────────────────────────
  {
    id: "level-10",
    name: "Toujours Plus Haut",
    description: "Atteindre le niveau 10",
    icon: "toujours_plus_haut",
    condition: { type: "level_reached", level: 10 },
  },
  {
    id: "level-30",
    name: "Sommet",
    description: "Atteindre le niveau 30",
    icon: "sommet",
    condition: { type: "level_reached", level: 30 },
  },

  // ─────────────────────────────
  // LIGNES
  // ─────────────────────────────
  {
    id: "tetris",
    name: "Parfait",
    description: "Clear 4 lignes d’un coup",
    icon: "parfait",
    condition: { type: "tetris_cleared" },
  },
  {
    id: "lines-300",
    name: "Industriel",
    description: "Clear 300 lignes dans une run",
    icon: "industriel",
    condition: { type: "lines_cleared", lines: 300 },
  },

  // ─────────────────────────────
  // BOMBES
  // ─────────────────────────────
  {
    id: "bomb-user",
    name: "Démineur",
    description: "Utiliser une bombe",
    icon: "demineur",
    condition: { type: "bombs_used", count: 1 },
  },
  {
    id: "pacifist",
    name: "Pacifiste",
    description: "Terminer une run sans bombe",
    icon: "pacifiste",
    condition: { type: "no_bomb_run" },
  },

  // ─────────────────────────────
  // PERKS & SYNERGIES
  // ─────────────────────────────
  {
    id: "perk-collector",
    name: "Chargé",
    description: "Avoir 5 perks actifs",
    icon: "charger",
    condition: { type: "perk_count", count: 5 },
  },
  {
    id: "synergy-engineer",
    name: "Ingénieur",
    description: "Activer 3 synergies",
    icon: "ingenieur",
    condition: { type: "synergy_count", count: 3 },
  },
  {
    id: "nuclear-core",
    name: "Cœur Nucléaire",
    description: "Activer la synergie Nuclear Core",
    icon: "coeur_nucleaire",
    condition: { type: "synergy_activated", id: "nuclear-core" },
  },

  // ─────────────────────────────
  // MUTATIONS
  // ─────────────────────────────
  {
    id: "mutant",
    name: "Mutant",
    description: "Obtenir 5 mutations",
    icon: "mutant",
    condition: { type: "mutation_count", count: 5 },
  },

  // ─────────────────────────────
  // CHAOS
  // ─────────────────────────────
  {
    id: "dance-with-chaos",
    name: "Danse avec le Chaos",
    description: "Terminer une run avec Chaos Mode actif",
    icon: "chaos_mode",
    condition: { type: "chaos_mode_run" },
  },

  // ─────────────────────────────
  // SURVIE
  // ─────────────────────────────
  {
    id: "second-chance",
    name: "Dernier Souffle",
    description: "Survivre grâce à Second Chance",
    icon: "dernier_souffle",
    condition: { type: "second_chance_used" },
  },

  // ─────────────────────────────
  // SECRETS
  // ─────────────────────────────
  {
    id: "devil-seed",
    name: "Seed Maudite",
    description: "Jouer une run avec la seed DEVIL-666",
    icon: "devil",
    secret: true,
    condition: { type: "seed_used", seed: "DEVIL-666" },
  },
  {
    id: "devil-seed-plus",
    name: "Seed Maudite +",
    description: "Atteindre 100 000 points avec la seed DEVIL-666",
    icon: "devil",
    secret: true,
    condition: { type: "seed_score", seed: "DEVIL-666", score: 100_000 },
  },
  {
    id: "loop",
    name: "Boucle Temporelle",
    description: "Rejouer 3 fois la même seed",
    icon: "loop",
    secret: true,
    condition: { type: "same_seed_runs", count: 3 },
  },
];
