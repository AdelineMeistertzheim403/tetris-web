import { useCallback, useEffect, useRef, useState } from "react";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import NextPiece from "../hud/NextPiece";
import GameLayout from "../layout/GameLayout";
import { addScore, getScoreRunToken } from "../../services/scoreService";
import { useTetrisGame } from "../../hooks/useTetrisGame";
import type { GameMode } from "../../types/GameMode";
import type { Piece } from "../../types/Piece";
import { useLineClearFx } from "../../hooks/useLineClearFx";
import { useSettings } from "../../../settings/context/SettingsContext";
import StatCard from "../../../../shared/components/ui/cards/StatCard";
import FullScreenOverlay from "../../../../shared/components/ui/overlays/FullScreenOverlay";

type TetrisBoardProps = {
  mode?: GameMode;
  scoreMode?: GameMode | null;
  bagSequence?: string[];
  fixedSequence?: string[];
  forcedSequence?: string[];
  forcedSequenceToken?: number;
  initialBoard?: number[][];
  incomingGarbage?: number;
  onConsumeLines?: (lines: number) => void;
  onLinesCleared?: (lines: number, clearedRows?: number[]) => void;
  onPieceLocked?: (payload: { board: number[][]; linesCleared: number; piece: Piece }) => void;
  onSequenceEnd?: () => void;
  onGarbageConsumed?: () => void;
  autoStart?: boolean;
  scoreMultiplier?: number;
  onBoardUpdate?: (board: number[][]) => void;
  onLocalGameOver?: (score: number, lines: number) => void;
  onGameStart?: () => void;
  hideGameOverOverlay?: boolean;
  gravityMultiplier?: number;
  extraHold?: number;
  timeFrozen?: boolean;
  onBombUsed?: () => void;
  onBombsChange?: (count: number) => void;
  onTriggerTimeFreeze?: () => void;
  timeFreezeCharges?: number;
  secondChance?: boolean;
  onConsumeSecondChance?: () => void;
  chaosMode?: boolean;
  cursedMode?: boolean;
  bombRadius?: number;
  paused?: boolean;
  onScoreChange?: (score: number) => void;
  onLevelChange?: (level: number) => void;
  onHold?: () => void;
  onHardDrop?: () => void;
  onInvalidMove?: (dir: "left" | "right" | "rotate") => void;
  contracts?: {
    noLineClears?: boolean;
  };
  onContractViolation?: (reason: string) => void;
  bombsGranted?: number;
  fastHoldReset?: boolean;
  lastStand?: boolean;
  rng?: () => number;
  hardDropHoldReset?: boolean;
  rotationDelayMs?: number;
  chaosDrift?: boolean;
  pieceMutation?: boolean;
  disableHold?: boolean;
  invertControls?: boolean;
  hidePreview?: boolean;
  fogRows?: number;
  hideStats?: boolean;
  hideSidebar?: boolean;
  layout?: "default" | "plain";
};

const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30;
const PREVIEW_SIZE = 4 * CELL_SIZE;
const EXPLOSION_FRAME_DURATION_MS = 80;
const LINE_CLEAR_SCORES = [0, 100, 400, 900, 1600];
const LINE_CLEAR_COLORS: Record<number, string> = {
  1: "#3b82f6",
  2: "#22c55e",
  3: "#ef4444",
  4: "#facc15",
};
const getLineClearScore = (linesCleared: number) => {
  if (linesCleared <= 0) return 0;
  if (linesCleared < LINE_CLEAR_SCORES.length) {
    return LINE_CLEAR_SCORES[linesCleared];
  }
  return 100 * linesCleared * linesCleared;
};
const getLineClearColor = (linesCleared: number) =>
  LINE_CLEAR_COLORS[linesCleared] ?? "#666";
const getExplosionFrameCount = (radius: number) => {
  if (radius >= 3) return 9; // 7x7
  if (radius === 2) return 7; // 5x5
  return 4; // 3x3
};

