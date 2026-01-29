import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkCollision, clearFullLines, mergePiece, rotateMatrix } from "../logic/boardUtils";
import { createBagGenerator, createPieceFromKey } from "../logic/pieceGenerator";
import { SHAPES } from "../logic/shapes";
import type { Piece } from "../types/Piece";
import type { GameMode } from "../types/GameMode";
import { applyBomb } from "../logic/bombUtils";
import type { RNG } from "../utils/rng";

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
  cursedMode?: boolean;
  bombRadius?: number;
  hardDropHoldReset?: boolean;
  chaosDrift?: boolean;
  pieceMutation?: boolean;
  rng?: RNG;
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

const EXPLOSION_FRAME_DURATION_MS = 80;
const getExplosionFrameCount = (radius: number) => {
  if (radius >= 3) return 9; // 7x7
  if (radius === 2) return 7; // 5x5
  return 4; // 3x3
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
  cursedMode = false,
   bombRadius = 1,
  hardDropHoldReset = false,
  chaosDrift = false,
  pieceMutation = false,
  rng,
}: Options & {
  bagSequence?: string[];
  onConsumeLines?: (lines: number) => void;
  incomingGarbage?: number;
  onGarbageConsumed?: () => void;
}) {
  const rngRef = useRef<RNG>(() => Math.random());
  if (rng && rngRef.current !== rng) {
    rngRef.current = rng;
  }
  const bagGenRef = useRef(createBagGenerator(rngRef.current));
  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: rows }, () => Array(cols).fill(0))
  );
  const [piece, setPiece] = useState<Piece>(() => bagGenRef.current.next());
  const [nextPiece, setNextPiece] = useState<Piece>(() => bagGenRef.current.next());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [baseSpeedMs, setBaseSpeedMs] = useState(speed);
  const [speedMs, setSpeedMs] = useState(speed * gravityMultiplier);
  const [chaosGravityFactor, setChaosGravityFactor] = useState(1);
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
  const chaosBombRef = useRef<number | null>(null);

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
    setPiece(bagGenRef.current.next());
    setNextPiece(bagGenRef.current.next());
    setGhostPiece(null);
    setCanHold(true);
    setHoldBonusLeft(extraHold);
    if (chaosMode || cursedMode) {
      const chance = cursedMode ? 0.25 : 0.12;
      const roll = rngRef.current();
      if (roll < chance) {
        const radiusRoll = rngRef.current();
        chaosBombRef.current = cursedMode
          ? radiusRoll < 0.5
            ? 2
            : 3
          : radiusRoll < 0.7
            ? 1
            : 2;
      } else {
        chaosBombRef.current = null;
      }
    } else {
      chaosBombRef.current = null;
    }
  }, [extraHold, chaosMode, cursedMode]);


  const addBomb = useCallback(() => {
  setBombs((b: number) => b + 1);
}, []);

