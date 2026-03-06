import type { EnemyKind } from "./types";

export type PlatformerEvent =
  | "level_start"
  | "player_jump_chain"
  | "player_fall"
  | "player_collect_orb"
  | "player_collect_many_orbs"
  | "player_near_death"
  | "player_escape"
  | "player_kill_robot"
  | "player_kill_apex"
  | "player_speedrun"
  | "player_idle"
  | "player_fail_jump"
  | "player_finish_level"
  | "player_secret_found"
  | "player_glitch_power";

export type PixelProtocolChatLine = {
  speaker: EnemyKind;
  name: string;
  color: string;
  text: string;
  at: number;
};

const NAMES: Record<EnemyKind, string> = {
  rookie: "ROOKIE",
  pulse: "PULSE",
  apex: "APEX",
};

const COLORS: Record<EnemyKind, string> = {
  rookie: "#37e28f",
  pulse: "#4da6ff",
  apex: "#ff5f5f",
};

const DIALOGUES: Record<EnemyKind, Partial<Record<PlatformerEvent, string[]>>> = {
  rookie: {
    level_start: [
      "Oh ! Un nouveau niveau !",
      "Tu crois qu'on va gagner cette fois ?",
      "Je vais essayer de t'arreter... enfin... je crois.",
    ],
    player_collect_orb: [
      "He ! C'etait une donnee importante !",
      "Tu touches a des fichiers sensibles !",
    ],
    player_collect_many_orbs: [
      "STOP ! Tu telecharges trop de donnees !",
      "Le serveur va exploser !",
    ],
    player_jump_chain: [
      "Comment tu fais pour sauter autant ?!",
      "C'est pas dans les regles ca !",
    ],
    player_fall: [
      "Oups... ca arrive aux meilleurs !",
      "Je crois que la gravite gagne.",
    ],
    player_fail_jump: [
      "Ce saut avait l'air douteux...",
      "Le vide marque encore un point.",
    ],
    player_kill_robot: [
      "Erreur systeme... je redemarre...",
      "Aie. Ca pique pour un petit robot.",
    ],
    player_finish_level: [
      "Deja fini ?!",
      "Tu vas trop vite pour moi !",
    ],
    player_idle: [
      "Tu t'es endormi ?",
      "Je peux attendre... enfin je crois.",
    ],
    player_glitch_power: [
      "Tu pirates le niveau ?!",
      "He ! Tu triches avec le code !",
    ],
    player_near_death: [
      "Ca devient dangereux la...",
      "Encore un coup et c'est fini !",
    ],
    player_speedrun: [
      "He, ralentis un peu !",
      "On dirait que tu connais deja la map !",
    ],
  },
  pulse: {
    level_start: [
      "Analyse du niveau en cours.",
      "Calcul des trajectoires.",
    ],
    player_collect_orb: [
      "Accumulation de donnees detectee.",
      "Interessant...",
    ],
    player_collect_many_orbs: [
      "Tu optimises ton score.",
      "Strategie detectee.",
    ],
    player_jump_chain: [
      "Performance statistiquement improbable.",
      "Tu as repete ce niveau ?",
    ],
    player_fall: [
      "Erreur de calcul.",
      "Gravite confirmee.",
    ],
    player_fail_jump: [
      "Prediction invalidee.",
      "Saut sous-optimal detecte.",
    ],
    player_kill_robot: [
      "Defaillance critique... recalibrage.",
      "Module neutralise.",
    ],
    player_finish_level: [
      "Objectif atteint plus vite que prevu.",
      "Simulation du niveau suivante.",
    ],
    player_idle: [
      "Aucune activite detectee.",
      "Pause non planifiee en cours.",
    ],
    player_glitch_power: [
      "Interference detectee.",
      "Manipulation anormale du systeme.",
    ],
    player_secret_found: [
      "Zone cachee detectee.",
      "Tu explores beaucoup.",
    ],
    player_speedrun: [
      "Pattern de speedrunner identifie.",
      "Temps de parcours anormalement bas.",
    ],
  },
  apex: {
    level_start: [
      "Encore toi.",
      "Tu ne passeras pas.",
    ],
    player_collect_orb: [
      "Accumule tant que tu veux.",
      "Ca ne te sauvera pas.",
    ],
    player_collect_many_orbs: [
      "Tu vides mon noyau de donnees.",
      "Tu prends trop de place dans ce systeme.",
    ],
    player_jump_chain: [
      "Tu es agile.",
      "Mais pas assez.",
    ],
    player_fall: [
      "Le vide te connait bien.",
      "La gravite est de mon cote.",
    ],
    player_escape: [
      "Fuir ne changera rien.",
      "Je te rattraperai.",
    ],
    player_kill_apex: [
      "Anomalie statistique.",
      "Impossible...",
      "Bug... bug... bug...",
    ],
    player_finish_level: [
      "Tu as gagne cette fois.",
      "La prochaine simulation sera differente.",
    ],
    player_idle: [
      "La peur t'a paralyse ?",
      "Tu hesites deja.",
    ],
    player_glitch_power: [
      "Manipulation du systeme.",
      "Interessant.",
    ],
    player_near_death: [
      "Je sens ta faiblesse.",
      "Un choc de plus et tu tombes.",
    ],
    player_speedrun: [
      "Tu cours, mais tu ne m'echappes pas.",
      "Ta vitesse ne te sauvera pas.",
    ],
  },
};

function pickRandom<T>(items: T[]): T | null {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)] as T;
}

export function buildPixelProtocolChatLine(
  event: PlatformerEvent,
  options: {
    availableSpeakers: EnemyKind[];
    now: number;
    preferredSpeaker?: EnemyKind | null;
  }
): PixelProtocolChatLine | null {
  const speaker =
    options.preferredSpeaker && options.availableSpeakers.includes(options.preferredSpeaker)
      ? options.preferredSpeaker
      : pickRandom(options.availableSpeakers) ?? null;
  if (!speaker) return null;

  const pool = DIALOGUES[speaker][event] ?? [];
  const text = pickRandom(pool);
  if (!text) return null;

  return {
    speaker,
    name: NAMES[speaker],
    color: COLORS[speaker],
    text,
    at: options.now,
  };
}
