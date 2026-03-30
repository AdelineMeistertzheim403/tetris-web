import { CONTROL_ACTIONS, type ControlAction } from "../types/Controls";

export type KeyBindings = Record<ControlAction, string>;
export type TetrisControlMode =
  | "CLASSIQUE"
  | "SPRINT"
  | "VERSUS"
  | "ROGUELIKE"
  | "ROGUELIKE_VERSUS"
  | "PUZZLE";
export type StandaloneControlMode =
  | "BRICKFALL_SOLO"
  | "TETROMAZE"
  | "PIXEL_INVASION"
  | "PIXEL_PROTOCOL";
export type BrickfallControlAction = "left" | "right" | "launch";
export type TetromazeControlAction = "up" | "down" | "left" | "right";
export type PixelInvasionControlAction = "left" | "right" | "shoot" | "dash" | "bomb";
export type PixelProtocolControlAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "jump"
  | "dash"
  | "hack"
  | "grapple"
  | "phaseShift"
  | "pulseShock"
  | "overclock"
  | "timeBuffer"
  | "platformSpawn"
  | "respawn";
export type ControlSettingsMode = TetrisControlMode | StandaloneControlMode;
export type ModeKeyBindings = {
  CLASSIQUE: KeyBindings;
  SPRINT: KeyBindings;
  VERSUS: KeyBindings;
  ROGUELIKE: KeyBindings;
  ROGUELIKE_VERSUS: KeyBindings;
  PUZZLE: KeyBindings;
  BRICKFALL_SOLO: Record<BrickfallControlAction, string>;
  TETROMAZE: Record<TetromazeControlAction, string>;
  PIXEL_INVASION: Record<PixelInvasionControlAction, string>;
  PIXEL_PROTOCOL: Record<PixelProtocolControlAction, string>;
};

type KeyBindingSource = {
  keyBindings?: Partial<KeyBindings> | null;
  modeKeyBindings?: Partial<ModeKeyBindings> | null;
};

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  left: "ArrowLeft",
  right: "ArrowRight",
  down: "ArrowDown",
  rotate: "ArrowUp",
  harddrop: "Space",
  hold: "Shift",
  bomb: "B",
  freeze: "F",
};

export const TETRIS_CONTROL_MODE_ORDER: TetrisControlMode[] = [
  "CLASSIQUE",
  "SPRINT",
  "VERSUS",
  "ROGUELIKE",
  "ROGUELIKE_VERSUS",
  "PUZZLE",
];

export const STANDALONE_CONTROL_MODE_ORDER: StandaloneControlMode[] = [
  "BRICKFALL_SOLO",
  "TETROMAZE",
  "PIXEL_INVASION",
  "PIXEL_PROTOCOL",
];

export const CONTROL_MODE_ORDER: ControlSettingsMode[] = [
  ...TETRIS_CONTROL_MODE_ORDER,
  ...STANDALONE_CONTROL_MODE_ORDER,
];

export const CONTROL_MODE_LABELS: Record<ControlSettingsMode, string> = {
  CLASSIQUE: "Classique",
  SPRINT: "Sprint",
  VERSUS: "Versus",
  ROGUELIKE: "Roguelike",
  ROGUELIKE_VERSUS: "Roguelike Versus",
  PUZZLE: "Puzzle",
  BRICKFALL_SOLO: "Brickfall Solo",
  TETROMAZE: "Tetromaze",
  PIXEL_INVASION: "Pixel Invasion",
  PIXEL_PROTOCOL: "Pixel Protocol",
};

export const CONTROL_MODE_DESCRIPTIONS: Record<ControlSettingsMode, string> = {
  CLASSIQUE: "Bindings du mode Tetris classique.",
  SPRINT: "Touches dediees au mode Sprint.",
  VERSUS: "Controls pour les matchs versus.",
  ROGUELIKE: "Bindings de la campagne roguelike.",
  ROGUELIKE_VERSUS: "Touches du roguelike versus.",
  PUZZLE: "Controls pour les runs puzzle.",
  BRICKFALL_SOLO: "Deplacement de la raquette et lancement.",
  TETROMAZE: "Deplacements dans les labyrinthes.",
  PIXEL_INVASION: "Pilotage du shooter arcade.",
  PIXEL_PROTOCOL: "Deplacements et modules du platformer.",
};

