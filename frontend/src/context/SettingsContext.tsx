import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { COLORS } from "../logic/shapes";
import { DEFAULT_KEY_BINDINGS, normalizeKey, type KeyBindings } from "../utils/controls";
import type { Settings, UiColors, PieceColors } from "../types/Settings";

const STORAGE_KEY = "tetris-user-settings";

export const DEFAULT_UI_COLORS: UiColors = {
  accent: "#ff00ff",
  accentSecondary: "#00ffff",
  accentWarm: "#ffff00",
  panelBg: "#141414",
  boardBg: "#111111",
  boardBorder: "#555555",
  text: "#ffffff",
  muted: "#bbbbbb",
};

export const DEFAULT_PIECE_COLORS: PieceColors = {
  I: COLORS.I,
  O: COLORS.O,
  T: COLORS.T,
  S: COLORS.S,
  Z: COLORS.Z,
  L: COLORS.L,
  J: COLORS.J,
};

export const DEFAULT_SETTINGS: Settings = {
  keyBindings: DEFAULT_KEY_BINDINGS,
  reducedMotion: false,
  reducedNeon: false,
  uiColors: DEFAULT_UI_COLORS,
  pieceColors: DEFAULT_PIECE_COLORS,
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return `${r} ${g} ${b}`;
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `${r} ${g} ${b}`;
  }
  return "255 255 255";
};

type SettingsContextValue = {
  settings: Settings;
  setSettings: (next: Settings) => void;
  updateKeyBindings: (next: Partial<KeyBindings>) => void;
  updateUiColors: (next: Partial<UiColors>) => void;
  updatePieceColors: (next: Partial<PieceColors>) => void;
  toggleReducedMotion: (value: boolean) => void;
  toggleReducedNeon: (value: boolean) => void;
  resetSettings: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const mergeSettings = (raw: Partial<Settings> | null): Settings => {
  if (!raw) return DEFAULT_SETTINGS;
  const merged = {
    ...DEFAULT_SETTINGS,
    ...raw,
    keyBindings: { ...DEFAULT_SETTINGS.keyBindings, ...(raw.keyBindings ?? {}) },
    uiColors: { ...DEFAULT_SETTINGS.uiColors, ...(raw.uiColors ?? {}) },
    pieceColors: { ...DEFAULT_SETTINGS.pieceColors, ...(raw.pieceColors ?? {}) },
  };
  const normalizedKeyBindings = Object.fromEntries(
    Object.entries(merged.keyBindings).map(([action, key]) => [
      action,
      normalizeKey(key),
    ])
  ) as KeyBindings;
  return {
    ...merged,
    keyBindings: normalizedKeyBindings,
  };
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      return mergeSettings(JSON.parse(raw));
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const setSettings = useCallback((next: Settings) => {
    setSettingsState(next);
  }, []);

  const updateKeyBindings = useCallback((next: Partial<KeyBindings>) => {
    setSettingsState((prev) => ({
      ...prev,
      keyBindings: {
        ...prev.keyBindings,
        ...Object.fromEntries(
          Object.entries(next).map(([action, key]) => [action, normalizeKey(key)])
        ),
      },
    }));
  }, []);

  const updateUiColors = useCallback((next: Partial<UiColors>) => {
    setSettingsState((prev) => ({
      ...prev,
      uiColors: { ...prev.uiColors, ...next },
    }));
  }, []);

  const updatePieceColors = useCallback((next: Partial<PieceColors>) => {
    setSettingsState((prev) => ({
      ...prev,
      pieceColors: { ...prev.pieceColors, ...next },
    }));
  }, []);

  const toggleReducedMotion = useCallback((value: boolean) => {
    setSettingsState((prev) => ({ ...prev, reducedMotion: value }));
  }, []);

  const toggleReducedNeon = useCallback((value: boolean) => {
    setSettingsState((prev) => ({ ...prev, reducedNeon: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore persistence errors
    }
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ui-accent", settings.uiColors.accent);
    root.style.setProperty("--ui-accent-2", settings.uiColors.accentSecondary);
    root.style.setProperty("--ui-accent-3", settings.uiColors.accentWarm);
    root.style.setProperty("--ui-accent-rgb", hexToRgb(settings.uiColors.accent));
    root.style.setProperty("--ui-accent-2-rgb", hexToRgb(settings.uiColors.accentSecondary));
    root.style.setProperty("--ui-accent-3-rgb", hexToRgb(settings.uiColors.accentWarm));
    root.style.setProperty("--ui-panel-bg", settings.uiColors.panelBg);
    root.style.setProperty("--ui-board-bg", settings.uiColors.boardBg);
    root.style.setProperty("--ui-board-border", settings.uiColors.boardBorder);
    root.style.setProperty("--ui-text", settings.uiColors.text);
    root.style.setProperty("--ui-muted", settings.uiColors.muted);

    const body = document.body;
    body.classList.toggle("reduce-motion", settings.reducedMotion);
    body.classList.toggle("reduce-neon", settings.reducedNeon);
  }, [settings.reducedMotion, settings.reducedNeon, settings.uiColors]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setSettings,
      updateKeyBindings,
      updateUiColors,
      updatePieceColors,
      toggleReducedMotion,
      toggleReducedNeon,
      resetSettings,
    }),
    [
      settings,
      setSettings,
      updateKeyBindings,
      updateUiColors,
      updatePieceColors,
      toggleReducedMotion,
      toggleReducedNeon,
      resetSettings,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
