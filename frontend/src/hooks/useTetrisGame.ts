import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkCollision, clearFullLines, mergePiece, rotateMatrix } from "../logic/boardUtils";
import { generateBagPiece } from "../logic/pieceGenerator";
import type { Piece } from "../types/Piece";

type GameMode = "CLASSIQUE" | "SPRINT";

type Options = {
  rows?: number;
  cols?: number;
  mode: GameMode;
  speed?: number;
  onGameOver?: (score: number, level: number, lines: number) => void;
  onComplete?: (elapsedMs: number) => void; // pour sprint
  targetLines?: number; // pour sprint
};

const DEFAULT_ROWS = 20;
const DEFAULT_COLS = 10;
const DEFAULT_SPEED = 1000;

export function useTetrisGame({
  rows = DEFAULT_ROWS,
  cols = DEFAULT_COLS,
  mode,
  speed = DEFAULT_SPEED,
  onGameOver,
  onComplete,
  targetLines = 40,
}: Options) {
  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: rows }, () => Array(cols).fill(0))
  );
  const [piece, setPiece] = useState<Piece>(generateBagPiece());
  const [nextPiece, setNextPiece] = useState<Piece>(generateBagPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [speedMs, setSpeedMs] = useState(speed);
  const [ghostPiece, setGhostPiece] = useState<Piece | null>(null);
  const [holdPiece, setHoldPiece] = useState<Piece | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [completed, setCompleted] = useState(false);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const computeGhost = useCallback(
    (current: Piece, stateBoard: number[][]) => {
      let ghostY = current.y;
      while (!checkCollision(stateBoard, current.shape, current.x, ghostY + 1)) {
        ghostY++;
      }
      setGhostPiece({ ...current, y: ghostY, ghost: true });
    },
    []
  );

  const mergeAndNext = useCallback(
    (currentBoard: number[][], currentPiece: Piece) => {
      const merged = mergePiece(currentBoard, currentPiece.shape, currentPiece.x, currentPiece.y);
      setCanHold(true);
      const { newBoard, linesCleared } = clearFullLines(merged);

      if (linesCleared > 0) {
        setScore((prev) => prev + linesCleared * 100);
        setLines((prev) => {
          const total = prev + linesCleared;
          if (mode === "CLASSIQUE") {
            const newLevel = Math.floor(total / 10) + 1;
            setLevel(newLevel);
            setSpeedMs(Math.max(200, speed - (newLevel - 1) * 100));
          } else if (mode === "SPRINT" && total >= targetLines) {
            setRunning(false);
            const nowElapsed = Date.now() - (startTime ?? Date.now());
            setElapsedMs(nowElapsed);
            setCompleted(true);
            if (onComplete) onComplete(nowElapsed);
            setLines(total);
            setBoard(newBoard);
            return total;
          }
          return total;
        });
      }

      setBoard(newBoard);

      const newPiece = nextPiece;
      if (checkCollision(newBoard, newPiece.shape, newPiece.x, newPiece.y)) {
        setRunning(false);
        setGameOver(true);
        if (onGameOver) onGameOver(score, level, lines);
        return;
      }

      setPiece(newPiece);
      setNextPiece(generateBagPiece());
    },
    [nextPiece, mode, targetLines, speed, startTime, onComplete, onGameOver, score, level, lines]
  );

  // ----- Movement -----
  const movePiece = useCallback(
    (dir: "left" | "right" | "down" | "rotate") => {
      if (!running || gameOver) return;
      let newX = piece.x;
      let newY = piece.y;
      let newShape = piece.shape;

      if (dir === "left") newX--;
      if (dir === "right") newX++;
      if (dir === "down") newY++;
      if (dir === "rotate") newShape = rotateMatrix(piece.shape);

      if (!checkCollision(board, newShape, newX, newY)) {
        setPiece({ ...piece, x: newX, y: newY, shape: newShape });
      } else if (dir === "down") {
        mergeAndNext(board, piece);
      }
    },
    [board, gameOver, mergeAndNext, piece, running]
  );

  // Hard drop
  const hardDrop = useCallback(() => {
    if (!running || gameOver) return;
    let dropY = piece.y;
    while (!checkCollision(board, piece.shape, piece.x, dropY + 1)) {
      dropY++;
    }
    setPiece({ ...piece, y: dropY });
    mergeAndNext(board, { ...piece, y: dropY });
  }, [board, gameOver, mergeAndNext, piece, running]);

  const handleHold = useCallback(() => {
    if (!canHold || !piece) return;
    if (!holdPiece) {
      setHoldPiece(piece);
      setPiece(nextPiece);
      setNextPiece(generateBagPiece());
    } else {
      const swapped = holdPiece;
      setHoldPiece(piece);
      setPiece({
        ...swapped,
        x: cols / 2 - Math.floor(swapped.shape[0].length / 2),
        y: 0,
      });
    }
    setCanHold(false);
  }, [canHold, cols, holdPiece, nextPiece, piece]);

  // ----- Tick -----
  useEffect(() => {
    if (!running || gameOver) return;
    intervalRef.current && clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      movePiece("down");
    }, speedMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, gameOver, movePiece, speedMs]);

  // Ghost recompute
  useEffect(() => {
    computeGhost(piece, board);
  }, [piece, board, computeGhost]);

  // Sprint timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (running && startTime) {
      timer = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 100);
    }
    return () => clearInterval(timer);
  }, [running, startTime]);

  const start = useCallback(() => {
    setRunning(true);
    if (!startTime) setStartTime(Date.now());
  }, [startTime]);

  const pause = useCallback(() => {
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    intervalRef.current && clearInterval(intervalRef.current);
    setBoard(Array.from({ length: rows }, () => Array(cols).fill(0)));
    setPiece(generateBagPiece());
    setNextPiece(generateBagPiece());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setRunning(false);
    setSpeedMs(speed);
    setGhostPiece(null);
    setHoldPiece(null);
    setCanHold(true);
    setStartTime(null);
    setElapsedMs(0);
    setCompleted(false);
  }, [cols, rows, speed]);

  const state = useMemo(
    () => ({
      board,
      piece,
      nextPiece,
      score,
      lines,
      level,
      gameOver,
      running,
      ghostPiece,
      holdPiece,
      completed,
      elapsedMs,
    }),
    [board, piece, nextPiece, score, lines, level, gameOver, running, ghostPiece, holdPiece, completed, elapsedMs]
  );

  return {
    state,
    actions: {
      movePiece,
      hardDrop,
      handleHold,
      start,
      pause,
      reset,
    },
  };
}
