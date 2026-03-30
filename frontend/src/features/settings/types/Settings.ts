// Types partages utilises par ce module.
import type { DashboardSettings } from "../../app/logic/dashboardWidgets";
import type { KeyBindings, ModeKeyBindings } from "../../game/utils/controls";

export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "L" | "J";

export type PieceColors = Record<TetrominoType, string>;

export type UiColors = {
  accent: string;
  accentSecondary: string;
  accentWarm: string;
  panelBg: string;
  boardBg: string;
  boardBorder: string;
  text: string;
  muted: string;
};

export type Settings = {
  keyBindings: KeyBindings;
  modeKeyBindings: ModeKeyBindings;
  reducedMotion: boolean;
  reducedNeon: boolean;
  uiColors: UiColors;
  pieceColors: PieceColors;
  dashboard: DashboardSettings;
};
