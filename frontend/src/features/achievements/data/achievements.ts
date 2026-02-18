import type { GameMode } from "../../game/types/GameMode";

export type AchievementGroup =
  | "GLOBAL"
  | "CROSS"
  | "CLASSIQUE"
  | "SPRINT"
  | "VERSUS"
  | "BOT"
  | "BRICKFALL"
  | "SOLO"
  | "SKILL"
  | "POWER"
  | "EDITOR"
  | "ROGUELIKE"
  | "ROGUELIKE_VERSUS"
  | "PUZZLE"
  | "SECRETS"
  | "BOT_ADAPTIVE";

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
    icon: "combo_master_",
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
    icon: "regulier",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "level_10_three_modes" },
  },
  {
    id: "cross-versatile",
    name: "Polyvalent",
    description: "Gagner des points dans tous les modes",
    icon: "polyvalent",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "scored_all_modes" },
  },
  {
    id: "cross-endurance",
    name: "Endurant",
    description: "Jouer 1h cumulée",
    icon: "endurant",
    mode: "ALL",
    group: "CROSS",
    condition: { type: "custom", key: "playtime_60m" },
  },
  {
    id: "cross-marathon",
    name: "Marathonien",
    description: "Jouer 5h cumulées",
    icon: "marathonien",
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
    icon: "gestionnaire",
    mode: "CLASSIQUE",
    group: "CLASSIQUE",
    condition: { type: "custom", key: "classic_half_board" },
  },
  {
    id: "classic-minimal-hold",
    name: "Minimaliste",
    description: "Finir une partie avec moins de 3 Hold",
    icon: "minimaliste",
    mode: "CLASSIQUE",
    group: "CLASSIQUE",
    condition: { type: "custom", key: "classic_hold_under_3" },
  },
  {
    id: "classic-clean",
    name: "Propre",
    description: "10 Tetris dans une run",
    icon: "propre",
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
    icon: "presser",
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
    icon: "memoire_musculaire",
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
    icon: "rivaliter",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_match_10" },
  },
  {
    id: "versus-50",
    name: "Vétéran",
    description: "Jouer 50 matchs",
    icon: "veteran",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_match_50" },
  },
  {
    id: "versus-win",
    name: "Vainqueur",
    description: "Gagner un match",
    icon: "vainqueur",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_win_1" },
  },
  {
    id: "versus-streak-5",
    name: "Dominateur",
    description: "Gagner 5 matchs d’affilée",
    icon: "dominateur",
    mode: "VERSUS",
    group: "VERSUS",
    condition: { type: "custom", key: "versus_win_streak_5" },
  },
  {
    id: "versus-perfect",
    name: "Intouchable",
    description: "Gagner sans jamais atteindre la zone rouge",
    icon: "intouchable",
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
  // MODE BRICKFALL VERSUS
  // ─────────────────────────────
  {
    id: "bf-builder",
    name: "Architecte",
    description: "Survivre une manche complète en tant qu’Architecte",
    icon: "architecte_brickfall",
    mode: "BRICKFALL_VERSUS",
    group: "BRICKFALL",
    condition: { type: "custom", key: "bf_survive_architect" },
  },
  {
    id: "bf-fortress",
    name: "Forteresse",
    description: "Créer 10 blocs blindés en une manche",
    icon: "forteresse",
    mode: "BRICKFALL_VERSUS",
    group: "BRICKFALL",
    condition: { type: "custom", key: "bf_armored_10" },
  },
  {
    id: "bf-overflow",
    name: "Surcharge",
    description: "Faire perdre le Démolisseur par saturation",
    icon: "surcharge",
    mode: "BRICKFALL_VERSUS",
    group: "BRICKFALL",
    condition: { type: "custom", key: "bf_overwhelm" },
  },
  {
    id: "bf-breaker",
    name: "Démolisseur",
    description: "Détruire 50 blocs en une manche",
    icon: "demolisseur",
    mode: "BRICKFALL_VERSUS",
    group: "BRICKFALL",
    condition: { type: "custom", key: "bf_blocks_50" },
  },
  {
    id: "bf-heartbreaker",
    name: "Briseur de Cœur",
    description: "Détruire le Cœur Structurel",
    icon: "briseur_de_coeur",
    mode: "BRICKFALL_VERSUS",
    group: "BRICKFALL",
    condition: { type: "custom", key: "bf_core_destroyed" },
  },
  {
    id: "bf-no-miss",
    name: "Précision Mortelle",
    description: "Gagner une manche sans perdre de balle",
    icon: "precision_mortelle",
    mode: "BRICKFALL_VERSUS",
    group: "BRICKFALL",
    condition: { type: "custom", key: "bf_no_ball_lost" },
  },
  {
    id: "bf-chaos",
    name: "Chaos Absolu",
    description: "Déclencher 5 effets chaos en une manche",
    icon: "chaos_absolu",
    mode: "BRICKFALL_VERSUS",
    group: "BRICKFALL",
    condition: { type: "custom", key: "bf_chaos_5" },
  },
  {
    id: "bf-dual-master",
    name: "Double Maîtrise",
    description: "Gagner une manche dans chaque rôle",
    icon: "double_maitrise",
    mode: "BRICKFALL_VERSUS",
    group: "BRICKFALL",
    condition: { type: "custom", key: "bf_win_both_roles" },
  },
  {
    id: "bf-mirror",
    name: "Miroir Brisé",
    description: "Gagner une manche après inversion totale des contrôles",
    icon: "miroir_briser",
    secret: true,
    mode: "BRICKFALL_VERSUS",
    group: "SECRETS",
    condition: { type: "custom", key: "bf_inverted_win" },
  },

  // ─────────────────────────────
  // MODE BRICKFALL SOLO
  // ─────────────────────────────
  {
    id: "bf-solo-first-win",
    name: "Premier Impact",
    description: "Terminer un niveau",
    icon: "bf_solo_first",
    mode: "BRICKFALL_SOLO",
    group: "SOLO",
    condition: { type: "custom", key: "bf_solo_1_clear" },
  },
  {
    id: "bf-solo-world-1",
    name: "Initiation Complete",
    description: "Terminer le Monde 1",
    icon: "bf_solo_world1",
    mode: "BRICKFALL_SOLO",
    group: "SOLO",
    condition: { type: "custom", key: "bf_solo_world1_clear" },
  },
  {
    id: "bf-solo-campaign",
    name: "Architecte Ultime",
    description: "Terminer la campagne complete",
    icon: "bf_solo_campaign",
    mode: "BRICKFALL_SOLO",
    group: "SOLO",
    condition: { type: "custom", key: "bf_solo_campaign_clear" },
  },
  {
    id: "bf-solo-no-miss",
    name: "Main de Fer",
    description: "Terminer un niveau sans perdre de balle",
    icon: "bf_solo_no_miss",
    mode: "BRICKFALL_SOLO",
    group: "SKILL",
    condition: { type: "custom", key: "bf_solo_no_miss" },
  },
  {
    id: "bf-solo-1000",
    name: "Destructeur",
    description: "Detruire 1000 blocs",
    icon: "bf_solo_1000",
    mode: "BRICKFALL_SOLO",
    group: "SKILL",
    condition: { type: "custom", key: "bf_solo_1000_blocks" },
  },
  {
    id: "bf-solo-speedrun",
    name: "Overclocke",
    description: "Finir un niveau en moins de 45 secondes",
    icon: "bf_solo_speedrun",
    mode: "BRICKFALL_SOLO",
    group: "SKILL",
    condition: { type: "custom", key: "bf_solo_under_45s" },
  },
  {
    id: "bf-solo-multi",
    name: "Tempete de Balles",
    description: "Activer 3 multi-balls dans un niveau",
    icon: "bf_solo_multi",
    mode: "BRICKFALL_SOLO",
    group: "POWER",
    condition: { type: "custom", key: "bf_solo_3_multiballs" },
  },
  {
    id: "bf-solo-chaos",
    name: "Chaos Maitrise",
    description: "Gagner malgre 3 malus dans un niveau",
    icon: "bf_solo_chaos",
    mode: "BRICKFALL_SOLO",
    group: "POWER",
    condition: { type: "custom", key: "bf_solo_3_malus_win" },
  },
  {
    id: "bf-editor-first",
    name: "Createur",
    description: "Creer un niveau personnalise",
    icon: "bf_editor_first",
    mode: "BRICKFALL_SOLO",
    group: "EDITOR",
    condition: { type: "custom", key: "bf_editor_create" },
  },
  {
    id: "bf-editor-played",
    name: "Testeur",
    description: "Terminer son propre niveau",
    icon: "bf_editor_play",
    mode: "BRICKFALL_SOLO",
    group: "EDITOR",
    condition: { type: "custom", key: "bf_editor_win" },
  },

  // ─────────────────────────────
  // MODE ROGUELIKE VERSUS
  // ─────────────────────────────
  {
    id: "rv-first",
    name: "Premier Duel Rogue",
    description: "Jouer un match Roguelike Versus",
    icon: "RV_premier_duel",
    mode: "ROGUELIKE_VERSUS",
    group: "ROGUELIKE_VERSUS",
    condition: { type: "custom", key: "rv_match_1" },
  },
  {
    id: "rv-10",
    name: "Rivalité Rogue",
    description: "Jouer 10 matchs Roguelike Versus",
    icon: "RV_rivaliter",
    mode: "ROGUELIKE_VERSUS",
    group: "ROGUELIKE_VERSUS",
    condition: { type: "custom", key: "rv_match_10" },
  },
  {
    id: "rv-50",
    name: "Vétéran Rogue",
    description: "Jouer 50 matchs Roguelike Versus",
    icon: "RV_veteran",
    mode: "ROGUELIKE_VERSUS",
    group: "ROGUELIKE_VERSUS",
    condition: { type: "custom", key: "rv_match_50" },
  },
  {
    id: "rv-win",
    name: "Vainqueur Rogue",
    description: "Gagner un match Roguelike Versus",
    icon: "RV_vainqueur",
    mode: "ROGUELIKE_VERSUS",
    group: "ROGUELIKE_VERSUS",
    condition: { type: "custom", key: "rv_win_1" },
  },
  {
    id: "rv-streak-5",
    name: "Dominateur Rogue",
    description: "Gagner 5 matchs Roguelike Versus d’affilée",
    icon: "RV_dominateur",
    mode: "ROGUELIKE_VERSUS",
    group: "ROGUELIKE_VERSUS",
    condition: { type: "custom", key: "rv_win_streak_5" },
  },
  {
    id: "rv-perfect",
    name: "Intouchable Rogue",
    description: "Gagner sans jamais atteindre la zone rouge",
    icon: "RV_intouchable",
    mode: "ROGUELIKE_VERSUS",
    group: "ROGUELIKE_VERSUS",
    condition: { type: "custom", key: "rv_perfect_win" },
  },
  {
    id: "rv-send-30",
    name: "Harceleur Rogue",
    description: "Envoyer 30 lignes en Roguelike Versus",
    icon: "harceleur",
    mode: "ROGUELIKE_VERSUS",
    group: "ROGUELIKE_VERSUS",
    condition: { type: "custom", key: "rv_lines_sent_30" },
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
    icon: "danse_avec_le_chaos",
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
  // PUZZLE
  // ─────────────────────────────
  {
    id: "puzzle-no-hold",
    name: "Cerveau Carré",
    description: "Résoudre un puzzle sans Hold",
    icon: "cerveau_carre",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_no_hold" },
  },
  {
    id: "puzzle-optimal",
    name: "Perfection Géométrique",
    description: "Résoudre un puzzle avec la solution optimale",
    icon: "perfection_geometrique",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_optimal" },
  },

  {
    id: "puzzle-first",
    name: "Première Énigme",
    description: "Résoudre un puzzle",
    icon: "puzzle_first",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_completed_1" },
  },
  {
    id: "puzzle-apprentice",
    name: "Apprenti Logicien",
    description: "Résoudre 5 puzzles",
    icon: "puzzle_5",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_completed_5" },
  },
  {
    id: "puzzle-master",
    name: "Maître du Puzzle",
    description: "Résoudre tous les puzzles",
    icon: "puzzle_master",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_completed_all" },
  },

  {
    id: "puzzle-no-hold-master",
    name: "Esprit Pur",
    description: "Résoudre 5 puzzles sans Hold",
    icon: "no_hold_master",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_no_hold_5" },
  },
  {
    id: "puzzle-no-error",
    name: "Sans Faute",
    description: "Résoudre un puzzle sans placement invalide",
    icon: "sans_faute",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_no_error" },
  },

  {
    id: "puzzle-optimal-first",
    name: "Solution Élégante",
    description: "Résoudre un puzzle avec le nombre optimal de coups",
    icon: "solution_optimale",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_optimal_1" },
  },
  {
    id: "puzzle-optimal-5",
    name: "Architecte Précis",
    description: "Résoudre 5 puzzles de manière optimale",
    icon: "architecte_precision",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_optimal_5" },
  },

  {
    id: "puzzle-speed",
    name: "Réflexion Éclair",
    description: "Résoudre un puzzle en moins de 30 secondes",
    icon: "puzzle_speed",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_under_30s" },
  },
  {
    id: "puzzle-chain",
    name: "Enchaînement",
    description: "Résoudre 3 puzzles d’affilée sans échec",
    icon: "puzzle_chain",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_streak_3" },
  },

  {
    id: "puzzle-survivor",
    name: "Survivant",
    description: "Réussir 3 puzzles de type Survie",
    icon: "survivor",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_survive_3" },
  },
  {
    id: "puzzle-liberator",
    name: "Libérateur",
    description: "Libérer 5 zones au total",
    icon: "liberator",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_free_zones_5" },
  },
  {
    id: "puzzle-cleaner",
    name: "Nettoyeur",
    description: "Clear 10 lignes via des puzzles",
    icon: "puzzle_cleaner",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_lines_10" },
  },

  {
    id: "puzzle-hard",
    name: "Cerveau en Fusion",
    description: "Résoudre un puzzle Hard",
    icon: "brain_overclock",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_hard_completed" },
  },
  {
    id: "puzzle-very-hard",
    name: "Impossible n’est pas Tetris",
    description: "Résoudre un puzzle Very Hard",
    icon: "impossible",
    mode: "PUZZLE",
    group: "PUZZLE",
    condition: { type: "custom", key: "puzzle_very_hard_completed" },
  },

  {
    id: "puzzle-replay",
    name: "Obsédé",
    description: "Rejouer le même puzzle 3 fois",
    icon: "loop_puzzle",
    secret: true,
    mode: "PUZZLE",
    group: "SECRETS",
    condition: { type: "custom", key: "puzzle_same_3" },
  },
  {
    id: "puzzle-wrong-way",
    name: "Contre-Intuition",
    description: "Résoudre un puzzle en utilisant une stratégie non prévue",
    icon: "counter_logic",
    secret: true,
    mode: "PUZZLE",
    group: "SECRETS",
    condition: { type: "custom", key: "puzzle_alt_solution" },
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
    icon: "seed_maudite_plus",
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
    icon: "architecte",
    secret: true,
    mode: "ALL",
    group: "SECRETS",
    condition: { type: "custom", key: "same_score_twice" },
  },
  // ─────────────────────────────
  // Tetrobots
  // ─────────────────────────────
  {
    id: "bot-first-match",
    name: "Test de Turing",
    description: "Jouer un match contre Tetrobots",
    icon: "bot_first",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_match_1" },
  },
  {
    id: "bot-first-win",
    name: "Machine Battue",
    description: "Gagner un match contre Tetrobots",
    icon: "bot_win",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_win_1" },
  },
  {
    id: "bot-rookie-win",
    name: "Début Prometteur",
    description: "Battre Tetrobots Rookie",
    icon: "bot_rookie",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_rookie_win" },
  },
  {
    id: "bot-balanced-win",
    name: "Système Déstabilisé",
    description: "Battre Tetrobots Pulse",
    icon: "bot_balanced",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_balanced_win" },
  },
  {
    id: "bot-apex-win",
    name: "Briseur d’Algorithme",
    description: "Battre Tetrobots Apex",
    icon: "bot_apex",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_apex_win" },
  },
  {
    id: "bot-perfect",
    name: "Sans Bug",
    description: "Battre Tetrobots sans jamais atteindre la zone rouge",
    icon: "bot_perfect",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_perfect_win" },
  },
  {
    id: "bot-speed-kill",
    name: "Overclocké",
    description: "Battre Tetrobots en moins de 60 secondes",
    icon: "bot_speed",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_win_under_60s" },
  },
  {
    id: "bot-blunder",
    name: "Faille Détectée",
    description: "Gagner après une erreur du bot",
    icon: "bot_blunder",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_won_after_blunder" },
  },
  {
    id: "bot-clean-stack",
    name: "Empilement Supérieur",
    description: "Avoir moins de trous que le bot en fin de partie",
    icon: "bot_stack",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_fewer_holes" },
  },
  {
    id: "bot-streak-5",
    name: "Dominateur Numérique",
    description: "Battre Tetrobots 5 fois d’affilée",
    icon: "bot_streak",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_win_streak_5" },
  },
  {
    id: "bot-evolution",
    name: "Évolution Forcée",
    description: "Battre les 3 personnalités dans la même session",
    icon: "bot_evolution",
    secret: true,
    mode: "VERSUS",
    group: "SECRETS",
    condition: { type: "custom", key: "bot_all_personalities_session" },
  },
  {
    id: "bot-apex-10",
    name: "Terminator",
    description: "Battre Tetrobots Apex 10 fois",
    icon: "bot_terminator",
    mode: "VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "bot_apex_win_10" },
  },
  {
    id: "bot-heuristic-master",
    name: "Maître des Heuristiques",
    description: "Gagner contre Apex avec plus de lignes cleared",
    icon: "bot_heuristic",
    secret: true,
    mode: "VERSUS",
    group: "SECRETS",
    condition: { type: "custom", key: "bot_outscore_lines_apex" },
  },
  {
    id: "rv-bot-counter",
    name: "Contre-Mesure",
    description: "Gagner après que le bot ait activé une synergie",
    icon: "rv_bot_counter",
    mode: "ROGUELIKE_VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "rv_win_after_bot_synergy" },
  },
  {
    id: "rv-bot-overclock",
    name: "Briseur de Code",
    description: "Battre Apex en mode Chaos actif",
    icon: "rv_break_code",
    mode: "ROGUELIKE_VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "rv_apex_chaos_win" },
  },
  {
    id: "rv-bomb-war",
    name: "Guerre Nucléaire",
    description: "Envoyer 10 bombes au bot",
    icon: "rv_bomb_war",
    mode: "ROGUELIKE_VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "rv_10_bombs_sent" },
  },
  {
    id: "rv-evolve",
    name: "Evolution Supérieure",
    description: "Avoir plus de mutations que le bot",
    icon: "rv_evolve",
    mode: "ROGUELIKE_VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "rv_more_mutations_than_bot" },
  },
  {
    id: "rv-dominate-apex",
    name: "Machine Dominée",
    description: "Battre Apex avec 3 synergies actives",
    icon: "rv_dominate",
    mode: "ROGUELIKE_VERSUS",
    group: "BOT",
    condition: { type: "custom", key: "rv_apex_3_synergies_win" },
  },
  // ─────────────────────────────
  // BOT ADAPTATIF
  // ─────────────────────────────

  {
    id: "bot-adapt-first",
    name: "Intelligence Artificielle",
    description: "Affronter Tetrobots en mode adaptatif",
    icon: "bot_adapt_first",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_adaptive_match_1" },
  },

  {
    id: "bot-adapt-win",
    name: "L’Humain Résiste",
    description: "Gagner contre Tetrobots adaptatif",
    icon: "bot_adapt_win",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_adaptive_win" },
  },

  {
    id: "bot-adapt-counter",
    name: "Contre-Analyse",
    description: "Gagner après un changement de stratégie du bot",
    icon: "bot_adapt_counter",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_win_after_strategy_shift" },
  },

  {
    id: "bot-adapt-pressure",
    name: "Sous Pression",
    description: "Gagner pendant que le bot est en mode 'pressure'",
    icon: "bot_adapt_pressure",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_win_vs_pressure_mode" },
  },

  {
    id: "bot-adapt-defensive",
    name: "Briseur de Défense",
    description: "Gagner quand le bot joue en mode défensif",
    icon: "bot_adapt_defense",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_win_vs_defensive_mode" },
  },

  {
    id: "bot-adapt-panic",
    name: "Erreur Système",
    description: "Forcer le bot en mode panique",
    icon: "bot_adapt_panic",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_trigger_panic" },
  },

  {
    id: "bot-adapt-exploit",
    name: "Exploit Détecté",
    description: "Exploiter la même faiblesse 3 fois dans un match",
    icon: "bot_adapt_exploit",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_exploit_pattern_3" },
  },

  {
    id: "bot-adapt-mindgame",
    name: "Mind Game",
    description: "Changer de style 3 fois et forcer le bot à s’adapter",
    icon: "bot_adapt_mindgame",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_forced_multiple_strategy_shifts" },
  },

  {
    id: "bot-adapt-dominance",
    name: "Domination Cognitive",
    description: "Gagner contre Apex adaptatif",
    icon: "bot_adapt_apex",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_adaptive_apex_win" },
  },

  {
    id: "bot-adapt-overwhelm",
    name: "Surcharge Neuronale",
    description: "Envoyer 50 lignes pendant que le bot s’adapte",
    icon: "bot_adapt_overwhelm",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_adaptive_lines_50" },
  },

  {
    id: "bot-adapt-perfection",
    name: "Erreur 404",
    description: "Gagner sans que le bot déclenche de changement stratégique",
    icon: "bot_adapt_perfect",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_no_strategy_change_win" },
  },

  {
    id: "bot-adapt-evolution",
    name: "Évolution Supérieure",
    description: "Battre le bot après 5 adaptations successives",
    icon: "bot_adapt_evolution",
    mode: "VERSUS",
    group: "SECRETS",
    secret: true,
    condition: { type: "custom", key: "bot_win_after_5_adaptations" },
  },

  {
    id: "bot-adapt-reverse",
    name: "Apprentissage Inversé",
    description: "Faire échouer le bot après qu’il ait analysé votre style",
    icon: "bot_adapt_reverse",
    mode: "VERSUS",
    group: "SECRETS",
    secret: true,
    condition: { type: "custom", key: "bot_adapt_failed_analysis" },
  },

  {
    id: "bot-adapt-session",
    name: "Turing Test",
    description: "Battre toutes les personnalités adaptatives dans une session",
    icon: "bot_adapt_all_session",
    mode: "VERSUS",
    group: "SECRETS",
    secret: true,
    condition: { type: "custom", key: "bot_adapt_all_personalities_session" },
  },
  {
    id: "bot-memory-detected",
    name: "Le Bot te connaît",
    description: "Déclencher un commentaire adaptatif du bot",
    icon: "bot_evolution_v2",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_memory_dialogue" },
  },
  {
    id: "bot-analyzed",
    name: "Sous Surveillance",
    description: "Le bot analyse votre style",
    icon: "bot_heuristic_v2",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "bot_detected_style" },
  },
  {
    id: "bot-outsmart",
    name: "Plus Fort que l’IA",
    description: "Gagner après adaptation du bot",
    icon: "bot_apex_v2",
    mode: "VERSUS",
    group: "BOT_ADAPTIVE",
    condition: { type: "custom", key: "win_after_bot_adapt" },
  },
  {
    id: "bot-shadow",
    name: "Ombre Numerique",
    description: "Jouer 10 matchs contre la meme personnalite Tetrobots",
    icon: "counter_logic_v2",
    mode: "VERSUS",
    group: "SECRETS",
    secret: true,
    condition: { type: "custom", key: "bot_10_matches_same" },
  },

];
