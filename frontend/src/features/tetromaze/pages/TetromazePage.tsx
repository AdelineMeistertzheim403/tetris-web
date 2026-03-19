import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { useAuth } from "../../auth/context/AuthContext";
import { TOTAL_GAME_MODES } from "../../game/types/GameMode";
import {
  getTetromazeCampaignLevel,
  TETROMAZE_TOTAL_LEVELS,
  toWorldStage,
} from "../data/campaignLevels";
import {
  fetchTetromazeCommunityLevel,
  fetchTetromazeCustomLevels,
  fetchTetromazeProgress,
  saveTetromazeProgress,
  toggleTetromazeCommunityLevelLike,
  type TetromazeCommunityLevel,
  type TetromazeProgress,
} from "../services/tetromazeService";
import { findTetromazeCustomLevel, mergeTetromazeCustomLevels } from "../utils/customLevels";
import { markTetromazeCustomLevelCompleted } from "../utils/communityCompletion";
import {
  canMoveTo,
  chooseRandom,
  findNextStepBfs,
  getValidMoves,
  manhattan,
  nextPos,
  parseKey,
  toKey,
  type GridPos,
} from "../logic/grid";
import type { Direction, TetromazeLevel, TetromazeOrbType, TetrobotKind } from "../types";
import "../../../styles/tetromaze.css";

// État runtime d'un bot.
// `prevPos` + `lastMoveAt` permettent une interpolation visuelle fluide
// entre deux cases de grille.
type BotState = {
  id: string;
  kind: TetrobotKind;
  pos: GridPos;
  prevPos: GridPos;
  lastMoveAt: number;
  spawn: GridPos;
  respawnAt: number;
};

type TetromazeMode = "CLASSIC" | "SURVIVAL";

type GameState = {
  mode: TetromazeMode;
  seed: string;
  startedAt: number;
  status: "idle" | "running" | "won" | "lost";
  playerPos: GridPos;
  playerDir: Direction;
  lives: number;
  score: number;
  dataOrbs: Set<string>;
  powerOrbs: Map<string, TetromazeOrbType>;
  bots: BotState[];
  hackUntil: number;
  glitchUntil: number;
  overclockUntil: number;
  freezeUntil: number;
  magnetUntil: number;
  magnetTarget: GridPos | null;
  firewallUntil: number;
  firewallCell: GridPos | null;
  ghostUntil: number;
  desyncUntil: number;
  mirrorUntil: number;
  overheatUntil: number;
  neuralLagUntil: number;
  corruptionUntil: number;
  corruptionOpenCell: GridPos | null;
  corruptionClosedCell: GridPos | null;
  scanUntil: number;
  virusUntil: number;
  virusHostBotId: string | null;
  safeUntil: number;
  botWakeUntil: number;
  timeLeftMs: number;
  tick: number;
};

type SpriteStore = {
  player: HTMLImageElement[];
  bots: Record<TetrobotKind, HTMLImageElement>;
};

// Réglages globaux du mode (timings, dimensions, cadence IA).
const TILE = 40;
const TICK_MS = 120;
const SURVIVAL_MS = 120000;
const HACK_MS = 12000;
const GLITCH_MS = 7500;
const OVERCLOCK_MS = 9000;
const FREEZE_MS = 3000;
const MAGNET_MS = 5000;
const FIREWALL_MS = 6500;
const GHOST_MS = 2000;
const DESYNC_MS = 6000;
const MIRROR_MS = 4500;
const OVERHEAT_MS = 8000;
const NEURAL_LAG_MS = 7000;
const CORRUPTION_MS = 7000;
const SCAN_MS = 5000;
const VIRUS_MS = 7500;
const START_SAFE_MS = 2800;
const BOT_WAKE_MS = 1400;
const PLAYER_ANIM_MS = 170;
const CAPTURE_BONUS = 350;
const BOT_MOVE_INTERVAL: Record<TetrobotKind, number> = {
  rookie: 6,
  balanced: 5,
  apex: 4,
};

const ORB_COLORS: Record<TetromazeOrbType, string> = {
  OVERCLOCK: "#ffe066",
  GLITCH: "#8efff5",
  HACK: "#ff89ff",
  LOOP: "#9f8dff",
  FREEZE_PROTOCOL: "#96d8ff",
  MAGNET_FIELD: "#5be7c4",
  FIREWALL: "#ff835a",
  GHOST_MODE: "#d8cbff",
  DESYNC: "#6ec8ff",
  MIRROR_SIGNAL: "#ffd86d",
  PULSE_WAVE: "#ffc066",
  OVERHEAT: "#ff4c4c",
  NEURAL_LAG: "#8aa6ff",
  RANDOMIZER: "#ff8fd9",
  CORRUPTION: "#7eff95",
  SCAN: "#5fd1ff",
  VIRUS: "#9cff6a",
};

const POWERUP_UI: Record<TetromazeOrbType, { name: string; description: string }> = {
  OVERCLOCK: {
    name: "Overclock",
    description: "Augmente la vitesse du joueur temporairement.",
  },
  GLITCH: {
    name: "Glitch",
    description: "Rend les deplacements des bots plus aleatoires.",
  },
  HACK: {
    name: "Hack",
    description: "Inverse la chasse: toucher un bot le stun et donne du score.",
  },
  LOOP: {
    name: "Loop",
    description: "Teleportation instantanee via le reseau de loops.",
  },
  FREEZE_PROTOCOL: {
    name: "Freeze Protocol",
    description: "Gele les Tetrobots pendant 3 secondes.",
  },
  MAGNET_FIELD: {
    name: "Magnet Field",
    description: "Attire les bots vers un leurre temporaire.",
  },
  FIREWALL: {
    name: "Firewall",
    description: "Cree une barriere temporaire dans le labyrinthe.",
  },
  GHOST_MODE: {
    name: "Ghost Mode",
    description: "Rend intangible pendant 2 secondes.",
  },
  DESYNC: {
    name: "Desync",
    description: "Les bots voient ta position avec un retard de 1 case.",
  },
  MIRROR_SIGNAL: {
    name: "Mirror Signal",
    description: "Inverse brievement leurs decisions de mouvement.",
  },
  PULSE_WAVE: {
    name: "Pulse Wave",
    description: "Repousse les bots proches autour de toi.",
  },
  OVERHEAT: {
    name: "Overheat",
    description: "Bots plus rapides mais moins precis.",
  },
  NEURAL_LAG: {
    name: "Neural Lag",
    description: "Ralentit uniquement Apex pendant quelques secondes.",
  },
  RANDOMIZER: {
    name: "Randomizer",
    description: "Melange instantanement les positions des Tetrobots.",
  },
  CORRUPTION: {
    name: "Corruption",
    description: "Ouvre un mur et ferme temporairement un passage.",
  },
  SCAN: {
    name: "Scan",
    description: "Affiche une prevision de trajectoire des Tetrobots.",
  },
  VIRUS: {
    name: "Virus",
    description: "Infecte un Tetrobot et ralentit les autres.",
  },
};

const PLAYER_SPRITES = [
  "/Tetromaze/hacker_pixel_1.png",
  "/Tetromaze/hacker_pixel_2.png",
] as const;

const BOT_SPRITES: Record<TetrobotKind, string> = {
  rookie: "/Tetromaze/rookie_ingame.png",
  balanced: "/Tetromaze/pulse_ingame.png",
  apex: "/Tetromaze/apex_ingame.png",
};

type TetromazeEvent =
  | "maze_start"
  | "player_near"
  | "player_escape"
  | "bot_stunned"
  | "powerup_taken"
  | "power_freeze_protocol"
  | "power_magnet_field"
  | "power_firewall"
  | "power_ghost_mode"
  | "power_desync"
  | "power_mirror_signal"
  | "power_pulse_wave"
  | "power_overheat"
  | "power_neural_lag"
  | "power_randomizer"
  | "power_corruption"
  | "power_scan"
  | "power_virus"
  | "player_low_life"
  | "player_win"
  | "player_lose"
  | "long_chase"
  | "cornered"
  | "multi_bot_near";

const POWERUP_EVENT_BY_TYPE: Partial<Record<TetromazeOrbType, TetromazeEvent>> = {
  FREEZE_PROTOCOL: "power_freeze_protocol",
  MAGNET_FIELD: "power_magnet_field",
  FIREWALL: "power_firewall",
  GHOST_MODE: "power_ghost_mode",
  DESYNC: "power_desync",
  MIRROR_SIGNAL: "power_mirror_signal",
  PULSE_WAVE: "power_pulse_wave",
  OVERHEAT: "power_overheat",
  NEURAL_LAG: "power_neural_lag",
  RANDOMIZER: "power_randomizer",
  CORRUPTION: "power_corruption",
  SCAN: "power_scan",
  VIRUS: "power_virus",
};

type ChatLine = {
  speaker: TetrobotKind;
  text: string;
  at: number;
};

type ChatState = Record<TetrobotKind, ChatLine | null>;

const BOT_LABELS: Record<TetrobotKind, string> = {
  rookie: "ROOKIE",
  balanced: "PULSE",
  apex: "APEX",
};

const BOT_ACCENTS: Record<TetrobotKind, string> = {
  rookie: "#37e28f",
  balanced: "#4da6ff",
  apex: "#ff5f5f",
};