export default function TetrisBoard({
  mode = "CLASSIQUE",
  scoreMode,
  bagSequence,
  fixedSequence,
  forcedSequence,
  forcedSequenceToken,
  initialBoard,
  incomingGarbage = 0,
  onConsumeLines,
  onLinesCleared,
  onPieceLocked,
  onSequenceEnd,
  onGarbageConsumed,
  scoreMultiplier = 1,
  autoStart = true,
  onBoardUpdate,
  onLocalGameOver,
  onGameStart,
  secondChance = false,
  onConsumeSecondChance,
  hideGameOverOverlay = false,
  gravityMultiplier = 1,
  extraHold = 0,
  timeFrozen = false,
  onTriggerTimeFreeze,
  timeFreezeCharges = 0,
  chaosMode = false,
  cursedMode = false,
  bombRadius = 1,
  onBombUsed,
  onBombsChange,
  onScoreChange,
  onLevelChange,
  onHold,
  onHardDrop,
  onInvalidMove,
  contracts,
  onContractViolation,
  paused = false,
  bombsGranted = 0,
  fastHoldReset = false,
  hardDropHoldReset = false,
  lastStand = false,
  rotationDelayMs = 0,
  chaosDrift = false,
  pieceMutation = false,
  rng,
  disableHold = false,
  invertControls = false,
  hidePreview = false,
  fogRows = 0,
  hideStats = false,
  hideSidebar = false,
  layout = "default",
}: TetrisBoardProps) {
  const { settings } = useSettings();
  const effectiveScoreMode = scoreMode === undefined ? mode : scoreMode;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState<number | null>(autoStart ? 3 : null);
  const [bombFlash, setBombFlash] = useState(false);
  const explosionFramesRef = useRef<HTMLImageElement[]>([]);
  const [framesReady, setFramesReady] = useState(false);
  const [explosionFrameTick, setExplosionFrameTick] = useState(0);
  const lastRotationRef = useRef(0);
  const hasStartedRef = useRef(false);
  const scoreRunTokenRef = useRef<string | null>(null);
  const [lastClearPoints, setLastClearPoints] = useState(0);
  const [lastClearLines, setLastClearLines] = useState(0);
  const [gainFxKey, setGainFxKey] = useState(0);
  const { effects: lineClearFx, tetrisFlash, trigger: triggerLineClearFx } = useLineClearFx();

  const handleLinesCleared = useCallback(
    (linesCleared: number, clearedRows?: number[]) => {
      if (linesCleared > 0) {
        triggerLineClearFx(linesCleared, clearedRows ?? []);
        const baseScore = getLineClearScore(linesCleared);
        setLastClearLines(linesCleared);
        setLastClearPoints(Math.round(baseScore * scoreMultiplier));
        setGainFxKey((prev) => prev + 1);
      }
      onLinesCleared?.(linesCleared, clearedRows);
    },
    [onLinesCleared, scoreMultiplier, triggerLineClearFx]
  );

  const { state, actions } = useTetrisGame({
    mode,
    bagSequence,
    fixedSequence,
    forcedSequence,
    forcedSequenceToken,
    initialBoard,
    gravityMultiplier,
    extraHold,
    onConsumeLines,
    onLinesCleared: handleLinesCleared,
    onPieceLocked,
    onSequenceEnd,
    incomingGarbage,
    onGarbageConsumed,
    scoreMultiplier,
     secondChance,
     timeFrozen,
     chaosMode,
     cursedMode,
    hardDropHoldReset,
    chaosDrift,
    pieceMutation,
    pieceColors: settings.pieceColors,
    bombRadius,
    onInvalidMove,
    contracts,
    onContractViolation,
  onConsumeSecondChance,
  onBombExplode: () => {
    setBombFlash(true);
    setTimeout(() => setBombFlash(false), 120);
  },
  rng,
  onGameOver: async (score, level, lines) => {
    // En mode classique/sprint/etc., on enregistre le score (pas en roguelike).
  if (onLocalGameOver) onLocalGameOver(score, lines);

  if (
    !effectiveScoreMode ||
    effectiveScoreMode === "ROGUELIKE" ||
    effectiveScoreMode === "ROGUELIKE_VERSUS" ||
    effectiveScoreMode === "PUZZLE"
  )
    return;

  try {
    let runToken = scoreRunTokenRef.current;
    if (!runToken) {
      runToken = await getScoreRunToken(effectiveScoreMode);
      scoreRunTokenRef.current = runToken;
    }
    await addScore(score, level, lines, effectiveScoreMode, runToken);
  } catch (err) {
    console.error("Erreur enregistrement score :", err);
  }
  },
  });

  const {
    board,
    piece,
    nextPiece,
    score,
    lines,
    level,
    gameOver,
    ghostPiece,
    holdPiece,
    bombs,
    explosions,
  } = state;
  const roundedScore = Math.round(score);
  const lastClearLabel = `+${lastClearPoints}`;
  const lastClearColor = getLineClearColor(lastClearLines);
  const {
    movePiece,
    hardDrop,
    handleHold,
    triggerBomb,
    reset,
    start,
    pause,
    addBomb,
    enableFastHoldReset,
    enableLastStand,
  } = actions;
  const bombsGrantRef = useRef(0);

    useKeyboardControls((dir) => {
    const effectiveDir =
      invertControls && (dir === "left" || dir === "right")
        ? dir === "left"
          ? "right"
          : "left"
        : dir;
    if (dir === "harddrop") {
      onHardDrop?.();
      return hardDrop();
    }
    if (dir === "hold") {
      if (disableHold) return;
      onHold?.();
      return handleHold();
    }
    if (dir === "bomb") {
      if (bombs <= 0) return;
      triggerBomb();
      onBombUsed?.();
      return;
    }
    if (dir === "freeze") {
      if (countdown !== null) return;
      if (timeFreezeCharges <= 0) return;
      onTriggerTimeFreeze?.();
      return;
    }
    if (dir === "rotate") {
      const now = Date.now();
      if (rotationDelayMs > 0 && now - lastRotationRef.current < rotationDelayMs) {
        return;
      }
      lastRotationRef.current = now;
    }
    movePiece(effectiveDir as "left" | "right" | "down" | "rotate");
  });

  useEffect(() => {
    const diff = bombsGranted - bombsGrantRef.current;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        addBomb();
      }
      bombsGrantRef.current = bombsGranted;
    } else if (diff < 0) {
      bombsGrantRef.current = bombsGranted;
    }
  }, [addBomb, bombsGranted]);

  useEffect(() => {
    if (fastHoldReset) {
      enableFastHoldReset();
    }
  }, [enableFastHoldReset, fastHoldReset]);

  useEffect(() => {
    if (lastStand) {
      enableLastStand();
    }
  }, [enableLastStand, lastStand]);

  useEffect(() => {
  if (!effectiveScoreMode || effectiveScoreMode === "ROGUELIKE" || effectiveScoreMode === "PUZZLE") return;
    getScoreRunToken(effectiveScoreMode)
      .then((token) => {
        scoreRunTokenRef.current = token;
      })
      .catch((err) => console.error("Erreur récupération token score :", err));
  }, [effectiveScoreMode]);

  useEffect(() => {
    onBombsChange?.(bombs);
  }, [bombs, onBombsChange]);

