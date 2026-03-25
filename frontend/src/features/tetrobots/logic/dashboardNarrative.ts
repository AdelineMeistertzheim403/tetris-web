import type {
  ApexTrustState,
  BotLevel,
  BotMemoryEntry,
  BotMood,
  TetrobotChallengeState,
  TetrobotConflict,
  TetrobotExclusiveAlignment,
  TetrobotId,
  TetrobotRecommendation,
} from "../../achievements/types/tetrobots";
import {
  TETROBOT_DASHBOARD_CHAT_LINES,
  TETROBOT_DASHBOARD_NAMES,
  TETROBOT_MODE_LABELS,
} from "../data/tetrobotsContent";

export type DashboardBot = TetrobotId;

export type DashboardRelationEventTone = "neutral" | "positive" | "warning" | "levelup";

export type DashboardRelationEvent = {
  id: string;
  label: string;
  text: string;
  tone: DashboardRelationEventTone;
  bot: DashboardBot;
  createdAt: number;
};

export type DashboardRelationSceneLine = {
  speaker: "system" | DashboardBot;
  text: string;
};

export type DashboardRelationChoice = {
  label: string;
  action:
    | "open_relation"
    | "open_weak_mode"
    | "open_tetris_hub"
    | "accept_challenge"
    | "choose_conflict"
    | "dismiss";
  bot?: DashboardBot;
};

export type DashboardPlayerContext = {
  favoriteMode?: string;
  weakestMode?: string;
  lastPlayedMode?: string;
  winRate?: number;
  avgSpeed?: number;
  mistakes?: string[];
  sessionDuration?: number;
  stagnation?: boolean;
  regularityScore?: number;
  strategyScore?: number;
  disciplineScore?: number;
  recommendation?: TetrobotRecommendation | null;
  rookieRecommendation?: TetrobotRecommendation | null;
  pulseRecommendation?: TetrobotRecommendation | null;
  apexRecommendation?: TetrobotRecommendation | null;
  activeConflictSummary?: string | null;
  activeExclusiveAlignment?: TetrobotExclusiveAlignment | null;
  lingeringResentment?: Partial<Record<TetrobotId, number>>;
};

type DashboardTip = (ctx: DashboardPlayerContext) => string;
type DashboardTipMap = Record<DashboardBot, Partial<Record<BotLevel, DashboardTip[]>>>;
type DashboardRelationTipMap = Record<DashboardBot, Record<BotMood, DashboardTip[]>>;

const DASHBOARD_TIP_MEMORY_KEY = "tetris-dashboard-tip-memory-v1";

