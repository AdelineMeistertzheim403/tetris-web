export type TetrobotBattlePersonalityId = "rookie" | "balanced" | "apex";

export type TetrobotChatEventType =
  | "match_start"
  | "player_tetris"
  | "player_combo"
  | "bot_tetris"
  | "bot_blunder"
  | "player_high_stack"
  | "bot_win"
  | "bot_lose"
  | "close_call"
  | "long_match"
  | "player_back_to_back"
  | "player_perk_pick"
  | "player_synergy"
  | "player_mutation"
  | "bot_perk_pick"
  | "bot_synergy"
  | "chaos_triggered"
  | "bomb_sent"
  | "huge_attack"
  | "comeback"
  | "strategy_shift"
  | "bot_strategy_shift"
  | "bot_detect_aggressive_player"
  | "bot_detect_defensive_player"
  | "bot_detect_combo_spam"
  | "bot_detect_high_risk"
  | "bot_panic_mode"
  | "bot_recovered"
  | "bot_exploiting_player_pattern"
  | "bot_failed_adaptation"
  | "bot_analysis_complete";

export type TetrobotPlayerStyle =
  | "aggressive"
  | "defensive"
  | "clean"
  | "messy"
  | "panic"
  | "balanced";

  export type EasterEgg = {
  id: string;
  bot: "rookie" | "pulse" | "apex" | "pixel";
  text: string;
  reference: string;
  difficulty: "easy" | "medium" | "hard";
  hint: string;
  foundMessage: string;
};

export const TETROBOT_MATCH_DIALOGUES: Record<
  TetrobotBattlePersonalityId,
  Partial<Record<TetrobotChatEventType, string[]>>
