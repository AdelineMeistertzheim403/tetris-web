import type { TetrobotsPersonality } from "./tetrobots";

export type PlayerStyle =
  | "aggressive"
  | "defensive"
  | "clean"
  | "messy"
  | "panic"
  | "balanced";

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
  | { type: "comeback" }
  | { type: "strategy_shift" }
  | { type: "bot_strategy_shift"; from: string; to: string }
  | { type: "bot_detect_aggressive_player" }
  | { type: "bot_detect_defensive_player" }
  | { type: "bot_detect_combo_spam" }
  | { type: "bot_detect_high_risk" }
  | { type: "bot_panic_mode" }
  | { type: "bot_recovered" }
  | { type: "bot_exploiting_player_pattern" }
  | { type: "bot_failed_adaptation" }
  | { type: "bot_analysis_complete" };

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

const LAST_PICK_BY_EVENT: Partial<
  Record<TetrobotsPersonality["id"], Partial<Record<BotEvent["type"], number>>>
> = {};
const EVENT_PICK_BAGS: Partial<
  Record<TetrobotsPersonality["id"], Partial<Record<BotEvent["type"], number[]>>>
> = {};
const STRATEGY_SHIFT_COUNT: Partial<Record<TetrobotsPersonality["id"], number>> = {};
const ADAPTIVE_SHIFT_EVOLUTION: Record<TetrobotsPersonality["id"], string[]> = {
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

const applyTemplate = (message: string, event: BotEvent): string => {
  if (event.type === "player_combo") {
    return message.replace("{combo}", String(event.value));
  }
  if (event.type === "bot_strategy_shift") {
    return message.replace("{from}", event.from).replace("{to}", event.to);
  }
  return message;
};

const getEvolvingShiftLine = (
  personality: TetrobotsPersonality
): string | null => {
  const lines = ADAPTIVE_SHIFT_EVOLUTION[personality.id];
  if (!lines || lines.length === 0) return null;
  const nextCount = (STRATEGY_SHIFT_COUNT[personality.id] ?? 0) + 1;
  STRATEGY_SHIFT_COUNT[personality.id] = nextCount;
  if (nextCount > lines.length) return null;
  return lines[nextCount - 1];
};

const shuffleIndexes = (size: number, rng: () => number): number[] => {
  const values = Array.from({ length: size }, (_, idx) => idx);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
};

const getDialoguePool = (
  personality: TetrobotsPersonality,
  event: BotEvent["type"]
): string[] => {
  const ownPool = BOT_DIALOGUES[personality.id]?.[event] ?? [];
  if (event !== "bot_strategy_shift") return ownPool;
  const legacyPool = BOT_DIALOGUES[personality.id]?.strategy_shift ?? [];
  return [...new Set([...ownPool, ...legacyPool])];
};

const pickDialogueIndex = (
  personality: TetrobotsPersonality,
  event: BotEvent["type"],
  poolSize: number,
  rng: () => number
): number => {
  if (!EVENT_PICK_BAGS[personality.id]) EVENT_PICK_BAGS[personality.id] = {};
  let bag = EVENT_PICK_BAGS[personality.id]![event];
  const previousIndex = LAST_PICK_BY_EVENT[personality.id]?.[event];

  if (!bag || bag.length === 0) {
    bag = shuffleIndexes(poolSize, rng);
    if (
      poolSize > 1 &&
      previousIndex !== undefined &&
      bag[0] === previousIndex
    ) {
      const swapIdx = 1 + Math.floor(rng() * (poolSize - 1));
      [bag[0], bag[swapIdx]] = [bag[swapIdx], bag[0]];
    }
    EVENT_PICK_BAGS[personality.id]![event] = bag;
  }

  return bag.shift() as number;
};

export function getBotMessage(
  personality: TetrobotsPersonality,
  event: BotEvent,
  rng: () => number = Math.random
): string | null {
  if (event.type === "bot_strategy_shift") {
    const progressive = getEvolvingShiftLine(personality);
    if (progressive && rng() < 0.55) return applyTemplate(progressive, event);
  }
  const pool = getDialoguePool(personality, event.type);
  if (!pool || pool.length === 0) return null;
  const index = pickDialogueIndex(personality, event.type, pool.length, rng);
  if (!LAST_PICK_BY_EVENT[personality.id]) {
    LAST_PICK_BY_EVENT[personality.id] = {};
  }
  LAST_PICK_BY_EVENT[personality.id]![event.type] = index;
  return applyTemplate(pool[index], event);
}

export function resetBotDialogueState(personalityId?: TetrobotsPersonality["id"]) {
  if (personalityId) {
    delete LAST_PICK_BY_EVENT[personalityId];
    delete EVENT_PICK_BAGS[personalityId];
    delete STRATEGY_SHIFT_COUNT[personalityId];
    return;
  }

  (Object.keys(LAST_PICK_BY_EVENT) as TetrobotsPersonality["id"][]).forEach((id) => {
    delete LAST_PICK_BY_EVENT[id];
  });
  (Object.keys(EVENT_PICK_BAGS) as TetrobotsPersonality["id"][]).forEach((id) => {
    delete EVENT_PICK_BAGS[id];
  });
  (Object.keys(STRATEGY_SHIFT_COUNT) as TetrobotsPersonality["id"][]).forEach((id) => {
    delete STRATEGY_SHIFT_COUNT[id];
  });
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
    case "strategy_shift":
      return personality.id === "apex" ? "thinking" : "overclock";
    case "bot_strategy_shift":
      return "thinking";
    case "bot_detect_aggressive_player":
      return personality.id === "apex" ? "evil" : "thinking";
    case "bot_detect_defensive_player":
      return personality.id === "apex" ? "evil" : "thinking";
    case "bot_detect_combo_spam":
      return personality.id === "apex" ? "angry" : "thinking";
    case "bot_detect_high_risk":
      return "surprised";
    case "bot_panic_mode":
      return personality.id === "rookie" ? "sad" : "angry";
    case "bot_recovered":
      return "happy";
    case "bot_exploiting_player_pattern":
      return personality.id === "apex" ? "evil" : "happy";
    case "bot_failed_adaptation":
      return personality.id === "apex" ? "angry" : "sad";
    case "bot_analysis_complete":
      return "overclock";
    default:
      return "idle";
  }
}

