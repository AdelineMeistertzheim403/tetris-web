import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { COLORS } from "../../game/logic/shapes";
import {
  DEFAULT_KEY_BINDINGS,
  createDefaultModeKeyBindings,
  normalizeKey,
  normalizeModeKeyBindings,
  type ControlSettingsMode,
  type KeyBindings,
} from "../../game/utils/controls";
import type { Settings, UiColors, PieceColors } from "../types/Settings";
import { useAuth } from "../../auth/context/AuthContext";
import { fetchUserSettings, saveUserSettings } from "../services/settingsService";
import {
  createDefaultDashboardSettings,
  normalizeDashboardSettings,
  type DashboardSettings,
  type DashboardWidgetId,
} from "../../app/logic/dashboardWidgets";

// Clé de persistance locale pour conserver les préférences utilisateur.
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

const createDefaultSettings = (): Settings => ({
  keyBindings: DEFAULT_KEY_BINDINGS,
  modeKeyBindings: createDefaultModeKeyBindings(),
  reducedMotion: false,
  reducedNeon: false,
  uiColors: DEFAULT_UI_COLORS,
  pieceColors: DEFAULT_PIECE_COLORS,
  dashboard: createDefaultDashboardSettings(),
});

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
  updateModeKeyBinding: (mode: ControlSettingsMode, action: string, key: string) => void;
  resetModeKeyBindings: (mode: ControlSettingsMode) => void;
  updateUiColors: (next: Partial<UiColors>) => void;
  updatePieceColors: (next: Partial<PieceColors>) => void;
  updateDashboardSettings: (next: DashboardSettings) => void;
  updateDashboardWidgetVisibility: (widgetId: DashboardWidgetId, value: boolean) => void;
  toggleReducedMotion: (value: boolean) => void;
  toggleReducedNeon: (value: boolean) => void;
  resetDashboardLayout: () => void;
  resetSettings: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

