import type { TetrobotsPersonality } from "./tetrobots";

export type BotEvent =
  | { type: "match_start" }
  | { type: "player_tetris" }
  | { type: "player_combo"; value: number }
  | { type: "bot_tetris" }
  | { type: "bot_blunder" }
  | { type: "player_high_stack" }
  | { type: "bot_win" }
  | { type: "bot_lose" }
  | { type: "close_call" }
  | { type: "long_match" }
  | { type: "player_back_to_back" }
  // 🔥 Roguelike Versus
  | { type: "player_perk_pick"; perk: string }
  | { type: "player_synergy"; id: string }
  | { type: "player_mutation"; id: string }
  | { type: "bot_perk_pick"; perk: string }
  | { type: "bot_synergy"; id: string }
  | { type: "chaos_triggered" }
  | { type: "bomb_sent" }
  | { type: "huge_attack" }
  | { type: "comeback" };

export type BotMood =
  | "idle"
  | "thinking"
  | "happy"
  | "angry"
  | "surprised"
  | "sad"
  | "evil"
  | "glitch"
  | "overclock"
  | "chaos";

const BOT_DIALOGUES: Record<
  TetrobotsPersonality["id"],
  Partial<Record<BotEvent["type"], string[]>>
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
  },
};

const LAST_PICK_BY_EVENT: Partial<
  Record<TetrobotsPersonality["id"], Partial<Record<BotEvent["type"], number>>>
> = {};

const applyTemplate = (message: string, event: BotEvent): string => {
  if (event.type === "player_combo") {
    return message.replace("{combo}", String(event.value));
  }
  return message;
};

export function getBotMessage(
  personality: TetrobotsPersonality,
  event: BotEvent,
  rng: () => number = Math.random
): string | null {
  const pool = BOT_DIALOGUES[personality.id]?.[event.type];
  if (!pool || pool.length === 0) return null;
  const previousIndex = LAST_PICK_BY_EVENT[personality.id]?.[event.type];
  let index = Math.floor(rng() * pool.length);
  if (pool.length > 1 && previousIndex !== undefined && index === previousIndex) {
    index = (index + 1 + Math.floor(rng() * (pool.length - 1))) % pool.length;
  }
  if (!LAST_PICK_BY_EVENT[personality.id]) {
    LAST_PICK_BY_EVENT[personality.id] = {};
  }
  LAST_PICK_BY_EVENT[personality.id]![event.type] = index;
  return applyTemplate(pool[index], event);
}

export function getBotBubbleAccent(personality: TetrobotsPersonality): string {
  if (personality.id === "rookie") return "#22c55e";
  if (personality.id === "balanced") return "#38bdf8";
  return "#ef4444";
}

export function getMoodFromEvent(
  personality: TetrobotsPersonality,
  event: BotEvent["type"]
): BotMood {
  switch (event) {
    case "match_start":
      return "thinking";
    case "player_tetris":
      return personality.id === "apex" ? "angry" : "surprised";
    case "player_combo":
      return personality.id === "rookie" ? "surprised" : "angry";
    case "player_back_to_back":
      return personality.id === "apex" ? "angry" : "surprised";
    case "bot_tetris":
      return "happy";
    case "bot_blunder":
      return "glitch";
    case "player_high_stack":
      return personality.id === "apex" ? "evil" : "thinking";
    case "bot_win":
      return personality.id === "apex" ? "evil" : "happy";
    case "bot_lose":
      return personality.id === "rookie" ? "sad" : "angry";
    case "close_call":
      return "surprised";
    case "long_match":
      return "thinking";
    case "player_perk_pick":
      return personality.id === "rookie" ? "surprised" : "thinking";
    case "player_synergy":
      return personality.id === "apex" ? "angry" : "surprised";
    case "player_mutation":
      return "thinking";
    case "bot_perk_pick":
      return "overclock";
    case "bot_synergy":
      return "overclock";
    case "chaos_triggered":
      return "chaos";
    case "bomb_sent":
      return personality.id === "apex" ? "angry" : "surprised";
    case "huge_attack":
      return personality.id === "apex" ? "evil" : "happy";
    case "comeback":
      return "surprised";
    default:
      return "idle";
  }
}