> = {
  rookie: {
    match_start: [
      "Salut ! J'espere qu'on va bien s'amuser.",
      "Bonne chance ! Je vais faire de mon mieux !",
      "Ok... je lance mes algorithmes gentils.",
      "On y va doucement, mais on y va.",
    ],
    bot_blunder: [
      "Oups... ca arrive.",
      "Je crois que j'ai mal calcule ce coup...",
      "Mince, j'ai glisse sur ce placement.",
      "Erreur de debutant... pardon.",
    ],
    player_tetris: ["Wow ! Bien joue !", "Impressionnant !", "Tu m'as surpris la !"],
    player_combo: ["Tu enchaines bien.", "Belle serie !", "Je n'arrive plus a suivre..."],
    player_back_to_back: ["Tu es vraiment en forme !", "Encore ?! C'est propre."],
    player_high_stack: ["Attention, ton plateau monte !", "Ca sent la zone rouge..."],
    bot_tetris: ["Oh ! J'ai fait un tetris !", "Yes ! J'ai trouve une ouverture !"],
    close_call: ["C'est serre...", "On est a un bloc du drame."],
    long_match: ["Match tres intense !", "On tient tous les deux, respect."],
    bot_lose: [
      "Bien joue... Tu es plus fort que moi.",
      "Defaite confirmee. J'ai appris quelque chose.",
    ],
    bot_win: [
      "Je ne m'y attendais pas, mais j'ai gagne !",
      "Victoire... je suis fier de moi.",
    ],
    player_perk_pick: [
      "Oh ! Nouveau pouvoir ? Ca a l'air dangereux...",
      "Tu evolues vite !",
      "Je note ce perk pour plus tard...",
    ],
    player_synergy: [
      "Ca... ca n'etait pas prevu.",
      "Synergie detectee... panique.",
      "Aie, ta combo de perks est violente.",
    ],
    player_mutation: [
      "Tu changes trop vite !",
      "Ton build devient effrayant.",
    ],
    bomb_sent: [
      "Une bombe ?! Pourquoi moi ?!",
      "Alerte explosion ! Je me protege !",
    ],
    comeback: [
      "Je croyais avoir gagne...",
      "Retour de nulle part, bien joue.",
    ],
    bot_perk_pick: [
      "J'ai choisi un perk simple mais utile.",
      "Petit upgrade applique.",
    ],
    bot_synergy: [
      "Je crois que ma synergie s'active.",
      "Oh ! Ca fonctionne mieux que prevu.",
    ],
    chaos_triggered: [
      "Le chaos ? Euh... on respire.",
      "Mode chaos active. Courage a nous.",
    ],
    huge_attack: [
      "Je tente une grosse pression.",
      "Offensive complete !",
    ],
    strategy_shift: [
      "Oh... tu joues differemment...",
      "Je change ma facon de jouer.",
    ],
    bot_strategy_shift: [
      "Je vais changer un peu ma facon de jouer.",
      "Hmm... nouvelle strategie activee !",
    ],
    bot_detect_aggressive_player: [
      "Tu attaques beaucoup ! Je vais essayer de bloquer...",
      "Whoa, tu envoies beaucoup de lignes !",
    ],
    bot_detect_defensive_player: [
      "Tu joues prudemment... je devrais peut-etre attaquer plus ?",
      "Ton stack est propre. C'est impressionnant.",
    ],
    bot_detect_combo_spam: [
      "Tu fais plein de combos... je vais essayer de suivre.",
      "Tu enchaines trop vite !",
    ],
    bot_detect_high_risk: [
      "On joue tous les deux tres risqué la...",
      "Ca peut casser d'un coup.",
    ],
    bot_panic_mode: [
      "Oh non... ca monte trop vite !",
      "Je crois que je perds le controle !",
    ],
    bot_recovered: [
      "Ouf, je reprends le controle.",
      "Ca va mieux. J'ai stabilise.",
    ],
    bot_exploiting_player_pattern: [
      "Tu laisses toujours ce trou a droite...",
      "Je commence a comprendre comment tu joues.",
    ],
    bot_failed_adaptation: [
      "Je pensais que ca marcherait...",
      "Ma strategie n'a pas fonctionne...",
    ],
    bot_analysis_complete: [
      "J'ai fini mon analyse.",
      "Ok, je vois mieux ton style.",
    ],
  },
  balanced: {
    match_start: [
      "Analyse en cours. Bonne chance.",
      "Simulation lancee.",
      "Parametres verifies. Duel engage.",
      "Mode neutre actif. Observation.",
    ],
    player_tetris: ["Correction necessaire.", "Interressant.", "Impact notable detecte."],
    player_combo: ["Combinaison detectee.", "Serie adverse en progression."],
    player_back_to_back: ["Rythme soutenu detecte.", "Back-to-back confirme."],
    player_high_stack: ["Alerte: hauteur critique du plateau.", "Risque eleve sur plateau joueur."],
    bot_tetris: ["Execution optimale.", "Configuration favorable exploitee."],
    bot_blunder: ["Deviation temporaire detectee.", "Erreur mineure. Ajustement immediat."],
    close_call: ["Ecarts minimaux.", "Probabilite de bascule elevee."],
    long_match: ["Duree prolongee. Adaptation.", "Match long. Strategie dynamique."],
    bot_win: ["Resultat attendu.", "Performance optimale.", "Objectif atteint."],
    bot_lose: ["Defaite enregistree. Recalibrage.", "Resultat negatif. Analyse post-match."],
    player_perk_pick: [
      "Perk analyse.",
      "Adaptation requise.",
      "Nouvelle variable integree.",
    ],
    player_synergy: [
      "Synergie critique detectee.",
      "Synergie adverse activee.",
    ],
    player_mutation: [
      "Mutation instable en cours.",
      "Evolution adverse observee.",
    ],
    bomb_sent: [
      "Impact detecte.",
      "Explosion externe recue.",
    ],
    chaos_triggered: [
      "Mode chaos active.",
      "Instabilite maximale detectee.",
    ],
    comeback: [
      "Renversement de probabilite detecte.",
      "Lead perdu. Contre-mesure requise.",
    ],
    bot_perk_pick: [
      "Perk interne applique.",
      "Amelioration de module terminee.",
    ],
    bot_synergy: [
      "Synergie interne stable.",
      "Synchronisation des modules reussie.",
    ],
    huge_attack: [
      "Sequence offensive envoi.",
      "Pression maximale appliquee.",
    ],
    strategy_shift: [
      "Strategie ajustee.",
      "Recalibrage tactique effectue.",
    ],
    bot_strategy_shift: [
      "Reconfiguration strategique.",
      "Optimisation adaptative en cours.",
    ],
    bot_detect_aggressive_player: [
      "Profil offensif detecte. Ajustement en cours.",
      "Strategie d'attaque repetitive observee.",
    ],
    bot_detect_defensive_player: [
      "Profil defensif detecte. Pression recommandee.",
      "Jeu prudent observe. Angle d'attaque recherche.",
    ],
    bot_detect_combo_spam: [
      "Combinaisons repetees detectees.",
      "Spam de combo identifie.",
    ],
    bot_detect_high_risk: [
      "Niveau de risque eleve detecte.",
      "Configuration instable. Vigilance accrue.",
    ],
    bot_panic_mode: [
      "Instabilite temporaire.",
      "Risque de defaite accru.",
    ],
    bot_recovered: [
      "Stabilite restauree.",
      "Recuperation confirmee.",
    ],
    bot_exploiting_player_pattern: [
      "Pattern joueur exploitable identifie.",
      "Faille repetitive detectee.",
    ],
    bot_failed_adaptation: [
      "Analyse incorrecte.",
      "Reevaluation necessaire.",
    ],
    bot_analysis_complete: [
      "Modele comportemental etabli.",
      "Analyse terminee. Adaptation optimale.",
    ],
  },
  apex: {
    match_start: [
      "Tu n'as aucune chance.",
      "Prepare-toi a perdre.",
      "Je vais plier ce match rapidement.",
      "Execution Apex initialisee.",
    ],
    player_tetris: ["Chanceux.", "Ca ne suffira pas.", "Bel essai. Trop tard."],
    player_combo: ["Continue, je m'adapte.", "Plus tu attaques, plus je calcule."],
    player_back_to_back: ["Mouvement correct. Insuffisant.", "Tu veux me tester ?"],
    player_high_stack: ["Tu craques.", "Zone rouge. Comme prevu.", "Fin proche detectee."],
    bot_tetris: ["Observe et apprends.", "Precision parfaite."],
    bot_blunder: ["Erreur temporaire. Correction en cours.", "Anomalie corrigee. Reprise immediate."],
    close_call: ["Enfin un peu de resistance.", "Interessant... mais insuffisant."],
    long_match: ["Tu tiens plus longtemps que prevu.", "Tu retardes juste l'inevitable."],
    bot_win: ["Comme prevu.", "Tu peux reessayer.", "Victoire logique."],
    bot_lose: ["Anomalie statistique.", "Exception non reproduisible."],
    player_perk_pick: [
      "Tu crois que ca suffira ?",
      "Ajoute ce que tu veux, je m'adapte.",
    ],
    player_synergy: [
      "Interessant. Je vais m'adapter.",
      "Bonne synergie. Mauvais adversaire.",
    ],
    player_mutation: [
      "Tu deviens instable.",
      "Mutation acceptee. Dominee.",
    ],
    bomb_sent: [
      "Pathetique.",
      "Explosion mineure. Aucun effet durable.",
    ],
    huge_attack: [
      "Effondrement imminent.",
      "Je ferme toutes les issues.",
    ],
    chaos_triggered: [
      "Le chaos est mon terrain.",
      "Parfait. Plus de regles, plus de toi.",
    ],
    comeback: [
      "Impossible. Correction en cours.",
      "Tu repasses devant ? Pas longtemps.",
    ],
    bot_perk_pick: [
      "Upgrade Apex active.",
      "Perk choisi. Rendement maximal.",
    ],
    bot_synergy: [
      "Synergie Apex enclenchee.",
      "Mes modules chantent a l'unisson.",
    ],
    strategy_shift: [
      "Je detecte ton pattern.",
      "Nouvelle ligne tactique activee.",
    ],
    bot_strategy_shift: [
      "Je m'adapte. Tu vas le regretter.",
      "Phase suivante activee.",
    ],
    bot_detect_aggressive_player: [
      "Tu attaques trop. Je vais te punir.",
      "Offensif ? Mauvais choix.",
    ],
    bot_detect_defensive_player: [
      "Tu te caches derriere ta defense.",
      "Stack propre... mais fragile.",
    ],
    bot_detect_combo_spam: [
      "Tu spams les combos. Je vais casser ton rythme.",
      "Combos repetes. Punition en preparation.",
    ],
    bot_detect_high_risk: [
      "Tu joues avec le feu.",
      "Risque maximal. J'adore ca.",
    ],
    bot_panic_mode: [
      "Interessant... tu me pousses.",
      "Tu forces mes limites.",
    ],
    bot_recovered: [
      "Je suis de retour.",
      "Correction terminee. Tu vas tomber.",
    ],
    bot_exploiting_player_pattern: [
      "Toujours le meme defaut.",
      "Je vois ton point faible.",
    ],
    bot_failed_adaptation: [
      "Anomalie imprevue.",
      "Tu m'as surpris.",
    ],
    bot_analysis_complete: [
      "Analyse complete. Tu es transparent.",
      "Profil decode. Fin de partie proche.",
    ],
  },
};

