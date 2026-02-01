import { useEffect, useRef } from "react";
import TetrisBoard from "../components/TetrisBoard";
import { useAchievements } from "../hooks/useAchievements";

export default function Game() {
  const { checkAchievements, updateStats } = useAchievements();
  const startTimeRef = useRef<number | null>(null);
  const holdCountRef = useRef(0);
  const hardDropCountRef = useRef(0);
  const comboStreakRef = useRef(0);
  const maxComboRef = useRef(0);
  const tetrisCountRef = useRef(0);
  const maxStackHeightRef = useRef(0);
  const levelRef = useRef(1);
  const visitedRef = useRef(false);

  const resetRunTracking = () => {
    holdCountRef.current = 0;
    hardDropCountRef.current = 0;
    comboStreakRef.current = 0;
    maxComboRef.current = 0;
    tetrisCountRef.current = 0;
    maxStackHeightRef.current = 0;
    startTimeRef.current = null;
  };

  const countTrue = (values: Record<string, boolean>) =>
    Object.values(values).filter(Boolean).length;

  useEffect(() => {
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, CLASSIQUE: true },
    }));
    checkAchievements({
      custom: { modes_visited_all: countTrue(next.modesVisited) >= 4 },
    });
  }, [checkAchievements, updateStats]);

  return (
    <div className="flex justify-center items-center h-screen bg-slate-900">
      <TetrisBoard
        mode="CLASSIQUE"
        onGameStart={() => {
          resetRunTracking();
          startTimeRef.current = Date.now();
        }}
        onHold={() => {
          holdCountRef.current += 1;
        }}
        onHardDrop={() => {
          hardDropCountRef.current += 1;
        }}
        onLinesCleared={(linesCleared) => {
          if (linesCleared > 0) {
            comboStreakRef.current += linesCleared;
            if (comboStreakRef.current > maxComboRef.current) {
              maxComboRef.current = comboStreakRef.current;
            }
          } else {
            comboStreakRef.current = 0;
          }
          if (linesCleared === 4) {
            tetrisCountRef.current += 1;
          }
        }}
        onBoardUpdate={(board) => {
          const rows = board.length;
          let topFilled = rows;
          for (let y = 0; y < rows; y += 1) {
            if (board[y].some((cell) => cell !== 0)) {
              topFilled = y;
              break;
            }
          }
          const height = rows - topFilled;
          if (height > maxStackHeightRef.current) {
            maxStackHeightRef.current = height;
          }
        }}
        onLevelChange={(level) => {
          levelRef.current = level;
          if (level >= 10 && maxStackHeightRef.current <= 10) {
            checkAchievements({
              mode: "CLASSIQUE",
              custom: { classic_half_board: true },
            });
          }
        }}
        onLocalGameOver={(score, lines) => {
          const now = Date.now();
          const durationMs = startTimeRef.current ? now - startTimeRef.current : 0;
          const noHold = holdCountRef.current === 0;
          const noHardDrop = hardDropCountRef.current === 0;
          const level = levelRef.current;
          let sameScoreTwice = false;

          const next = updateStats((prev) => {
            sameScoreTwice = prev.lastScore !== null && prev.lastScore === score;
            return {
              ...prev,
              scoredModes: {
                ...prev.scoredModes,
                CLASSIQUE: score > 0 ? true : prev.scoredModes.CLASSIQUE,
              },
              level10Modes: {
                ...prev.level10Modes,
                CLASSIQUE: level >= 10 ? true : prev.level10Modes.CLASSIQUE,
              },
              playtimeMs: prev.playtimeMs + durationMs,
              noHoldRuns: prev.noHoldRuns + (noHold ? 1 : 0),
              hardDropCount: prev.hardDropCount + hardDropCountRef.current,
              lastScore: score,
            };
          });

          checkAchievements({
            mode: "CLASSIQUE",
            score,
            lines,
            level,
            tetrisCleared: tetrisCountRef.current > 0,
            custom: {
              classic_half_board: maxStackHeightRef.current <= 10,
              classic_hold_under_3: holdCountRef.current < 3,
              classic_tetris_10: tetrisCountRef.current >= 10,
              combo_5: maxComboRef.current >= 5,
              no_hold_runs_10: next.noHoldRuns >= 10,
              harddrop_50: next.hardDropCount >= 50,
              no_harddrop_10_min: durationMs >= 10 * 60 * 1000 && noHardDrop,
              playtime_60m: next.playtimeMs >= 60 * 60 * 1000,
              playtime_300m: next.playtimeMs >= 300 * 60 * 1000,
              level_10_three_modes: countTrue(next.level10Modes) >= 3,
              scored_all_modes: countTrue(next.scoredModes) >= 4,
              modes_visited_all: countTrue(next.modesVisited) >= 4,
              same_score_twice: sameScoreTwice,
            },
          });
        }}
      />
    </div>
  );
}
