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
  bagSequence,
  onConsumeLines,
  incomingGarbage = 0,
  onGarbageConsumed,
}: Options & {
  bagSequence?: string[];
  onConsumeLines?: (lines: number) => void;
  incomingGarbage?: number;
  onGarbageConsumed?: () => void;
}) {
  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: rows }, () => Array(cols).fill(0))
  );
  const bagRef = useRef<string[]>(bagSequence ? [...bagSequence] : []);
  const [piece, setPiece] = useState<Piece>(() =>
    bagRef.current.length ? generateBagPiece(bagRef.current) : generateBagPiece()
  );
  const [nextPiece, setNextPiece] = useState<Piece>(() =>
    bagRef.current.length ? generateBagPiece(bagRef.current) : generateBagPiece()
  );
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [speedMs, setSpeedMs] = useState(speed);
  const [ghostPiece, setGhostPiece] = useState<Piece | null>(null);
  const [holdPiece, setHoldPiece] = useState<Piece | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [completed, setCompleted] = useState(false);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveRef = useRef<(dir: "left" | "right" | "down" | "rotate") => void>(() => {});
  const garbageRef = useRef(0);

  // Mettre à jour le bag quand une nouvelle séquence arrive
  // Ajout de bag externe : on concatène pour éviter de tomber en panne de tirage
  useEffect(() => {
    if (bagSequence && bagSequence.length > 0) {
      bagRef.current.push(...bagSequence);
      // Si le board est vide et qu'on n'a pas démarré, on prépare la prochaine pièce
      if (!running) {
        setPiece(generateBagPiece(bagRef.current));
        setNextPiece(generateBagPiece(bagRef.current));
      }
    }
  }, [bagSequence, running]);

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
      let boardAfterGarbage = merged;
      if (garbageRef.current > 0) {
        // injecter des lignes avec un trou pour éviter de donner du score gratuit
        const garbageLines = Array.from({ length: garbageRef.current }, () => {
          const line = Array(cols).fill(1);
          const hole = Math.floor(Math.random() * cols);
          line[hole] = 0;
          return line;
        });
        boardAfterGarbage = [...boardAfterGarbage.slice(garbageRef.current), ...garbageLines];
        if (onGarbageConsumed) onGarbageConsumed();
        garbageRef.current = 0;
      }
      const { newBoard, linesCleared } = clearFullLines(boardAfterGarbage);

      if (linesCleared > 0) {
        if (onConsumeLines) onConsumeLines(linesCleared);
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

      const newPiece = nextPiece ?? generateBagPiece(bagRef.current);
      if (checkCollision(newBoard, newPiece.shape, newPiece.x, newPiece.y)) {
        setRunning(false);
        setGameOver(true);
        if (onGameOver) onGameOver(score, level, lines);
        return;
      }

      setPiece(newPiece);
      setNextPiece(generateBagPiece(bagRef.current));
    },
    [nextPiece, mode, targetLines, speed, startTime, onComplete, onGameOver, score, level, lines, onConsumeLines]
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
      setNextPiece(generateBagPiece(bagRef.current));
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
  // Boucle de jeu : tick basé sur setInterval, sépare le timer et le mouvement
  useEffect(() => {
    // Toujours nettoyer l'intervalle courant quand les dépendances changent
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!running || gameOver) return;

    intervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, speedMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running, gameOver, speedMs]);

  // Déplacement vertical sur chaque tick
  useEffect(() => {
    moveRef.current = movePiece;
  }, [movePiece]);

  useEffect(() => {
    if (!running || gameOver) return;
    moveRef.current("down");
  }, [tick, running, gameOver]);

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

  // Consommer le compteur de garbage externe
  useEffect(() => {
    if (incomingGarbage > 0) {
      garbageRef.current = incomingGarbage;
    }
  }, [incomingGarbage]);

  const pause = useCallback(() => {
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setBoard(Array.from({ length: rows }, () => Array(cols).fill(0)));
    setPiece(generateBagPiece());
    setNextPiece(generateBagPiece());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setRunning(false);
    setTick(0);
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