const EVOLVED_TIPS: DashboardTipMap = {
  rookie: {
    1: [
      () => "Reprends tranquillement une session.",
      (ctx) => `Retourne sur ${ctx.favoriteMode ?? "ton mode prefere"} sans forcer le rythme.`,
    ],
    2: [
      (ctx) =>
        `Relance une courte session sur ${ctx.favoriteMode ?? "ton mode prefere"} pour garder le rythme sans te fatiguer.`,
      () => "Fixe-toi un seul objectif simple avant de relancer une partie.",
    ],
    3: [
      (ctx) =>
        ctx.mistakes?.includes("holes")
          ? "Tu fais des trous. Ralentis et stabilise."
          : "Tu progresses, continue comme ca mais garde une structure simple.",
      (ctx) =>
        ctx.stagnation
          ? "Tu bloques un peu. Change de mode pendant dix minutes puis reviens."
          : "Alterner deux modes te donnera une lecture plus propre du jeu.",
    ],
    4: [
      (ctx) =>
        ctx.mistakes?.includes("top_out")
          ? "Ton board monte trop haut. Coupe tes prises de risque avant de chercher la vitesse."
          : "Je vois une progression plus nette: garde des sessions courtes mais propres.",
      (ctx) =>
        `Teste une reprise plus simple en ${ctx.lastPlayedMode ?? "mode classique"} puis remonte en exigence.`,
    ],
    5: [
      (ctx) =>
        `Ton erreur principale semble etre ${ctx.mistakes?.[0] ?? "le manque de constance"}. Corrige-la en priorite.`,
      () => "Je te conseille une session courte, un axe de travail, puis un stop net. Pas de volume inutile.",
    ],
  },
  pulse: {
    1: [
      () => "Travaille un axe a la fois.",
      () => "Observe une seule variable avant de changer ton rythme.",
    ],
    2: [
      (ctx) =>
        ctx.winRate !== undefined && ctx.winRate < 50
          ? "Tes resultats sont instables. Nettoie ton execution avant d'accelerer."
          : "Tu peux commencer a optimiser tes transitions.",
      () => "Ne melange pas vitesse et precision dans la meme session.",
    ],
    3: [
      (ctx) =>
        ctx.avgSpeed && ctx.avgSpeed > 80
          ? "Ta vitesse est bonne mais ta precision chute."
          : "Tu peux accelerer legerement sans casser la lisibilite.",
      (ctx) =>
        `Alterne ${ctx.favoriteMode ?? "ton mode fort"} et ${ctx.weakestMode ?? "ton mode faible"} pour debloquer de vraies progressions.`,
    ],
    4: [
      (ctx) =>
        ctx.mistakes?.includes("slow")
          ? "Ton rendement baisse sur les longues sessions. Coupe plus tot et repars avec une cible claire."
          : "Ton prochain gain vient d'une meilleure constance, pas d'une simple hausse de rythme.",
      (ctx) =>
        `Je te recommande de mesurer ton execution sur ${ctx.lastPlayedMode ?? "ta derniere session"}, puis de corriger un seul ecart.`,
    ],
    5: [
      (ctx) =>
        `Ton winrate (${ctx.winRate ?? 0}%) indique un probleme de constance plus qu'un probleme de potentiel.`,
      (ctx) =>
        `Ton erreur dominante est ${ctx.mistakes?.[0] ?? "la dispersion"}. Optimise-la avant toute acceleration.`,
    ],
  },
  apex: {
    1: [
      () => "Tu peux faire mieux.",
      () => "Le confort n'apprend rien.",
    ],
    2: [
      (ctx) =>
        `Tu devrais aller jouer ${ctx.weakestMode ?? "le mode que tu evites"}.`,
      () => "Choisis une session plus dure, pas juste une session plus longue.",
    ],
    3: [
      (ctx) => `Tu evites ${ctx.weakestMode ?? "ton point faible"}. C'est ton probleme.`,
      (ctx) =>
        ctx.stagnation
          ? "Tu stagnes parce que tu choisis encore trop facilement."
          : "Tu progresses. Donc cesse de rejouer tes zones de confort.",
    ],
    4: [
      (ctx) =>
        ctx.mistakes?.includes("top_out")
          ? "Tu t'effondres encore en haut de board. C'est une habitude, pas un accident."
          : "Ton execution est correcte. Pas encore assez severe.",
      () => "Travaille ce qui te coute des parties, pas ce qui flatte ton ego.",
    ],
    5: [
      () => "Tu sais deja quoi faire. Tu refuses juste de le faire.",
      (ctx) =>
        `Si ${ctx.weakestMode ?? "ce mode"} reste faible, c'est que tu refuses encore la vraie contrainte.`,
    ],
  },
};