const TETROMAZE_DIALOGUES: Record<TetrobotKind, Partial<Record<TetromazeEvent, string[]>>> = {
  rookie: {
    maze_start: [
      "C'est parti ! Je vais te trouver... peut-etre.",
      "Tu ne peux pas te cacher eternellement ! Enfin... j'espere.",
    ],
    player_near: ["Oh ! Tu es juste la ?!", "Attends... j'ai vu quelque chose bouger !"],
    player_escape: ["Oh non... encore rate.", "Tu es rapide ! Trop rapide !"],
    bot_stunned: ["Systeme... perturbe...", "Erreur... je... redemarre..."],
    powerup_taken: ["Pourquoi tu brilles comme ca ?!", "Ca ne me plait pas du tout..."],
    power_freeze_protocol: [
      "Hein ? Pourquoi je ne bouge plus ?!",
      "Pause ? On fait une pause ?!",
      "Je… crois… que… je… bug…",
    ],
    power_magnet_field: [
      "Oh ! Tu es la-bas ! ... Non ?",
      "Pourquoi tu te teleportes tout le temps ?!",
      "Je me sens... attire...",
    ],
    power_firewall: [
      "Mais... il y avait un passage ici !",
      "Qui a deplace le mur ?!",
      "Je ne comprends plus le plan...",
    ],
    power_ghost_mode: [
      "Tu m'as traverse ?!",
      "C'est interdit ca !",
      "Ce n'est pas juste !",
    ],
    power_desync: [
      "Je suis sur que tu etais la !",
      "Je vois double !",
      "Mon radar deconne !",
    ],
    power_mirror_signal: [
      "Pourquoi je vais dans l'autre sens ?!",
      "Mes commandes sont inversees !",
    ],
    power_pulse_wave: [
      "Whoa ! Ca repousse !",
      "C'etait quoi cette explosion ?!",
    ],
    power_overheat: [
      "Pourquoi je vais si vite ?!",
      "Je perds le controle !",
    ],
    power_randomizer: [
      "Je... suis ou ?!",
      "Ca n'a aucun sens !",
    ],
    power_corruption: [
      "Le mur... vient de disparaitre ?!",
      "Le labyrinthe change !",
    ],
    power_scan: [
      "Tu lis mes mouvements ?!",
      "Ce n'est pas equitable !",
    ],
    power_virus: [
      "Je ne me sens pas bien...",
      "Je crois que je suis infecte...",
    ],
    long_chase: ["Tu me fatigues la...", "Pourquoi tu ne t'arretes jamais ?"],
    player_win: ["Bien joue... je vais m'entrainer.", "Un jour, je te rattraperai."],
    player_lose: ["On peut refaire une partie ?"],
    cornered: ["Attention... tu n'as presque plus de sortie."],
  },
  balanced: {
    maze_start: ["Analyse du labyrinthe en cours.", "Probabilite de capture : 62%."],
    player_near: ["Contact visuel etabli.", "Distance minimale detectee."],
    player_escape: ["Evasion imprevue.", "Recalcul de trajectoire."],
    powerup_taken: ["Amplification detectee.", "Modification du comportement recommandee."],
    power_freeze_protocol: [
      "Immobilisation forcee detectee.",
      "Processus suspendu temporairement.",
      "Analyse en attente.",
    ],
    power_magnet_field: [
      "Signal fantome detecte.",
      "Coordonnees incoherentes.",
      "Simulation perturbee.",
    ],
    power_firewall: [
      "Obstacle imprevu.",
      "Recalcul du chemin optimal.",
      "Modification topologique detectee.",
    ],
    power_ghost_mode: [
      "Collision impossible.",
      "Entite intangible.",
      "Physique temporairement desactivee.",
    ],
    power_desync: [
      "Latence anormale.",
      "Decalage temporel mesure.",
      "Synchronisation compromise.",
    ],
    power_mirror_signal: [
      "Inversion vectorielle detectee.",
      "Commande contradictoire.",
      "Correction en cours.",
    ],
    power_pulse_wave: [
      "Onde de choc detectee.",
      "Distance de securite compromise.",
    ],
    power_overheat: [
      "Acceleration excessive.",
      "Precision diminuee.",
    ],
    power_randomizer: [
      "Positions aleatoires.",
      "Chaos structurel.",
    ],
    power_corruption: [
      "Structure instable.",
      "Carte non fiable.",
    ],
    power_scan: [
      "Prediction interceptee.",
      "Chemin expose.",
    ],
    power_virus: [
      "Propagation detectee.",
      "Anomalie interne.",
    ],
    bot_stunned: ["Interruption du systeme.", "Latence critique."],
    cornered: ["Impasse confirmee.", "Plus d'issues detectees."],
    player_lose: ["Resultat attendu.", "Capture optimisee."],
    player_win: ["Les donnees ont ete enregistrees."],
    long_chase: ["Traque prolongee. Adaptation continue."],
  },
  apex: {
    maze_start: ["Cours.", "Tu es deja perdu."],
    player_near: ["Je te vois.", "Ta fuite s'arrete ici."],
    player_escape: ["Chanceux.", "Je m'adapte."],
    multi_bot_near: ["Nous sommes partout.", "Tu es encercle."],
    bot_stunned: ["Erreur... temporaire.", "Je reviens."],
    power_freeze_protocol: [
      "Pathetique.",
      "Ce n'est qu'un delai.",
      "Trois secondes ne te sauveront pas.",
    ],
    power_magnet_field: [
      "Illusion.",
      "Tu crois pouvoir me tromper ?",
      "Je corrige.",
    ],
    power_firewall: [
      "Tu bloques ma route ?",
      "Erreur.",
      "Je trouverai une autre voie.",
    ],
    power_ghost_mode: [
      "Cache-toi derriere des bugs.",
      "Tu redeviendras solide.",
      "Je t'attends.",
    ],
    power_desync: [
      "Tu manipules le temps.",
      "Interessant.",
      "Je m'adapte.",
    ],
    power_mirror_signal: [
      "Tu joues avec mes directions ?",
      "Instable...",
      "Je reprends le controle.",
    ],
    power_pulse_wave: [
      "Force brute.",
      "Inefficace a long terme.",
      "Tu paniques.",
    ],
    power_overheat: [
      "Tu veux du chaos ?",
      "Tres bien.",
      "Je vais te submerger.",
    ],
    power_neural_lag: [
      "Ralentissement detecte.",
      "Interference ciblee.",
      "Tu as peur de moi.",
    ],
    power_randomizer: [
      "Tu relies ton destin au hasard.",
      "Erreur strategique.",
    ],
    power_corruption: [
      "Tu detruis l'ordre.",
      "Je reconstruirai.",
    ],
    power_scan: [
      "Tu vois l'avenir ?",
      "Il n'est pas fige.",
    ],
    power_virus: [
      "Tentative de sabotage.",
      "Je purge.",
    ],
    player_low_life: ["Tu vacilles.", "Fin imminente."],
    player_win: ["Anomalie statistique.", "Ce n'est pas fini."],
    player_lose: ["Je suis l'algorithme."],
    long_chase: ["Tu joues avec le feu."],
  },
};

function countTrue(values: Record<string, boolean>) {
  return Object.values(values).filter(Boolean).length;
}

function pickRandom<T>(values: T[]): T | null {
  if (!values.length) return null;
  return values[Math.floor(Math.random() * values.length)] ?? null;
}

function clampTarget(grid: string[], target: GridPos, fallback: GridPos): GridPos {
  if (canMoveTo(grid, target.x, target.y)) return target;
  return fallback;
}

function clampLevelIndex(levelIndex: number) {
  return Math.max(1, Math.min(TETROMAZE_TOTAL_LEVELS, levelIndex));
}

const LOCAL_PROGRESS_KEY = "tetromaze-campaign-progress-v1";

function readLocalProgress(): TetromazeProgress {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!raw) return { highestLevel: 1, currentLevel: 1, levelScores: {} };
    const parsed = JSON.parse(raw) as TetromazeProgress;
    return {
      highestLevel: clampLevelIndex(Number(parsed.highestLevel) || 1),
      currentLevel: clampLevelIndex(Number(parsed.currentLevel) || 1),
      levelScores: parsed.levelScores ?? {},
    };
  } catch {
    return { highestLevel: 1, currentLevel: 1, levelScores: {} };
  }
}

function writeLocalProgress(progress: TetromazeProgress) {
  localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));
}

function oppositeDir(dir: Direction): Direction {
  if (dir === "UP") return "DOWN";
  if (dir === "DOWN") return "UP";
  if (dir === "LEFT") return "RIGHT";
  return "LEFT";
}

function canMoveDynamic(
  grid: string[],
  x: number,
  y: number,
  closedCell: GridPos | null,
  openCell: GridPos | null
) {
  const key = toKey(x, y);
  if (openCell && toKey(openCell.x, openCell.y) === key) return true;
  if (closedCell && toKey(closedCell.x, closedCell.y) === key) return false;
  return canMoveTo(grid, x, y);
}

function getValidMovesDynamic(
  grid: string[],
  x: number,
  y: number,
  closedCell: GridPos | null,
  openCell: GridPos | null
) {
  return getValidMoves(grid, x, y).filter((move) =>
    canMoveDynamic(grid, move.pos.x, move.pos.y, closedCell, openCell)
  );
}

