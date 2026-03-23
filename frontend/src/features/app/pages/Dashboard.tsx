import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { TOTAL_GAME_MODES } from "../../game/types/GameMode";
import type {
  BotLevel,
  BotMood,
  TetrobotChallengeState,
  TetrobotId,
} from "../../achievements/types/tetrobots";
import { getApexTrustState } from "../../achievements/lib/tetrobotAchievementLogic";
import {
  useAchievements,
} from "../../achievements/hooks/useAchievements";
import "../../../styles/dashboard.scss";

type ModeCard = {
  title: string;
  desc: string;
  path: string;
  accent: string;
  image: string;
  variant: "tetris" | "brickfall" | "tetroverse";
};

type DashboardBot = TetrobotId;

type DashboardChatLine = {
  bot: DashboardBot;
  text: string;
};

type DashboardRelationEventTone = "neutral" | "positive" | "warning" | "levelup";

type DashboardRelationEvent = {
  id: string;
  label: string;
  text: string;
  tone: DashboardRelationEventTone;
  bot: DashboardBot;
  createdAt: number;
};

type DashboardRelationSceneLine = {
  speaker: "system" | DashboardBot;
  text: string;
};

type DashboardRelationChoice = {
  label: string;
  action:
    | "open_relation"
    | "open_weak_mode"
    | "open_tetris_hub"
    | "accept_challenge"
    | "dismiss";
};

type DashboardActionIconName =
  | "resume"
  | "hub"
  | "editor"
  | "gallery"
  | "relation"
  | "message"
  | "help";

type ShortcutButton = {
  label: string;
  tooltip: string;
  icon: DashboardActionIconName;
  action: () => void;
};

type PlayerContext = {
  favoriteMode?: string;
  weakestMode?: string;
  lastPlayedMode?: string;
  winRate?: number;
  avgSpeed?: number;
  mistakes?: string[];
  sessionDuration?: number;
  stagnation?: boolean;
};

type Tip = (ctx: PlayerContext) => string;
type TipMap = Record<DashboardBot, Partial<Record<BotLevel, Tip[]>>>;
type ChatLineMap = Record<DashboardBot, Partial<Record<BotLevel, string[]>>>;
type RelationTipMap = Record<DashboardBot, Record<BotMood, Tip[]>>;

function DashboardActionIcon({ name }: { name: DashboardActionIconName }) {
  const iconMap: Record<DashboardActionIconName, ReactElement> = {
    resume: (
      <path d="M12 2a10 10 0 1 0 7.1 2.9 1 1 0 1 0-1.4 1.4A8 8 0 1 1 12 4v3l4-4-4-4z" />
    ),
    hub: (
      <path d="M3 5a2 2 0 0 1 2-2h4v4H5v4H3zm12-2h4a2 2 0 0 1 2 2v6h-2V7h-4zm4 12v4a2 2 0 0 1-2 2h-6v-2h6v-4zM9 21H5a2 2 0 0 1-2-2v-4h2v4h4zm1-12h4v4h-4zm-5 5h4v4H5zm10 0h4v4h-4z" />
    ),
    editor: (
      <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zm14.71-9.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.46 1.46 3.75 3.75z" />
    ),
    gallery: (
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14H4zm2 2v10h12V7zm1 8 3-4 2 3 2-2 3 3z" />
    ),
    relation: (
      <path d="M7 6h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-3l-4 3v-3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3zm1 4h8v2H8zm0-3h6v2H8z" />
    ),
    message: (
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 4h10v2H7zm0 4h7v2H7z" />
    ),
    help: (
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 15h-1.5v-1.5H12zm1.72-6.22-.67.46A1.92 1.92 0 0 0 12 12.9V13h-1.5v-.26a2.94 2.94 0 0 1 1.27-2.72l.92-.63a1.43 1.43 0 0 0 .66-1.18 1.85 1.85 0 0 0-3.69.11H8.15a3.35 3.35 0 1 1 6.69-.2 2.79 2.79 0 0 1-1.12 2.66z" />
    ),
  };

  return (
    <svg
      className="dashboard-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      {iconMap[name]}
    </svg>
  );
}

const CHATBOT_AVATARS: Record<DashboardBot, Record<BotMood, string>> = {
  rookie: {
    angry: "/chatbots/rookie_angry.png",
    neutral: "/chatbots/rookie_neutral.png",
    friendly: "/chatbots/rookie_friend.png",
    respect: "/chatbots/rookie_respect.png",
  },
  pulse: {
    angry: "/chatbots/pulse_angry.png",
    neutral: "/chatbots/pulse_neutral.png",
    friendly: "/chatbots/pulse_friend.png",
    respect: "/chatbots/pulse_respect.png",
  },
  apex: {
    angry: "/chatbots/apex_angry.png",
    neutral: "/chatbots/apex_neutral.png",
    friendly: "/chatbots/apex_friend.png",
    respect: "/chatbots/apex_respect.png",
  },
};

const CHATBOT_AVATAR_FALLBACKS: Record<DashboardBot, string> = {
  rookie: "/Tetromaze/rookie.png",
  pulse: "/Tetromaze/pulse.png",
  apex: "/Tetromaze/apex.png",
};

const CHATBOT_NAMES: Record<DashboardBot, string> = {
  rookie: "ROOKIE",
  pulse: "PULSE",
  apex: "APEX",
};

const CHATBOT_LEVEL_COLORS: Record<DashboardBot, Record<BotLevel, string>> = {
  rookie: {
    1: "#65d7a6",
    2: "#4ee5b1",
    3: "#37e28f",
    4: "#72f0ca",
    5: "#baffea",
  },
  pulse: {
    1: "#6b8dff",
    2: "#4da6ff",
    3: "#58c1ff",
    4: "#70d7ff",
    5: "#baf1ff",
  },
  apex: {
    1: "#ff7a7a",
    2: "#ff5f5f",
    3: "#ff6a3d",
    4: "#ff7d33",
    5: "#ffd0a8",
  },
};