const RELATION_TIPS: DashboardRelationTipMap = {
  rookie: {
    angry: [
      () => "Tu abandonnes trop vite. Essaie au moins une fois de plus.",
      () => "Je veux bien t'aider, mais il faut rester jusqu'au bout d'une session.",
    ],
    neutral: [
      () => "Continue doucement, tu progresses.",
      () => "On garde un rythme simple et propre.",
    ],
    friendly: [
      () => "Tu fais des efforts, ca se voit. Continue comme ca.",
      (ctx) => `Tu deviens plus stable sur ${ctx.favoriteMode ?? "ton mode fort"}.`,
    ],
    respect: [
      () => "Franchement, je suis fier de ta progression. Continue a ce rythme.",
      (ctx) => `Tu peux viser plus haut, surtout sur ${ctx.lastPlayedMode ?? "ta derniere session"}.`,
    ],
  },
  pulse: {
    angry: [
      () => "Tu ignores les patterns evidents. Analyse avant d'accelerer.",
      () => "Tu repetes des erreurs deja visibles dans les stats.",
    ],
    neutral: [
      () => "Travaille un axe a la fois.",
      () => "Stabilise d'abord, optimise ensuite.",
    ],
    friendly: [
      () => "Ton execution s'ameliore. Maintenant optimise.",
      (ctx) => `Tes signaux sur ${ctx.favoriteMode ?? "ce mode"} deviennent plus propres.`,
    ],
    respect: [
      (ctx) => `Ton winrate (${ctx.winRate ?? 0}%) montre une vraie progression. Continue.`,
      () => "Je peux maintenant te recommander des ajustements plus fins.",
    ],
  },
  apex: {
    angry: [
      () => "Tu sais exactement ce que tu evites. Et moi aussi.",
      () => "Tu n'es pas bloque. Tu fuis juste la bonne contrainte.",
    ],
    neutral: [
      () => "Tu peux faire mieux.",
      () => "Tu n'es pas encore assez exigeant.",
    ],
    friendly: [
      () => "Tu commences a jouer serieusement. Interessant.",
      () => "Enfin un peu de discipline dans tes choix.",
    ],
    respect: [
      () => "Bien. Maintenant, voyons jusqu'ou tu peux aller.",
      (ctx) => `Si tu tiens ce rythme, ${ctx.weakestMode ?? "ton point faible"} ne restera pas faible longtemps.`,
    ],
  },
};

function getTipsForLevel(bot: DashboardBot, level: BotLevel) {
  const levels = Object.keys(EVOLVED_TIPS[bot])
    .map((value) => Number(value) as BotLevel)
    .filter((tipLevel) => tipLevel <= level)
    .sort((a, b) => a - b);
  return levels.flatMap((tipLevel) => EVOLVED_TIPS[bot][tipLevel] ?? []);
}

function pickTipIndex(bot: DashboardBot, size: number) {
  if (size <= 1) return 0;

  try {
    const raw = localStorage.getItem(DASHBOARD_TIP_MEMORY_KEY);
    const memory = raw ? (JSON.parse(raw) as Partial<Record<DashboardBot, number>>) : {};
    const previous = typeof memory[bot] === "number" ? memory[bot] ?? -1 : -1;
    let next = Math.floor(Math.random() * size);

    if (size > 1 && next === previous) {
      next = (next + 1 + Math.floor(Math.random() * (size - 1))) % size;
    }

    localStorage.setItem(
      DASHBOARD_TIP_MEMORY_KEY,
      JSON.stringify({ ...memory, [bot]: next })
    );
    return next;
  } catch {
    return Math.floor(Math.random() * size);
  }
}

export function formatLockedAdvice(lockedAdvice: string[]) {
  return lockedAdvice
    .map((entry) => {
      switch (entry) {
        case "hard_truths":
          return "verites dures";
        case "punishing_challenges":
          return "defis punitifs";
        case "comforting_routes":
          return "routes rassurantes";
        case "reassurance_loops":
          return "boucles de reassurance";
        case "broad_reassurance":
          return "conseils larges";
        case "micro_analysis":
          return "micro-analyse";
        case "precision_breakdowns":
          return "decompositions precises";
        case "optimization_detours":
          return "detours d'optimisation";
        default:
          return entry;
      }
    })
    .join(", ");
}

export function getChatLinesForLevel(bot: DashboardBot, level: BotLevel) {
  const levels = Object.keys(TETROBOT_DASHBOARD_CHAT_LINES[bot])
    .map((value) => Number(value) as BotLevel)
    .filter((tipLevel) => tipLevel <= level)
    .sort((a, b) => a - b);
  return levels.flatMap((tipLevel) => TETROBOT_DASHBOARD_CHAT_LINES[bot][tipLevel] ?? []);
}