function findNextStepDynamic(
  grid: string[],
  from: GridPos,
  target: GridPos,
  closedCell: GridPos | null,
  openCell: GridPos | null
) {
  if (from.x === target.x && from.y === target.y) return from;

  const q: GridPos[] = [from];
  const visited = new Set<string>([toKey(from.x, from.y)]);
  const parent = new Map<string, string>();

  while (q.length > 0) {
    const cur = q.shift()!;
    if (cur.x === target.x && cur.y === target.y) break;
    for (const move of getValidMovesDynamic(grid, cur.x, cur.y, closedCell, openCell)) {
      const key = toKey(move.pos.x, move.pos.y);
      if (visited.has(key)) continue;
      visited.add(key);
      parent.set(key, toKey(cur.x, cur.y));
      q.push(move.pos);
    }
  }

  const targetKey = toKey(target.x, target.y);
  if (!visited.has(targetKey)) return null;

  let current = targetKey;
  let prev = parent.get(current);
  while (prev && prev !== toKey(from.x, from.y)) {
    current = prev;
    prev = parent.get(current);
  }
  return parseKey(current);
}

function nearestWalkableAround(
  grid: string[],
  start: GridPos,
  closedCell: GridPos | null,
  openCell: GridPos | null
) {
  if (canMoveDynamic(grid, start.x, start.y, closedCell, openCell)) return start;
  const q: GridPos[] = [start];
  const seen = new Set<string>([toKey(start.x, start.y)]);
  while (q.length) {
    const cur = q.shift()!;
    for (const move of getValidMoves(grid, cur.x, cur.y)) {
      const key = toKey(move.pos.x, move.pos.y);
      if (seen.has(key)) continue;
      seen.add(key);
      if (canMoveDynamic(grid, move.pos.x, move.pos.y, closedCell, openCell)) return move.pos;
      q.push(move.pos);
    }
  }
  return start;
}

