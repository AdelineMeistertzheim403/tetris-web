import { useCallback, useRef, useState } from "react";

export type LineClearTotals = {
  single: number;
  double: number;
  triple: number;
  tetris: number;
};

export function useRoguelikeStatsTracking() {
  // Refs pour stats de run sans déclencher de re-render.
  const startTimeRef = useRef<number | null>(null);
  const holdCountRef = useRef(0);
  const hardDropCountRef = useRef(0);
  const comboStreakRef = useRef(0);
  const maxComboRef = useRef(0);
  const tetrisCountRef = useRef(0);
  const lineClearTotalsRef = useRef<LineClearTotals>({
    single: 0,
    double: 0,
    triple: 0,
    tetris: 0,
  });
  const [tetrisCleared, setTetrisCleared] = useState(false);

  const resetLineClears = useCallback(() => {
    // Remet à zéro les compteurs par type de ligne.
    lineClearTotalsRef.current = {
      single: 0,
      double: 0,
      triple: 0,
      tetris: 0,
    };
  }, []);

  const resetRunTracking = useCallback(() => {
    // Reset complet des statistiques d'une run roguelike.
    startTimeRef.current = null;
    holdCountRef.current = 0;
    hardDropCountRef.current = 0;
    comboStreakRef.current = 0;
    maxComboRef.current = 0;
    tetrisCountRef.current = 0;
    resetLineClears();
    setTetrisCleared(false);
  }, [resetLineClears]);

  const recordLineClear = useCallback((linesCleared: number) => {
    // Historise le nombre de clears par type pour les badges/succès.
    if (linesCleared === 1) lineClearTotalsRef.current.single += 1;
    if (linesCleared === 2) lineClearTotalsRef.current.double += 1;
    if (linesCleared === 3) lineClearTotalsRef.current.triple += 1;
    if (linesCleared === 4) lineClearTotalsRef.current.tetris += 1;
  }, []);

  const handleLinesCleared = useCallback((linesCleared: number) => {
    // Gestion des combos (streak), utilisée pour achievements et UI.
    if (linesCleared > 0) {
      recordLineClear(linesCleared);
      comboStreakRef.current += linesCleared;
      if (comboStreakRef.current > maxComboRef.current) {
        maxComboRef.current = comboStreakRef.current;
      }
    } else {
      comboStreakRef.current = 0;
    }
  }, [recordLineClear]);

  const noteTetrisCleared = useCallback(() => {
    // Trace une ligne de 4 (tetris) pour les succès.
    setTetrisCleared(true);
    tetrisCountRef.current += 1;
  }, []);

  const onHold = useCallback(() => {
    holdCountRef.current += 1;
  }, []);

  const onHardDrop = useCallback(() => {
    hardDropCountRef.current += 1;
  }, []);

  return {
    startTimeRef,
    holdCountRef,
    hardDropCountRef,
    comboStreakRef,
    maxComboRef,
    tetrisCountRef,
    lineClearTotalsRef,
    tetrisCleared,
    setTetrisCleared,
    resetLineClears,
    resetRunTracking,
    recordLineClear,
    handleLinesCleared,
    noteTetrisCleared,
    onHold,
    onHardDrop,
  };
}
