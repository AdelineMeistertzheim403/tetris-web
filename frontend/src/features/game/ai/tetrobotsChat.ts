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
  | { type: "player_back_to_back" };

export type BotMood =
  | "idle"
  | "thinking"
  | "happy"
  | "angry"
  | "surprised"
  | "sad"
  | "evil"
  | "glitch";

const BOT_DIALOGUES: Record<
  TetrobotsPersonality["id"],
  Partial<Record<BotEvent["type"], string[]>>
> = {
  rookie: {
    match_start: [
      "Salut ! J'espere qu'on va bien s'amuser.",
      "Bonne chance ! Je vais faire de mon mieux !",
    ],
    bot_blunder: ["Oups... ca arrive.", "Je crois que j'ai mal calcule ce coup..."],
    player_tetris: ["Wow ! Bien joue !", "Impressionnant !"],
    player_combo: ["Tu enchaines bien.", "Belle serie !"],
    player_back_to_back: ["Tu es vraiment en forme !"],
    player_high_stack: ["Attention, ton plateau monte !"],
    bot_tetris: ["Oh ! J'ai fait un tetris !"],
    close_call: ["C'est serre..."],
    long_match: ["Match tres intense !"],
    bot_lose: ["Bien joue... Tu es plus fort que moi."],
    bot_win: ["Je ne m'y attendais pas, mais j'ai gagne !"],
  },
  balanced: {
    match_start: ["Analyse en cours. Bonne chance.", "Simulation lancee."],
    player_tetris: ["Correction necessaire.", "Interressant."],
    player_combo: ["Combinaison detectee."],
    player_back_to_back: ["Rythme soutenu detecte."],
    player_high_stack: ["Alerte: hauteur critique du plateau."],
    bot_tetris: ["Execution optimale."],
    bot_blunder: ["Deviation temporaire detectee."],
    close_call: ["Ecarts minimaux."],
    long_match: ["Duree prolongee. Adaptation."],
    bot_win: ["Resultat attendu.", "Performance optimale."],
    bot_lose: ["Defaite enregistree. Recalibrage."],
  },
  apex: {
    match_start: ["Tu n'as aucune chance.", "Prepare-toi a perdre."],
    player_tetris: ["Chanceux.", "Ca ne suffira pas."],
    player_combo: ["Continue, je m'adapte."],
    player_back_to_back: ["Mouvement correct. Insuffisant."],
    player_high_stack: ["Tu craques.", "Zone rouge. Comme prevu."],
    bot_tetris: ["Observe et apprends."],
    bot_blunder: ["Erreur temporaire. Correction en cours."],
    close_call: ["Enfin un peu de resistance."],
    long_match: ["Tu tiens plus longtemps que prevu."],
    bot_win: ["Comme prevu.", "Tu peux reessayer."],
    bot_lose: ["Anomalie statistique."],
  },
};

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
  const index = Math.floor(rng() * pool.length);
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
    default:
      return "idle";
  }
}