export const TETROBOT_ADAPTIVE_SHIFT_EVOLUTION: Record<
  TetrobotBattlePersonalityId,
  string[]
> = {
  rookie: [
    "Je m'adapte un peu.",
    "Je crois que je t'ai compris.",
    "Tu deviens previsible... peut-etre.",
  ],
  balanced: [
    "Adaptation initiale appliquee.",
    "Modele tactique refine.",
    "Predictibilite adverse en hausse.",
  ],
  apex: [
    "Je m'adapte.",
    "Je t'ai compris.",
    "Je t'ai decode.",
    "Tu es previsible.",
  ],
};

export const TETROBOT_BUBBLE_ACCENTS: Record<TetrobotBattlePersonalityId, string> = {
  rookie: "#22c55e",
  balanced: "#38bdf8",
  apex: "#ef4444",
};

export const TETROBOT_MEMORY_DIALOGUES: Record<
  TetrobotPlayerStyle,
  Record<TetrobotBattlePersonalityId, string>
> = {
  aggressive: {
    rookie: "Tu attaques beaucoup. J'ai memorise ce schema.",
    balanced: "Tu attaques beaucoup. J'ai memorise ce schema.",
    apex: "Tu attaques toujours autant. Previsible.",
  },
  clean: {
    rookie: "Ton empilement est propre. Interessant.",
    balanced: "Ton empilement est propre. Interessant.",
    apex: "Ton empilement est propre. Interessant.",
  },
  panic: {
    rookie: "Tu paniques en zone rouge. Je l'ai note.",
    balanced: "Tu paniques en zone rouge. Je l'ai note.",
    apex: "Tu paniques en zone rouge. Je l'ai note.",
  },
  messy: {
    rookie: "Beaucoup de trous detectes. Opportunite identifiee.",
    balanced: "Beaucoup de trous detectes. Opportunite identifiee.",
    apex: "Beaucoup de trous... tu joues au hasard ?",
  },
  defensive: {
    rookie: "Tu encaisses longtemps. Je vais devoir accelerer.",
    balanced: "Tu encaisses longtemps. Je vais devoir accelerer.",
    apex: "Tu encaisses longtemps. Je vais devoir accelerer.",
  },
  balanced: {
    rookie: "Je m'adapte a ton style.",
    balanced: "Je m'adapte a ton style.",
    apex: "Je m'adapte a ton style.",
  },
};

