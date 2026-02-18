export type ControlAction =
  | "left"
  | "right"
  | "down"
  | "rotate"
  | "harddrop"
  | "hold"
  | "bomb"
  | "freeze";

// Ordre d'affichage des actions dans les menus de contrôles.
export const CONTROL_ACTIONS: ControlAction[] = [
  "left",
  "right",
  "down",
  "rotate",
  "harddrop",
  "hold",
  "bomb",
  "freeze",
];