export function getMemoryDialogue(
  personality: TetrobotsPersonality,
  style: PlayerStyle
): string {
  if (style === "aggressive") {
    return personality.id === "apex"
      ? "Tu attaques toujours autant. Previsible."
      : "Tu attaques beaucoup. J'ai memorise ce schema.";
  }
  if (style === "clean") {
    return "Ton empilement est propre. Interessant.";
  }
  if (style === "panic") {
    return "Tu paniques en zone rouge. Je l'ai note.";
  }
  if (style === "messy") {
    return personality.id === "apex"
      ? "Beaucoup de trous... tu joues au hasard ?"
      : "Beaucoup de trous detectes. Opportunite identifiee.";
  }
  if (style === "defensive") {
    return "Tu encaisses longtemps. Je vais devoir accelerer.";
  }
  return "Je m'adapte a ton style.";
}

export function getScoreTrollDialogue(
  personality: TetrobotsPersonality,
  playerScore: number,
  botScore: number
): string | null {
  const diff = playerScore - botScore;
  if (diff > 20000) {
    if (personality.id === "rookie") return "Je peux encore revenir !";
    if (personality.id === "balanced") return "Avantage temporaire detecte.";
    return "Illusion de superiorite.";
  }
  if (diff < -20000) {
    if (personality.id === "rookie") return "Attends, c'est pas fini !";
    if (personality.id === "balanced") return "Correction strategique en cours.";
    return "Tu vas tomber.";
  }
  return null;
}
