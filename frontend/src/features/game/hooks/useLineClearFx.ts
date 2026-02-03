import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "../../settings/context/SettingsContext";

export type LineClearEffect = {
  id: string;
  rows: number[];
  count: number;
};

const BASE_DURATION_MS = 180;
const PER_LINE_DURATION_MS = 90;
const MAX_EFFECTS = 8;

export function useLineClearFx() {
  const { settings } = useSettings();
  const [effects, setEffects] = useState<LineClearEffect[]>([]);
  const [tetrisFlash, setTetrisFlash] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reducedMotionRef = useRef(settings.reducedMotion);

  const clearTimers = useCallback(() => {
    // Nettoie toutes les animations en cours.
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = [];
  }, []);

  const trigger = useCallback(
    (count: number, rows: number[] = []) => {
      // Déclenche un FX visuel par ligne clear (désactivé si reduced motion).
      if (count <= 0) return;
      if (reducedMotionRef.current) return;

      const id = `${Date.now()}-${Math.random()}`;
      const duration = BASE_DURATION_MS + count * PER_LINE_DURATION_MS;

      // On garde uniquement les derniers FX pour éviter un empilement infini.
      setEffects((prev) => [...prev, { id, rows, count }].slice(-MAX_EFFECTS));

      const clearTimeoutId = setTimeout(() => {
        setEffects((prev) => prev.filter((effect) => effect.id !== id));
      }, duration);
      timeoutsRef.current.push(clearTimeoutId);

      if (count >= 4) {
        // Effet flash spécifique aux tetris.
        setTetrisFlash(true);
        const flashTimeoutId = setTimeout(() => setTetrisFlash(false), duration);
        timeoutsRef.current.push(flashTimeoutId);
      }
    },
    []
  );

  useEffect(() => {
    // Synchronise reduced motion et annule les FX actifs si nécessaire.
    reducedMotionRef.current = settings.reducedMotion;
    if (settings.reducedMotion) {
      clearTimers();
      setEffects([]);
      setTetrisFlash(false);
    }
  }, [clearTimers, settings.reducedMotion]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return { effects, tetrisFlash, trigger };
}
