import { useCallback, useEffect, useRef, useState } from "react";


import {
  getCurrentRoguelikeRun,
  startRoguelikeRun,
  checkpointRoguelikeRun,
  endRoguelikeRun,
  type RoguelikeStoredMutation,
} from "../services/roguelike.service";

export type RoguelikeRunState = {
  id: number;
  seed: string;
  score: number;
  lines: number;
  level: number;
  perks: string[];
  mutations: RoguelikeStoredMutation[];
  bombs: number;
  timeFreezeCharges: number;
  chaosMode: boolean;
  gravityMultiplier: number;
  scoreMultiplier: number;
};

export function useRoguelikeRun() {
  const [run, setRun] = useState<RoguelikeRunState | null>(null);
  const checkpointLock = useRef(false);

  /* ───────────────────────────── */
  /* 🔄 Reprise d'une run existante */
  /* ───────────────────────────── */
  useEffect(() => {
    async function loadRun() {
      const existing = await getCurrentRoguelikeRun();
      if (existing) {
        setRun(existing);
      }
    }
    loadRun();
  }, []);

  /* ───────────────────────────── */
  /* 🚀 Démarrer une nouvelle run */
  /* ───────────────────────────── */
  const startRun = useCallback(async (seed: string, initialState: any) => {
    const newRun = await startRoguelikeRun(seed, initialState);
    setRun(newRun);
    return newRun;
  }, []);

  /* ───────────────────────────── */
  /* 💾 Checkpoint (safe) */
  /* ───────────────────────────── */
  const checkpoint = useCallback(
    async (payload: Omit<RoguelikeRunState, "id">) => {
      if (!run || checkpointLock.current) return;

      checkpointLock.current = true;

      try {
        const normalizedScore = Math.round(payload.score);
        const normalizedLines = Math.round(payload.lines);
        const normalizedLevel = Math.max(1, Math.round(payload.level));
        const normalizedBombs = Math.max(0, Math.round(payload.bombs));
        const normalizedTimeFreezeCharges = Math.max(
          0,
          Math.round(payload.timeFreezeCharges)
        );

        await checkpointRoguelikeRun(run.id, {
          score: normalizedScore,
          lines: normalizedLines,
          level: normalizedLevel,
          perks: payload.perks,
          mutations: payload.mutations,
          bombs: normalizedBombs,
          timeFreezeCharges: normalizedTimeFreezeCharges,
          chaosMode: payload.chaosMode,
          gravityMultiplier: payload.gravityMultiplier,
          scoreMultiplier: payload.scoreMultiplier,
        });

        setRun((prev) =>
          prev
            ? {
                ...prev,
                score: normalizedScore,
                lines: normalizedLines,
                level: normalizedLevel,
                perks: payload.perks,
                mutations: payload.mutations,
                bombs: normalizedBombs,
                timeFreezeCharges: normalizedTimeFreezeCharges,
                chaosMode: payload.chaosMode,
                gravityMultiplier: payload.gravityMultiplier,
                scoreMultiplier: payload.scoreMultiplier,
              }
            : prev
        );
      } finally {
        checkpointLock.current = false;
      }
    },
    [run]
  );

  /* ───────────────────────────── */
  /* 🏁 Fin de run */
  /* ───────────────────────────── */
  const finishRun = useCallback(
    async (status: "FINISHED" | "ABANDONED") => {
      if (!run) return;
      await endRoguelikeRun(run.id, status);
      setRun(null);
    },
    [run]
  );

  return {
    run,
    startRun,
    checkpoint,
    finishRun,
    hasActiveRun: !!run,
  };
}
