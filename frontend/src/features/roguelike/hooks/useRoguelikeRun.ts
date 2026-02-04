import { useCallback, useEffect, useRef, useState } from "react";


import {
  getCurrentRoguelikeRun,
  startRoguelikeRun,
  checkpointRoguelikeRun,
  endRoguelikeRun,
  type RoguelikeCheckpointPayload,
  type RoguelikeStoredMutation,
  type RoguelikeInitialState,
} from "../services/roguelike.service";

const MIN_GRAVITY_MULTIPLIER = 0.05;
const MAX_GRAVITY_MULTIPLIER = 100;

export type RoguelikeRunState = {
  id: number;
  seed: string;
  runToken: string;
  score: string | number;
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
        // Casting pour aligner avec l'état local enrichi
        setRun(existing as RoguelikeRunState);
      }
    }
    loadRun();
  }, []);

  /* ───────────────────────────── */
  /* 🚀 Démarrer une nouvelle run */
  /* ───────────────────────────── */
  const startRun = useCallback(async (seed: string, initialState: RoguelikeInitialState) => {
    const newRun = await startRoguelikeRun(seed, initialState);
    setRun(newRun as RoguelikeRunState);
    return newRun;
  }, []);

  /* ───────────────────────────── */
  /* 💾 Checkpoint (safe) */
  /* ───────────────────────────── */
  const checkpoint = useCallback(
    async (payload: RoguelikeCheckpointPayload) => {
      if (!run || checkpointLock.current) return;

      checkpointLock.current = true;

      try {
        // Normalisation des valeurs envoyées au backend pour éviter les incohérences.
        const normalizedScore = Math.round(payload.score);
        const normalizedLines = Math.round(payload.lines);
        const normalizedLevel = Math.max(1, Math.round(payload.level));
        const normalizedBombs = Math.max(0, Math.round(payload.bombs));
        const normalizedBombsUsed = Math.max(0, Math.round(payload.bombsUsed));
        const normalizedTimeFreezeCharges = Math.max(
          0,
          Math.round(payload.timeFreezeCharges)
        );
        const normalizedLineClears = {
          single: Math.max(0, Math.round(payload.lineClears.single)),
          double: Math.max(0, Math.round(payload.lineClears.double)),
          triple: Math.max(0, Math.round(payload.lineClears.triple)),
          tetris: Math.max(0, Math.round(payload.lineClears.tetris)),
        };
        const normalizedGravityMultiplier = Math.min(
          MAX_GRAVITY_MULTIPLIER,
          Math.max(MIN_GRAVITY_MULTIPLIER, payload.gravityMultiplier)
        );

        const serverState = await checkpointRoguelikeRun(
          run.id,
          {
            score: normalizedScore,
            lines: normalizedLines,
            level: normalizedLevel,
            perks: payload.perks,
            mutations: payload.mutations,
            lineClears: normalizedLineClears,
            bombs: normalizedBombs,
            bombsUsed: normalizedBombsUsed,
            timeFreezeCharges: normalizedTimeFreezeCharges,
            chaosMode: payload.chaosMode,
            gravityMultiplier: normalizedGravityMultiplier,
            scoreMultiplier: payload.scoreMultiplier,
          },
          run.runToken
        );

        setRun((prev) =>
          prev
            ? {
                ...prev,
                runToken: prev.runToken,
                score: serverState?.score ?? normalizedScore,
                lines: serverState?.lines ?? normalizedLines,
                level: serverState?.level ?? normalizedLevel,
                perks: payload.perks,
                mutations: payload.mutations,
                bombs: normalizedBombs,
                timeFreezeCharges: normalizedTimeFreezeCharges,
                chaosMode: payload.chaosMode,
                gravityMultiplier: normalizedGravityMultiplier,
                scoreMultiplier: payload.scoreMultiplier,
              }
            : prev
        );
      } catch (err) {
        console.error("Roguelike checkpoint failed:", err);
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
      await endRoguelikeRun(run.id, status, run.runToken);
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