const DASHBOARD_CHAT_LAST_SEEN_KEY = "tetris-dashboard-last-seen-at";
const DASHBOARD_TIP_MEMORY_KEY = "tetris-dashboard-tip-memory-v1";
const DASHBOARD_RELATION_POPUP_SEEN_KEY = "tetris-dashboard-relation-popup-seen-v1";

const EVOLVED_CHAT_LINES: ChatLineMap = {
  rookie: {
    1: [
      "Tu veux refaire une partie ? Promis je m'ameliore.",
      "On repart doucement si tu veux.",
      "Je surveille juste ton rythme pour l'instant.",
    ],
    2: [
      "Je commence a voir comment tu apprends.",
      "Ton rythme est plus lisible qu'avant.",
      "Je peux deja mieux guider tes reprises.",
    ],
    3: [
      "J'ai repere des erreurs qui reviennent.",
      "Tu progresses, mais certaines habitudes resistent encore.",
      "Je commence a comprendre ton style.",
    ],
    4: [
      "Je peux te guider avec plus de precision maintenant.",
      "Tes runs racontent quelque chose de plus net.",
      "Je vois mieux ce qui te fait perdre du temps.",
    ],
    5: [
      "Plan de progression quasi pret.",
      "Je ne t'encourage plus au hasard, je te cadre.",
      "On peut corriger proprement ce qui bloque vraiment.",
    ],
  },
  pulse: {
    1: [
      "Analyse des performances en cours.",
      "Lecture de tendances en attente.",
      "Travail de calibration active.",
    ],
    2: [
      "Premier modele comportemental stabilise.",
      "Variations de performance detectees.",
      "Analyse simple disponible.",
    ],
    3: [
      "Pattern repetitif identifie.",
      "Optimisation locale recommandee.",
      "Je commence a relier execution et resultat.",
    ],
    4: [
      "Strategie avancee en preparation.",
      "Tes ecarts de constance sont plus clairs.",
      "Je peux maintenant isoler tes vrais leviers.",
    ],
    5: [
      "Analyse quasi professionnelle active.",
      "Simulation alternative disponible.",
      "Ton profil est maintenant suffisamment dense pour une vraie lecture.",
    ],
  },
  apex: {
    1: [
      "Tu peux faire mieux.",
      "Je t'observe encore.",
      "Ce n'est qu'un echauffement.",
    ],
    2: [
      "Tu commences enfin a m'interesser.",
      "Choisis un vrai defi cette fois.",
      "Je te laisserai moins respirer.",
    ],
    3: [
      "Je vois exactement ce que tu evites.",
      "Ta progression est encore trop confortable.",
      "Tu repousses toujours les memes points faibles.",
    ],
    4: [
      "Je ne te laisserai plus cacher tes failles.",
      "Tu veux progresser ou juste rester correct ?",
      "La pression commence maintenant.",
    ],
    5: [
      "Je n'ai plus besoin de te menager.",
      "Tu sais deja quoi faire. Reste a le faire.",
      "Je n'attends plus des essais, j'attends des choix durs.",
    ],
  },
};

const CHAT_GLOBAL_FUN = [
  "Le labyrinthe observe.",
  "Le système se souvient.",
  "Une nouvelle anomalie a été détectée.",
  "Tu as débloqué quelque chose hier.",
  "Un succès secret t’attend.",
  "Quelque chose a changé dans le code.",
  "Mode Chaos recommandé.",
  "Une mutation t’irait bien.",
  "Tu n’as pas encore battu Apex aujourd’hui.",
  "Les Tetrobots discutent de toi.",
];

const CHAT_META = {
  lowPerformance: {
    rookie: "On peut baisser la difficulté si tu veux.",
    pulse: "Performance en baisse détectée.",
    apex: "Ça devient embarrassant.",
  },
  highPerformance: {
    rookie: "Tu es impressionnant !",
    pulse: "Domination confirmée.",
    apex: "Intéressant.",
  },
  inactive: {
    rookie: "Tu m’as oublié ?",
    pulse: "Inactivité prolongée détectée.",
    apex: "Fuite détectée.",
  },
};

const CHAT_RARE = [
  "Je commence à comprendre qui tu es.",
  "Le code n’est jamais neutre.",
  "Tu crois jouer... mais tu es analysé.",
  "Il y a quelque chose derrière le labyrinthe.",
  "Ce n’est que le début.",
];

const MODE_LABELS: Record<string, string> = {
  CLASSIQUE: "Classique",
  SPRINT: "Sprint",
  VERSUS: "Versus",
  BRICKFALL_SOLO: "Brickfall Solo",
  ROGUELIKE: "Roguelike",
  ROGUELIKE_VERSUS: "Roguelike Versus",
  PUZZLE: "Puzzle",
  TETROMAZE: "Tetromaze",
  PIXEL_PROTOCOL: "Pixel Protocol",
};

const MODE_ROUTE_MAP: Partial<Record<string, string>> = {
  CLASSIQUE: "/game",
  SPRINT: "/sprint",
  VERSUS: "/versus",
  BRICKFALL_SOLO: "/brickfall-solo",
  ROGUELIKE: "/roguelike",
  ROGUELIKE_VERSUS: "/roguelike-versus",
  PUZZLE: "/puzzle",
  TETROMAZE: "/tetromaze",
  PIXEL_PROTOCOL: "/pixel-protocol",
};