export const TETRIS_STANDARD_CONTROL_ACTIONS: readonly ControlAction[] = [
  "left",
  "right",
  "down",
  "rotate",
  "harddrop",
  "hold",
];
export const BRICKFALL_CONTROL_ACTIONS: BrickfallControlAction[] = ["left", "right", "launch"];
export const TETROMAZE_CONTROL_ACTIONS: TetromazeControlAction[] = [
  "up",
  "down",
  "left",
  "right",
];
export const PIXEL_INVASION_CONTROL_ACTIONS: PixelInvasionControlAction[] = [
  "left",
  "right",
  "shoot",
  "dash",
  "bomb",
];
export const PIXEL_PROTOCOL_CONTROL_ACTIONS: PixelProtocolControlAction[] = [
  "left",
  "right",
  "up",
  "down",
  "jump",
  "dash",
  "hack",
  "grapple",
  "phaseShift",
  "pulseShock",
  "overclock",
  "timeBuffer",
  "platformSpawn",
  "respawn",
];

export const controlActionLabels: Record<ControlAction, string> = {
  left: "Deplacer a gauche",
  right: "Deplacer a droite",
  down: "Accelerer",
  rotate: "Rotation",
  harddrop: "Hard Drop",
  hold: "Hold",
  bomb: "Bombe",
  freeze: "Time Freeze",
};

export const brickfallControlActionLabels: Record<BrickfallControlAction, string> = {
  left: "Raquette a gauche",
  right: "Raquette a droite",
  launch: "Lancer la balle",
};

export const tetromazeControlActionLabels: Record<TetromazeControlAction, string> = {
  up: "Monter",
  down: "Descendre",
  left: "Aller a gauche",
  right: "Aller a droite",
};

export const pixelInvasionControlActionLabels: Record<PixelInvasionControlAction, string> = {
  left: "Deplacement gauche",
  right: "Deplacement droite",
  shoot: "Tir",
  dash: "Dash",
  bomb: "Bombe",
};

export const pixelProtocolControlActionLabels: Record<PixelProtocolControlAction, string> = {
  left: "Deplacement gauche",
  right: "Deplacement droite",
  up: "Monter / viser vers le haut",
  down: "Descendre / viser vers le bas",
  jump: "Saut",
  dash: "Dash",
  hack: "Hack",
  grapple: "Data Grapple",
  phaseShift: "Phase Shift",
  pulseShock: "Pulse Shock",
  overclock: "Overclock",
  timeBuffer: "Time Buffer",
  platformSpawn: "Platform Spawn",
  respawn: "Respawn checkpoint",
};

const DEFAULT_BRICKFALL_KEY_BINDINGS: Record<BrickfallControlAction, string> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  launch: "Space",
};

const DEFAULT_TETROMAZE_KEY_BINDINGS: Record<TetromazeControlAction, string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

const DEFAULT_PIXEL_INVASION_KEY_BINDINGS: Record<PixelInvasionControlAction, string> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  shoot: "Space",
  dash: "Shift",
  bomb: "B",
};

const DEFAULT_PIXEL_PROTOCOL_KEY_BINDINGS: Record<PixelProtocolControlAction, string> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  jump: "Space",
  dash: "Shift",
  hack: "E",
  grapple: "G",
  phaseShift: "F",
  pulseShock: "Q",
  overclock: "C",
  timeBuffer: "X",
  platformSpawn: "V",
  respawn: "R",
};

/**
 * Uniformise la touche brute issue des evenements clavier.
 */
export const normalizeKey = (key: string) => {
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
};

function cloneTetrisDefaults(): KeyBindings {
  return { ...DEFAULT_KEY_BINDINGS };
}

export function createDefaultModeKeyBindings(): ModeKeyBindings {
  return {
    CLASSIQUE: cloneTetrisDefaults(),
    SPRINT: cloneTetrisDefaults(),
    VERSUS: cloneTetrisDefaults(),
    ROGUELIKE: cloneTetrisDefaults(),
    ROGUELIKE_VERSUS: cloneTetrisDefaults(),
    PUZZLE: cloneTetrisDefaults(),
    BRICKFALL_SOLO: { ...DEFAULT_BRICKFALL_KEY_BINDINGS },
    TETROMAZE: { ...DEFAULT_TETROMAZE_KEY_BINDINGS },
    PIXEL_INVASION: { ...DEFAULT_PIXEL_INVASION_KEY_BINDINGS },
    PIXEL_PROTOCOL: { ...DEFAULT_PIXEL_PROTOCOL_KEY_BINDINGS },
  };
}

function normalizeBindingRecord<T extends Record<string, string>>(
  defaults: T,
  raw: Partial<Record<keyof T, unknown>> | null | undefined
): T {
  const next = { ...defaults };

  (Object.keys(defaults) as Array<keyof T>).forEach((action) => {
    const value = raw?.[action];
    next[action] =
      typeof value === "string" && value.trim().length > 0
        ? (normalizeKey(value) as T[keyof T])
        : defaults[action];
  });

  return next;
}