// Fusionne des settings partiels avec les defaults (résilience aux anciennes versions).
const mergeSettings = (raw: Partial<Settings> | null): Settings => {
  if (!raw) return createDefaultSettings();
  const defaults = createDefaultSettings();
  const normalizedModeKeyBindings = normalizeModeKeyBindings(
    raw.modeKeyBindings,
    raw.keyBindings
  );
  const merged = {
    ...defaults,
    ...raw,
    keyBindings: normalizedModeKeyBindings.CLASSIQUE,
    modeKeyBindings: normalizedModeKeyBindings,
    uiColors: { ...defaults.uiColors, ...(raw.uiColors ?? {}) },
    pieceColors: { ...defaults.pieceColors, ...(raw.pieceColors ?? {}) },
    dashboard: normalizeDashboardSettings(raw.dashboard),
  };
  return {
    ...merged,
    keyBindings: normalizedModeKeyBindings.CLASSIQUE,
    modeKeyBindings: normalizedModeKeyBindings,
  };
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultSettings();
      return mergeSettings(JSON.parse(raw));
    } catch {
      return createDefaultSettings();
    }
  });
  const loadedUserIdRef = useRef<number | null>(null);
  const canPersistRemoteRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRemoteSnapshotRef = useRef<string | null>(null);

  const setSettings = useCallback((next: Settings) => {
    setSettingsState(mergeSettings(next));
  }, []);

  const updateKeyBindings = useCallback((next: Partial<KeyBindings>) => {
    setSettingsState((prev) => {
      const nextClassic = {
        ...prev.modeKeyBindings.CLASSIQUE,
        ...Object.fromEntries(
          Object.entries(next).flatMap(([action, key]) =>
            typeof key === "string" ? [[action, normalizeKey(key)]] : []
          )
        ),
      } as KeyBindings;

      return {
        ...prev,
        keyBindings: nextClassic,
        modeKeyBindings: {
          ...prev.modeKeyBindings,
          CLASSIQUE: nextClassic,
        },
      };
    });
  }, []);

  const updateModeKeyBinding = useCallback(
    (mode: ControlSettingsMode, action: string, key: string) => {
      const normalized = normalizeKey(key);

      setSettingsState((prev) => {
        const currentModeBindings = prev.modeKeyBindings[mode];
        if (!(action in currentModeBindings)) return prev;

        const nextModeBindings = {
          ...currentModeBindings,
          [action]: normalized,
        };

        return {
          ...prev,
          keyBindings:
            mode === "CLASSIQUE" ? (nextModeBindings as KeyBindings) : prev.keyBindings,
          modeKeyBindings: {
            ...prev.modeKeyBindings,
            [mode]: nextModeBindings,
          },
        };
      });
    },
    []
  );

  const resetModeKeyBindings = useCallback((mode: ControlSettingsMode) => {
    const defaults = createDefaultModeKeyBindings();

    setSettingsState((prev) => ({
      ...prev,
      keyBindings: mode === "CLASSIQUE" ? defaults.CLASSIQUE : prev.keyBindings,
      modeKeyBindings: {
        ...prev.modeKeyBindings,
        [mode]: defaults[mode],
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

  const updateDashboardSettings = useCallback((next: DashboardSettings) => {
    setSettingsState((prev) => ({
      ...prev,
      dashboard: normalizeDashboardSettings(next),
    }));
  }, []);

  const updateDashboardWidgetVisibility = useCallback(
    (widgetId: DashboardWidgetId, value: boolean) => {
      setSettingsState((prev) => ({
        ...prev,
        dashboard: normalizeDashboardSettings({
          widgets: {
            ...prev.dashboard.widgets,
            [widgetId]: {
              ...prev.dashboard.widgets[widgetId],
              visible: value,
            },
          },
        }),
      }));
    },
    []
  );

  const toggleReducedMotion = useCallback((value: boolean) => {
    setSettingsState((prev) => ({ ...prev, reducedMotion: value }));
  }, []);

  const toggleReducedNeon = useCallback((value: boolean) => {
    setSettingsState((prev) => ({ ...prev, reducedNeon: value }));
  }, []);

  const resetDashboardLayout = useCallback(() => {
    setSettingsState((prev) => ({
      ...prev,
      dashboard: createDefaultDashboardSettings(),
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(createDefaultSettings());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore persistence errors
    }
  }, [settings]);

  useEffect(() => {
    if (loading) return;

    const userId = typeof user?.id === "number" ? user.id : null;
    if (!userId) {
      loadedUserIdRef.current = null;
      canPersistRemoteRef.current = false;
      return;
    }
    if (loadedUserIdRef.current === userId && canPersistRemoteRef.current) return;

    let cancelled = false;
    loadedUserIdRef.current = userId;
    canPersistRemoteRef.current = false;

    fetchUserSettings()
      .then((remoteSettings) => {
        if (cancelled) return;
        if (remoteSettings) {
          const merged = mergeSettings(remoteSettings);
          lastRemoteSnapshotRef.current = JSON.stringify(merged);
          setSettingsState(merged);
        } else {
          lastRemoteSnapshotRef.current = JSON.stringify(settings);
        }
      })
      .catch(() => {
        // fallback localStorage seulement
      })
      .finally(() => {
        if (cancelled) return;
        canPersistRemoteRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user?.id]);

  useEffect(() => {
    if (loading) return;
    const userId = typeof user?.id === "number" ? user.id : null;
    if (!userId || !canPersistRemoteRef.current) return;

    const serializedSettings = JSON.stringify(settings);
    if (lastRemoteSnapshotRef.current === serializedSettings) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveUserSettings(settings)
        .then(() => {
          lastRemoteSnapshotRef.current = serializedSettings;
        })
        .catch(() => {
          // fallback localStorage seulement
        });
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [loading, settings, user?.id]);

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
      updateModeKeyBinding,
      resetModeKeyBindings,
      updateUiColors,
      updatePieceColors,
      updateDashboardSettings,
      updateDashboardWidgetVisibility,
      toggleReducedMotion,
      toggleReducedNeon,
      resetDashboardLayout,
      resetSettings,
    }),
    [
      settings,
      setSettings,
      updateKeyBindings,
      updateModeKeyBinding,
      resetModeKeyBindings,
      updateUiColors,
      updatePieceColors,
      updateDashboardSettings,
      updateDashboardWidgetVisibility,
      toggleReducedMotion,
      toggleReducedNeon,
      resetDashboardLayout,
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
