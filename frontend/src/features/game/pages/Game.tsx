import { useEffect, useRef } from "react";
import TetrisBoard from "../components/board/TetrisBoard";
import type {
  PlayerMistakeKey,
  PlayerRunTimelineSample,
  PlayerRunTimelineTag,
} from "../../achievements/types/tetrobots";
import {
  useAchievements,
} from "../../achievements/hooks/useAchievements";
import { TOTAL_GAME_MODES, TOTAL_SCORED_MODES } from "../types/GameMode";

function countBoardHoles(board: number[][]) {
  if (!board.length) return 0;
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  let holes = 0;

  for (let x = 0; x < cols; x += 1) {
    let seenBlock = false;
    for (let y = 0; y < rows; y += 1) {
      if (board[y][x] !== 0) {
        seenBlock = true;
      } else if (seenBlock) {
        holes += 1;
      }
    }
  }

  return holes;
}

export default function Game() {
  const { checkAchievements, updateStats, recordPlayerBehavior, recordTetrobotEvent } =
    useAchievements();
  // Refs pour tracker la run sans déclencher de re-render.
  const startTimeRef = useRef<number | null>(null);
  const holdCountRef = useRef(0);
  const hardDropCountRef = useRef(0);
  const comboStreakRef = useRef(0);
  const maxComboRef = useRef(0);
  const tetrisCountRef = useRef(0);
  const maxStackHeightRef = useRef(0);
  const levelRef = useRef(1);
  const visitedRef = useRef(false);
  const boardRef = useRef<number[][]>([]);
  const timelineSamplesRef = useRef<PlayerRunTimelineSample[]>([]);
  const lastHeightRef = useRef(0);

  const resetRunTracking = () => {
    // Remise à zéro des compteurs de run.
    holdCountRef.current = 0;
    hardDropCountRef.current = 0;
    comboStreakRef.current = 0;
    maxComboRef.current = 0;
    tetrisCountRef.current = 0;
    maxStackHeightRef.current = 0;
    startTimeRef.current = null;
    timelineSamplesRef.current = [];
    lastHeightRef.current = 0;
  };

  const pushTimelineSample = (
    phase: "early" | "mid" | "late",
    tags: PlayerRunTimelineTag[],
    runContext: PlayerRunTimelineSample["runContext"]
  ) => {
    if (!startTimeRef.current) return;
    const atMs = Math.max(0, Date.now() - startTimeRef.current);
    const previous = timelineSamplesRef.current[timelineSamplesRef.current.length - 1];
    if (
      previous &&
      previous.phase === phase &&
      previous.tags.join("|") === tags.join("|") &&
      Math.abs((previous.runContext.pressureScore ?? 0) - (runContext.pressureScore ?? 0)) < 8
    ) {
      return;
    }
    timelineSamplesRef.current = [
      ...timelineSamplesRef.current,
      { atMs, phase, tags, runContext },
    ].slice(-6);
  };

  const countTrue = (values: Record<string, boolean>) =>
    Object.values(values).filter(Boolean).length;

  useEffect(() => {
    // Enregistre la visite du mode pour les succès globaux.
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, CLASSIQUE: true },
    }));
    checkAchievements({
      custom: { modes_visited_all: countTrue(next.modesVisited) >= TOTAL_GAME_MODES },
    });
  }, [checkAchievements, updateStats]);

  return (
    <div className="flex justify-center items-center h-screen bg-slate-900">
      <TetrisBoard
        mode="CLASSIQUE"
        onGameStart={() => {
          // Démarrage d'une run classique.
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
          // Comptage des combos et des tetris pour les succès.
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
          if (comboStreakRef.current >= 4) {
            pushTimelineSample("mid", ["execution_peak"], {
              comboPeak: comboStreakRef.current,
              boardMaxHeight: lastHeightRef.current,
              pressureScore: Math.round((lastHeightRef.current / 20) * 100),
              stageIndex: levelRef.current,
            });
          }
        }}
        onBoardUpdate={(board) => {
          // Détecte la hauteur max pour les succès "demi plateau".
          boardRef.current = board;
          const rows = board.length;
          let topFilled = rows;
          for (let y = 0; y < rows; y += 1) {
            if (board[y].some((cell) => cell !== 0)) {
              topFilled = y;
              break;
            }
          }
          const height = rows - topFilled;
          if (height >= 14 && lastHeightRef.current < 14) {
            pushTimelineSample(height >= 17 ? "late" : "mid", ["pressure_spike"], {
              boardMaxHeight: height,
              comboPeak: maxComboRef.current,
              pressureScore: Math.round((height / 20) * 100),
              stageIndex: levelRef.current,
            });
          }
          if (lastHeightRef.current >= 15 && height <= lastHeightRef.current - 4) {
            pushTimelineSample(height <= 10 ? "mid" : "late", ["recovery"], {
              boardMaxHeight: height,
              comboPeak: maxComboRef.current,
              pressureScore: Math.round((height / 20) * 100),
              stageIndex: levelRef.current,
            });
          }
          if (height > maxStackHeightRef.current) {
            maxStackHeightRef.current = height;
          }
          lastHeightRef.current = height;
        }}
        onLevelChange={(level) => {
          // Vérifie certaines conditions de succès à partir du niveau.
          levelRef.current = level;
          if (level >= 10 && maxStackHeightRef.current <= 10) {
            checkAchievements({
              mode: "CLASSIQUE",
              custom: { classic_half_board: true },
            });
          }
        }}
        onLocalGameOver={(score, lines) => {
          // Consolidation des stats + déclenchement des succès en fin de run.
          const now = Date.now();
          const durationMs = startTimeRef.current ? now - startTimeRef.current : 0;
          const noHold = holdCountRef.current === 0;
          const noHardDrop = hardDropCountRef.current === 0;
          const level = levelRef.current;
          const mistakes: PlayerMistakeKey[] = [];
          const contextualMistakes: Array<{
            key: PlayerMistakeKey;
            phase: "early" | "mid" | "late";
            pressure: "low" | "medium" | "high";
            trigger: "timeout" | "collapse" | "tilt" | "attrition" | "unknown";
          }> = [];
          const holeCount = countBoardHoles(boardRef.current);
          if (holeCount >= 3) {
            mistakes.push("holes" as const);
            contextualMistakes.push({
              key: "holes",
              phase: durationMs < 90_000 ? "early" : durationMs < 240_000 ? "mid" : "late",
              pressure: holeCount >= 6 ? "high" : "medium",
              trigger: "collapse",
            });
          }
          if (maxStackHeightRef.current >= 16) {
            mistakes.push("unsafe_stack" as const);
            contextualMistakes.push({
              key: "unsafe_stack",
              phase: "late",
              pressure: maxStackHeightRef.current >= 18 ? "high" : "medium",
              trigger: "collapse",
            });
          }
          if (maxStackHeightRef.current >= 18) {
            mistakes.push("top_out" as const);
            contextualMistakes.push({
              key: "top_out",
              phase: "late",
              pressure: "high",
              trigger: durationMs < 90_000 ? "tilt" : "collapse",
            });
          }
          if (durationMs >= 8 * 60 * 1000 && score < 2500) {
            mistakes.push("slow" as const);
            contextualMistakes.push({
              key: "slow",
              phase: "late",
              pressure: "medium",
              trigger: "timeout",
            });
          }
          let sameScoreTwice = false;
          let reachedClassicScoreMilestone = false;
          let reachedClassicLevelMilestone = false;

          const next = updateStats((prev) => {
            sameScoreTwice = prev.lastScore !== null && prev.lastScore === score;
            reachedClassicScoreMilestone = score > 0 && !prev.scoredModes.CLASSIQUE;
            reachedClassicLevelMilestone = level >= 10 && !prev.level10Modes.CLASSIQUE;
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
              counters: {
                ...prev.counters,
                classic_half_board_runs:
                  (prev.counters.classic_half_board_runs ?? 0) +
                  (maxStackHeightRef.current <= 10 ? 1 : 0),
                classic_hold_under_3_runs:
                  (prev.counters.classic_hold_under_3_runs ?? 0) +
                  (holdCountRef.current < 3 ? 1 : 0),
                classic_best_tetris_run: Math.max(
                  prev.counters.classic_best_tetris_run ?? 0,
                  tetrisCountRef.current
                ),
                total_tetris_clears:
                  (prev.counters.total_tetris_clears ?? 0) + tetrisCountRef.current,
              },
            };
          });

          recordPlayerBehavior({
            mode: "CLASSIQUE",
            won: false,
            durationMs,
            mistakes,
            contextualMistakes,
            runContext: {
              boardMaxHeight: maxStackHeightRef.current,
              comboPeak: maxComboRef.current,
              pressureScore: Math.round((maxStackHeightRef.current / 20) * 100),
              stageIndex: level,
            },
            timelineSamples: timelineSamplesRef.current,
          });

          if (mistakes.length === 0 && durationMs >= 60_000) {
            recordTetrobotEvent({ type: "rookie_tip_followed" });
          }
          if (reachedClassicScoreMilestone || reachedClassicLevelMilestone) {
            recordTetrobotEvent({ type: "pulse_advice_success" });
          }

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
              scored_all_modes: countTrue(next.scoredModes) >= TOTAL_SCORED_MODES,
              modes_visited_all: countTrue(next.modesVisited) >= TOTAL_GAME_MODES,
              same_score_twice: sameScoreTwice,
            },
          });
        }}
      />
    </div>
  );
}