useEffect(() => {
  onScoreChange?.(score);
}, [onScoreChange, score]);

useEffect(() => {
  onLevelChange?.(level);
}, [level, onLevelChange]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);
    board.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell) {
          ctx.fillStyle = "#888";
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      })
    );

    if (ghostPiece) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ghostPiece.shape.forEach((row, dy) =>
        row.forEach((val, dx) => {
          if (val) {
            ctx.fillRect(
              (ghostPiece.x + dx) * CELL_SIZE,
              (ghostPiece.y + dy) * CELL_SIZE,
              CELL_SIZE,
              CELL_SIZE
            );
          }
        })
      );
    }

    ctx.fillStyle = piece.color;
    piece.shape.forEach((row, dy) =>
      row.forEach((val, dx) => {
        if (val) {
          ctx.fillRect(
            (piece.x + dx) * CELL_SIZE,
            (piece.y + dy) * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
          );
        }
      })
    );

    ctx.strokeStyle = "#222";
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    if (onBoardUpdate) onBoardUpdate(board);

    if (fogRows > 0) {
      const fogHeight = Math.min(ROWS, fogRows) * CELL_SIZE;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, ROWS * CELL_SIZE - fogHeight, COLS * CELL_SIZE, fogHeight);
    }

    if (framesReady && explosionFramesRef.current.length) {
      explosions.forEach((exp) => {
        const frameCount = getExplosionFrameCount(exp.radius);
        const elapsed = Date.now() - exp.startedAt;
        const frameIndex = Math.min(
          frameCount - 1,
          Math.floor(elapsed / EXPLOSION_FRAME_DURATION_MS)
        );
        const img = explosionFramesRef.current[frameIndex];
        if (!img) return;

        const targetSize = (exp.radius * 2 + 1) * CELL_SIZE;
        const scale = targetSize / Math.max(img.width, img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const centerX = (exp.x + 0.5) * CELL_SIZE;
        const centerY = (exp.y + 0.5) * CELL_SIZE;
        const dx = centerX - dw / 2;
        const dy = centerY - dh / 2;

        ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
      });
    }
  }, [board, piece, ghostPiece, explosions, onBoardUpdate, framesReady, explosionFrameTick, fogRows]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown < 0) {
      setCountdown(null);
      start();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, start]);

  useEffect(() => {
    if (countdown !== null) {
      hasStartedRef.current = false;
      return;
    }
    if (paused) return;
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    onGameStart?.();
  }, [countdown, onGameStart, paused]);

  useEffect(() => {
    let cancelled = false;
    const frames: HTMLImageElement[] = [];
    const totalFrames = 9;
    let loaded = 0;

    const markLoaded = () => {
      loaded += 1;
      if (cancelled || loaded < totalFrames) return;
      explosionFramesRef.current = frames;
      setFramesReady(true);
    };

    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      img.src = `/Explosion/${i}.png`;
      img.onload = markLoaded;
      img.onerror = markLoaded;
      frames.push(img);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!explosions.length) return;
    let rafId: number;
    const step = () => {
      setExplosionFrameTick((v) => v + 1);
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [explosions.length]);

  useEffect(() => {
  if (paused) {
    pause();
  } else {
    start();
  }
}, [pause, paused, start]);

  const boardCanvas = (
    <div className="tetris-canvas-wrap">
      <canvas
        ref={canvasRef}
        width={COLS * CELL_SIZE}
        height={ROWS * CELL_SIZE}
        style={{
          border: "2px solid var(--ui-board-border, #555)",
          background: "var(--ui-board-bg, #111)",
          boxShadow: "0 0 20px rgba(0,0,0,0.8)",
        }}
      />
      {tetrisFlash && <div className="tetris-flash" />}
      {lineClearFx.flatMap((effect) =>
        effect.rows.map((row, idx) => (
          <div
            key={`${effect.id}-${row}`}
            className={`line-clear line-clear--${effect.count} ${
              effect.count === 2 && idx % 2 === 1 ? "line-clear--reverse" : ""
            }`}
            style={{ top: row * CELL_SIZE, height: CELL_SIZE }}
          />
        ))
      )}
    </div>
  );

  const sidebarContent = hideSidebar ? null : (
    <div
      style={{
        background: "var(--ui-panel-bg, #141414)",
        borderRadius: "12px",
        padding: "25px 30px",
        boxShadow: "0 0 20px rgba(0,0,0,0.6)",
        width: "220px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
        {!hideStats && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <StatCard
                label="SCORE"
                value={roundedScore}
                valueColor="#00eaff"
                accentColor="#f5f5f5"
              />
              <div className="score-gain-flash" key={gainFxKey}>
                <StatCard
                  label=""
                  value={lastClearLabel}
                  valueColor={lastClearColor}
                  accentColor="#cccccc"
                />
              </div>
            </div>
            <StatCard label="LIGNES" value={lines} valueColor="#9eff8c" accentColor="#cccccc" />
            <StatCard label="NIVEAU" value={level} valueColor="#facc15" accentColor="#cccccc" />
          </>
        )}

        {!hidePreview && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: "20px",
              width: "100%",
              marginTop: "10px",
              padding: "10px 0",
              borderTop: "1px solid var(--ui-board-border, #333)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h3
                style={{ marginBottom: "8px", fontSize: "0.9rem", color: "var(--ui-muted, #bbbbbb)" }}
              >
                HOLD
              </h3>

              <div
                style={{
                  width: PREVIEW_SIZE,
                  height: PREVIEW_SIZE,
                  border: "2px solid var(--ui-board-border, #333)",
                  background: "var(--ui-board-bg, #111)",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {holdPiece && <NextPiece piece={holdPiece} />}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <h3
                style={{ marginBottom: "8px", fontSize: "0.9rem", color: "var(--ui-muted, #bbbbbb)" }}
              >
                NEXT
              </h3>

              <div
                style={{
                  width: PREVIEW_SIZE,
                  height: PREVIEW_SIZE,
                  border: "2px solid var(--ui-board-border, #333)",
                  background: "var(--ui-board-bg, #111)",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <NextPiece piece={nextPiece} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const shouldUseGameLayout = layout === "default" && !hideSidebar;

  return (
    <div className={shouldUseGameLayout ? "relative flex items-start justify-center gap-8" : "relative"}>
      {bombFlash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255, 80, 80, 0.35)",
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
      )}

      {shouldUseGameLayout ? (
        <GameLayout canvas={boardCanvas} sidebar={sidebarContent} />
      ) : (
        boardCanvas
      )}

      {!hideGameOverOverlay && (
        <FullScreenOverlay show={gameOver && countdown === null}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "2rem",
            fontWeight: "bold",
            gap: "16px",
          }}
        >
          <p>GAME OVER</p>
          <button
            onClick={() => {
              reset();
              if (autoStart) setCountdown(3);
            }}
            style={{
              padding: "10px 20px",
              background: "#e11d48",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Rejouer
          </button>
        </div>
        </FullScreenOverlay>
      )}

      <FullScreenOverlay show={countdown !== null}>
        <div
          style={{
            color: "white",
            fontSize: countdown === 0 ? "3rem" : "8rem",
            fontWeight: "bold",
            animation: "fadeInOut 1s ease-in-out",
          }}
        >
          {countdown === 0 ? "GO!" : countdown}
        </div>
      </FullScreenOverlay>
    </div>
  );
}
