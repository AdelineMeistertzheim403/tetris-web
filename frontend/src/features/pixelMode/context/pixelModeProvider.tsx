import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import {
  getPixelInstabilityLevel,
  isPixelGameplayPath,
  isPixelModeUnlocked,
  PIXEL_MODE_ENABLED_STORAGE_KEY,
  PIXEL_MODE_REGISTERED_RUN_PREFIX,
  PIXEL_MODE_RUN_COUNTER_KEY,
} from "../logic/pixelMode";
import {
  PixelModeContext,
  type PixelModeContextValue,
  type PixelRuntimeEvent,
  type PixelRuntimeEventInput,
} from "./pixelModeContext";

export function PixelModeProvider({ children }: { children: ReactNode }) {
  const { stats, updateStats } = useAchievements();
  const location = useLocation();
  const unlocked = useMemo(() => isPixelModeUnlocked(stats.counters), [stats.counters]);
  const [storedEnabled, setStoredEnabled] = useState(() => {
    try {
      return localStorage.getItem(PIXEL_MODE_ENABLED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const runtimeEventTimeoutRef = useRef<number | null>(null);
  const [activeRuntimeEvent, setActiveRuntimeEvent] = useState<PixelRuntimeEvent | null>(null);
  const enabled = unlocked && storedEnabled;
  const gameplayRouteActive = enabled && isPixelGameplayPath(location.pathname);
  const runCount = stats.counters[PIXEL_MODE_RUN_COUNTER_KEY] ?? 0;
  const instabilityLevel = enabled ? getPixelInstabilityLevel(runCount) : 0;

  const persistEnabled = useCallback((next: boolean) => {
    setStoredEnabled(next);
    try {
      localStorage.setItem(PIXEL_MODE_ENABLED_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore persistence errors
    }
  }, []);

  const setEnabled = useCallback(
    (next: boolean) => {
      if (next && !unlocked) return;
      persistEnabled(next);
    },
    [persistEnabled, unlocked]
  );

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  const reportRuntimeEvent = useCallback(
    (event: PixelRuntimeEventInput) => {
      if (!enabled || !gameplayRouteActive) return;

      const nextEvent: PixelRuntimeEvent = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        sourceLabel: event.sourceLabel,
        title: event.title,
        description: event.description,
        severity: event.severity,
      };

      if (runtimeEventTimeoutRef.current) {
        window.clearTimeout(runtimeEventTimeoutRef.current);
      }

      setActiveRuntimeEvent(nextEvent);
      runtimeEventTimeoutRef.current = window.setTimeout(() => {
        setActiveRuntimeEvent((current) => (current?.id === nextEvent.id ? null : current));
        runtimeEventTimeoutRef.current = null;
      }, event.ttlMs ?? 2400);
    },
    [enabled, gameplayRouteActive]
  );

  useEffect(() => {
    if (!unlocked && storedEnabled) {
      persistEnabled(false);
    }
  }, [persistEnabled, storedEnabled, unlocked]);

  useEffect(() => {
    if (gameplayRouteActive) return;
    setActiveRuntimeEvent(null);
    if (runtimeEventTimeoutRef.current) {
      window.clearTimeout(runtimeEventTimeoutRef.current);
      runtimeEventTimeoutRef.current = null;
    }
  }, [gameplayRouteActive]);

  useEffect(() => {
    document.body.classList.toggle("pixel-mode-enabled", enabled);
    document.body.classList.toggle("pixel-mode-runtime", gameplayRouteActive);

    return () => {
      document.body.classList.remove("pixel-mode-enabled");
      document.body.classList.remove("pixel-mode-runtime");
    };
  }, [enabled, gameplayRouteActive]);

  useEffect(() => {
    if (!gameplayRouteActive) return;

    const registrationKey = `${PIXEL_MODE_REGISTERED_RUN_PREFIX}:${location.key}:${location.pathname}`;
    try {
      if (sessionStorage.getItem(registrationKey) === "1") return;
      sessionStorage.setItem(registrationKey, "1");
    } catch {
      // ignore session storage issues
    }

    updateStats((prev) => ({
      ...prev,
      counters: {
        ...prev.counters,
        [PIXEL_MODE_RUN_COUNTER_KEY]: (prev.counters[PIXEL_MODE_RUN_COUNTER_KEY] ?? 0) + 1,
      },
    }));
  }, [gameplayRouteActive, location.key, location.pathname, updateStats]);

  useEffect(() => {
    return () => {
      if (runtimeEventTimeoutRef.current) {
        window.clearTimeout(runtimeEventTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo<PixelModeContextValue>(
    () => ({
      enabled,
      unlocked,
      gameplayRouteActive,
      instabilityLevel,
      runCount,
      activeRuntimeEvent,
      reportRuntimeEvent,
      setEnabled,
      toggle,
    }),
    [
      activeRuntimeEvent,
      enabled,
      gameplayRouteActive,
      instabilityLevel,
      reportRuntimeEvent,
      runCount,
      setEnabled,
      toggle,
      unlocked,
    ]
  );

  return (
    <PixelModeContext.Provider value={value}>{children}</PixelModeContext.Provider>
  );
}