const triggerBomb = useCallback(() => {
  if (bombs <= 0 || !piece || gameOver || !running) return;


  const finalRadius = chaosMode
    ? rngRef.current() < 0.5 ? bombRadius : bombRadius + 1
    : bombRadius;

  setBombs((b: number) => b - 1);
  pendingBombsRef.current.push(finalRadius);
}, [bombs, piece, gameOver, running, chaosMode, bombRadius]);

  // Mettre à jour le bag quand une nouvelle séquence arrive
  // Ajout de bag externe : on concatène pour éviter de tomber en panne de tirage
  useEffect(() => {
    if (bagSequence && bagSequence.length > 0) {
      bagGenRef.current.pushSequence([...bagSequence]);
      if (!running) {
        setPiece(bagGenRef.current.next());
        setNextPiece(bagGenRef.current.next());
      }
    }
  }, [bagSequence, running]);

  useEffect(() => {
    if (!rng) return;
    rngRef.current = rng;
    bagGenRef.current = createBagGenerator(rngRef.current);
    setPiece(bagGenRef.current.next());
    setNextPiece(bagGenRef.current.next());
  }, [rng]);

  useEffect(() => {
    setBaseSpeedMs(speed);
  }, [speed]);

  useEffect(() => {
    if (!chaosMode && !cursedMode) {
      setChaosGravityFactor(1);
      return;
    }

    const update = () => {
      const min = cursedMode ? 0.4 : 0.6;
      const range = cursedMode ? 1.8 : 1.2;
      setChaosGravityFactor(min + rngRef.current() * range);
    };

    update();
    const interval = setInterval(
      update,
      cursedMode ? 800 + rngRef.current() * 800 : 1500 + rngRef.current() * 1500
    );
    return () => clearInterval(interval);
  }, [chaosMode, cursedMode]);

  useEffect(() => {
    setSpeedMs(baseSpeedMs * gravityMultiplier * chaosGravityFactor);
  }, [baseSpeedMs, gravityMultiplier, chaosGravityFactor]);

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

      if (chaosBombRef.current !== null) {
        pendingBombsRef.current.push(chaosBombRef.current);
        chaosBombRef.current = null;
      }

      if (pendingBombsRef.current.length > 0) {
        const centerX = currentPiece.x + Math.floor(currentPiece.shape[0].length / 2);
        const centerY = currentPiece.y + Math.floor(currentPiece.shape.length / 2);

        pendingBombsRef.current.forEach((radius) => {
          boardAfterBomb = applyBomb(boardAfterBomb, centerX, centerY, radius);
          onBombExplode?.();

          const explosionId = `${Date.now()}-${rngRef.current()}`;
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

          const frames = getExplosionFrameCount(radius);
          const animationDuration = frames * EXPLOSION_FRAME_DURATION_MS;
          const expTimeout = setTimeout(() => {
            setExplosions((prev) => prev.filter((e) => e.id !== explosionId));
          }, animationDuration + 50);
          explosionTimeoutsRef.current.push(expTimeout);
        });

        pendingBombsRef.current = [];
      }

      let boardAfterGarbage = boardAfterBomb;
      if (cursedMode && rngRef.current() < 0.12) {
        const cursedLinesCount = rngRef.current() < 0.7 ? 1 : 2;
        const cursedLines = Array.from({ length: cursedLinesCount }, () => {
          const line = Array(cols).fill(1);
          const hole = Math.floor(rngRef.current() * cols);
          line[hole] = 0;
          return line;
        });
        boardAfterGarbage = [
          ...boardAfterGarbage.slice(cursedLinesCount),
          ...cursedLines,
        ];
      }
      if (garbageRef.current > 0) {
        // injecter des lignes avec un trou pour éviter de donner du score gratuit
        const garbageLines = Array.from({ length: garbageRef.current }, () => {
          const line = Array(cols).fill(1);
          const hole = Math.floor(rngRef.current() * cols);
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
            const nextBaseSpeedMs = Math.max(200, speed - (newLevel - 1) * 100);
            setBaseSpeedMs(nextBaseSpeedMs);
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

      const newPiece = nextPiece ?? bagGenRef.current.next();
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
    setPiece(bagGenRef.current.next());
    setNextPiece(bagGenRef.current.next());
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
      setNextPiece(bagGenRef.current.next());
      if (chaosMode || cursedMode) {
        const chance = cursedMode ? 0.25 : 0.12;
        const roll = rngRef.current();
        if (roll < chance) {
          const radiusRoll = rngRef.current();
          chaosBombRef.current = cursedMode
            ? radiusRoll < 0.5
              ? 2
              : 3
            : radiusRoll < 0.7
              ? 1
              : 2;
        } else {
          chaosBombRef.current = null;
        }
      } else {
        chaosBombRef.current = null;
      }
    },
    [extraHold, nextPiece, onBombExplode, onGarbageConsumed, cols, onConsumeLines, scoreMultiplier, mode, targetLines, speed, startTime, onComplete, secondChance, lastStandAvailable, onGameOver, score, level, lines, onConsumeSecondChance, rows, clearActivePiece, shiftBoardDown, spawnNewPiece, chaosMode, cursedMode]
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
    if (hardDropHoldReset) {
      setCanHold(true);
      setHoldBonusLeft(extraHold);
    }
  }, [board, gameOver, mergeAndNext, piece, running, hardDropHoldReset, extraHold]);

  const handleHold = useCallback(() => {
  if (!piece) return;

  if (!canHold && holdBonusLeft <= 0 && !fastHoldReset) return;
    if (!holdPiece) {
      setHoldPiece(piece);
      setPiece(nextPiece);
      setNextPiece(bagGenRef.current.next());
      
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

  useEffect(() => {
    if (!running || gameOver) return;
    if (!chaosDrift && !pieceMutation && !chaosMode && !cursedMode) return;

    setPiece((current) => {
      let updated = current;

      if ((chaosDrift || chaosMode || cursedMode) && rngRef.current() < 0.2) {
        const dir = rngRef.current() < 0.5 ? -1 : 1;
        if (!checkCollision(board, current.shape, current.x + dir, current.y)) {
          updated = { ...updated, x: updated.x + dir };
        }
      }

      if ((pieceMutation || chaosMode || cursedMode) && rngRef.current() < (cursedMode ? 0.18 : 0.1)) {
        const mutated = rotateMatrix(updated.shape);
        if (!checkCollision(board, mutated, updated.x, updated.y)) {
          updated = { ...updated, shape: mutated };
        }
      }

      if ((chaosMode || cursedMode) && rngRef.current() < (cursedMode ? 0.12 : 0.05)) {
        const keys = Object.keys(SHAPES);
        const key = keys[Math.floor(rngRef.current() * keys.length)];
        const candidate = createPieceFromKey(key);
        if (!checkCollision(board, candidate.shape, updated.x, updated.y)) {
          updated = { ...updated, shape: candidate.shape, color: candidate.color, type: key };
        }
      }

      return updated;
    });
  }, [tick, running, gameOver, chaosDrift, pieceMutation, chaosMode, cursedMode, board]);

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
    bagGenRef.current.reset();
    setPiece(bagGenRef.current.next());
    setNextPiece(bagGenRef.current.next());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setRunning(false);
    setTick(0);
    setHoldBonusLeft(0);
    setBaseSpeedMs(speed);
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
    bagGenRef.current.reset();
    pendingBombsRef.current = [];
    chaosBombRef.current = null;
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