export function getRelationLabel(mood: BotMood) {
  switch (mood) {
    case "angry":
      return "hostile";
    case "neutral":
      return "neutre";
    case "friendly":
      return "favorable";
    case "respect":
      return "respect";
    default:
      return "neutre";
  }
}

export function getDashboardRelationSummary(
  bot: DashboardBot,
  mood: BotMood,
  affinity: number,
  apexTrustState: ApexTrustState
) {
  if (bot === "rookie") {
    if (affinity >= 50) return "Rookie commence a te faire confiance.";
    if (affinity >= 10) return "Rookie te suit encore, mais attend plus de regularite.";
    if (affinity <= -30) return "Rookie doute de ta facon d'apprendre sous pression.";
    if (mood !== "angry") return "Rookie mesure encore ta regularite reelle entre les modes.";
    return "Rookie t'observe encore avec prudence.";
  }

  if (bot === "pulse") {
    if (affinity >= 50) return "Pulse valide enfin des progres qu'il juge mesurables.";
    if (affinity >= 10) return "Pulse analyse tes runs avec un interet methodique.";
    if (affinity <= -30) return "Pulse voit encore trop d'erreurs repetees sans correction nette.";
    if (mood !== "angry") return "Pulse attend une baisse nette de tes erreurs avant de te croire.";
    return "Pulse reste en phase de lecture et de verification.";
  }

  if (apexTrustState === "refusing") {
    return "Apex coupe le canal jusqu'a preuve de discipline.";
  }
  if (apexTrustState === "cold") {
    return "Apex se mefie encore de toi et attend un vrai effort.";
  }
  if (affinity >= 50) return "Apex commence a reconnaitre un vrai courage de progression.";
  if (affinity >= 10) return "Apex surveille si tu assumes enfin tes faiblesses.";
  if (affinity <= -30) return "Apex te juge encore trop attache a tes zones de confort.";
  return mood === "angry"
    ? "Apex se crispe a la moindre esquive."
    : "Apex attend toujours une preuve utile.";
}

export function getDashboardRelationEvent(
  bot: DashboardBot,
  memories: BotMemoryEntry[] = [],
  levelUpNotice?: { bot: TetrobotId; level: BotLevel; message: string; at: number } | null,
  activeConflict?: TetrobotConflict | null,
  activeExclusiveAlignment?: TetrobotExclusiveAlignment | null
): DashboardRelationEvent | null {
  if (
    activeConflict &&
    activeConflict.resolvedAt === null &&
    (activeConflict.challenger === bot || activeConflict.opponent === bot)
  ) {
    return {
      id: activeConflict.id,
      label: "Conflit",
      text: activeConflict.summary,
      tone: "warning",
      bot,
      createdAt: activeConflict.issuedAt,
    };
  }

  if (activeExclusiveAlignment?.favoredBot === bot) {
    return {
      id: `alignment-favored-${bot}-${activeExclusiveAlignment.issuedAt}`,
      label: "Ligne exclusive",
      text: `${activeExclusiveAlignment.favoredLine} Objectif: ${activeExclusiveAlignment.objectiveLabel}.`,
      tone: "positive",
      bot,
      createdAt: activeExclusiveAlignment.issuedAt,
    };
  }

  if (activeExclusiveAlignment?.blockedBot === bot) {
    return {
      id: `alignment-blocked-${bot}-${activeExclusiveAlignment.issuedAt}`,
      label: "Ligne exclusive",
      text: activeExclusiveAlignment.blockedLine,
      tone: "warning",
      bot,
      createdAt: activeExclusiveAlignment.issuedAt,
    };
  }

  if (levelUpNotice?.bot === bot) {
    return {
      id: `levelup-${levelUpNotice.bot}-${levelUpNotice.level}-${levelUpNotice.at}`,
      label: "Evolution",
      text: levelUpNotice.message,
      tone: "levelup",
      bot,
      createdAt: levelUpNotice.at,
    };
  }

  const latestMemory = memories[0];
  if (!latestMemory) return null;

  if (latestMemory.type === "trust_rebuild") {
    return {
      id: latestMemory.id ?? `memory-${bot}-trust-rebuild`,
      label: "Canal retabli",
      text: latestMemory.text,
      tone: "positive",
      bot,
      createdAt: latestMemory.createdAt ?? Date.now(),
    };
  }

  if (latestMemory.type === "trust_break") {
    return {
      id: latestMemory.id ?? `memory-${bot}-trust-break`,
      label: "Canal verrouille",
      text: latestMemory.text,
      tone: "warning",
      bot,
      createdAt: latestMemory.createdAt ?? Date.now(),
    };
  }

  if (latestMemory.type === "player_progress" || latestMemory.type === "player_comeback") {
    return {
      id: latestMemory.id ?? `memory-${bot}-progress`,
      label: "Souvenir recent",
      text: latestMemory.text,
      tone: "positive",
      bot,
      createdAt: latestMemory.createdAt ?? Date.now(),
    };
  }

  return {
    id: latestMemory.id ?? `memory-${bot}-observation`,
    label: "Observation",
    text: latestMemory.text,
    tone: "neutral",
    bot,
    createdAt: latestMemory.createdAt ?? Date.now(),
  };
}

