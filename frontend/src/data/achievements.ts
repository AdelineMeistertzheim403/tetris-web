import type { GameMode } from "../types/GameMode";

export type AchievementGroup =
  | "GLOBAL"
  | "CROSS"
  | "CLASSIQUE"
  | "SPRINT"
  | "VERSUS"
  | "ROGUELIKE"
  | "SECRETS";

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
  group?: AchievementGroup;

  condition: AchievementCondition;
};

export const ACHIEVEMENTS: Achievement[] = [
  // ─────────────────────────────
  // SUCCÈS GLOBAUX
  // ─────────────────────────────
  {
    id: "global-welcome",
    name: "Bienvenue",
    description: "Créer un compte",
    icon: "bienvenue",
    mode: "ALL",
    group: "GLOBAL",
    condition: { type: "custom", key: "created_account" },
  },
  {
    id: "global-regular",
    name: "Habitué",
    description: "Se connecter 7 jours différents",
    icon: "habitue",
    mode: "ALL",
    group: "GLOBAL",
    condition: { type: "custom", key: "login_days_7" },
  },
  {
    id: "global-nolife",
    name: "No-Life",
    description: "Se connecter 30 jours différents",
    icon: "no_life",
    mode: "ALL",
    group: "GLOBAL",
    condition: { type: "custom", key: "login_days_30" },
  },
  {
    id: "global-archivist",
    name: "Archiviste",
    description: "Consulter l’historique 10 fois",
    icon: "archiviste",
    mode: "ALL",
    group: "GLOBAL",
    condition: { type: "history_viewed", count: 10 },
  },
  {
    id: "global-curious",
    name: "Curieux",
    description: "Visiter tous les modes de jeu",
    icon: "curieux",
    mode: "ALL",
    group: "GLOBAL",
    condition: { type: "custom", key: "modes_visited_all" },
  },
  {
    id: "global-perfectionist",
    name: "Perfectionniste",
    description: "Débloquer 50% des succès",
    icon: "perfectioniste",
    mode: "ALL",
    group: "GLOBAL",
    condition: { type: "custom", key: "achievements_50_percent" },
  },
  {
    id: "global-completionist",
    name: "Complétionniste",
    description: "Débloquer 100% des succès",
    icon: "completioniste",
    mode: "ALL",
    group: "GLOBAL",
    condition: { type: "custom", key: "achievements_100_percent" },
  },

  // ─────────────────────────────
  // SUCCÈS TRANSVERSAUX
  // ─────────────────────────────
  {
    id: "cross-first-tetris",
    name: "Premier Tetris",
    description: "Réussir un Tetris (4 lignes)",
    icon: "parfait",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "tetris_cleared" },
  },
  {
    id: "cross-combo-master",
    name: "Combo Master",
    description: "5 lignes consécutives",
    icon: "combo_master",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "combo_5" },
  },
  {
    id: "cross-no-hold",
    name: "Sans filet",
    description: "10 parties sans utiliser Hold",
    icon: "sans_filet",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "no_hold_runs_10" },
  },
  {
    id: "cross-zen",
    name: "Zen",
    description: "Jouer 10 minutes sans Hard Drop",
    icon: "zen",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "no_harddrop_10_min" },
  },
  {
    id: "cross-reflexes",
    name: "Réflexes",
    description: "Hard Drop 50 pièces",
    icon: "reflexes",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "harddrop_50" },
  },
  {
    id: "cross-regular",
    name: "Régulier",
    description: "Atteindre le niveau 10 dans 3 modes différents",
    icon: "cerveau_accelerer",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "level_10_three_modes" },
  },
  {
    id: "cross-versatile",
    name: "Polyvalent",
    description: "Gagner des points dans tous les modes",
    icon: "score_boost",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "scored_all_modes" },
  },
  {
    id: "cross-endurance",
    name: "Endurant",
    description: "Jouer 1h cumulée",
    icon: "time_lord",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "playtime_60m" },
  },
  {
    id: "cross-marathon",
    name: "Marathonien",
    description: "Jouer 5h cumulées",
    icon: "immortel",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "playtime_300m" },
  },

  // ─────────────────────────────
  // MODE CLASSIQUE
  // ─────────────────────────────
  {
    id: "classic-level-5",
    name: "Débutant Classique",
    description: "Atteindre le niveau 5",
    icon: "debutant_classique",
    mode: "CLASSIQUE",
    group: "CLASSIQUE",
    condition: { type: "level_reached", level: 5 },
  },
  {
    id: "classic-level-15",
    name: "Confirmé Classique",
    description: "Atteindre le niveau 15",
    icon: "confirme_classique",
    mode: "CLASSIQUE",
    group: "CLASSIQUE",
    condition: { type: "level_reached", level: 15 },
  },
  {
    id: "classic-level-30",
    name: "Maître Classique",
    description: "Atteindre le niveau 30",
    icon: "maitre_classique",
    mode: "CLASSIQUE",
    group: "CLASSIQUE",
    condition: { type: "level_reached", level: 30 },
  },
  {
    id: "classic-half-board",
    name: "Gestionnaire",
    description: "Atteindre le niveau 10 sans dépasser la moitié du plateau",
    icon: "mode_precision",
    mode: "CLASSIQUE",
    group: "CLASSIQUE",
    condition: { type: "custom", key: "classic_half_board" },
  },
  {
    id: "classic-minimal-hold",
    name: "Minimaliste",
    description: "Finir une partie avec moins de 3 Hold",
    icon: "extra_hold",
    mode: "CLASSIQUE",
    group: "CLASSIQUE",
    condition: { type: "custom", key: "classic_hold_under_3" },
  },
  {
    id: "classic-clean",
    name: "Propre",
    description: "10 Tetris dans une run",
    icon: "parfait",
    mode: "CLASSIQUE",
    group: "CLASSIQUE",
    condition: { type: "custom", key: "classic_tetris_10" },
  },

  // ─────────────────────────────
  // MODE SPRINT
  // ─────────────────────────────
  {
    id: "sprint-finish",
    name: "Pressé",
    description: "Terminer un sprint",
    icon: "time_freeze",
    mode: "SPRINT",
    group: "SPRINT",
    condition: { type: "custom", key: "sprint_finish" },
  },
  {
    id: "sprint-under-5",
    name: "Rapide",
    description: "< 5 minutes",
    icon: "rapide",
    mode: "SPRINT",
    group: "SPRINT",
    condition: { type: "custom", key: "sprint_under_5" },
  },
  {
    id: "sprint-under-3",
    name: "Fulgurant",
    description: "< 3 minutes",
    icon: "fulgurant",
    mode: "SPRINT",
    group: "SPRINT",
    condition: { type: "custom", key: "sprint_under_3" },
  },
  {
    id: "sprint-under-2",
    name: "Éclair",
    description: "< 2 minutes",
    icon: "eclair",
    mode: "SPRINT",
    group: "SPRINT",
    condition: { type: "custom", key: "sprint_under_2" },
  },
  {
    id: "sprint-no-hold",
    name: "Mémoire musculaire",
    description: "Sprint sans Hold",
    icon: "extra_hold",
    mode: "SPRINT",
    group: "SPRINT",
    condition: { type: "custom", key: "sprint_no_hold" },
  },

  // ─────────────────────────────
  // MODE VERSUS
  // ─────────────────────────────
  {
    id: "versus-first",
    name: "Premier Duel",
    description: "Jouer un match Versus",
    icon: "premier_duel",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_match_1" },
  },
  {
    id: "versus-10",
    name: "Rivalité",
    description: "Jouer 10 matchs",
    icon: "accro",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_match_10" },
  },
  {
    id: "versus-50",
    name: "Vétéran",
    description: "Jouer 50 matchs",
    icon: "sommet",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_match_50" },
  },
  {
    id: "versus-win",
    name: "Vainqueur",
    description: "Gagner un match",
    icon: "scoreur",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_win_1" },
  },
  {
    id: "versus-streak-5",
    name: "Dominateur",
    description: "Gagner 5 matchs d’affilée",
    icon: "sommet",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_win_streak_5" },
  },
  {
    id: "versus-perfect",
    name: "Intouchable",
    description: "Gagner sans jamais atteindre la zone rouge",
    icon: "pacifiste",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_perfect_win" },
  },
  {
    id: "versus-send-20",
    name: "Harceleur",
    description: "Envoyer 20 lignes",
    icon: "harceleur",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_lines_sent_20" },
  },

  // ─────────────────────────────
  // DÉCOUVERTE
  // ─────────────────────────────
  {
    id: "first-run",
    name: "Premier Pas",
    description: "Terminer une run",
    icon: "premier_pas",
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
    condition: { type: "runs_played", count: 1 },
  },
  {
    id: "addicted",
    name: "Accro",
    description: "Lancer 25 runs",
    icon: "accro",
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
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
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
    condition: { type: "score_reached", score: 100_000 },
  },
  {
    id: "millionnaire",
    name: "Millionnaire",
    description: "Atteindre 1 000 000 points",
    icon: "millionnaire",
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
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
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
    condition: { type: "level_reached", level: 10 },
  },
  {
    id: "level-30",
    name: "Sommet",
    description: "Atteindre le niveau 30",
    icon: "sommet",
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
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
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
    condition: { type: "tetris_cleared" },
  },
  {
    id: "lines-300",
    name: "Industriel",
    description: "Clear 300 lignes dans une run",
    icon: "industriel",
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
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
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
    condition: { type: "bombs_used", count: 1 },
  },
  {
    id: "pacifist",
    name: "Pacifiste",
    description: "Terminer une run sans bombe",
    icon: "pacifiste",
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
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
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
    condition: { type: "perk_count", count: 5 },
  },
  {
    id: "synergy-engineer",
    name: "Ingénieur",
    description: "Activer 3 synergies",
    icon: "ingenieur",
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
    condition: { type: "synergy_count", count: 3 },
  },
  {
    id: "nuclear-core",
    name: "Cœur Nucléaire",
    description: "Activer la synergie Nuclear Core",
    icon: "coeur_nucleaire",
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
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
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
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
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
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
    mode: "ROGUELIKE",
    group: "ROGUELIKE",
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
    mode: "ROGUELIKE",
    group: "SECRETS",
    condition: { type: "seed_used", seed: "DEVIL-666" },
  },
  {
    id: "devil-seed-plus",
    name: "Seed Maudite +",
    description: "Atteindre 100 000 points avec la seed DEVIL-666",
    icon: "devil",
    secret: true,
    mode: "ROGUELIKE",
    group: "SECRETS",
    condition: { type: "seed_score", seed: "DEVIL-666", score: 100_000 },
  },
  {
    id: "loop",
    name: "Boucle Temporelle",
    description: "Rejouer 3 fois la même seed",
    icon: "loop",
    secret: true,
    mode: "ROGUELIKE",
    group: "SECRETS",
    condition: { type: "same_seed_runs", count: 3 },
  },
  {
    id: "architect",
    name: "L’Architecte",
    description: "Même score exact dans 2 runs",
    icon: "loop",
    secret: true,
    mode: "ALL",
    group: "SECRETS",
    condition: { type: "custom", key: "same_score_twice" },
  },
];