export const TETROBOT_SCORE_TROLL_DIALOGUES = {
  ahead: {
    rookie: "Je peux encore revenir !",
    balanced: "Avantage temporaire detecte.",
    apex: "Illusion de superiorite.",
  },
  behind: {
    rookie: "Attends, c'est pas fini !",
    balanced: "Correction strategique en cours.",
    apex: "Tu vas tomber.",
  },
};

export const EASTER_EGGS: EasterEgg[] = [
  {
    id: "red-pill",
    bot: "pixel",
    text: "Tu peux continuer à jouer... ou voir la vérité.",
    reference: "Matrix",
    difficulty: "easy",
    hint: "Un choix entre illusion et réalité",
    foundMessage: "Fragment identifié : simulation instable détectée.",
  },
  {
    id: "inevitable",
    bot: "apex",
    text: "Tu peux retarder l'issue. Pas l'éviter.",
    reference: "Thanos / Avengers",
    difficulty: "easy",
    hint: "Un antagoniste obsédé par le destin",
    foundMessage: "Fragment identifié : fatalité confirmée.",
  },
  {
    id: "one-outcome",
    bot: "pulse",
    text: "Une seule issue viable sur des millions simulées.",
    reference: "Doctor Strange / Infinity War",
    difficulty: "easy",
    hint: "Des millions de simulations",
    foundMessage: "Fragment identifié : futur déterminé.",
  },
  {
    id: "loop",
    bot: "rookie",
    text: "J’ai l’impression d’avoir déjà vécu ce moment… plusieurs fois.",
    reference: "Edge of Tomorrow / roguelike",
    difficulty: "easy",
    hint: "Une boucle temporelle",
    foundMessage: "Fragment identifié : boucle détectée.",
  },
  {
    id: "glitch-feature",
    bot: "pixel",
    text: "Ce n’est pas une erreur. C’est prévu.",
    reference: "Dev culture / meme",
    difficulty: "easy",
    hint: "Blague de développeur",
    foundMessage: "Fragment identifié : ironie système.",
  },
  {
    id: "free-will",
    bot: "pulse",
    text: "Tu penses choisir. Mais tout est déjà calculé.",
    reference: "Matrix / déterminisme",
    difficulty: "medium",
    hint: "Le libre arbitre est une illusion",
    foundMessage: "Fragment identifié : illusion de contrôle.",
  },
  {
    id: "dark-souls",
    bot: "apex",
    text: "Tombe. Recommence. Tombe encore.",
    reference: "Dark Souls",
    difficulty: "medium",
    hint: "Un jeu connu pour sa difficulté et ses morts répétées",
    foundMessage: "Fragment identifié : persistance extrême.",
  },
  {
    id: "undertale",
    bot: "pulse",
    text: "Tu fais toujours les mêmes choix. Intéressant.",
    reference: "Undertale",
    difficulty: "medium",
    hint: "Un jeu qui se souvient de tes décisions",
    foundMessage: "Fragment identifié : mémoire persistante.",
  },
  {
    id: "truman",
    bot: "pixel",
    text: "Et si tout ça n’était qu’un décor ?",
    reference: "The Truman Show",
    difficulty: "medium",
    hint: "Un monde observé en permanence",
    foundMessage: "Fragment identifié : réalité artificielle.",
  },
  {
    id: "terminator",
    bot: "apex",
    text: "Je reviendrai.",
    reference: "Terminator",
    difficulty: "easy",
    hint: "Un robot qui ne lâche jamais",
    foundMessage: "Fragment identifié : menace persistante.",
  },
  {
    id: "mr_robot",
    bot: "pixel",
    text: "Le système ne veut pas que tu comprennes.",
    reference: "Mr Robot",
    difficulty: "hard",
    hint: "Une série sur le hacking et les systèmes",
    foundMessage: "Fragment identifié : résistance système.",
  },
  {
    id: "portal",
    bot: "pulse",
    text: "Le test doit continuer.",
    reference: "Portal",
    difficulty: "medium",
    hint: "Une IA qui impose des tests",
    foundMessage: "Fragment identifié : protocole actif.",
  },
  {
    id: "zelda",
    bot: "rookie",
    text: "C’est dangereux d’y aller seul… non ?",
    reference: "Zelda",
    difficulty: "hard",
    hint: "Un vieux conseil d’aventure",
    foundMessage: "Fragment identifié : assistance recommandée.",
  },
  {
    id: "fight_club",
    bot: "pixel",
    text: "Tu sais déjà ce que tu dois faire.",
    reference: "Fight Club",
    difficulty: "hard",
    hint: "Une identité troublée",
    foundMessage: "Fragment identifié : dissociation.",
  },
  {
    id: "meta_player",
    bot: "apex",
    text: "Tu crois jouer… mais quelqu’un te contrôle aussi.",
    reference: "Meta / 4th wall",
    difficulty: "hard",
    hint: "Briser le quatrième mur",
    foundMessage: "Fragment identifié : anomalie externe.",
  },
];