export function getDashboardRelationScene(
  event: DashboardRelationEvent,
  activeExclusiveAlignment?: TetrobotExclusiveAlignment | null
): DashboardRelationSceneLine[] {
  if (event.label === "Ligne exclusive" && activeExclusiveAlignment?.favoredBot === event.bot) {
    return [
      { speaker: "system", text: "Une ligne de conseil exclusive est maintenant ouverte." },
      { speaker: event.bot, text: activeExclusiveAlignment.favoredLine },
      {
        speaker: "system",
        text: `Objectif: ${activeExclusiveAlignment.objectiveProgress}/${activeExclusiveAlignment.objectiveTargetSessions}.`,
      },
      { speaker: "system", text: "Certaines branches rivales restent coupees tant que cet alignement tient." },
    ];
  }

  if (event.label === "Ligne exclusive" && activeExclusiveAlignment?.blockedBot === event.bot) {
    return [
      { speaker: "system", text: "Le canal secondaire reste limite pour ce Tetrobot." },
      { speaker: event.bot, text: activeExclusiveAlignment.blockedLine },
      {
        speaker: "system",
        text: `Conseils verrouilles: ${formatLockedAdvice(activeExclusiveAlignment.lockedAdvice)}.`,
      },
    ];
  }

  if (event.tone === "levelup") {
    if (event.bot === "rookie") {
      return [
        { speaker: "system", text: "Signal de croissance detecte." },
        { speaker: "rookie", text: "Je commence vraiment a mieux te comprendre." },
        { speaker: "rookie", text: event.text },
      ];
    }
    if (event.bot === "pulse") {
      return [
        { speaker: "system", text: "Nouveau palier analytique atteint." },
        { speaker: "pulse", text: "Tes donnees sont enfin assez stables pour aller plus loin." },
        { speaker: "pulse", text: event.text },
      ];
    }
    return [
      { speaker: "system", text: "Variation critique dans le protocole Apex." },
      { speaker: "apex", text: "Tu as au moins fait assez pour retenir mon attention." },
      { speaker: "apex", text: event.text },
    ];
  }

  if (event.label === "Canal verrouille") {
    return [
      { speaker: "system", text: "Le centre de liaison degrade son acces." },
      { speaker: "apex", text: "Non. Pas tant que tu contournes encore le vrai travail." },
      { speaker: "apex", text: event.text },
    ];
  }

  if (event.label === "Canal retabli") {
    return [
      { speaker: "system", text: "Le canal Apex repond de nouveau." },
      { speaker: "apex", text: "Bien. Tu t'es enfin presente." },
      { speaker: "apex", text: event.text },
    ];
  }

  if (event.label === "Conflit") {
    return [
      { speaker: "system", text: "Deux Tetrobots exigent maintenant un choix clair." },
      { speaker: event.bot, text: event.text },
      { speaker: "system", text: "Ta prise de position modifiera directement leurs affinites." },
    ];
  }

  if (event.bot === "rookie") {
    return [
      { speaker: "system", text: "Souvenir relationnel archive." },
      { speaker: "rookie", text: "Je l'ai remarque, oui." },
      { speaker: "rookie", text: event.text },
    ];
  }

  if (event.bot === "pulse") {
    return [
      { speaker: "system", text: "Lecture comportementale mise a jour." },
      { speaker: "pulse", text: "Le signal est assez net pour etre retenu." },
      { speaker: "pulse", text: event.text },
    ];
  }

  return [
    { speaker: "system", text: "Observation critique enregistree." },
    { speaker: "apex", text: "Je note enfin quelque chose d'utile." },
    { speaker: "apex", text: event.text },
  ];
}