// Construit un état de départ complet à partir du niveau courant.
// Les data orbs sont dérivées de la grille, en excluant zones de spawn/orbs.
function createInitialState(mode: TetromazeMode, level: TetromazeLevel): GameState {
  const dataOrbs = new Set<string>();
  const powerOrbs = new Map<string, TetromazeOrbType>();
  const reserved = new Set<string>([
    toKey(level.playerSpawn.x, level.playerSpawn.y),
    ...level.botSpawns.map((s) => toKey(s.x, s.y)),
  ]);

  // Empêche la génération d'orbs dans la maison des bots
  // pour éviter des objectifs impossibles à atteindre.
  if (level.botHome) {
    const { x, y, width, height } = level.botHome;
    for (let yy = y; yy < y + height; yy += 1) {
      for (let xx = x; xx < x + width; xx += 1) {
        reserved.add(toKey(xx, yy));
      }
    }
  }

  for (let y = 0; y < level.grid.length; y += 1) {
    for (let x = 0; x < level.grid[y].length; x += 1) {
      const key = toKey(x, y);
      if (level.grid[y][x] === "." && !reserved.has(key)) {
        dataOrbs.add(key);
      }
    }
  }

  for (const orb of level.powerOrbs) {
    const key = toKey(orb.x, orb.y);
    powerOrbs.set(key, orb.type);
    dataOrbs.delete(key);
  }

  return {
    mode,
    seed: `tetromaze-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    startedAt: Date.now(),
    status: "idle",
    playerPos: { ...level.playerSpawn },
    playerDir: "LEFT",
    lives: 3,
    score: 0,
    dataOrbs,
    powerOrbs,
    bots: (level.botKinds ?? ["rookie", "balanced", "apex"]).map((kind, index) => ({
      id: `${kind}-${index}`,
      kind: kind as TetrobotKind,
      pos: { ...level.botSpawns[index] },
      prevPos: { ...level.botSpawns[index] },
      lastMoveAt: Date.now(),
      spawn: { ...level.botSpawns[index] },
      respawnAt: 0,
    })),
    hackUntil: 0,
    glitchUntil: 0,
    overclockUntil: 0,
    freezeUntil: 0,
    magnetUntil: 0,
    magnetTarget: null,
    firewallUntil: 0,
    firewallCell: null,
    ghostUntil: 0,
    desyncUntil: 0,
    mirrorUntil: 0,
    overheatUntil: 0,
    neuralLagUntil: 0,
    corruptionUntil: 0,
    corruptionOpenCell: null,
    corruptionClosedCell: null,
    scanUntil: 0,
    virusUntil: 0,
    virusHostBotId: null,
    safeUntil: 0,
    botWakeUntil: 0,
    timeLeftMs: mode === "SURVIVAL" ? SURVIVAL_MS : 0,
    tick: 0,
  };
}

function directionToAngle(direction: Direction) {
  if (direction === "UP") return -Math.PI / 2;
  if (direction === "DOWN") return Math.PI / 2;
  if (direction === "LEFT") return Math.PI;
  return 0;
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  direction?: Direction
) {
  ctx.save();
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.translate(cx, cy);
  if (direction) {
    ctx.rotate(directionToAngle(direction));
  }
  ctx.drawImage(image, -size / 2, -size / 2, size, size);
  ctx.restore();
}

export default function TetromazePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [levelIndex, setLevelIndex] = useState(1);
  const [level, setLevel] = useState<TetromazeLevel>(() => getTetromazeCampaignLevel(1));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputDirRef = useRef<Direction | null>(null);
  const movementActiveRef = useRef(false);
  const visitedRef = useRef(false);
  const spritesRef = useRef<SpriteStore | null>(null);
  const { updateStats, checkAchievements, recordPlayerBehavior, recordTetrobotEvent } =
    useAchievements();
  const { user } = useAuth();

  const [assetsReady, setAssetsReady] = useState(false);
  const [state, setState] = useState<GameState>(() => createInitialState("CLASSIC", level));
  const [savedProgress, setSavedProgress] = useState<TetromazeProgress>(() => readLocalProgress());
  const [isCustomLevel, setIsCustomLevel] = useState(false);
  const [communityLevel, setCommunityLevel] = useState<TetromazeCommunityLevel | null>(null);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityLikeBusy, setCommunityLikeBusy] = useState(false);
  const [renderTick, setRenderTick] = useState(0);
  const [chatLines, setChatLines] = useState<ChatState>({
    rookie: null,
    balanced: null,
    apex: null,
  });
  const lastChatAtRef = useRef(0);
  const prevStateRef = useRef(state);
  const nearStartAtRef = useRef<number | null>(null);
  const wasNearRef = useRef(false);
  const wasCorneredRef = useRef(false);
  const wasMultiNearRef = useRef(false);
  const outcomeSavedRef = useRef<string | null>(null);
  const nearBotRef = useRef<TetrobotKind | null>(null);
  const prevLivesRef = useRef(3);
  const runEffectsRef = useRef(0);
  const runCapturesRef = useRef(0);
  const runNoHitRef = useRef(true);
  const undetectedStartRef = useRef<number | null>(null);
  const loopStartRef = useRef<number | null>(null);
  const loopPathRef = useRef<string[]>([]);

  const canvasSize = useMemo(
    () => ({ width: level.grid[0].length * TILE, height: level.grid.length * TILE }),
    [level.grid]
  );
  const worldStage = useMemo(() => toWorldStage(levelIndex), [levelIndex]);
  const customParam = searchParams.get("custom");
  const communityParam = searchParams.get("community");
  const levelParam = searchParams.get("level");
  const levelPowerupTypes = useMemo(() => {
    const seen = new Set<TetromazeOrbType>();
    const ordered: TetromazeOrbType[] = [];
    for (const orb of level.powerOrbs) {
      if (seen.has(orb.type)) continue;
      seen.add(orb.type);
      ordered.push(orb.type);
    }
    return ordered;
  }, [level.powerOrbs]);
  const isCommunityLevel = Boolean(communityLevel);

  const pushChatLine = (
    event: TetromazeEvent,
    preferredBot?: TetrobotKind,
    broadcast = false
  ) => {
    const now = Date.now();
    if (now - lastChatAtRef.current < 1800) return;

    const speakers: TetrobotKind[] = broadcast
      ? ["rookie", "balanced", "apex"]
      : [preferredBot ?? pickRandom<TetrobotKind>(["rookie", "balanced", "apex"]) ?? "balanced"];

    setChatLines((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const speaker of speakers) {
        const pool = TETROMAZE_DIALOGUES[speaker][event] ?? [];
        const line = pickRandom(pool);
        if (!line) continue;
        next[speaker] = { speaker, text: line, at: now };
        changed = true;
      }
      return changed ? next : prev;
    });
    lastChatAtRef.current = now;
  };

  const persistProgress = (payload: {
    highestLevel?: number;
    currentLevel?: number;
    levelIndex?: number;
    score?: number;
  }) => {
    const local = readLocalProgress();
    const nextLocal: TetromazeProgress = {
      highestLevel: payload.highestLevel ? Math.max(local.highestLevel, payload.highestLevel) : local.highestLevel,
      currentLevel: payload.currentLevel ? Math.max(local.currentLevel, payload.currentLevel) : local.currentLevel,
      levelScores: { ...local.levelScores },
    };
    if (payload.levelIndex !== undefined && payload.score !== undefined) {
      const key = String(payload.levelIndex);
      nextLocal.levelScores[key] = Math.max(nextLocal.levelScores[key] ?? 0, payload.score);
    }
    writeLocalProgress(nextLocal);
    setSavedProgress(nextLocal);

    saveTetromazeProgress(payload)
      .then((next) => {
        const merged: TetromazeProgress = {
          highestLevel: Math.max(next.highestLevel, nextLocal.highestLevel),
          currentLevel: Math.max(next.currentLevel, nextLocal.currentLevel),
          levelScores: { ...nextLocal.levelScores, ...next.levelScores },
        };
        writeLocalProgress(merged);
        setSavedProgress(merged);
      })
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      const localProgress = readLocalProgress();
      const requestedCommunityId = Number.parseInt(communityParam ?? "", 10);
      if (Number.isFinite(requestedCommunityId) && requestedCommunityId > 0) {
        if (!cancelled) {
          setCommunityLoading(true);
          setCommunityError(null);
        }
        try {
          const remoteCommunityLevel = await fetchTetromazeCommunityLevel(requestedCommunityId);
          if (cancelled) return;
          setCommunityLevel(remoteCommunityLevel);
          setIsCustomLevel(false);
          setSavedProgress(localProgress);
          setLevelIndex(1);
          setLevel(remoteCommunityLevel.level);
          setState(createInitialState("CLASSIC", remoteCommunityLevel.level));
          setCommunityLoading(false);
          return;
        } catch (err) {
          if (!cancelled) {
            setCommunityLevel(null);
            setCommunityError(err instanceof Error ? err.message : "Niveau joueur introuvable");
            setCommunityLoading(false);
            navigate("/tetromaze");
          }
          return;
        }
      }

      if (customParam) {
        let customLevel = findTetromazeCustomLevel(customParam);
        if (!customLevel) {
          try {
            const remoteCustomLevels = await fetchTetromazeCustomLevels();
            mergeTetromazeCustomLevels(remoteCustomLevels);
            customLevel = findTetromazeCustomLevel(customParam);
          } catch {
            // hors ligne: local only
          }
        }
        if (!customLevel) {
          if (!cancelled) navigate("/tetromaze");
          return;
        }
        if (cancelled) return;
        setIsCustomLevel(true);
        setCommunityLevel(null);
        setCommunityError(null);
        setSavedProgress(localProgress);
        setLevelIndex(1);
        setLevel(customLevel);
        setState(createInitialState("CLASSIC", customLevel));
        return;
      }

      let merged = localProgress;
      try {
        const remote = await fetchTetromazeProgress();
        merged = {
          highestLevel: Math.max(localProgress.highestLevel, remote.highestLevel),
          currentLevel: Math.max(localProgress.currentLevel, remote.currentLevel),
          levelScores: { ...localProgress.levelScores, ...remote.levelScores },
        };
      } catch {
        // hors ligne: local only
      }

      if (cancelled) return;
      writeLocalProgress(merged);
      setIsCustomLevel(false);
      setCommunityLevel(null);
      setCommunityError(null);
      setSavedProgress(merged);

      const requestedLevel = levelParam ? clampLevelIndex(Number.parseInt(levelParam, 10) || merged.currentLevel) : merged.currentLevel;
      const safeLevel = clampLevelIndex(Math.min(requestedLevel, merged.highestLevel));
      const resumeData = getTetromazeCampaignLevel(safeLevel);
      setLevelIndex(safeLevel);
      setLevel(resumeData);
      setState(createInitialState("CLASSIC", resumeData));
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [communityParam, customParam, levelParam, navigate]);

  useEffect(() => {
    // Précharge les sprites pour éviter le clignotement au premier rendu canvas.
    let mounted = true;
    const playerImages = PLAYER_SPRITES.map((path) => {
      const img = new Image();
      img.src = path;
      return img;
    });
    const botImages: Record<TetrobotKind, HTMLImageElement> = {
      rookie: new Image(),
      balanced: new Image(),
      apex: new Image(),
    };
    botImages.rookie.src = BOT_SPRITES.rookie;
    botImages.balanced.src = BOT_SPRITES.balanced;
    botImages.apex.src = BOT_SPRITES.apex;

    const allImages = [...playerImages, ...Object.values(botImages)];
    let loaded = 0;

    const done = () => {
      loaded += 1;
      if (mounted && loaded === allImages.length) {
        setAssetsReady(true);
      }
    };

    allImages.forEach((img) => {
      if (img.complete) {
        done();
      } else {
        img.onload = done;
        img.onerror = done;
      }
    });

    spritesRef.current = { player: playerImages, bots: botImages };

    return () => {
      mounted = false;
      allImages.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, []);

  useEffect(() => {
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, TETROMAZE: true },
    }));
    checkAchievements({
      custom: { modes_visited_all: countTrue(next.modesVisited) >= TOTAL_GAME_MODES },
    });
  }, [checkAchievements, updateStats]);

  useEffect(() => {
    // Incrémente un tick de rendu avec RAF pour animer/interpoler en continu.
    let rafId = 0;
    const tick = () => {
      setRenderTick((value) => (value + 1) % 1000000);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const isMoveKey = (key: string) =>
      key === "arrowup" ||
      key === "w" ||
      key === "z" ||
      key === "arrowdown" ||
      key === "s" ||
      key === "arrowleft" ||
      key === "a" ||
      key === "q" ||
      key === "arrowright" ||
      key === "d";

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        key === "arrowup" ||
        key === "arrowdown" ||
        key === "arrowleft" ||
        key === "arrowright"
      ) {
        event.preventDefault();
      }
      if (key === "arrowup" || key === "w" || key === "z") inputDirRef.current = "UP";
      if (key === "arrowdown" || key === "s") inputDirRef.current = "DOWN";
      if (key === "arrowleft" || key === "a" || key === "q") inputDirRef.current = "LEFT";
      if (key === "arrowright" || key === "d") inputDirRef.current = "RIGHT";
      if (isMoveKey(key)) {
        movementActiveRef.current = true;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    // Boucle de simulation principale (déplacement joueur + IA bots + collisions).
    const interval = window.setInterval(() => {
      setState((prev) => {
        if (prev.status !== "running") return prev;

        const now = Date.now();
        const hackActive = now < prev.hackUntil;
        const glitchActive = now < prev.glitchUntil;
        const overclockActive = now < prev.overclockUntil;
        const freezeActive = now < prev.freezeUntil;
        const magnetActive = now < prev.magnetUntil && !!prev.magnetTarget;
        const firewallActive = now < prev.firewallUntil && !!prev.firewallCell;
        const ghostActive = now < prev.ghostUntil;
        const desyncActive = now < prev.desyncUntil;
        const mirrorActive = now < prev.mirrorUntil;
        const overheatActive = now < prev.overheatUntil;
        const neuralLagActive = now < prev.neuralLagUntil;
        const corruptionActive = now < prev.corruptionUntil;
        const virusActive = now < prev.virusUntil && !!prev.virusHostBotId;
        const safeActive = now < prev.safeUntil;
        const dynamicClosedCell = firewallActive
          ? prev.firewallCell
          : corruptionActive
            ? prev.corruptionClosedCell
            : null;
        const dynamicOpenCell = corruptionActive ? prev.corruptionOpenCell : null;
        const playerSteps = overclockActive ? 2 : 1;

        let nextState: GameState = {
          ...prev,
          tick: prev.tick + 1,
          dataOrbs: new Set(prev.dataOrbs),
          powerOrbs: new Map(prev.powerOrbs),
          bots: prev.bots.map((b) => ({
            ...b,
            pos: { ...b.pos },
            prevPos: { ...b.prevPos },
            spawn: { ...b.spawn },
          })),
        };

        const shouldMovePlayer = movementActiveRef.current && inputDirRef.current;
        if (shouldMovePlayer) {
          for (let step = 0; step < playerSteps; step += 1) {
            const desiredDir = inputDirRef.current ?? nextState.playerDir;
            let candidate = nextPos(nextState.playerPos.x, nextState.playerPos.y, desiredDir);
            let chosenDir = desiredDir;

            if (
              !canMoveDynamic(
                level.grid,
                candidate.x,
                candidate.y,
                dynamicClosedCell,
                dynamicOpenCell
              )
            ) {
              candidate = nextPos(
                nextState.playerPos.x,
                nextState.playerPos.y,
                nextState.playerDir
              );
              chosenDir = nextState.playerDir;
            }

            if (
              canMoveDynamic(
                level.grid,
                candidate.x,
                candidate.y,
                dynamicClosedCell,
                dynamicOpenCell
              )
            ) {
              nextState.playerPos = candidate;
              nextState.playerDir = chosenDir;
            }

            if (level.loopPairs?.length) {
              const playerKey = toKey(nextState.playerPos.x, nextState.playerPos.y);
              for (const pair of level.loopPairs) {
                const a = toKey(pair.a.x, pair.a.y);
                const b = toKey(pair.b.x, pair.b.y);
                if (playerKey === a) nextState.playerPos = { ...pair.b };
                if (playerKey === b) nextState.playerPos = { ...pair.a };
              }
            }

            const orbKey = toKey(nextState.playerPos.x, nextState.playerPos.y);
            if (nextState.dataOrbs.has(orbKey)) {
              nextState.dataOrbs.delete(orbKey);
              nextState.score += 10;
            }

            const power = nextState.powerOrbs.get(orbKey);
            if (!power) continue;

            nextState.powerOrbs.delete(orbKey);
            nextState.score += 50;

            if (power === "OVERCLOCK") nextState.overclockUntil = now + OVERCLOCK_MS;
            if (power === "GLITCH") nextState.glitchUntil = now + GLITCH_MS;
            if (power === "HACK") nextState.hackUntil = now + HACK_MS;
            if (power === "LOOP" && level.loopPairs?.length) {
              const pair = level.loopPairs[0];
              const aDist = manhattan(nextState.playerPos, pair.a);
              const bDist = manhattan(nextState.playerPos, pair.b);
              nextState.playerPos = aDist <= bDist ? { ...pair.b } : { ...pair.a };
            }
            if (power === "FREEZE_PROTOCOL") nextState.freezeUntil = now + FREEZE_MS;
            if (power === "MAGNET_FIELD") {
              nextState.magnetUntil = now + MAGNET_MS;
              nextState.magnetTarget = nearestWalkableAround(
                level.grid,
                {
                  x: nextState.playerPos.x + (nextState.playerDir === "LEFT" ? 5 : nextState.playerDir === "RIGHT" ? -5 : 0),
                  y: nextState.playerPos.y + (nextState.playerDir === "UP" ? 5 : nextState.playerDir === "DOWN" ? -5 : 0),
                },
                dynamicClosedCell,
                dynamicOpenCell
              );
            }
            if (power === "FIREWALL") {
              nextState.firewallUntil = now + FIREWALL_MS;
              nextState.firewallCell = nearestWalkableAround(
                level.grid,
                nextPos(nextState.playerPos.x, nextState.playerPos.y, nextState.playerDir),
                null,
                null
              );
            }
            if (power === "GHOST_MODE") nextState.ghostUntil = now + GHOST_MS;
            if (power === "DESYNC") nextState.desyncUntil = now + DESYNC_MS;
            if (power === "MIRROR_SIGNAL") nextState.mirrorUntil = now + MIRROR_MS;
            if (power === "OVERHEAT") nextState.overheatUntil = now + OVERHEAT_MS;
            if (power === "NEURAL_LAG") nextState.neuralLagUntil = now + NEURAL_LAG_MS;
            if (power === "SCAN") nextState.scanUntil = now + SCAN_MS;

            if (power === "PULSE_WAVE") {
              nextState.bots = nextState.bots.map((bot) => {
                const distance = manhattan(bot.pos, nextState.playerPos);
                if (distance > 3) return bot;
                const valid = getValidMovesDynamic(
                  level.grid,
                  bot.pos.x,
                  bot.pos.y,
                  dynamicClosedCell,
                  dynamicOpenCell
                );
                const away = valid
                  .map((move) => move.pos)
                  .sort(
                    (a, b) =>
                      manhattan(b, nextState.playerPos) - manhattan(a, nextState.playerPos)
                  )[0];
                if (!away) return bot;
                return { ...bot, prevPos: { ...bot.pos }, pos: away, lastMoveAt: now };
              });
            }

            if (power === "RANDOMIZER") {
              const active = nextState.bots.filter((bot) => bot.respawnAt <= now);
              const shuffled = [...active.map((bot) => ({ ...bot.pos }))].sort(
                () => Math.random() - 0.5
              );
              let idx = 0;
              nextState.bots = nextState.bots.map((bot) => {
                if (bot.respawnAt > now) return bot;
                const pos = shuffled[idx] ?? bot.pos;
                idx += 1;
                return { ...bot, prevPos: { ...bot.pos }, pos: { ...pos }, lastMoveAt: now };
              });
            }

            if (power === "CORRUPTION") {
              nextState.corruptionUntil = now + CORRUPTION_MS;
              const nearbyWall = nearestWalkableAround(
                level.grid,
                nextState.playerPos,
                null,
                { ...nextState.playerPos }
              );
              const nearbyOpen = nearestWalkableAround(
                level.grid,
                nextPos(nextState.playerPos.x, nextState.playerPos.y, nextState.playerDir),
                null,
                null
              );
              nextState.corruptionOpenCell = nearbyWall;
              nextState.corruptionClosedCell = nearbyOpen;
            }

            if (power === "VIRUS") {
              const host = chooseRandom(nextState.bots);
              nextState.virusUntil = now + VIRUS_MS;
              nextState.virusHostBotId = host?.id ?? null;
            }
          }
        }

        const player = nextState.playerPos;
        const trackingPlayer = desyncActive ? prev.playerPos : player;
        const botTarget = magnetActive && prev.magnetTarget ? prev.magnetTarget : trackingPlayer;

        if (!freezeActive && now >= nextState.botWakeUntil) {
          nextState.bots = nextState.bots.map((bot) => {
            if (bot.respawnAt > now) return bot;
            let interval = BOT_MOVE_INTERVAL[bot.kind];
            if (overheatActive) interval = Math.max(2, interval - 1);
            if (neuralLagActive && bot.kind === "apex") interval += 2;
            if (virusActive && bot.id !== prev.virusHostBotId) interval += 2;
            if (nextState.tick % interval !== 0) return bot;

            const moves = getValidMovesDynamic(
              level.grid,
              bot.pos.x,
              bot.pos.y,
              dynamicClosedCell,
              dynamicOpenCell
            );
            if (!moves.length) return bot;

            const steps = 1;

            let pos = { ...bot.pos };
            const from = { ...bot.pos };
            for (let i = 0; i < steps; i += 1) {
              const valid = getValidMovesDynamic(
                level.grid,
                pos.x,
                pos.y,
                dynamicClosedCell,
                dynamicOpenCell
              );
              if (!valid.length) break;

              let targetStep: GridPos | null = null;

              if (glitchActive) {
                targetStep = chooseRandom(valid)?.pos ?? null;
              } else if (hackActive) {
                targetStep = valid
                  .map((m) => m.pos)
                  .sort((a, b) => manhattan(b, player) - manhattan(a, player))[0];
              } else if (bot.kind === "rookie") {
                if (Math.random() < 0.3) {
                  targetStep = chooseRandom(valid)?.pos ?? null;
                } else {
                  targetStep = findNextStepDynamic(
                    level.grid,
                    pos,
                    botTarget,
                    dynamicClosedCell,
                    dynamicOpenCell
                  );
                }
              } else if (bot.kind === "balanced") {
                const chase = Math.floor(now / 4500) % 2 === 0;
                const predicted = {
                  x: botTarget.x + (nextState.playerDir === "LEFT" ? -2 : nextState.playerDir === "RIGHT" ? 2 : 0),
                  y: botTarget.y + (nextState.playerDir === "UP" ? -2 : nextState.playerDir === "DOWN" ? 2 : 0),
                };
                const target = chase ? clampTarget(level.grid, predicted, botTarget) : bot.spawn;
                targetStep = findNextStepDynamic(
                  level.grid,
                  pos,
                  target,
                  dynamicClosedCell,
                  dynamicOpenCell
                );
              } else {
                const cut = {
                  x: botTarget.x + (nextState.playerDir === "LEFT" ? -3 : nextState.playerDir === "RIGHT" ? 3 : 0),
                  y: botTarget.y + (nextState.playerDir === "UP" ? -3 : nextState.playerDir === "DOWN" ? 3 : 0),
                };
                const target = clampTarget(level.grid, cut, botTarget);
                targetStep = findNextStepDynamic(
                  level.grid,
                  pos,
                  target,
                  dynamicClosedCell,
                  dynamicOpenCell
                );
              }

              if (overheatActive && Math.random() < 0.35) {
                targetStep = chooseRandom(valid)?.pos ?? targetStep;
              }

              if (mirrorActive && targetStep) {
                const dir = targetStep.x > pos.x ? "RIGHT" : targetStep.x < pos.x ? "LEFT" : targetStep.y > pos.y ? "DOWN" : "UP";
                const mirrored = nextPos(pos.x, pos.y, oppositeDir(dir));
                if (canMoveDynamic(level.grid, mirrored.x, mirrored.y, dynamicClosedCell, dynamicOpenCell)) {
                  targetStep = mirrored;
                }
              }

              if (
                !targetStep ||
                !canMoveDynamic(
                  level.grid,
                  targetStep.x,
                  targetStep.y,
                  dynamicClosedCell,
                  dynamicOpenCell
                )
              ) {
                targetStep = chooseRandom(valid)?.pos ?? pos;
              }
              pos = targetStep;
            }

            const moved = pos.x !== from.x || pos.y !== from.y;
            if (!moved) return bot;
            return { ...bot, prevPos: from, pos, lastMoveAt: now };
          });
        }

        for (const bot of nextState.bots) {
          if (bot.respawnAt > now) continue;
          if (bot.pos.x === player.x && bot.pos.y === player.y) {
            if (freezeActive || hackActive) {
              bot.pos = { ...bot.spawn };
              bot.prevPos = { ...bot.spawn };
              bot.lastMoveAt = now;
              bot.respawnAt = now + 3000;
              nextState.score += CAPTURE_BONUS;
            } else if (!safeActive && !ghostActive) {
              if (nextState.lives > 1) {
                nextState.lives -= 1;
                nextState.playerPos = { ...level.playerSpawn };
                nextState.playerDir = "LEFT";
                nextState.safeUntil = now + START_SAFE_MS;
                nextState.botWakeUntil = now + BOT_WAKE_MS;
                nextState.bots = nextState.bots.map((b) => ({
                  ...b,
                  pos: { ...b.spawn },
                  prevPos: { ...b.spawn },
                  lastMoveAt: now,
                  respawnAt: now + 600,
                }));
              } else {
                nextState.lives = 0;
                nextState.status = "lost";
              }
              return nextState;
            }
          }
        }

        if (nextState.dataOrbs.size === 0) {
          nextState.status = "won";
          return nextState;
        }

        if (nextState.mode === "SURVIVAL") {
          const timeLeftMs = Math.max(0, prev.timeLeftMs - TICK_MS);
          nextState.timeLeftMs = timeLeftMs;
          if (timeLeftMs === 0) {
            nextState.status = "won";
            nextState.score += 500;
            return nextState;
          }
        }

        return nextState;
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [level.grid, level.loopPairs]);

  useEffect(() => {
    const prev = prevStateRef.current;
    const now = Date.now();

    if (prev.status !== "running" && state.status === "running") {
      pushChatLine("maze_start", undefined, true);
      const next = updateStats((old) => ({
        ...old,
        tetromazeRuns: old.tetromazeRuns + 1,
      }));
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_play_1: next.tetromazeRuns >= 1,
        },
      });
    }
    if (prev.status === "running" && state.status === "won") {
      pushChatLine("player_win", "rookie");
    }
    if (prev.status === "running" && state.status === "lost") {
      pushChatLine("player_lose", "apex");
    }

    const activeBots = state.bots.filter((bot) => bot.respawnAt <= now);
    const withDistance = activeBots
      .map((bot) => ({
        bot,
        dist: manhattan(bot.pos, state.playerPos),
      }))
      .sort((a, b) => a.dist - b.dist);
    const nearest = withDistance[0];
    const minDist = nearest?.dist ?? 999;

    const near = minDist <= 2;
    if (near && !wasNearRef.current) {
      nearStartAtRef.current = now;
      nearBotRef.current = nearest?.bot.kind ?? null;
      pushChatLine("player_near", nearest?.bot.kind);
    } else if (!near && wasNearRef.current) {
      nearStartAtRef.current = null;
      const escapedBot = nearBotRef.current;
      nearBotRef.current = null;
      pushChatLine("player_escape", escapedBot ?? nearest?.bot.kind ?? "rookie");
      const updated = updateStats((old) => ({
        ...old,
        tetromazeEscapesTotal: old.tetromazeEscapesTotal + 1,
        tetromazeEscapesRookie:
          old.tetromazeEscapesRookie + (escapedBot === "rookie" ? 1 : 0),
        tetromazeEscapesPulse:
          old.tetromazeEscapesPulse + (escapedBot === "balanced" ? 1 : 0),
        tetromazeEscapesApex:
          old.tetromazeEscapesApex + (escapedBot === "apex" ? 1 : 0),
      }));
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_close_escape: minDist <= 4,
          tm_escape_10: updated.tetromazeEscapesTotal >= 10,
          tm_escape_rookie_5: updated.tetromazeEscapesRookie >= 5,
          tm_escape_pulse_5: updated.tetromazeEscapesPulse >= 5,
          tm_escape_apex_5: updated.tetromazeEscapesApex >= 5,
        },
      });
    } else if (near && nearStartAtRef.current && now - nearStartAtRef.current > 7000) {
      nearStartAtRef.current = now;
      pushChatLine("long_chase", nearest?.bot.kind ?? "balanced");
    }
    wasNearRef.current = near;

    const closeBots = withDistance.filter((it) => it.dist <= 3).length;
    const multiNear = closeBots >= 2;
    if (multiNear && !wasMultiNearRef.current) {
      pushChatLine("multi_bot_near", undefined, true);
    }
    wasMultiNearRef.current = multiNear;
    if (closeBots >= 3) {
      checkAchievements({
        mode: "TETROMAZE",
        custom: { tm_encircled: true },
      });
    }

    const playerMoves = getValidMoves(level.grid, state.playerPos.x, state.playerPos.y).length;
    const cornered = playerMoves <= 1;
    if (cornered && !wasCorneredRef.current) {
      pushChatLine("cornered", "balanced");
    }
    wasCorneredRef.current = cornered;

    if (minDist <= 1 && state.status === "running" && now >= state.safeUntil) {
      pushChatLine("player_low_life", "apex");
    }

    const tookPowerUp = state.powerOrbs.size < prev.powerOrbs.size;
    if (tookPowerUp) {
      const collectedPowerTypes = Array.from(prev.powerOrbs.entries())
        .filter(([key]) => !state.powerOrbs.has(key))
        .map(([, type]) => type);
      const collectedType = collectedPowerTypes[collectedPowerTypes.length - 1];
      const powerEvent = collectedType ? POWERUP_EVENT_BY_TYPE[collectedType] : undefined;
      const preferredSpeaker =
        collectedType === "NEURAL_LAG" ? "apex" : nearest?.bot.kind ?? "balanced";
      pushChatLine(powerEvent ?? "powerup_taken", preferredSpeaker);
      runEffectsRef.current += 1;
      const next = updateStats((old) => ({
        ...old,
        tetromazePowerUses: old.tetromazePowerUses + 1,
      }));
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_power_used: next.tetromazePowerUses >= 1,
          tm_5_effects: runEffectsRef.current >= 5,
        },
      });
    }

    if (state.score >= prev.score + CAPTURE_BONUS && state.score !== prev.score) {
      pushChatLine("bot_stunned", nearest?.bot.kind ?? "rookie");
      runCapturesRef.current += 1;
      const next = updateStats((old) => ({
        ...old,
        tetromazeCaptures: old.tetromazeCaptures + 1,
      }));
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_capture_3: runCapturesRef.current >= 3 || next.tetromazeCaptures >= 3,
          tm_stun_3:
            state.bots.filter((bot) => bot.respawnAt > now).length >= 3,
        },
      });
    }

    if (state.lives < prevLivesRef.current) {
      runNoHitRef.current = false;
    }
    prevLivesRef.current = state.lives;

    if (state.status === "running") {
      if (minDist > 4) {
        if (undetectedStartRef.current === null) undetectedStartRef.current = now;
      } else {
        undetectedStartRef.current = null;
      }

      if (undetectedStartRef.current && now - undetectedStartRef.current >= 30000) {
        checkAchievements({
          mode: "TETROMAZE",
          custom: { tm_30s_undetected: true },
        });
      }

      const posKey = toKey(state.playerPos.x, state.playerPos.y);
      const path = loopPathRef.current;
      path.push(posKey);
      if (path.length > 30) path.shift();
      const unique = new Set(path).size;
      if (unique <= 4 && path.length >= 18) {
        if (loopStartRef.current === null) loopStartRef.current = now;
      } else {
        loopStartRef.current = null;
      }
      if (loopStartRef.current && now - loopStartRef.current >= 10000) {
        checkAchievements({
          mode: "TETROMAZE",
          custom: { tm_loop_10s: true },
        });
      }
    }

    prevStateRef.current = state;
  }, [checkAchievements, level.grid, state, updateStats]);

  useEffect(() => {
    // Rendu complet canvas: grille, objets, bot home, bots, joueur.
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = Date.now();
    const hackActive = now < state.hackUntil;
    const glitchActive = now < state.glitchUntil;
    const freezeActive = now < state.freezeUntil;
    const magnetActive = now < state.magnetUntil && !!state.magnetTarget;
    const ghostActive = now < state.ghostUntil;
    const desyncActive = now < state.desyncUntil;
    const mirrorActive = now < state.mirrorUntil;
    const overheatActive = now < state.overheatUntil;
    const neuralLagActive = now < state.neuralLagUntil;
    const firewallActive = now < state.firewallUntil && !!state.firewallCell;
    const corruptionActive = now < state.corruptionUntil;
    const scanActive = now < state.scanUntil;
    const virusActive = now < state.virusUntil;
    const safeActive = now < state.safeUntil;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < level.grid.length; y += 1) {
      for (let x = 0; x < level.grid[y].length; x += 1) {
        const px = x * TILE;
        const py = y * TILE;
        const wall = level.grid[y][x] === "#";

        ctx.fillStyle = wall ? "#13203f" : "#080c16";
        ctx.fillRect(px, py, TILE, TILE);

        if (wall) {
          ctx.strokeStyle = "#3fc0ff";
          ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
        }
      }
    }

    state.dataOrbs.forEach((key) => {
      const [x, y] = key.split(",").map(Number);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      ctx.fillStyle = "#63f6ff";
      ctx.beginPath();
      ctx.arc(cx, cy, TILE * 0.12, 0, Math.PI * 2);
      ctx.fill();
    });

    state.powerOrbs.forEach((type, key) => {
      const [x, y] = key.split(",").map(Number);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      ctx.fillStyle = ORB_COLORS[type];
      ctx.beginPath();
      ctx.arc(cx, cy, TILE * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    if (firewallActive && state.firewallCell) {
      ctx.fillStyle = "rgba(255, 112, 82, 0.45)";
      ctx.fillRect(
        state.firewallCell.x * TILE + TILE * 0.1,
        state.firewallCell.y * TILE + TILE * 0.1,
        TILE * 0.8,
        TILE * 0.8
      );
    }

    if (corruptionActive) {
      if (state.corruptionOpenCell) {
        ctx.fillStyle = "rgba(126, 255, 149, 0.35)";
        ctx.fillRect(
          state.corruptionOpenCell.x * TILE + TILE * 0.15,
          state.corruptionOpenCell.y * TILE + TILE * 0.15,
          TILE * 0.7,
          TILE * 0.7
        );
      }
      if (state.corruptionClosedCell) {
        ctx.fillStyle = "rgba(255, 76, 76, 0.35)";
        ctx.fillRect(
          state.corruptionClosedCell.x * TILE + TILE * 0.15,
          state.corruptionClosedCell.y * TILE + TILE * 0.15,
          TILE * 0.7,
          TILE * 0.7
        );
      }
    }

    if (level.loopPairs?.length) {
      ctx.fillStyle = "#4b3a9f";
      for (const pair of level.loopPairs) {
        for (const point of [pair.a, pair.b]) {
          ctx.fillRect(point.x * TILE + TILE * 0.2, point.y * TILE + TILE * 0.2, TILE * 0.6, TILE * 0.6);
        }
      }
    }

    if (level.botHome) {
      const { x, y, width, height, gate } = level.botHome;
      const homeX = x * TILE;
      const homeY = y * TILE;
      const homeW = width * TILE;
      const homeH = height * TILE;

      ctx.fillStyle = "rgba(13, 20, 41, 0.84)";
      ctx.fillRect(homeX, homeY, homeW, homeH);
      ctx.strokeStyle = "#62e2ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(homeX + 1, homeY + 1, homeW - 2, homeH - 2);

      if (gate) {
        ctx.fillStyle = "#ff86db";
        ctx.fillRect(gate.x * TILE + 2, gate.y * TILE + TILE * 0.44, gate.width * TILE - 4, TILE * 0.12);
      }
    }

    for (const bot of state.bots) {
      if (bot.respawnAt > now) continue;
      const size = TILE * 0.95;
      const moveDuration = BOT_MOVE_INTERVAL[bot.kind] * TICK_MS;
      const t = Math.max(0, Math.min(1, (now - bot.lastMoveAt) / moveDuration));
      const drawX = bot.prevPos.x + (bot.pos.x - bot.prevPos.x) * t;
      const drawY = bot.prevPos.y + (bot.pos.y - bot.prevPos.y) * t;
      const x = drawX * TILE + (TILE - size) / 2;
      const y = drawY * TILE + (TILE - size) / 2;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const sprite = spritesRef.current?.bots[bot.kind];

      if (assetsReady && sprite) {
        drawSprite(ctx, sprite, x, y, size);
      } else {
        ctx.fillStyle = "#67b2ff";
        ctx.beginPath();
        ctx.arc(cx, cy, TILE * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }

      if (hackActive) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 120);
        ctx.strokeStyle = `rgba(255, 137, 255, ${0.45 + pulse * 0.45})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
      }
      if (freezeActive) {
        ctx.strokeStyle = "#9bd7ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
      }
      if (glitchActive) {
        ctx.strokeStyle = "rgba(142, 255, 245, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 5);
        ctx.lineTo(x + size - 5, y + size - 5);
        ctx.moveTo(x + size - 5, y + 5);
        ctx.lineTo(x + 5, y + size - 5);
        ctx.stroke();
      }
      if (magnetActive && state.magnetTarget) {
        ctx.strokeStyle = "rgba(91, 231, 196, 0.7)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          state.magnetTarget.x * TILE + TILE / 2,
          state.magnetTarget.y * TILE + TILE / 2
        );
        ctx.stroke();
      }
      if (desyncActive) {
        ctx.strokeStyle = "rgba(110, 200, 255, 0.7)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 2, size - 10, size - 10);
      }
      if (mirrorActive) {
        ctx.strokeStyle = "rgba(255, 216, 109, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - TILE * 0.2, cy);
        ctx.lineTo(cx + TILE * 0.2, cy);
        ctx.moveTo(cx, cy - TILE * 0.2);
        ctx.lineTo(cx, cy + TILE * 0.2);
        ctx.stroke();
      }
      if (overheatActive) {
        ctx.strokeStyle = "rgba(255, 76, 76, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE * 0.31, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (neuralLagActive && bot.kind === "apex") {
        ctx.strokeStyle = "rgba(138, 166, 255, 0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE * 0.36, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (corruptionActive) {
        ctx.strokeStyle = "rgba(126, 255, 149, 0.75)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
      }
      if (state.virusHostBotId === bot.id && virusActive) {
        ctx.strokeStyle = "#9cff6a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (virusActive) {
        ctx.strokeStyle = "rgba(156, 255, 106, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE * 0.28, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (scanActive) {
        const next = findNextStepBfs(level.grid, bot.pos, state.playerPos);
        if (next) {
          ctx.strokeStyle = "rgba(95, 209, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + size / 2, y + size / 2);
          ctx.lineTo(next.x * TILE + TILE / 2, next.y * TILE + TILE / 2);
          ctx.stroke();
        }
      }

      if (ghostActive) {
        ctx.strokeStyle = "#f7a6ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
      }
    }

    const playerSize = TILE * 1.02;
    const playerX = state.playerPos.x * TILE + (TILE - playerSize) / 2;
    const playerY = state.playerPos.y * TILE + (TILE - playerSize) / 2;

    if (safeActive) {
      ctx.fillStyle = "rgba(132, 224, 255, 0.25)";
      ctx.beginPath();
      ctx.arc(playerX + playerSize / 2, playerY + playerSize / 2, TILE * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (ghostActive) {
      ctx.fillStyle = "rgba(255, 110, 248, 0.25)";
      ctx.beginPath();
      ctx.arc(playerX + playerSize / 2, playerY + playerSize / 2, TILE * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    const playerFrames = spritesRef.current?.player ?? [];
    const animIdx = state.status === "running" ? Math.floor(now / PLAYER_ANIM_MS) % 2 : 0;
    const frame = playerFrames[animIdx] ?? playerFrames[0];

    if (assetsReady && frame) {
      drawSprite(ctx, frame, playerX, playerY, playerSize, state.playerDir);
    } else {
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(playerX + playerSize / 2, playerY + playerSize / 2, TILE * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [assetsReady, level.grid, level.loopPairs, renderTick, state]);

  const startRun = () => {
    setState((prev) => {
      const now = Date.now();
      const next = createInitialState(prev.mode, level);
      inputDirRef.current = null;
      movementActiveRef.current = false;
      outcomeSavedRef.current = null;
      nearBotRef.current = null;
      prevLivesRef.current = 3;
      runEffectsRef.current = 0;
      runCapturesRef.current = 0;
      runNoHitRef.current = true;
      undetectedStartRef.current = now;
      loopStartRef.current = null;
      loopPathRef.current = [];
      return {
        ...next,
        status: "running",
        startedAt: now,
        safeUntil: now + START_SAFE_MS,
        botWakeUntil: now + BOT_WAKE_MS,
      };
    });
  };

  const changeMode = (nextMode: TetromazeMode) => {
    inputDirRef.current = null;
    movementActiveRef.current = false;
    outcomeSavedRef.current = null;
    nearBotRef.current = null;
    prevLivesRef.current = 3;
    runEffectsRef.current = 0;
    runCapturesRef.current = 0;
    runNoHitRef.current = true;
    undetectedStartRef.current = null;
    loopStartRef.current = null;
    loopPathRef.current = [];
    setState(createInitialState(nextMode, level));
  };

  const loadLevel = (nextIndex: number, keepMode: TetromazeMode = state.mode) => {
    const safe = clampLevelIndex(nextIndex);
    const nextLevel = getTetromazeCampaignLevel(safe);
    setIsCustomLevel(false);
    setLevelIndex(safe);
    setLevel(nextLevel);
    inputDirRef.current = null;
    movementActiveRef.current = false;
    outcomeSavedRef.current = null;
    setState(createInitialState(keepMode, nextLevel));
    setChatLines({ rookie: null, balanced: null, apex: null });
    nearStartAtRef.current = null;
    wasNearRef.current = false;
    wasCorneredRef.current = false;
    wasMultiNearRef.current = false;
    nearBotRef.current = null;
    prevLivesRef.current = 3;
    runEffectsRef.current = 0;
    runCapturesRef.current = 0;
    runNoHitRef.current = true;
    undetectedStartRef.current = null;
    loopStartRef.current = null;
    loopPathRef.current = [];
  };

  const replayLevel = () => {
    if (isCustomLevel) {
      inputDirRef.current = null;
      movementActiveRef.current = false;
      outcomeSavedRef.current = null;
      nearBotRef.current = null;
      prevLivesRef.current = 3;
      runEffectsRef.current = 0;
      runCapturesRef.current = 0;
      runNoHitRef.current = true;
      undetectedStartRef.current = null;
      loopStartRef.current = null;
      loopPathRef.current = [];
      setState(createInitialState(state.mode, level));
      return;
    }
    loadLevel(levelIndex, state.mode);
  };

  const goToNextLevel = () => {
    if (isCustomLevel) return;
    if (levelIndex >= TETROMAZE_TOTAL_LEVELS) return;
    loadLevel(levelIndex + 1, state.mode);
  };

  const quitTetromaze = () => {
    navigate("/tetromaze");
  };

  useEffect(() => {
    if (state.status !== "won" && state.status !== "lost") return;
    const outcomeKey = `${state.startedAt}-${levelIndex}-${state.status}`;
    if (outcomeSavedRef.current === outcomeKey) return;
    outcomeSavedRef.current = outcomeKey;

    if (isCustomLevel || isCommunityLevel) {
      if (state.status === "won") {
        if (isCustomLevel) {
          markTetromazeCustomLevelCompleted(level);
        }
        const nextStats = updateStats((old) => ({
          ...old,
          tetromazeWins: old.tetromazeWins + 1,
        }));
        checkAchievements({
          mode: "TETROMAZE",
          custom: { tm_win_1: nextStats.tetromazeWins >= 1 },
        });
      }
      return;
    }

    const nextLevelOnWin =
      state.status === "won" ? clampLevelIndex(levelIndex + 1) : levelIndex;

    persistProgress({
      levelIndex,
      score: state.score,
      highestLevel: state.status === "won" ? nextLevelOnWin : levelIndex,
      currentLevel: nextLevelOnWin,
    });

    if (state.status === "won") {
      const elapsedMs = Math.max(0, Date.now() - state.startedAt);
      const noDamage = state.lives === 3;
      recordPlayerBehavior({
        mode: "TETROMAZE",
        won: true,
        durationMs: elapsedMs,
        mistakes: [
          ...(state.lives < 3 ? (["damage_taken"] as const) : []),
          ...(elapsedMs > 60_000 ? (["slow"] as const) : []),
        ],
      });
      const nextStats = updateStats((old) => ({
        ...old,
        tetromazeWins: old.tetromazeWins + 1,
      }));
      if (noDamage && elapsedMs <= 60_000) {
        recordTetrobotEvent({ type: "rookie_tip_followed" });
      }
      if (nextStats.tetromazeWins === 1 || levelIndex >= 8 || (runNoHitRef.current && noDamage)) {
        recordTetrobotEvent({ type: "pulse_advice_success" });
      }
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_win_1: nextStats.tetromazeWins >= 1,
          tm_world1_clear: levelIndex >= 8,
          tm_campaign_clear: levelIndex >= TETROMAZE_TOTAL_LEVELS,
          tm_no_hit: runNoHitRef.current && state.lives === 3,
          tm_under_60s: elapsedMs <= 60000,
          tm_5_effects: runEffectsRef.current >= 5,
          tm_capture_3: runCapturesRef.current >= 3,
        },
      });
    } else {
      recordPlayerBehavior({
        mode: "TETROMAZE",
        won: false,
        durationMs: Math.max(0, Date.now() - state.startedAt),
        mistakes: ["top_out", ...(state.lives < 3 ? (["damage_taken"] as const) : [])],
      });
      checkAchievements({
        mode: "TETROMAZE",
        custom: {
          tm_capture_3: runCapturesRef.current >= 3,
          tm_5_effects: runEffectsRef.current >= 5,
        },
      });
    }
  }, [
    checkAchievements,
    isCommunityLevel,
    isCustomLevel,
    level,
    levelIndex,
    recordPlayerBehavior,
    recordTetrobotEvent,
    state.lives,
    state.score,
    state.startedAt,
    state.status,
    updateStats,
  ]);

  const handleCommunityLike = async () => {
    if (!user || !communityLevel || communityLevel.isOwn || communityLikeBusy) return;
    setCommunityLikeBusy(true);
    try {
      const result = await toggleTetromazeCommunityLevelLike(communityLevel.id);
      setCommunityLevel({
        ...communityLevel,
        likedByMe: result.liked,
        likeCount: result.likeCount,
      });
      setCommunityError(null);
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : "Vote impossible");
    } finally {
      setCommunityLikeBusy(false);
    }
  };

  const message =
    state.status === "won"
      ? "Niveau complete"
      : state.status === "lost"
        ? "Interception par Tetrobots"
        : "";

  const timer = Math.ceil(state.timeLeftMs / 1000);
  const safeLeftMs = Math.max(0, state.safeUntil - Date.now());
  const bestScoreCurrentLevel = savedProgress.levelScores[String(levelIndex)] ?? 0;
  const isEndScreenVisible = state.status === "won" || state.status === "lost";

  if (communityLoading) {
    return (
      <div className="tetromaze-page">
        <header className="tetromaze-head">
          <h1>Tetromaze</h1>
        </header>
        <div className="tetromaze-main">
          <section className="tetromaze-panel">
            <p>Chargement du niveau joueur...</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="tetromaze-page">
      <header className="tetromaze-head">
        <h1>Tetromaze</h1>
      </header>

      <div className="tetromaze-main">
        <div className="tetromaze-left">
          <section className="tetromaze-panel">
            <div className="tetromaze-meta">
              <div>
                {communityLevel
                  ? `Mode: Niveau joueur par ${communityLevel.authorPseudo}`
                  : isCustomLevel
                  ? "Mode: Niveau custom"
                  : `Campagne: Monde ${worldStage.world} - Niveau ${worldStage.stage}`}
              </div>
              {!isCustomLevel && !isCommunityLevel && <div>Progression: {levelIndex}/{TETROMAZE_TOTAL_LEVELS}</div>}
              <div>{level.name ?? `Tetromaze ${levelIndex}`}</div>
              {communityLevel && (
                <div>
                  Likes: {communityLevel.likeCount}
                  {communityLevel.likedByMe ? " (deja like)" : ""}
                </div>
              )}
              <div>Mode: {state.mode === "CLASSIC" ? "Classique Maze" : "Survie 120s"}</div>
              <div>Vies: {state.lives}/3</div>
              <div>Score: {state.score}</div>
              {!isCustomLevel && !isCommunityLevel && <div>Meilleur score niveau: {bestScoreCurrentLevel}</div>}
              <div>Data Orbs: {state.dataOrbs.size}</div>
              {!isCustomLevel && !isCommunityLevel && (
                <div>Sauvegarde: niveau {savedProgress.currentLevel} (max {savedProgress.highestLevel})</div>
              )}
              {state.mode === "SURVIVAL" && <div>Temps: {timer}s</div>}
              {state.status === "running" && safeLeftMs > 0 && (
                <div>Synchronisation: {Math.ceil(safeLeftMs / 1000)}s</div>
              )}
              <div className="tetromaze-seed">Seed: {state.seed}</div>
            </div>

            <div className="tetromaze-actions">
              <button type="button" onClick={startRun}>
                {state.status === "running" ? "Restart" : "Start"}
              </button>
              <button
                type="button"
                onClick={() => changeMode(state.mode === "CLASSIC" ? "SURVIVAL" : "CLASSIC")}
              >
                Basculer mode
              </button>
            </div>
          </section>
          {message ? <p className="tetromaze-message">{message}</p> : null}
          <div className="tetromaze-chatbot-list">
            {(["rookie", "balanced", "apex"] as TetrobotKind[]).map((botId) => {
              const line = chatLines[botId];
              return (
                <div className="tetromaze-chatbot" key={botId}>
                  <p
                    className="tetromaze-chatbot__speaker"
                    style={{ color: BOT_ACCENTS[botId] }}
                  >
                    {BOT_LABELS[botId]}
                  </p>
                  <p className="tetromaze-chatbot__text">
                    {line?.text ?? "..."}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="tetromaze-stage">
          <img src="/Tetromaze/hacker_pixel.png" alt="Hacker" className="tetromaze-deco tetromaze-deco--hacker" />
          <img src="/Tetromaze/rookie.png" alt="Rookie" className="tetromaze-deco tetromaze-deco--rookie" />
          <img src="/Tetromaze/pulse.png" alt="Pulse" className="tetromaze-deco tetromaze-deco--pulse" />
          <img src="/Tetromaze/apex.png" alt="Apex" className="tetromaze-deco tetromaze-deco--apex" />

          <div className="tetromaze-canvas-wrap">
            <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} />
          </div>
        </div>

        <div className="tetromaze-right">
          <ul className="tetromaze-legend">
            {levelPowerupTypes.map((type) => (
              <li key={type}>
                <span className="tetromaze-legend__item">
                  <span
                    className="tetromaze-legend__dot"
                    style={{ backgroundColor: ORB_COLORS[type] }}
                  />
                  {POWERUP_UI[type].name}
                  <span className="tetromaze-legend__tooltip">
                    {POWERUP_UI[type].description}
                  </span>
                </span>
              </li>
            ))}
            {levelPowerupTypes.length === 0 && (
              <li>
                <span className="tetromaze-legend__item">Aucun power-up sur ce niveau.</span>
              </li>
            )}
          </ul>

          <div className="tetromaze-controls">
            <button
              type="button"
              onClick={() => {
                inputDirRef.current = "UP";
                movementActiveRef.current = true;
              }}
            >
              ↑
            </button>
            <div>
              <button
                type="button"
                onClick={() => {
                  inputDirRef.current = "LEFT";
                  movementActiveRef.current = true;
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => {
                  inputDirRef.current = "DOWN";
                  movementActiveRef.current = true;
                }}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  inputDirRef.current = "RIGHT";
                  movementActiveRef.current = true;
                }}
              >
                →
              </button>
            </div>
          </div>

          <div className="tetromaze-livesbar" aria-label={`Vies restantes: ${state.lives} sur 3`}>
            <span>Vies restantes</span>
            <div className="tetromaze-livesbar__pips">
              {[0, 1, 2].map((slot) => (
                <span
                  key={slot}
                  className={`tetromaze-livesbar__pip ${slot < state.lives ? "is-on" : "is-off"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {isEndScreenVisible && (
        <div className="tetromaze-end-overlay" role="dialog" aria-modal="true">
          <div className="tetromaze-end-card">
            {state.status === "won" ? (
              <>
                <h2>Niveau termine</h2>
                <p>Score: {state.score}</p>
                <div className="tetromaze-end-actions">
                  {communityLevel && (
                    <button
                      type="button"
                      onClick={() => void handleCommunityLike()}
                      disabled={!user || communityLevel.isOwn || communityLikeBusy}
                    >
                      {communityLevel.isOwn
                        ? "Ton niveau"
                        : communityLevel.likedByMe
                          ? "Retirer like"
                          : "Liker"}
                    </button>
                  )}
                  {!isCustomLevel && !isCommunityLevel && (
                    <button
                      type="button"
                      onClick={goToNextLevel}
                      disabled={levelIndex >= TETROMAZE_TOTAL_LEVELS}
                    >
                      Niveau suivant
                    </button>
                  )}
                  <button type="button" onClick={replayLevel}>
                    Rejouer le niveau
                  </button>
                  <button type="button" onClick={quitTetromaze}>
                    {isCustomLevel || isCommunityLevel ? "Retour hub" : "Quitter"}
                  </button>
                </div>
                {communityLevel && communityError && <p>{communityError}</p>}
              </>
            ) : (
              <>
                <h2>Game Over</h2>
                <p>Score: {state.score}</p>
                <div className="tetromaze-end-actions">
                  <button type="button" onClick={replayLevel}>
                    Rejouer
                  </button>
                  <button type="button" onClick={quitTetromaze}>
                    Quitter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
