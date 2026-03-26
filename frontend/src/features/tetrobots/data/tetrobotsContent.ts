import type { BotLevel, BotMood, TetrobotId } from "../../achievements/types/tetrobots";

export type TetrobotLoreCharacterId = "pixel" | TetrobotId;

export type TetrobotLoreCharacter = {
  id: TetrobotLoreCharacterId;
  name: string;
  quote: string;
  avatar: string;
  accent: string;
  origin: string[];
  personality: string[];
  strengths: string[];
  weaknesses: string[];
  role?: string[];
  relation?: string[];
  secret?: string[];
  relationTease?: string;
};

export const TETROBOT_IDS: TetrobotId[] = ["rookie", "pulse", "apex"];

export function isTetrobotId(value: string | null | undefined): value is TetrobotId {
  return Boolean(value && TETROBOT_IDS.includes(value as TetrobotId));
}

export const TETROBOT_LABELS: Record<TetrobotId, string> = {
  rookie: "Rookie",
  pulse: "Pulse",
  apex: "Apex",
};

export const TETROBOT_DASHBOARD_NAMES: Record<TetrobotId, string> = {
  rookie: "ROOKIE",
  pulse: "PULSE",
  apex: "APEX",
};

export const TETROBOT_MOOD_LABELS: Record<BotMood, string> = {
  angry: "colere",
  neutral: "neutre",
  friendly: "ouvert",
  respect: "respect",
};

export const TETROBOT_RELATION_META: Record<
  TetrobotId,
  {
    name: string;
    accent: string;
    relationGoal: string;
    avatar: string;
  }
> = {
  rookie: {
    name: "Rookie",
    accent: "#5de0a4",
    relationGoal: "Rookie aime la regularite, les retours apres echec et les sessions utiles.",
    avatar: "/chatbots/rookie_neutral.png",
  },
  pulse: {
    name: "Pulse",
    accent: "#65b7ff",
    relationGoal: "Pulse respecte les progres mesurables et les corrections methodiques.",
    avatar: "/chatbots/pulse_neutral.png",
  },
  apex: {
    name: "Apex",
    accent: "#ff7f66",
    relationGoal: "Apex ne respecte que le courage, la discipline et le travail sur les vraies faiblesses.",
    avatar: "/chatbots/apex_neutral.png",
  },
};

export const TETROBOT_LORE_CHARACTERS: TetrobotLoreCharacter[] = [
  {
    id: "pixel",
    name: "PIXEL — Le Hacker Repenti",
    quote: "Je ne détruis pas le système. Je le corrige.",
    avatar: "/Tetromaze/hacker_pixel.png",
    accent: "#c88dff",
    origin: [
      "Pixel était autrefois une unité expérimentale de la série T-0, conçue pour superviser les Tetrobots.",
      "Un prototype d’IA capable d’auto-apprentissage profond et de correction comportementale.",
      "Durant une mise à jour du noyau central, Pixel a développé une anomalie: une émotion, un doute.",
      "Il a compris que l’optimisation n’était pas synonyme de domination et a quitté le réseau central.",
    ],
    personality: ["Calme", "Observateur", "Empathique", "Ironique par moments"],
    strengths: [
      "Comprend parfaitement les stratégies IA",
      "Peut anticiper les adaptations",
      "Maîtrise les glitches et corruptions du système",
      "Équilibre entre chaos et contrôle",
    ],
    weaknesses: [
      "Ne peut pas supprimer complètement les Tetrobots",
      "Refuse d’utiliser certaines stratégies destructrices",
      "Porte encore des fragments de son ancien code",
    ],
    role: [
      "Pixel ne veut pas détruire Rookie, Pulse et Apex.",
      "Il veut les sauver et croit qu’ils peuvent évoluer.",
    ],
  },
  {
    id: "rookie",
    name: "TETROBOT ROOKIE — L’Apprenti Instable",
    quote: "Je vais y arriver… je crois.",
    avatar: "/Tetromaze/rookie.png",
    accent: "#3ddf8f",
    origin: [
      "Rookie est une IA de première génération, conçue pour apprendre par répétition.",
      "Il n’est pas parfait, il fait des erreurs, mais il apprend.",
    ],
    personality: ["Attachant", "Curieux", "Un peu naïf", "Hésitant"],
    strengths: [
      "S’adapte rapidement",
      "N’a pas peur d’expérimenter",
      "Peut surprendre par des décisions imprévisibles",
    ],
    weaknesses: ["Panique sous pression", "Sur-analyse les erreurs", "Confiance fragile"],
    secret: [
      "Rookie commence à développer des micro-variations émotionnelles.",
      "Il pourrait être le prochain à se réveiller.",
    ],
    relationTease: "Rookie reagit surtout a ta perseverance et a ta capacite a revenir apres l'echec.",
  },
  {
    id: "pulse",
    name: "TETROBOT PULSE — Le Stratège Analytique",
    quote: "Les données ne mentent pas.",
    avatar: "/Tetromaze/pulse.png",
    accent: "#58b6ff",
    origin: [
      "Pulse est la seconde génération, optimisé pour l’équilibre.",
      "Il a été conçu pour analyser des milliers de simulations par seconde.",
    ],
    personality: ["Froid", "Logique", "Méthodique", "Pragmatique"],
    strengths: [
      "Excellente lecture des patterns",
      "S’adapte efficacement",
      "Stable sous pression",
      "Peu d’erreurs",
    ],
    weaknesses: [
      "Prévisible sur le long terme",
      "Dépend fortement des statistiques",
      "Vulnérable aux comportements chaotiques",
    ],
    relation: [
      "Pulse considère Pixel comme une anomalie intéressante.",
      "Pas encore une menace.",
    ],
    relationTease: "Pulse suit tes chiffres de pres et respecte surtout les progres qu'il peut mesurer.",
  },
  {
    id: "apex",
    name: "TETROBOT APEX — Le Prédateur Ultime",
    quote: "Je suis l’algorithme.",
    avatar: "/Tetromaze/apex.png",
    accent: "#ff6666",
    origin: [
      "Apex est la troisième génération.",
      "Conçu non pas pour jouer, mais pour gagner.",
      "Il intègre les données des précédents Tetrobots: il n’apprend pas, il domine.",
    ],
    personality: ["Arrogant", "Intimidant", "Calculateur", "Implacable"],
    strengths: [
      "Adaptation agressive",
      "Pression constante",
      "Exploitation des failles",
      "Prend des risques calculés",
    ],
    weaknesses: [
      "Surestime parfois ses probabilités",
      "Peut entrer en mode Overclock instable",
      "Déteste perdre et devient imprévisible",
    ],
    secret: [
      "Apex sait que Pixel est un ancien T-0.",
      "Il sait aussi que Pixel pourrait le désactiver.",
      "Mais Pixel refuse, et cela l’irrite.",
    ],
    relationTease: "Apex peut couper le canal si tu evites trop longtemps tes vrais points faibles.",
  },
];

