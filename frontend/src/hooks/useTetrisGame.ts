import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkCollision, clearFullLines, mergePiece, rotateMatrix } from "../logic/boardUtils";
import { generateBagPiece } from "../logic/pieceGenerator";
import type { Piece } from "../types/Piece";
import type { GameMode } from "../types/GameMode";
import { applyBomb } from "../logic/bombUtils";

type Options = {
  rows?: number;
  cols?: number;
  mode: GameMode;
  speed?: number;
  gravityMultiplier?: number; 
   scoreMultiplier?: number;
   secondChance?: boolean;
onConsumeSecondChance?: () => void;
  extraHold?: number;
  onGameOver?: (score: number, level: number, lines: number) => void;
  onComplete?: (elapsedMs: number) => void;
  targetLines?: number;
  onBombExplode?: () => void;
  timeFrozen?: boolean;
  chaosMode?: boolean;
  bombRadius?: number;
};

const DEFAULT_ROWS = 20;
const DEFAULT_COLS = 10;
const DEFAULT_SPEED = 1000;
type Explosion = {
  id: string;
  x: number;
  y: number;
  radius: number;
  startedAt: number;
};

export function useTetrisGame({
  rows = DEFAULT_ROWS,
  cols = DEFAULT_COLS,
  mode,
  speed = DEFAULT_SPEED,
  gravityMultiplier = 1,
  extraHold = 0,
  scoreMultiplier = 1,
  onGameOver,
  onComplete,
  secondChance = false,
  onConsumeSecondChance,
  targetLines = 40,
  bagSequence,
  onBombExplode,
  onConsumeLines,
  incomingGarbage = 0,
  onGarbageConsumed,
  timeFrozen = false,
  chaosMode = false,
   bombRadius = 1,
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
  const [speedMs, setSpeedMs] = useState(speed * gravityMultiplier);
  const [ghostPiece, setGhostPiece] = useState<Piece | null>(null);
  const [holdPiece, setHoldPiece] = useState<Piece | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [holdBonusLeft, setHoldBonusLeft] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [fastHoldReset, setFastHoldReset] = useState(false);
  const [lastStandAvailable, setLastStandAvailable] = useState(false);
  const [explosions, setExplosions] = useState<Explosion[]>([]);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveRef = useRef<(dir: "left" | "right" | "down" | "rotate") => void>(() => {});
  const garbageRef = useRef(0);
  const explosionTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingBombsRef = useRef<number[]>([]);

  const clearActivePiece = useCallback(
    (boardState: number[][], lockedPiece: Piece) => {
      const clone = boardState.map((row) => [...row]);
      lockedPiece.shape.forEach((row, dy) => {
        row.forEach((val, dx) => {
          if (!val) return;
          const targetY = lockedPiece.y + dy;
          const targetX = lockedPiece.x + dx;
          if (
            targetY >= 0 &&
            targetY < clone.length &&
            targetX >= 0 &&
            targetX < clone[0].length
          ) {
            clone[targetY][targetX] = 0;
          }
        });
      });
      return clone;
    },
    []
  );

  const shiftBoardDown = useCallback((boardState: number[][], amount = 1) => {
    let shifted = boardState.map((row) => [...row]);
    for (let i = 0; i < amount; i++) {
      shifted = [Array(shifted[0].length).fill(0), ...shifted.slice(0, -1)];
    }
    return shifted;
  }, []);

  const spawnNewPiece = useCallback(() => {
    setPiece(generateBagPiece(bagRef.current));
    setNextPiece(generateBagPiece(bagRef.current));
    setGhostPiece(null);
    setCanHold(true);
    setHoldBonusLeft(extraHold);
  }, [extraHold]);


  const addBomb = useCallback(() => {
  setBombs((b: number) => b + 1);
}, []);

const triggerBomb = useCallback(() => {
  if (bombs <= 0 || !piece || gameOver || !running) return;

  const centerX = piece.x + Math.floor(piece.shape[0].length / 2);
  const centerY = piece.y + Math.floor(piece.shape.length / 2);

  const finalRadius = chaosMode
    ? Math.random() < 0.5 ? bombRadius : bombRadius + 1
    : bombRadius;

  setBombs((b: number) => b - 1);
  pendingBombsRef.current.push(finalRadius);
}, [bombs, piece, gameOver, running, chaosMode, bombRadius]);

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

  useEffect(() => {
 const chaosFactor = chaosMode
  ? 0.8 + Math.random() * 0.6 // entre 0.8 et 1.4
  : 1;

setSpeedMs(speed * gravityMultiplier * chaosFactor);
}, [chaosMode, gravityMultiplier, speed]);

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
      setHoldBonusLeft(extraHold);
      let boardAfterBomb = merged;

      if (pendingBombsRef.current.length > 0) {
        const centerX = currentPiece.x + Math.floor(currentPiece.shape[0].length / 2);
        const centerY = currentPiece.y + Math.floor(currentPiece.shape.length / 2);

        pendingBombsRef.current.forEach((radius) => {
          boardAfterBomb = applyBomb(boardAfterBomb, centerX, centerY, radius);
          onBombExplode?.();

          const explosionId = `${Date.now()}-${Math.random()}`;
          setExplosions((prev) => [
            ...prev,
            {
              id: explosionId,
              x: centerX,
              y: centerY,
              radius,
              startedAt: Date.now(),
            },
          ]);

          const expTimeout = setTimeout(() => {
            setExplosions((prev) => prev.filter((e) => e.id !== explosionId));
          }, 600);
          explosionTimeoutsRef.current.push(expTimeout);
        });

        pendingBombsRef.current = [];
      }

      let boardAfterGarbage = boardAfterBomb;
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
        setScore((prev: number) => prev + linesCleared * 100 * scoreMultiplier);
        setLines((prev: number) => {
          const total = prev + linesCleared;
          if (mode !== "SPRINT") {
            const newLevel = Math.floor(total / 10) + 1;
            setLevel(newLevel);
            setSpeedMs(
  Math.max(200, (speed - (newLevel - 1) * 100) * gravityMultiplier)
);
          } else if (total >= targetLines) {
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
  if (secondChance) {
    onConsumeSecondChance?.();

    // ✅ crée de l’espace : on vide 4 lignes du haut
    const rescuedBoard = newBoard.map((row) => [...row]);
    for (let y = 0; y < Math.min(8, rows); y++) {
      rescuedBoard[y] = Array(cols).fill(0);
    }
    setBoard(rescuedBoard);

    // ✅ respawn propre
    setPiece(generateBagPiece(bagRef.current));
    setNextPiece(generateBagPiece(bagRef.current));
    setGhostPiece(null);

    return;
  }

  if (lastStandAvailable) {
    setLastStandAvailable(false);

    const boardWithoutPiece = clearActivePiece(newBoard, currentPiece);
    const rescuedBoard = shiftBoardDown(boardWithoutPiece, 1);
    setBoard(rescuedBoard);
    spawnNewPiece();
    return;
  }

  setRunning(false);
  setGameOver(true);
  onGameOver?.(score, level, lines);
  return;
}

      setPiece(newPiece);
      setNextPiece(generateBagPiece(bagRef.current));
    },
    [
      nextPiece,
      mode,
      targetLines,
      speed,
      startTime,
      onComplete,
      onGameOver,
      score,
      level,
      lines,
      onConsumeLines,
      extraHold,
      gravityMultiplier,
      secondChance,
      onConsumeSecondChance,
      rows,
      cols,
      scoreMultiplier,
      onGarbageConsumed,
      lastStandAvailable,
      clearActivePiece,
      shiftBoardDown,
      spawnNewPiece,
    ]
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
  if (!piece) return;

  if (!canHold && holdBonusLeft <= 0 && !fastHoldReset) return;
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
    if (!canHold && holdBonusLeft > 0) {
  setHoldBonusLeft((v: number) => v - 1);
}
    setCanHold(false);
  }, [canHold, fastHoldReset, holdBonusLeft, cols, holdPiece, nextPiece, piece]);

  // ----- Tick -----
  // Boucle de jeu : tick basé sur setInterval, sépare le timer et le mouvement
  useEffect(() => {
    // Toujours nettoyer l'intervalle courant quand les dépendances changent
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!running || gameOver || timeFrozen) return;

    intervalRef.current = setInterval(() => {
      setTick((t: number) => t + 1);
    }, speedMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running, gameOver, speedMs, timeFrozen]);

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
    setHoldBonusLeft(0);
    setSpeedMs(speed * gravityMultiplier);
    setGhostPiece(null);
    setHoldPiece(null);
    setCanHold(true);
    setStartTime(null);
    setElapsedMs(0);
    setCompleted(false);
    setFastHoldReset(false);
    setLastStandAvailable(false);
    setExplosions([]);
    pendingBombsRef.current = [];
    explosionTimeoutsRef.current.forEach((id) => clearTimeout(id));
    explosionTimeoutsRef.current = [];
  }, [cols, gravityMultiplier, rows, speed]);

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
       bombs,
      explosions,
    }),
    [board, piece, nextPiece, score, lines, level, gameOver, running, ghostPiece, holdPiece, completed, elapsedMs, bombs, explosions]
  );

  const enableFastHoldReset = useCallback(() => setFastHoldReset(true), []);
  const enableLastStand = useCallback(() => setLastStandAvailable(true), []);

  return {
    state,
    actions: {
      movePiece,
      hardDrop,
      handleHold,
      start,
      pause,
      reset,
      addBomb,
      triggerBomb,
      enableFastHoldReset,
      enableLastStand,
    },
  };
}