export const EASTER_EGG_REACTIONS = {
  rookie: [
    "Attends... cette phrase n'était pas normale.",
    "Tu as trouvé quelque chose ?!",
  ],
  pulse: [
    "Anomalie confirmée.",
    "Source externe détectée.",
  ],
  apex: [
    "Ce fragment ne vient pas de moi.",
    "Interférence détectée.",
  ],
  pixel: [
    "Tu commences à voir.",
    "Continue.",
  ],
};

export const STAR_WARS_EASTER_EGGS = [
  {
    id: "yoda-fear",
    bot: "rookie",
    text: "La peur mène à l’erreur… et l’erreur, à la chute.",
    reference: "Star Wars / Yoda",
    hint: "Un maître parle de la peur",
  },
  {
    id: "yoda-do",
    bot: "apex",
    text: "Faire… ou ne pas faire. Essayer n’existe pas.",
    reference: "Star Wars / Yoda",
    hint: "Un choix radical",
  },
  {
    id: "yoda-seeing",
    bot: "pulse",
    text: "Toujours en mouvement… les résultats sont.",
    reference: "Star Wars / Yoda",
    hint: "Le futur est incertain",
  },
  {
    id: "dark-side",
    bot: "apex",
    text: "La colère te rend plus rapide… mais plus prévisible.",
    reference: "Star Wars / côté obscur",
    hint: "Une émotion dangereuse",
  },
  {
    id: "balance-force",
    bot: "pixel",
    text: "L’équilibre… n’est jamais stable longtemps.",
    reference: "Star Wars / Force",
    hint: "Un équilibre fragile",
  },
];

