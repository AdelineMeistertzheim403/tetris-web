import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TetrisBoard from "../../game/components/board/TetrisBoard";
import type { PuzzleObjective } from "../types/Puzzle";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { TOTAL_GAME_MODES } from "../../game/types/GameMode";
import type { PuzzleDefinition } from "../types/Puzzle";
import {
  fetchPuzzle,
  fetchPuzzles,
  submitPuzzleAttempt,
  submitPuzzleSolution,
} from "../services/puzzleService";
import "../../../styles/puzzle.css";

type RunStatus = "running" | "success" | "failed";

const isFreeZoneClear = (
  board: number[][],
  zone: { x: number; y: number; width: number; height: number }
) => {
  for (let y = zone.y; y < zone.y + zone.height; y += 1) {
    for (let x = zone.x; x < zone.x + zone.width; x += 1) {
      if (board[y]?.[x]) return false;
    }
  }
  return true;
};

export default function PuzzleRun() {
  const { id } = useParams();
  const [puzzle, setPuzzle] = useState<PuzzleDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updateStats, checkAchievements } = useAchievements();
  const [runKey, setRunKey] = useState(0);
  const [movesUsed, setMovesUsed] = useState(0);
  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [holdUsed, setHoldUsed] = useState(false);
  const [status, setStatus] = useState<RunStatus>("running");
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [sequenceEnded, setSequenceEnded] = useState(false);
  const [lastBoard, setLastBoard] = useState<number[][]>(
    puzzle?.initialBoard ?? []
  );
  const [totalPuzzles, setTotalPuzzles] = useState<number | null>(null);
  const attemptSubmittedRef = useRef(false);
  const solutionSubmittedRef = useRef(false);
  const attemptTrackedRef = useRef(false);
  const successProcessedRef = useRef(false);
  const runStartRef = useRef<number | null>(null);
  const invalidMovesRef = useRef(0);

  useEffect(() => {
    let active = true;
    if (!id) {
      setError("Puzzle introuvable.");
      setLoading(false);
      return;
    }
    attemptSubmittedRef.current = false;
    solutionSubmittedRef.current = false;
    attemptTrackedRef.current = false;
    successProcessedRef.current = false;
    runStartRef.current = null;
    invalidMovesRef.current = 0;
    (async () => {
      try {
        const data = await fetchPuzzle(id);
        if (active) {
          setPuzzle(data);
          setLastBoard(data.initialBoard ?? []);
        }
      } catch (err) {
        if (active) setError("Impossible de charger le puzzle.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchPuzzles();
        if (active) setTotalPuzzles(data.length);
      } catch {
        // silent
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!puzzle) return;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, PUZZLE: true },
    }));
    checkAchievements({
      custom: {
        modes_visited_all:
          Object.values(next.modesVisited).filter(Boolean).length >= TOTAL_GAME_MODES,
      },
    });
  }, [checkAchievements, puzzle, updateStats]);

  useEffect(() => {
    setLastBoard(puzzle?.initialBoard ?? []);
  }, [puzzle]);

  const objectivesStatus = useMemo(() => {
    if (!puzzle) return [];
    return puzzle.objectives.map((obj) => {
      let met = false;
      if (obj.type === "clear_lines") {
        met = linesCleared >= obj.count;
      } else if (obj.type === "survive_pieces") {
        met = piecesPlaced >= obj.count;
      } else if (obj.type === "free_zone") {
        met = piecesPlaced > 0 && isFreeZoneClear(lastBoard, obj);
      }
      return { obj, met };
    });
  }, [lastBoard, linesCleared, piecesPlaced, puzzle]);

  const allObjectivesMet = objectivesStatus.length > 0 && objectivesStatus.every((o) => o.met);

  const efficiencyScore = useMemo(() => {
    if (!puzzle) return 0;
    if (puzzle.optimalMoves) {
      const diff = Math.max(0, movesUsed - puzzle.optimalMoves);
      return Math.max(0, 100 - diff * 10);
    }
    if (puzzle.maxMoves !== undefined) {
      return Math.max(0, puzzle.maxMoves - movesUsed);
    }
    return 0;
  }, [movesUsed, puzzle]);

  useEffect(() => {
    if (!puzzle || status !== "running") return;
    if (allObjectivesMet) {
      setStatus("success");
      setFailureReason(null);
      return;
    }
    if (sequenceEnded) {
      setStatus("failed");
      setFailureReason("Séquence épuisée");
      return;
    }
    if (puzzle.maxMoves !== undefined && movesUsed > puzzle.maxMoves) {
      setStatus("failed");
      setFailureReason("Limite de mouvements atteinte");
    }
  }, [allObjectivesMet, movesUsed, puzzle, sequenceEnded, status]);

  useEffect(() => {
    if (status !== "success" || !puzzle) return;
    if (successProcessedRef.current) return;
    successProcessedRef.current = true;

    const runDurationMs =
      runStartRef.current !== null ? Date.now() - runStartRef.current : null;
    const isOptimal =
      puzzle.optimalMoves !== undefined && movesUsed <= puzzle.optimalMoves;
    const isAltSolution =
      puzzle.optimalMoves !== undefined && movesUsed > puzzle.optimalMoves;
    const hasSurviveObjective = puzzle.objectives.some(
      (obj) => obj.type === "survive_pieces"
    );
    const freeZoneObjectives = puzzle.objectives.filter(
      (obj) => obj.type === "free_zone"
    ).length;

    const next = updateStats((prev) => {
      const completedSet = new Set(prev.puzzleCompletedIds ?? []);
      completedSet.add(puzzle.id);
      const nextCompletedIds = Array.from(completedSet).sort();

      return {
        ...prev,
        puzzleCompletedIds: nextCompletedIds,
        puzzleOptimalCount: prev.puzzleOptimalCount + (isOptimal ? 1 : 0),
        puzzleNoHoldCount: prev.puzzleNoHoldCount + (!holdUsed ? 1 : 0),
        puzzleSurviveCount: prev.puzzleSurviveCount + (hasSurviveObjective ? 1 : 0),
        puzzleFreeZonesTotal: prev.puzzleFreeZonesTotal + freeZoneObjectives,
        puzzleLinesTotal: prev.puzzleLinesTotal + linesCleared,
        puzzleWinStreak: prev.puzzleWinStreak + 1,
      };
    });

    const completedCount = next.puzzleCompletedIds.length;
    const attemptsForPuzzle = next.puzzleAttemptsById[puzzle.id] ?? 0;
    checkAchievements({
      mode: "PUZZLE",
      custom: {
        puzzle_no_hold: !holdUsed,
        puzzle_optimal: isOptimal,
        puzzle_completed_1: completedCount >= 1,
        puzzle_completed_5: completedCount >= 5,
        puzzle_completed_all:
          totalPuzzles !== null && completedCount >= totalPuzzles,
        puzzle_no_hold_5: next.puzzleNoHoldCount >= 5,
        puzzle_no_error: invalidMovesRef.current === 0,
        puzzle_optimal_1: next.puzzleOptimalCount >= 1,
        puzzle_optimal_5: next.puzzleOptimalCount >= 5,
        puzzle_under_30s: runDurationMs !== null && runDurationMs <= 30_000,
        puzzle_streak_3: next.puzzleWinStreak >= 3,
        puzzle_survive_3: next.puzzleSurviveCount >= 3,
        puzzle_free_zones_5: next.puzzleFreeZonesTotal >= 5,
        puzzle_lines_10: next.puzzleLinesTotal >= 10,
        puzzle_hard_completed: puzzle.difficulty === "hard",
        puzzle_very_hard_completed: puzzle.difficulty === "very hard",
        puzzle_same_3: attemptsForPuzzle >= 3,
        puzzle_alt_solution: isAltSolution,
      },
    });
  }, [
    checkAchievements,
    holdUsed,
    linesCleared,
    movesUsed,
    puzzle,
    status,
    totalPuzzles,
    updateStats,
  ]);

  useEffect(() => {
    if (!puzzle || !id) return;
    if (status === "running") return;
    if (attemptTrackedRef.current) return;
    attemptTrackedRef.current = true;
    const next = updateStats((prev) => {
      const puzzleAttemptsById = { ...prev.puzzleAttemptsById };
      puzzleAttemptsById[id] = (puzzleAttemptsById[id] ?? 0) + 1;
      return {
        ...prev,
        puzzleAttemptsById,
        puzzleWinStreak: status === "success" ? prev.puzzleWinStreak : 0,
      };
    });
    checkAchievements({
      mode: "PUZZLE",
      custom: {
        puzzle_same_3: (next.puzzleAttemptsById[id] ?? 0) >= 3,
      },
    });
  }, [checkAchievements, id, puzzle, status, updateStats]);

  useEffect(() => {
    if (!puzzle || !id) return;
    if (status === "running") return;
    if (attemptSubmittedRef.current) return;
    attemptSubmittedRef.current = true;
    submitPuzzleAttempt(id, {
      success: status === "success",
      movesUsed,
      linesCleared,
      piecesPlaced,
      holdUsed,
      efficiencyScore,
      optimal:
        status === "success" &&
        puzzle.optimalMoves !== undefined &&
        movesUsed <= puzzle.optimalMoves,
    }).catch(() => {
      attemptSubmittedRef.current = false;
    });
  }, [
    efficiencyScore,
    holdUsed,
    id,
    linesCleared,
    movesUsed,
    piecesPlaced,
    puzzle,
    status,
  ]);

  useEffect(() => {
    if (!puzzle || !id) return;
    if (status !== "success") return;
    if (solutionSubmittedRef.current) return;
    solutionSubmittedRef.current = true;
    submitPuzzleSolution(id, {
      movesUsed,
      optimal: puzzle.optimalMoves !== undefined && movesUsed <= puzzle.optimalMoves,
      data: {
        movesUsed,
        linesCleared,
        piecesPlaced,
        holdUsed,
        efficiencyScore,
      },
    }).catch(() => {
      solutionSubmittedRef.current = false;
    });
  }, [efficiencyScore, holdUsed, id, linesCleared, movesUsed, piecesPlaced, puzzle, status]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-pink-300 bg-black">
        <p>Chargement...</p>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-pink-300 bg-black">
        <p>{error ?? "Puzzle introuvable."}</p>
        <Link to="/puzzle" className="text-pink-400 underline">
          Retour
        </Link>
      </div>
    );
  }

  const movesLeft =
    puzzle.maxMoves !== undefined ? Math.max(0, puzzle.maxMoves - movesUsed) : null;

  const resetRun = () => {
    setRunKey((k) => k + 1);
    setMovesUsed(0);
    setPiecesPlaced(0);
    setLinesCleared(0);
    setHoldUsed(false);
    setStatus("running");
    setFailureReason(null);
    setSequenceEnded(false);
    setLastBoard(puzzle.initialBoard);
    attemptSubmittedRef.current = false;
    solutionSubmittedRef.current = false;
    attemptTrackedRef.current = false;
    successProcessedRef.current = false;
    runStartRef.current = null;
    invalidMovesRef.current = 0;
  };

  return (
    <div className="min-h-screen bg-black text-pink-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-pink-400">Mode Énigme</p>
          <h1 className="text-2xl text-yellow-400">{puzzle.name}</h1>
          <p className="text-sm text-pink-200">{puzzle.description}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/puzzle" className="px-3 py-2 rounded bg-pink-900/60">
            Liste des puzzles
          </Link>
          <button onClick={resetRun} className="px-3 py-2 rounded bg-pink-600">
            Rejouer
          </button>
        </div>
      </div>

      <div className="puzzle-run">
        <aside className="puzzle-left">
          <h2 className="text-lg text-yellow-300 mb-3">Objectifs</h2>
          <ul className="text-sm space-y-2">
            {objectivesStatus.map(({ obj, met }) => (
              <li key={`${obj.type}-${JSON.stringify(obj)}`} className="flex items-center gap-2">
                <span>{met ? "✅" : "⬜"}</span>
                <span>{formatObjective(obj)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 text-sm space-y-1">
            <div>Moves utilisés : {movesUsed}</div>
            {movesLeft !== null && <div>Moves restants : {movesLeft}</div>}
            <div>Pièces posées : {piecesPlaced}</div>
            <div>Lignes clear : {linesCleared}</div>
            <div>Efficacité : {efficiencyScore}</div>
            <div>Hold autorisé : {puzzle.allowHold ? "Oui" : "Non"}</div>
          </div>

          {status !== "running" && (
            <div className="mt-4 p-3 rounded bg-black/50">
              <p className="text-lg text-yellow-300">
                {status === "success" ? "Puzzle résolu ✅" : "Échec ❌"}
              </p>
              {failureReason && <p className="text-sm">{failureReason}</p>}
            </div>
          )}
        </aside>

        <div className="puzzle-center relative">
          <TetrisBoard
            key={runKey}
            mode="PUZZLE"
            scoreMode={null}
            fixedSequence={puzzle.sequence}
            initialBoard={puzzle.initialBoard}
            autoStart
            hideGameOverOverlay
            hideStats
            hideSidebar
            layout="plain"
            disableHold={!puzzle.allowHold}
            contracts={puzzle.contracts}
            onHold={() => setHoldUsed(true)}
            onContractViolation={(reason) => {
              if (status !== "running") return;
              setStatus("failed");
              setFailureReason(reason);
            }}
            onLinesCleared={(count) => setLinesCleared((prev) => prev + count)}
            onInvalidMove={() => {
              invalidMovesRef.current += 1;
            }}
            onPieceLocked={({ board }) => {
              setMovesUsed((prev) => prev + 1);
              setPiecesPlaced((prev) => prev + 1);
              setLastBoard(board);
            }}
            onGameStart={() => {
              runStartRef.current = Date.now();
            }}
            onSequenceEnd={() => {
              if (status !== "running") return;
              setSequenceEnded(true);
            }}
            paused={status !== "running"}
          />

          {status !== "running" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center p-6 rounded-lg border border-pink-500/50 bg-[#0b001a]">
                <p className="text-2xl text-yellow-300 mb-2">
                  {status === "success" ? "Puzzle résolu ✅" : "Échec ❌"}
                </p>
                {failureReason && <p className="text-sm text-pink-200">{failureReason}</p>}
                <div className="mt-4 flex gap-3 justify-center">
                  <button onClick={resetRun} className="px-4 py-2 rounded bg-pink-600">
                    Rejouer
                  </button>
                  <Link to="/puzzle" className="px-4 py-2 rounded bg-pink-900/60">
                    Liste des puzzles
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatObjective(obj: PuzzleObjective) {
  switch (obj.type) {
    case "clear_lines":
      return `Clear ${obj.count} ligne(s)`;
    case "survive_pieces":
      return `Survivre ${obj.count} pièce(s)`;
    case "free_zone":
      return `Libérer zone ${obj.width}x${obj.height} (x:${obj.x}, y:${obj.y})`;
    default:
      return "Objectif";
  }
}