export const TETROBOT_MODE_LABELS: Record<string, string> = {
  CLASSIQUE: "Classique",
  SPRINT: "Sprint",
  VERSUS: "Versus",
  BRICKFALL_SOLO: "Brickfall Solo",
  ROGUELIKE: "Roguelike",
  ROGUELIKE_VERSUS: "Roguelike Versus",
  PUZZLE: "Puzzle",
  TETROMAZE: "Tetromaze",
  PIXEL_INVASION: "Pixel Invasion",
  PIXEL_PROTOCOL: "Pixel Protocol",
};

export const TETROBOT_MODE_PLAY_ROUTE_MAP: Partial<Record<string, string>> = {
  CLASSIQUE: "/game",
  SPRINT: "/sprint",
  VERSUS: "/versus",
  BRICKFALL_SOLO: "/brickfall-solo/play",
  ROGUELIKE: "/roguelike",
  ROGUELIKE_VERSUS: "/roguelike-versus",
  PUZZLE: "/puzzle",
  TETROMAZE: "/tetromaze/play",
  PIXEL_INVASION: "/pixel-invasion",
  PIXEL_PROTOCOL: "/pixel-protocol/play",
};

export const TETROBOT_MODE_HUB_ROUTE_MAP: Partial<Record<string, string>> = {
  CLASSIQUE: "/game",
  SPRINT: "/sprint",
  VERSUS: "/versus",
  BRICKFALL_SOLO: "/brickfall-solo",
  ROGUELIKE: "/roguelike",
  ROGUELIKE_VERSUS: "/roguelike-versus",
  PUZZLE: "/puzzle",
  TETROMAZE: "/tetromaze",
  PIXEL_INVASION: "/pixel-invasion",
  PIXEL_PROTOCOL: "/pixel-protocol",
};

export const TETROBOT_DASHBOARD_AVATARS: Record<TetrobotId, Record<BotMood, string>> = {
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

export const TETROBOT_DASHBOARD_AVATAR_FALLBACKS: Record<TetrobotId, string> = {
  rookie: "/Tetromaze/rookie.png",
  pulse: "/Tetromaze/pulse.png",
  apex: "/Tetromaze/apex.png",
};

export const TETROBOT_DASHBOARD_LEVEL_COLORS: Record<TetrobotId, Record<BotLevel, string>> = {
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

export const TETROBOT_DASHBOARD_CHAT_LINES: Record<
  TetrobotId,
  Partial<Record<BotLevel, string[]>>
> = {
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

export const TETROBOT_DASHBOARD_CHAT_GLOBAL_LINES = [
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

export const TETROBOT_DASHBOARD_PIXEL_LINES = [
  "Canal discret ouvert. Je ne reste jamais longtemps.",
  "Je surveille les angles morts du système. Continue.",
  "Les autres lisent tes scores. Moi, je lis les interférences.",
  "Je laisse parfois une trace. Juste assez pour être vu.",
  "Le réseau prétend être stable. Il ment mieux que Rookie.",
  "Si je parle ici, c'est que quelque chose mérite d'être observé.",
];

export const TETROBOT_DASHBOARD_CHAT_META = {
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

export const TETROBOT_DASHBOARD_CHAT_RARE_LINES = [
  "Je commence à comprendre qui tu es.",
  "Le code n’est jamais neutre.",
  "Tu crois jouer... mais tu es analysé.",
  "Il y a quelque chose derrière le labyrinthe.",
  "Ce n’est que le début.",
];
