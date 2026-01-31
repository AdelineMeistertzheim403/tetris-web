import { useCallback, useEffect, useRef, useState } from "react";

export type LineClearEffect = {
  id: string;
  rows: number[];
  count: number;
};

const BASE_DURATION_MS = 180;
const PER_LINE_DURATION_MS = 90;
const MAX_EFFECTS = 8;

export function useLineClearFx() {
  const [effects, setEffects] = useState<LineClearEffect[]>([]);
  const [tetrisFlash, setTetrisFlash] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const trigger = useCallback((count: number, rows: number[] = []) => {
    if (count <= 0) return;

    const id = `${Date.now()}-${Math.random()}`;
    const duration = BASE_DURATION_MS + count * PER_LINE_DURATION_MS;

    setEffects((prev) => [...prev, { id, rows, count }].slice(-MAX_EFFECTS));

    const clearTimeoutId = setTimeout(() => {
      setEffects((prev) => prev.filter((effect) => effect.id !== id));
    }, duration);
    timeoutsRef.current.push(clearTimeoutId);

    if (count >= 4) {
      setTetrisFlash(true);
      const flashTimeoutId = setTimeout(() => setTetrisFlash(false), duration);
      timeoutsRef.current.push(flashTimeoutId);
    }
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, []);

  return { effects, tetrisFlash, trigger };
}
