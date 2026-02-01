import type { ControlAction } from "../types/Controls";

export type KeyBindings = Record<ControlAction, string>;

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

export const normalizeKey = (key: string) => {
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
};

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

export const controlActionLabels: Record<ControlAction, string> = {
  left: "Déplacer à gauche",
  right: "Déplacer à droite",
  down: "Accélérer",
  rotate: "Rotation",
  harddrop: "Hard Drop",
  hold: "Hold",
  bomb: "Bombe",
  freeze: "Time Freeze",
};