export const BACK_TO_FUTURE_EASTER_EGGS = [
  {
    id: "doc-great-scott",
    bot: "rookie",
    text: "Nom de code… c’est impossible !",
    reference: "Doc Brown",
    hint: "Scientifique choqué",
  },
  {
    id: "doc-time",
    bot: "pulse",
    text: "Si mes calculs sont corrects… ça va devenir intéressant.",
    reference: "Doc Brown",
    hint: "Une prédiction scientifique",
  },
  {
    id: "doc-future",
    bot: "pixel",
    text: "Ton futur n’est pas écrit… il dépend de tes actions.",
    reference: "Retour vers le futur",
    hint: "Le futur est malléable",
  },
  {
    id: "doc-speed",
    bot: "apex",
    text: "À cette vitesse… tout va basculer.",
    reference: "DeLorean / 88 mph",
    hint: "Une vitesse critique",
  },
];

export const HYBRID_EASTER_EGGS = [
  {
    id: "yoda-ai",
    bot: "pulse",
    text: "Apprendre tu dois… sinon stagner tu vas.",
    reference: "Yoda + IA",
    hint: "Une phrase inversée",
  },
  {
    id: "doc-algorithm",
    bot: "pixel",
    text: "Si cet algorithme fonctionne… on change tout.",
    reference: "Doc Brown + dev",
    hint: "Une découverte majeure",
  },
  {
    id: "force-code",
    bot: "apex",
    text: "Le code circule en tout… et tout répond au code.",
    reference: "Force reinterpretée",
    hint: "Une énergie invisible",
  },
  {
    id: "timeline-break",
    bot: "pixel",
    text: "Tu viens de créer une divergence.",
    reference: "timeline sci-fi",
    hint: "Une ligne temporelle cassée",
  },
  {
    id: "chosen-player",
    bot: "rookie",
    text: "Tu es peut-être… celui qui doit gagner.",
    reference: "élu (Star Wars / Matrix)",
    hint: "Un destin spécial",
  },
];