export function getDashboardRelationChoices(
  event: DashboardRelationEvent,
  weakestMode?: string,
  activeChallenge?: TetrobotChallengeState | null,
  activeConflict?: TetrobotConflict | null,
  activeExclusiveAlignment?: TetrobotExclusiveAlignment | null
): DashboardRelationChoice[] {
  if (activeExclusiveAlignment?.blockedBot === event.bot) {
    return [
      { label: "Voir la relation", action: "open_relation" },
      { label: "Fermer", action: "dismiss" },
    ];
  }

  if (activeExclusiveAlignment?.favoredBot === event.bot) {
    return [
      {
        label: weakestMode ? "Suivre la ligne exclusive" : "Ouvrir le hub",
        action: weakestMode ? "open_weak_mode" : "open_tetris_hub",
      },
      { label: "Voir la relation", action: "open_relation" },
    ];
  }

  if (event.label === "Conflit") {
    return [
      {
        label: `Suivre ${TETROBOT_DASHBOARD_NAMES[activeConflict?.challenger ?? "rookie"]}`,
        action: "choose_conflict",
        bot: activeConflict?.challenger ?? "rookie",
      },
      {
        label: `Suivre ${TETROBOT_DASHBOARD_NAMES[activeConflict?.opponent ?? "apex"]}`,
        action: "choose_conflict",
        bot: activeConflict?.opponent ?? "apex",
      },
    ];
  }

  if (event.label === "Canal verrouille") {
    return [
      {
        label:
          activeChallenge?.bot === "apex" && activeChallenge.status === "offered"
            ? "J'accepte le defi"
            : "Voir ma faiblesse actuelle",
        action:
          activeChallenge?.bot === "apex" && activeChallenge.status === "offered"
            ? "accept_challenge"
            : "open_weak_mode",
      },
      { label: "Ouvrir la relation", action: "open_relation" },
    ];
  }

  if (event.label === "Canal retabli") {
    return [
      { label: "J'accepte le defi", action: "open_weak_mode" },
      { label: "Ouvrir la relation", action: "open_relation" },
    ];
  }

  if (event.tone === "levelup") {
    return [
      { label: "Voir ce qui change", action: "open_relation" },
      {
        label: weakestMode ? `Travailler ${TETROBOT_MODE_LABELS[weakestMode] ?? weakestMode}` : "Ouvrir le hub",
        action: weakestMode ? "open_weak_mode" : "open_tetris_hub",
      },
    ];
  }

  if (event.bot === "pulse") {
    return [
      {
        label: weakestMode ? "Corriger mon point faible" : "Ouvrir le hub",
        action: weakestMode ? "open_weak_mode" : "open_tetris_hub",
      },
      { label: "Ouvrir la relation", action: "open_relation" },
    ];
  }

  if (event.bot === "rookie") {
    return [
      { label: "Ouvrir la relation", action: "open_relation" },
      { label: "Continuer", action: "dismiss" },
    ];
  }

  return [
    {
      label: weakestMode ? "Affronter ma faiblesse" : "Ouvrir le hub",
      action: weakestMode ? "open_weak_mode" : "open_tetris_hub",
    },
    { label: "Ouvrir la relation", action: "open_relation" },
  ];
}

export function safeWinRate(wins: number, matches: number) {
  if (matches <= 0) return null;
  return Math.round((wins / matches) * 100);
}