export function normalizeModeKeyBindings(
  raw: Partial<ModeKeyBindings> | null | undefined,
  legacyBindings?: Partial<KeyBindings> | null
): ModeKeyBindings {
  const defaults = createDefaultModeKeyBindings();
  const tetrisFallback = normalizeBindingRecord(DEFAULT_KEY_BINDINGS, legacyBindings);

  return {
    CLASSIQUE: normalizeBindingRecord(defaults.CLASSIQUE, raw?.CLASSIQUE ?? tetrisFallback),
    SPRINT: normalizeBindingRecord(defaults.SPRINT, raw?.SPRINT ?? tetrisFallback),
    VERSUS: normalizeBindingRecord(defaults.VERSUS, raw?.VERSUS ?? tetrisFallback),
    ROGUELIKE: normalizeBindingRecord(defaults.ROGUELIKE, raw?.ROGUELIKE ?? tetrisFallback),
    ROGUELIKE_VERSUS: normalizeBindingRecord(
      defaults.ROGUELIKE_VERSUS,
      raw?.ROGUELIKE_VERSUS ?? tetrisFallback
    ),
    PUZZLE: normalizeBindingRecord(defaults.PUZZLE, raw?.PUZZLE ?? tetrisFallback),
    BRICKFALL_SOLO: normalizeBindingRecord(defaults.BRICKFALL_SOLO, raw?.BRICKFALL_SOLO),
    TETROMAZE: normalizeBindingRecord(defaults.TETROMAZE, raw?.TETROMAZE),
    PIXEL_INVASION: normalizeBindingRecord(defaults.PIXEL_INVASION, raw?.PIXEL_INVASION),
    PIXEL_PROTOCOL: normalizeBindingRecord(defaults.PIXEL_PROTOCOL, raw?.PIXEL_PROTOCOL),
  };
}

export function getModeKeyBindings<M extends ControlSettingsMode>(
  source: KeyBindingSource,
  mode: M
): ModeKeyBindings[M] {
  return normalizeModeKeyBindings(source.modeKeyBindings, source.keyBindings)[mode];
}

export function isTetrisControlMode(mode: ControlSettingsMode): mode is TetrisControlMode {
  return (
    mode !== "BRICKFALL_SOLO" &&
    mode !== "TETROMAZE" &&
    mode !== "PIXEL_INVASION" &&
    mode !== "PIXEL_PROTOCOL"
  );
}

export function getControlActionOrder(mode: ControlSettingsMode): readonly string[] {
  if (mode === "ROGUELIKE" || mode === "ROGUELIKE_VERSUS") return CONTROL_ACTIONS;
  if (isTetrisControlMode(mode)) return TETRIS_STANDARD_CONTROL_ACTIONS;
  if (mode === "BRICKFALL_SOLO") return BRICKFALL_CONTROL_ACTIONS;
  if (mode === "TETROMAZE") return TETROMAZE_CONTROL_ACTIONS;
  if (mode === "PIXEL_INVASION") return PIXEL_INVASION_CONTROL_ACTIONS;
  return PIXEL_PROTOCOL_CONTROL_ACTIONS;
}

export function getControlActionLabel(mode: ControlSettingsMode, action: string): string {
  if (isTetrisControlMode(mode)) {
    return controlActionLabels[action as ControlAction] ?? action;
  }
  if (mode === "BRICKFALL_SOLO") {
    return brickfallControlActionLabels[action as BrickfallControlAction] ?? action;
  }
  if (mode === "TETROMAZE") {
    return tetromazeControlActionLabels[action as TetromazeControlAction] ?? action;
  }
  if (mode === "PIXEL_INVASION") {
    return pixelInvasionControlActionLabels[action as PixelInvasionControlAction] ?? action;
  }
  return pixelProtocolControlActionLabels[action as PixelProtocolControlAction] ?? action;
}

/**
 * Convertit une touche en libelle compact lisible dans l'UI.
 */
export const formatKeyLabel = (key: string) => {
  switch (key) {
    case "Space":
      return "ESPACE";
    case "ArrowLeft":
      return "←";
    case "ArrowRight":
      return "→";
    case "ArrowDown":
      return "↓";
    case "ArrowUp":
      return "↑";
    case "Shift":
      return "SHIFT";
    case "Control":
      return "CTRL";
    case "Alt":
      return "ALT";
    default:
      return key;
  }
};
