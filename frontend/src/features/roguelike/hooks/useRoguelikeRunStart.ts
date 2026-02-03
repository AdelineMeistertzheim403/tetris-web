import { useEffect } from "react";
import type { RoguelikeInitialState } from "../services/roguelike.service";

type Params = {
  hasActiveRun: boolean;
  runEnded: boolean;
  runStartedRef: React.MutableRefObject<boolean>;
  initialSeed?: string;
  startRun: (seed: string, initialState: RoguelikeInitialState) => Promise<unknown>;
  gravityMultiplier: number;
  scoreMultiplier: number;
  bombs: number;
  timeFreezeCharges: number;
  setAutoSeededMode: (value: boolean) => void;
  setBoardKey: React.Dispatch<React.SetStateAction<number>>;
};

export function useRoguelikeRunStart({
  hasActiveRun,
  runEnded,
  runStartedRef,
  initialSeed,
  startRun,
  gravityMultiplier,
  scoreMultiplier,
  bombs,
  timeFreezeCharges,
  setAutoSeededMode,
  setBoardKey,
}: Params) {
  useEffect(() => {
    // Démarre exactement une fois par run/seed, même si le composant re-render.
    if (!hasActiveRun && !runEnded && !runStartedRef.current) {
      runStartedRef.current = true;
      const trimmedSeed = initialSeed?.trim();
      const isDevilSeed = Boolean(trimmedSeed) && trimmedSeed?.toUpperCase() === "DEVIL-666";
      const seed = trimmedSeed
        ? isDevilSeed
          ? "DEVIL-666"
          : trimmedSeed
        : crypto.randomUUID();
      setAutoSeededMode(Boolean(trimmedSeed));
      startRun(seed, {
        gravityMultiplier,
        scoreMultiplier,
        bombs,
        timeFreezeCharges,
      });
      setBoardKey((k) => k + 1);
    }
  }, [
    hasActiveRun,
    runEnded,
    runStartedRef,
    initialSeed,
    startRun,
    gravityMultiplier,
    scoreMultiplier,
    bombs,
    timeFreezeCharges,
    setAutoSeededMode,
    setBoardKey,
  ]);
}