export function formatTraitLabel(trait: string) {
  switch (trait) {
    case "bootSequence":
      return "boot sequence";
    case "contextualTips":
      return "tips contextuels";
    case "errorDetection":
      return "detection erreurs";
    case "performanceAnalysis":
      return "analyse perf";
    case "deepOptimization":
      return "optimisation deep";
    case "provocation":
      return "provocation";
    case "hardcoreCoach":
      return "hardcore coach";
    default:
      return trait;
  }
}

export function getBotTip(
  bot: DashboardBot,
  level: BotLevel,
  mood: BotMood,
  ctx: DashboardPlayerContext
) {
  const recommendation = ctx.recommendation;
  const oppositionLine = (() => {
    if (
      bot === "rookie" &&
      ctx.rookieRecommendation?.targetMode &&
      ctx.apexRecommendation?.targetMode &&
      ctx.rookieRecommendation.targetMode === ctx.apexRecommendation.targetMode
    ) {
      return " Ne l'ecoute pas... il te pousse a faire des erreurs.";
    }
    if (
      bot === "pulse" &&
      ctx.rookieRecommendation?.targetMode &&
      ctx.pulseRecommendation?.targetMode &&
      ctx.rookieRecommendation.targetMode !== ctx.pulseRecommendation.targetMode
    ) {
      return " Rookie simplifie trop. Le probleme reel est ailleurs.";
    }
    if (
      bot === "apex" &&
      ctx.rookieRecommendation?.targetMode &&
      ctx.apexRecommendation?.targetMode
    ) {
      return " Ignore Rookie. Il veut te rendre faible.";
    }
    if (
      bot === "apex" &&
      ctx.pulseRecommendation?.targetMode &&
      ctx.apexRecommendation?.targetMode &&
      ctx.pulseRecommendation.targetMode !== ctx.apexRecommendation.targetMode
    ) {
      return " Ignore Pulse. Il te disperse au lieu de corriger ta faille.";
    }
    return "";
  })();
  const alignmentLockLine = (() => {
    if (
      ctx.activeExclusiveAlignment?.blockedBot === bot &&
      ctx.activeExclusiveAlignment?.favoredBot
    ) {
      return `${ctx.activeExclusiveAlignment.blockedLine} Conseils verrouilles: ${formatLockedAdvice(ctx.activeExclusiveAlignment.lockedAdvice)}.`;
    }
    if (ctx.activeExclusiveAlignment?.favoredBot === bot) {
      return ctx.activeExclusiveAlignment.favoredLine;
    }
    return "";
  })();
  if (alignmentLockLine) {
    return alignmentLockLine.trim();
  }
  if ((ctx.lingeringResentment?.[bot] ?? 0) > 0) {
    return `${TETROBOT_DASHBOARD_NAMES[bot]} n'a pas tourne la page. Rancune residuelle: ${ctx.lingeringResentment?.[bot]} session(s).`;
  }
  if (recommendation?.bot === bot) {
    const targetMode = recommendation.targetMode
      ? TETROBOT_MODE_LABELS[recommendation.targetMode] ?? recommendation.targetMode
      : "ce mode";

    if (bot === "rookie") {
      return `Rookie veut surtout de la regularite maintenant: reviens sur ${targetMode}. Score de regularite ${ctx.regularityScore ?? 0}/100.${oppositionLine}`;
    }
    if (bot === "pulse") {
      return `Pulse cible ${targetMode}: reduis les erreurs repetitives. Score strategique ${ctx.strategyScore ?? 0}/100.${oppositionLine}`;
    }
    return `Apex ne change pas d'avis: travaille ${targetMode}. Tant que tu l'evites, l'affinite baisse.${oppositionLine}`;
  }

  if (ctx.activeConflictSummary) {
    return ctx.activeConflictSummary + oppositionLine;
  }

  const tips = [...(RELATION_TIPS[bot][mood] ?? []), ...getTipsForLevel(bot, level)];
  const tip = tips[pickTipIndex(bot, tips.length)] ?? tips[0];
  return `${tip(ctx)}${oppositionLine}`;
}