const EVOLVED_TIPS: TipMap = {
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

const RELATION_TIPS: RelationTipMap = {
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function getTipsForLevel(bot: DashboardBot, level: BotLevel) {
  const levels = Object.keys(EVOLVED_TIPS[bot])
    .map((value) => Number(value) as BotLevel)
    .filter((tipLevel) => tipLevel <= level)
    .sort((a, b) => a - b);
  return levels.flatMap((tipLevel) => EVOLVED_TIPS[bot][tipLevel] ?? []);
}

function getChatLinesForLevel(bot: DashboardBot, level: BotLevel) {
  const levels = Object.keys(EVOLVED_CHAT_LINES[bot])
    .map((value) => Number(value) as BotLevel)
    .filter((tipLevel) => tipLevel <= level)
    .sort((a, b) => a - b);
  return levels.flatMap((tipLevel) => EVOLVED_CHAT_LINES[bot][tipLevel] ?? []);
}

function getRelationLabel(mood: BotMood) {
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

function getDashboardRelationSummary(
  bot: DashboardBot,
  mood: BotMood,
  affinity: number,
  apexTrustState: ReturnType<typeof getApexTrustState>
) {
  if (bot === "rookie") {
    if (affinity >= 50) return "Rookie commence a te faire confiance.";
    if (affinity >= 10) return "Rookie te suit encore, mais attend plus de regularite.";
    if (affinity <= -30) return "Rookie doute de ta facon d'apprendre sous pression.";
    return "Rookie t'observe encore avec prudence.";
  }

  if (bot === "pulse") {
    if (affinity >= 50) return "Pulse valide enfin des progres qu'il juge mesurables.";
    if (affinity >= 10) return "Pulse analyse tes runs avec un interet methodique.";
    if (affinity <= -30) return "Pulse voit encore trop d'erreurs repetees sans correction nette.";
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

function getDashboardRelationEvent(
  bot: DashboardBot,
  memories: Array<{ id?: string; type: string; text: string; createdAt?: number }> = [],
  levelUpNotice?: { bot: TetrobotId; level: BotLevel; message: string; at: number } | null
): DashboardRelationEvent | null {
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

function getDashboardRelationScene(event: DashboardRelationEvent): DashboardRelationSceneLine[] {
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

function getDashboardRelationChoices(
  event: DashboardRelationEvent,
  weakestMode?: string,
  activeChallenge?: TetrobotChallengeState | null
): DashboardRelationChoice[] {
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
        label: weakestMode ? `Travailler ${MODE_LABELS[weakestMode] ?? weakestMode}` : "Ouvrir le hub",
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

function safeWinRate(wins: number, matches: number) {
  if (matches <= 0) return null;
  return Math.round((wins / matches) * 100);
}

function formatTraitLabel(trait: string) {
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

function getBotTip(
  bot: DashboardBot,
  level: BotLevel,
  mood: BotMood,
  ctx: PlayerContext
) {
  const tips = [...(RELATION_TIPS[bot][mood] ?? []), ...getTipsForLevel(bot, level)];
  const tip = tips[pickTipIndex(bot, tips.length)] ?? tips[0];
  return tip(ctx);
}

function readLocalBrickfallProgress() {
  try {
    const raw = localStorage.getItem("brickfall-solo-campaign-progress-v1");
    const parsed = Number.parseInt(raw ?? "1", 10);
    return Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
  } catch {
    return 1;
  }
}

function readLocalTetromazeProgress() {
  try {
    const raw = localStorage.getItem("tetromaze-campaign-progress-v1");
    if (!raw) return { highestLevel: 1, currentLevel: 1 };
    const parsed = JSON.parse(raw) as { highestLevel?: number; currentLevel?: number };
    return {
      highestLevel: Math.max(1, Math.floor(parsed.highestLevel ?? 1)),
      currentLevel: Math.max(1, Math.floor(parsed.currentLevel ?? 1)),
    };
  } catch {
    return { highestLevel: 1, currentLevel: 1 };
  }
}

function readLocalPixelProtocolProgress() {
  try {
    const raw = localStorage.getItem("pixel-protocol-progress-v1");
    if (!raw) return { highestLevel: 1, currentLevel: 1 };
    const parsed = JSON.parse(raw) as { highestLevel?: number; currentLevel?: number };
    return {
      highestLevel: Math.max(1, Math.floor(parsed.highestLevel ?? 1)),
      currentLevel: Math.max(1, Math.floor(parsed.currentLevel ?? 1)),
    };
  } catch {
    return { highestLevel: 1, currentLevel: 1 };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    stats,
    achievements,
    recentUnlocks,
    syncTetrobotProgression,
    setLastTetrobotTip,
    recordTetrobotEvent,
    clearLastTetrobotLevelUp,
    acceptActiveTetrobotChallenge,
  } = useAchievements();
  const [chatLine, setChatLine] = useState<DashboardChatLine>({
    bot: "rookie",
    text: "Initialisation du flux Tétrobots...",
  });
  const [relationPopup, setRelationPopup] = useState<DashboardRelationEvent | null>(null);
  const chatTimerRef = useRef<number | null>(null);
  const inactiveRef = useRef(false);
  const levelUpDismissTimerRef = useRef<number | null>(null);
  const relationPopupTimerRef = useRef<number | null>(null);
  const modeCards: ModeCard[] = [
    {
      title: "Mode Tetris",
      desc: "Classique, sprint, roguelike, puzzle et versus.",
      path: "/tetris-hub",
      accent: "from-[#130018] to-[#2b0a45]",
      image: "/Game_Mode/tetris.png",
      variant: "tetris",
    },
    {
      title: "Brickfall Solo",
      desc: "Casse-brique solo a progression.",
      path: "/brickfall-solo",
      accent: "from-[#00121a] to-[#00314a]",
      image: "/Game_Mode/brickfall_solo.png",
      variant: "brickfall",
    },
    {
      title: "Tetro-Verse",
      desc: "Tetromaze, Pixel Protocol et Pixel Invasion dans un hub dedie.",
      path: "/tetro-verse",
      accent: "from-[#0a1028] to-[#21457a]",
      image: "/Game_Mode/tetroverse.png",
      variant: "tetroverse",
    },
  ];

  useEffect(() => {
    const now = Date.now();
    const previous = Number(localStorage.getItem(DASHBOARD_CHAT_LAST_SEEN_KEY) ?? "0");
    inactiveRef.current = previous > 0 && now - previous > 1000 * 60 * 60 * 24 * 4;
    localStorage.setItem(DASHBOARD_CHAT_LAST_SEEN_KEY, String(now));
  }, []);

  useEffect(() => {
    syncTetrobotProgression();
  }, [syncTetrobotProgression, stats.botApexWins, stats.hardDropCount, stats.level10Modes, stats.modesVisited, stats.playerBehaviorByMode, stats.scoredModes, stats.tetromazeEscapesTotal]);

  useEffect(() => {
    const pickMetaLine = (): DashboardChatLine | null => {
      const versusLosses = Math.max(0, stats.versusMatches - stats.versusWins);
      const rvLosses = Math.max(0, stats.roguelikeVersusMatches - stats.roguelikeVersusWins);
      const botLosses = Math.max(0, stats.botMatches - stats.botWins);
      const totalWins =
        stats.versusWins +
        stats.roguelikeVersusWins +
        stats.botWins +
        stats.brickfallWins +
        stats.tetromazeWins;
      const totalLosses = versusLosses + rvLosses + botLosses;

      const metaChance = Math.random();
      if (inactiveRef.current && metaChance < 0.35) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: CHAT_META.inactive[bot] };
      }
      if (totalLosses >= Math.max(5, totalWins * 1.3) && metaChance < 0.35) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: CHAT_META.lowPerformance[bot] };
      }
      if (totalWins >= Math.max(8, totalLosses * 1.4) && metaChance < 0.35) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: CHAT_META.highPerformance[bot] };
      }
      return null;
    };

    const generateLine = (): DashboardChatLine => {
      if (Math.random() < 0.01) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: pickRandom(CHAT_RARE) };
      }

      const meta = pickMetaLine();
      if (meta) return meta;

      if (Math.random() < 0.22) {
        const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
        return { bot, text: pickRandom(CHAT_GLOBAL_FUN) };
      }

      const bot = pickRandom<DashboardBot>(["rookie", "pulse", "apex"]);
      const level = stats.tetrobotProgression[bot]?.level ?? 1;
      return { bot, text: pickRandom(getChatLinesForLevel(bot, level)) };
    };

    const scheduleNext = () => {
      if (chatTimerRef.current) {
        window.clearTimeout(chatTimerRef.current);
      }
      const nextDelay = 20000 + Math.floor(Math.random() * 20001);
      chatTimerRef.current = window.setTimeout(() => {
        setChatLine(generateLine());
        scheduleNext();
      }, nextDelay);
    };

    setChatLine(generateLine());
    scheduleNext();

    return () => {
      if (chatTimerRef.current) {
        window.clearTimeout(chatTimerRef.current);
        chatTimerRef.current = null;
      }
    };
  }, [
    stats.botMatches,
    stats.botWins,
    stats.brickfallWins,
    stats.roguelikeVersusMatches,
    stats.roguelikeVersusWins,
    stats.tetrobotProgression,
    stats.tetromazeWins,
    stats.versusMatches,
    stats.versusWins,
  ]);

  const brickfallProgress = useMemo(() => readLocalBrickfallProgress(), []);
  const tetromazeProgress = useMemo(() => readLocalTetromazeProgress(), []);
  const pixelProtocolProgress = useMemo(() => readLocalPixelProtocolProgress(), []);
  const visibleAchievements = useMemo(
    () => achievements,
    [achievements]
  );
  const unlockedCount = visibleAchievements.filter((achievement) => achievement.unlocked).length;
  const visitedModes = Object.values(stats.modesVisited).filter(Boolean).length;
  const curiousUnlocked = achievements.some(
    (achievement) => achievement.id === "global-curious" && achievement.unlocked
  );
  const displayedVisitedModes = curiousUnlocked ? TOTAL_GAME_MODES : visitedModes;
  const playerContext = useMemo<PlayerContext>(() => {
    const behaviorModes = Object.entries(stats.playerBehaviorByMode);
    const playedModes = behaviorModes.filter(([, value]) => value.sessions > 0);
    const totalSessions = playedModes.reduce((sum, [, value]) => sum + value.sessions, 0);
    const totalWins = playedModes.reduce((sum, [, value]) => sum + value.wins, 0);
    const totalDurationMs = playedModes.reduce((sum, [, value]) => sum + value.totalDurationMs, 0);
    const averageSessionMinutes =
      totalSessions > 0 ? Math.round(totalDurationMs / totalSessions / 60000) : undefined;
    const recentMistakes = stats.lastPlayedMode
      ? Object.entries(stats.playerMistakesByMode[stats.lastPlayedMode] ?? {})
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([key]) => key)
      : [];
    const stagnation =
      totalSessions >= 6 &&
      totalWins / Math.max(1, totalSessions) < 0.5 &&
      recentUnlocks.length === 0 &&
      unlockedCount < visibleAchievements.length;

    return {
      favoriteMode: stats.mostPlayedMode ? MODE_LABELS[stats.mostPlayedMode] : undefined,
      weakestMode: stats.lowestWinrateMode ? MODE_LABELS[stats.lowestWinrateMode] : undefined,
      lastPlayedMode: stats.lastPlayedMode ? MODE_LABELS[stats.lastPlayedMode] : undefined,
      winRate: safeWinRate(totalWins, totalSessions) ?? undefined,
      avgSpeed:
        stats.runsPlayed > 0
          ? Math.round(stats.hardDropCount / Math.max(1, stats.runsPlayed))
          : undefined,
      mistakes: recentMistakes,
      sessionDuration: averageSessionMinutes,
      stagnation,
    };
  }, [
    recentUnlocks.length,
    stats.hardDropCount,
    stats.lastPlayedMode,
    stats.lowestWinrateMode,
    stats.mostPlayedMode,
    stats.playerBehaviorByMode,
    stats.playerMistakesByMode,
    stats.runsPlayed,
    unlockedCount,
    visibleAchievements.length,
  ]);

  const quickResume = useMemo(() => {
    if (pixelProtocolProgress.currentLevel > 1) {
      return {
        title: "Pixel Protocol",
        detail: `Checkpoint campagne: niveau ${pixelProtocolProgress.currentLevel}`,
        action: () => navigate(`/pixel-protocol/play?level=${pixelProtocolProgress.currentLevel}`),
        secondary: () => navigate("/pixel-protocol"),
        primaryLabel: "Reprendre",
        secondaryLabel: "Voir le hub",
      };
    }
    if (tetromazeProgress.currentLevel > 1) {
      return {
        title: "Tetromaze",
        detail: `Checkpoint campagne: niveau ${tetromazeProgress.currentLevel}`,
        action: () => navigate(`/tetromaze/play?level=${tetromazeProgress.currentLevel}`),
        secondary: () => navigate("/tetromaze"),
        primaryLabel: "Reprendre",
        secondaryLabel: "Voir le hub",
      };
    }
    if (brickfallProgress > 1) {
      return {
        title: "Brickfall Solo",
        detail: `Checkpoint campagne: niveau ${brickfallProgress}`,
        action: () => navigate(`/brickfall-solo/play?level=${brickfallProgress}`),
        secondary: () => navigate("/brickfall-solo"),
        primaryLabel: "Reprendre",
        secondaryLabel: "Voir le hub",
      };
    }
    return {
      title: "Mode Tetris",
      detail: "Aucune progression recente detectee, repars sur le hub central.",
      action: () => navigate("/tetris-hub"),
      secondary: () => navigate("/tetris-hub"),
      primaryLabel: "Ouvrir le hub",
      secondaryLabel: "Explorer les modes",
    };
  }, [
    brickfallProgress,
    navigate,
    pixelProtocolProgress.currentLevel,
    tetromazeProgress.currentLevel,
  ]);

  const achievementFocus = useMemo(() => {
    const items = [
      {
        label: "Modes visites",
        value: `${displayedVisitedModes}/${TOTAL_GAME_MODES}`,
        hint: curiousUnlocked
          ? "Tous les modes ont deja ete visites."
          : "Continue d'explorer les hubs.",
      },
      {
        label: "Succes debloques",
        value: `${unlockedCount}/${visibleAchievements.length}`,
        hint: unlockedCount >= Math.ceil(visibleAchievements.length / 2)
          ? "Tu approches du 100%."
          : "Encore de quoi debloquer pas mal de succes.",
      },
      {
        label: "Tetromaze",
        value: `${stats.tetromazeWins} victoire${stats.tetromazeWins > 1 ? "s" : ""}`,
        hint: stats.tetromazeWins >= 1 ? "Continue a augmenter tes escapes." : "Une premiere victoire debloquera du contenu de progression.",
      },
    ];
    return items;
  }, [
    curiousUnlocked,
    displayedVisitedModes,
    stats.tetromazeWins,
    unlockedCount,
    visibleAchievements.length,
  ]);

  const recentActivity = useMemo(() => {
    const items = [
      recentUnlocks[0]
        ? `Succes recent: ${recentUnlocks[0].name}`
        : `Succes debloques: ${unlockedCount}`,
      `Brickfall Solo: monde ${Math.max(1, stats.brickfallSoloBestWorld)} atteint`,
      `Tetromaze: ${stats.tetromazeEscapesTotal} esquive${stats.tetromazeEscapesTotal > 1 ? "s" : ""} reussie${stats.tetromazeEscapesTotal > 1 ? "s" : ""}`,
      `Pixel Protocol: checkpoint niveau ${pixelProtocolProgress.currentLevel}`,
    ];
    return items;
  }, [
    pixelProtocolProgress.currentLevel,
    recentUnlocks,
    stats.brickfallSoloBestWorld,
    stats.tetromazeEscapesTotal,
    unlockedCount,
  ]);

  const [tetrobotTip, setTetrobotTip] = useState(() =>
    getBotTip("rookie", 1, "neutral", {
      favoriteMode: "ton mode prefere",
      lastPlayedMode: "mode classique",
    })
  );
  const apexTrustState = getApexTrustState(
    stats.playerLongTermMemory,
    stats.tetrobotProgression.apex?.affinity ?? 0
  );

  useEffect(() => {
    const level = stats.tetrobotProgression[chatLine.bot]?.level ?? 1;
    const mood = stats.tetrobotProgression[chatLine.bot]?.mood ?? "neutral";
    const nextTip =
      chatLine.bot === "apex" && apexTrustState === "refusing"
        ? "Non. Tu veux des conseils, mais tu refuses encore d'affronter ce qu'il faut travailler."
        : getBotTip(chatLine.bot, level, mood, playerContext);
    setLastTetrobotTip(chatLine.bot, nextTip);
    setTetrobotTip(nextTip);
  }, [apexTrustState, chatLine.bot, playerContext, setLastTetrobotTip, stats.tetrobotProgression]);

  useEffect(() => {
    if (!stats.lastTetrobotLevelUp) return;
    if (levelUpDismissTimerRef.current) {
      window.clearTimeout(levelUpDismissTimerRef.current);
    }
    levelUpDismissTimerRef.current = window.setTimeout(() => {
      clearLastTetrobotLevelUp();
      levelUpDismissTimerRef.current = null;
    }, 10000);
    return () => {
      if (levelUpDismissTimerRef.current) {
        window.clearTimeout(levelUpDismissTimerRef.current);
        levelUpDismissTimerRef.current = null;
      }
    };
  }, [clearLastTetrobotLevelUp, stats.lastTetrobotLevelUp]);

  useEffect(() => {
    return () => {
      if (relationPopupTimerRef.current) {
        window.clearTimeout(relationPopupTimerRef.current);
        relationPopupTimerRef.current = null;
      }
    };
  }, []);

  const editorShortcuts: ShortcutButton[] = [
    {
      label: "Editeur Brickfall Solo",
      tooltip: "Ouvrir l'editeur de niveaux Brickfall Solo.",
      icon: "editor",
      action: () => navigate("/brickfall-editor"),
    },
    {
      label: "Editeur Tetromaze",
      tooltip: "Ouvrir l'editeur de niveaux Tetromaze.",
      icon: "editor",
      action: () => navigate("/tetromaze/editor"),
    },
    {
      label: "Editeur Pixel Protocol",
      tooltip: "Ouvrir l'editeur de niveaux Pixel Protocol.",
      icon: "editor",
      action: () => navigate("/pixel-protocol/editor"),
    },
  ];

  const communityShortcuts: ShortcutButton[] = [
    {
      label: "Galerie Brickfall Solo",
      tooltip: "Explorer les niveaux publies par la communaute Brickfall Solo.",
      icon: "gallery",
      action: () => navigate("/brickfall-solo/community"),
    },
    {
      label: "Galerie Tetromaze",
      tooltip: "Explorer les niveaux publies par la communaute Tetromaze.",
      icon: "gallery",
      action: () => navigate("/tetromaze/community"),
    },
    {
      label: "Galerie Pixel Protocol",
      tooltip: "Explorer les niveaux publies par la communaute Pixel Protocol.",
      icon: "gallery",
      action: () => navigate("/pixel-protocol/community"),
    },
  ];

  const activeBotState = stats.tetrobotProgression[chatLine.bot];
  const botAccentColor = CHATBOT_LEVEL_COLORS[chatLine.bot][activeBotState?.level ?? 1];
  const levelUpNotice = stats.lastTetrobotLevelUp;
  const botMood = activeBotState?.mood ?? "neutral";
  const botAffinity = activeBotState?.affinity ?? 0;
  const botAvatar = CHATBOT_AVATARS[chatLine.bot][botMood] ?? CHATBOT_AVATAR_FALLBACKS[chatLine.bot];
  const activeBotMemories = stats.tetrobotMemories[chatLine.bot] ?? [];
  const relationSummary = getDashboardRelationSummary(
    chatLine.bot,
    botMood,
    botAffinity,
    apexTrustState
  );
  const relationEvent = getDashboardRelationEvent(chatLine.bot, activeBotMemories, levelUpNotice);
  const relationScene = relationPopup ? getDashboardRelationScene(relationPopup) : [];
  const relationChoices = relationPopup
    ? getDashboardRelationChoices(
        relationPopup,
        stats.lowestWinrateMode ?? undefined,
        stats.activeTetrobotChallenge
      )
    : [];
  const latestRelationEvent = useMemo(() => {
    return (["rookie", "pulse", "apex"] as const)
      .map((bot) =>
        getDashboardRelationEvent(
          bot,
          stats.tetrobotMemories[bot] ?? [],
          stats.lastTetrobotLevelUp?.bot === bot ? stats.lastTetrobotLevelUp : null
        )
      )
      .filter((event): event is DashboardRelationEvent => Boolean(event))
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  }, [stats.lastTetrobotLevelUp, stats.tetrobotMemories]);

  const closeRelationPopup = () => {
    setRelationPopup(null);
    if (relationPopupTimerRef.current) {
      window.clearTimeout(relationPopupTimerRef.current);
      relationPopupTimerRef.current = null;
    }
  };

  const openRelationPopup = (event: DashboardRelationEvent) => {
    setRelationPopup(event);
    if (relationPopupTimerRef.current) {
      window.clearTimeout(relationPopupTimerRef.current);
    }
    relationPopupTimerRef.current = window.setTimeout(() => {
      setRelationPopup(null);
      relationPopupTimerRef.current = null;
    }, 6500);
  };

  const handleRelationChoice = (choice: DashboardRelationChoice) => {
    if (!relationPopup) return;

    if (choice.action === "dismiss") {
      closeRelationPopup();
      return;
    }

    if (choice.action === "open_relation") {
      closeRelationPopup();
      navigate(`/tetrobots/relations?bot=${relationPopup.bot}`);
      return;
    }

    if (choice.action === "open_tetris_hub") {
      closeRelationPopup();
      navigate("/tetris-hub");
      return;
    }

    if (choice.action === "accept_challenge") {
      acceptActiveTetrobotChallenge();
      const weakestRoute = stats.lowestWinrateMode
        ? MODE_ROUTE_MAP[stats.lowestWinrateMode]
        : undefined;
      closeRelationPopup();
      navigate(weakestRoute ?? "/tetris-hub");
      return;
    }

    const weakestRoute = stats.lowestWinrateMode
      ? MODE_ROUTE_MAP[stats.lowestWinrateMode]
      : undefined;
    closeRelationPopup();
    navigate(weakestRoute ?? "/tetris-hub");
  };

  useEffect(() => {
    const latestEvent = latestRelationEvent;
    if (!latestEvent) return;
    if (Date.now() - latestEvent.createdAt > 1000 * 60 * 60 * 24) return;

    try {
      const seenId = localStorage.getItem(DASHBOARD_RELATION_POPUP_SEEN_KEY);
      if (seenId === latestEvent.id) return;
      localStorage.setItem(DASHBOARD_RELATION_POPUP_SEEN_KEY, latestEvent.id);
    } catch {
      // no-op
    }

    openRelationPopup(latestEvent);
  }, [latestRelationEvent]);

  return (
    <div className="min-h-screen flex flex-col text-pink-300 font-['Press_Start_2P'] py-4 px-2 md:px-3 overflow-x-hidden">
      {relationPopup ? (
        <aside
          className={`dashboard-relation-popup dashboard-relation-popup--${relationPopup.tone} dashboard-relation-popup--${relationPopup.bot}`}
          aria-live="polite"
        >
          <div className="dashboard-relation-popup__head">
            <p className="dashboard-relation-popup__eyebrow">
              {CHATBOT_NAMES[relationPopup.bot]} · {relationPopup.label}
            </p>
            <button
              type="button"
              className="dashboard-relation-popup__close"
              onClick={closeRelationPopup}
              aria-label="Fermer l'evenement relationnel"
            >
              ×
            </button>
          </div>
          <div className="dashboard-relation-popup__scene">
            {relationScene.map((line, index) => (
              <div
                key={`${relationPopup.id}-${index}`}
                className={`dashboard-relation-popup__line dashboard-relation-popup__line--${line.speaker}`}
              >
                <span className="dashboard-relation-popup__speaker">
                  {line.speaker === "system" ? "SYSTEME" : CHATBOT_NAMES[line.speaker]}
                </span>
                <p>{line.text}</p>
              </div>
            ))}
          </div>
          <div className="dashboard-relation-popup__actions">
            {relationChoices.map((choice) => (
              <button
                key={`${relationPopup.id}-${choice.label}`}
                type="button"
                className={`dashboard-relation-popup__action${
                  choice.action === "open_relation" ? " dashboard-relation-popup__action--primary" : ""
                }`}
                onClick={() => handleRelationChoice(choice)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </aside>
      ) : null}
      <div className="dashboard-top-row">
        <section
          className={`dashboard-chatbot dashboard-chatbot--${chatLine.bot} dashboard-chatbot--level-${activeBotState?.level ?? 1} dashboard-chatbot--mood-${botMood}`}
          aria-live="polite"
        >
          <div
            className={`dashboard-chatbot__avatar-shell dashboard-chatbot__avatar-shell--${chatLine.bot} dashboard-chatbot__avatar-shell--${botMood}`}
          >
            <img
              src={botAvatar}
              alt={CHATBOT_NAMES[chatLine.bot]}
              className="dashboard-chatbot__avatar"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = CHATBOT_AVATAR_FALLBACKS[chatLine.bot];
              }}
              loading="lazy"
            />
          </div>
          <div className="dashboard-chatbot__body">
            {user ? (
              <p className="dashboard-chatbot__welcome">
                Bienvenue <span>{user.pseudo}</span> !
              </p>
            ) : (
              <p className="dashboard-chatbot__welcome">Bienvenue pilote !</p>
            )}
            <p
              className="dashboard-chatbot__name"
              style={{ color: botAccentColor }}
            >
              {CHATBOT_NAMES[chatLine.bot]} LVL {activeBotState?.level ?? 1}
            </p>
            <p className="dashboard-chatbot__text">{chatLine.text}</p>
            <div className="dashboard-chatbot__meta">
              <span>XP {activeBotState?.xp ?? 0}</span>
              <span>Affinite {botAffinity}</span>
              <span>{getRelationLabel(botMood)}</span>
              <span>{activeBotState?.unlockedTraits.length ?? 0} traits</span>
            </div>
            <p className="dashboard-chatbot__relation-summary">{relationSummary}</p>
            {relationEvent ? (
              <div
                className={`dashboard-chatbot__event dashboard-chatbot__event--${relationEvent.tone}`}
              >
                <span className="dashboard-chatbot__event-label">{relationEvent.label}</span>
                <p>{relationEvent.text}</p>
              </div>
            ) : null}
            <div className="dashboard-chatbot__actions">
                <button
                  type="button"
                  className="dashboard-shortcut dashboard-chatbot__icon-action dashboard-chatbot__icon-action--relation"
                  onClick={() => {
                    recordTetrobotEvent({ type: "tip_read", bot: chatLine.bot });
                    navigate(`/tetrobots/relations?bot=${chatLine.bot}`);
                  }}
                  data-tooltip="Voir la relation complete de ce Tetrobot."
                  aria-label="Voir la relation complete"
                >
                <DashboardActionIcon name="relation" />
              </button>
              {latestRelationEvent &&
              Date.now() - latestRelationEvent.createdAt <= 1000 * 60 * 60 * 24 ? (
                <button
                  type="button"
                  className="dashboard-shortcut dashboard-chatbot__icon-action dashboard-chatbot__icon-action--message"
                  onClick={() => openRelationPopup(latestRelationEvent)}
                  data-tooltip="Rouvrir la derniere scene relationnelle recente."
                  aria-label="Rouvrir le dernier message"
                >
                  <DashboardActionIcon name="message" />
                </button>
              ) : null}
              <button
                type="button"
                className="dashboard-shortcut dashboard-chatbot__icon-action dashboard-chatbot__icon-action--help"
                onClick={() => {
                  recordTetrobotEvent({ type: "tip_read", bot: chatLine.bot });
                  navigate("/tetrobots/help");
                }}
                data-tooltip="Comprendre l'XP, l'affinite, l'humeur et les defis des Tetrobots."
                aria-label="Comprendre les Tetrobots"
              >
                <DashboardActionIcon name="help" />
              </button>
            </div>
          </div>
        </section>

        <section className={`dashboard-panel dashboard-panel--tip dashboard-panel--tip-${chatLine.bot} dashboard-panel--tip-level-${activeBotState?.level ?? 1} dashboard-panel--tip-mood-${botMood}`}>
          <p className="dashboard-panel__eyebrow">Conseil Tetrobots</p>
          <h2>Analyse du jour</h2>
          <p className="dashboard-tip__bot" style={{ color: botAccentColor }}>
            {CHATBOT_NAMES[chatLine.bot]} · niveau {activeBotState?.level ?? 1}
          </p>
          <p className="dashboard-tip__mood">
            Humeur: {getRelationLabel(botMood)} · affinite {botAffinity}
          </p>
          <p className="dashboard-tip">{tetrobotTip}</p>
          <div className="dashboard-tip__traits">
            {(activeBotState?.unlockedTraits.length
              ? activeBotState.unlockedTraits
              : ["bootSequence"]
            ).map((trait) => (
              <span key={trait} className="dashboard-tip__trait">
                {formatTraitLabel(trait)}
              </span>
            ))}
          </div>
          {levelUpNotice && (
            <div className="dashboard-tip__levelup">
              {levelUpNotice.message}
            </div>
          )}
        </section>

        <section className="dashboard-resume">
          <div className="dashboard-resume__copy">
            <p className="dashboard-panel__eyebrow">Action rapide</p>
            <h2>Reprendre la ou tu t'es arrete</h2>
            <p className="dashboard-resume__title">{quickResume.title}</p>
            <p className="dashboard-resume__text">{quickResume.detail}</p>
          </div>
          <div className="dashboard-resume__actions">
            <button
              className="dashboard-cta dashboard-cta--primary"
              onClick={quickResume.action}
              data-tooltip="Relancer directement ton dernier point de reprise."
              aria-label="Reprendre la progression"
            >
              <DashboardActionIcon name="resume" />
            </button>
            <button
              className="dashboard-cta"
              onClick={quickResume.secondary}
              data-tooltip="Ouvrir le hub correspondant pour choisir une autre entree."
              aria-label="Voir le hub"
            >
              <DashboardActionIcon name="hub" />
            </button>
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col">
          <section className="dashboard-panel dashboard-panel--modes">
            <p className="dashboard-panel__eyebrow">Modes</p>
            <h2>Choisir une destination</h2>
            <div className="mode-card-grid mode-card-grid--dashboard">
              {modeCards.map((modeCard) => (
                <button
                  key={modeCard.title}
                  onClick={() => navigate(modeCard.path)}
                  className={`mode-card mode-card--dashboard mode-card--dashboard-${modeCard.variant} bg-gradient-to-b ${modeCard.accent}`}
                >
                  <div className="mode-card__icon">
                    <img
                      src={modeCard.image}
                      alt={modeCard.title}
                      className="mode-card__image"
                      loading="lazy"
                    />
                  </div>
                  <div className="mode-card__content">
                    <h3>{modeCard.title}</h3>
                    <p>{modeCard.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="dashboard-panel dashboard-panel--focus">
            <p className="dashboard-panel__eyebrow">Succes en progression</p>
            <h2>Ce que tu peux viser maintenant</h2>
            <div className="dashboard-focus-list">
              {achievementFocus.map((item) => (
                <div key={item.label} className="dashboard-focus-card">
                  <div className="dashboard-focus-card__top">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <p>{item.hint}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="dashboard-panel dashboard-panel--progress">
            <p className="dashboard-panel__eyebrow">Progression</p>
            <h2>Etat des campagnes</h2>
            <div className="dashboard-progress-list">
              <div className="dashboard-progress-item">
                <span>Mode Tetris</span>
                <strong>Hub central disponible</strong>
              </div>
              <div className="dashboard-progress-item">
                <span>Brickfall Solo</span>
                <strong>Niveau {brickfallProgress}</strong>
              </div>
              <div className="dashboard-progress-item">
                <span>Tetromaze</span>
                <strong>Niveau {tetromazeProgress.currentLevel} / max {tetromazeProgress.highestLevel}</strong>
              </div>
              <div className="dashboard-progress-item">
                <span>Pixel Protocol</span>
                <strong>Niveau {pixelProtocolProgress.currentLevel} / max {pixelProtocolProgress.highestLevel}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="dashboard-panel dashboard-panel--activity">
          <p className="dashboard-panel__eyebrow">Activite recente</p>
          <h2>Derniers signaux</h2>
          <div className="dashboard-activity-list">
            {recentActivity.map((item) => (
              <div key={item} className="dashboard-activity-item">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel dashboard-panel--create">
          <p className="dashboard-panel__eyebrow">Creer</p>
          <h2>Raccourcis editeurs</h2>
          <div className="dashboard-shortcuts">
            {editorShortcuts.map((shortcut) => (
              <button
                key={shortcut.label}
                className="dashboard-shortcut dashboard-shortcut--wide"
                onClick={shortcut.action}
                data-tooltip={shortcut.tooltip}
                aria-label={shortcut.label}
              >
                <DashboardActionIcon name={shortcut.icon} />
                <span>{shortcut.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-panel dashboard-panel--community">
          <p className="dashboard-panel__eyebrow">Communaute</p>
          <h2>Explorer les niveaux joueurs</h2>
          <div className="dashboard-shortcuts">
            {communityShortcuts.map((shortcut) => (
              <button
                key={shortcut.label}
                className="dashboard-shortcut dashboard-shortcut--wide"
                onClick={shortcut.action}
                data-tooltip={shortcut.tooltip}
                aria-label={shortcut.label}
              >
                <DashboardActionIcon name={shortcut.icon} />
                <span>{shortcut.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
