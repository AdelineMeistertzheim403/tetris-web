import { useEffect, useRef, useState } from "react";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import NextPiece from "./NextPiece";
import FullScreenOverlay from "./FullScreenOverlay";
import StatCard from "./StatCard";
import GameLayout from "./GameLayout";
import { getScoreRunToken, saveScore } from "../services/scoreService";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTetrisGame } from "../hooks/useTetrisGame";
import { useAchievements } from "../hooks/useAchievements";
import { useLineClearFx } from "../hooks/useLineClearFx";

const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30;
const PREVIEW_SIZE = 4 * CELL_SIZE;
const TARGET_LINES = 40;

export default function TetrisBoardSprint() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const { settings } = useSettings();
  const { checkAchievements, updateStats } = useAchievements();
  const [countdown, setCountdown] = useState<number | null>(3);
  const visitedRef = useRef(false);
  const holdCountRef = useRef(0);
  const hardDropCountRef = useRef(0);
  const comboStreakRef = useRef(0);
  const maxComboRef = useRef(0);
  const tetrisCountRef = useRef(0);
  const finalizedRef = useRef(false);
  const { effects: lineClearFx, tetrisFlash, trigger: triggerLineClearFx } = useLineClearFx();

  const resetRunTracking = () => {
    holdCountRef.current = 0;
    hardDropCountRef.current = 0;
    comboStreakRef.current = 0;
    maxComboRef.current = 0;
    tetrisCountRef.current = 0;
    finalizedRef.current = false;
  };

  const countTrue = (values: Record<string, boolean>) =>
    Object.values(values).filter(Boolean).length;

  const { state, actions } = useTetrisGame({
    mode: "SPRINT",
    targetLines: TARGET_LINES,
    pieceColors: settings.pieceColors,
    onComplete: async (elapsedMs) => {
      if (!user) return;
      try {
        const runToken = await getScoreRunToken("SPRINT");
        await saveScore({
          userId: user.id,
          value: Math.round(elapsedMs / 1000),
          level: 1,
          lines: TARGET_LINES,
          mode: "SPRINT",
        }, runToken);
      } catch (err) {
        console.error("Erreur enregistrement score sprint :", err);
      }
    },
    onLinesCleared: (linesCleared, clearedRows) => {
      if (linesCleared > 0) {
        triggerLineClearFx(linesCleared, clearedRows ?? []);
      }
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
    },
  });

  const {
    board,
    piece,
    nextPiece,
    lines,
    gameOver,
    ghostPiece,
    holdPiece,
    elapsedMs,
    completed,
    running,
  } = state;
  const { movePiece, hardDrop, handleHold, reset, start } = actions;

  useKeyboardControls((dir) => {
    if (dir === "harddrop") {
      hardDropCountRef.current += 1;
      return hardDrop();
    }
    if (dir === "hold") {
      holdCountRef.current += 1;
      return handleHold();
    }
    movePiece(dir as "left" | "right" | "down" | "rotate");
  });

  useEffect(() => {
    if (visitedRef.current) return;
    visitedRef.current = true;
    const next = updateStats((prev) => ({
      ...prev,
      modesVisited: { ...prev.modesVisited, SPRINT: true },
    }));
    checkAchievements({
      custom: { modes_visited_all: countTrue(next.modesVisited) >= 4 },
    });
  }, [checkAchievements, updateStats]);

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
  }, [board, piece, ghostPiece]);

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
    reset();
    setCountdown(3);
    resetRunTracking();
  }, [reset]);

  // Filet de sécurité : si le compte à rebours est fini mais que la boucle n'a pas démarré, on démarre.
  useEffect(() => {
    if (countdown === null && !running && !gameOver && !completed) {
      start();
    }
  }, [countdown, running, gameOver, completed, start]);

  const finalizeRun = (completedRun: boolean, durationMs: number) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    const noHold = holdCountRef.current === 0;
    const noHardDrop = hardDropCountRef.current === 0;
    const next = updateStats((prev) => ({
      ...prev,
      scoredModes: {
        ...prev.scoredModes,
        SPRINT: completedRun ? true : prev.scoredModes.SPRINT,
      },
      playtimeMs: prev.playtimeMs + durationMs,
      noHoldRuns: prev.noHoldRuns + (completedRun && noHold ? 1 : 0),
      hardDropCount: prev.hardDropCount + hardDropCountRef.current,
    }));

    checkAchievements({
      mode: "SPRINT",
      tetrisCleared: tetrisCountRef.current > 0,
      custom: {
        sprint_finish: completedRun,
        sprint_under_5: completedRun && durationMs <= 5 * 60 * 1000,
        sprint_under_3: completedRun && durationMs <= 3 * 60 * 1000,
        sprint_under_2: completedRun && durationMs <= 2 * 60 * 1000,
        sprint_no_hold: completedRun && noHold,
        combo_5: maxComboRef.current >= 5,
        no_hold_runs_10: next.noHoldRuns >= 10,
        harddrop_50: next.hardDropCount >= 50,
        no_harddrop_10_min: durationMs >= 10 * 60 * 1000 && noHardDrop,
        playtime_60m: next.playtimeMs >= 60 * 60 * 1000,
        playtime_300m: next.playtimeMs >= 300 * 60 * 1000,
        level_10_three_modes: countTrue(next.level10Modes) >= 3,
        scored_all_modes: countTrue(next.scoredModes) >= 4,
        modes_visited_all: countTrue(next.modesVisited) >= 4,
      },
    });
  };

  useEffect(() => {
    if (!completed) return;
    finalizeRun(true, elapsedMs);
  }, [completed, elapsedMs]);

  useEffect(() => {
    if (!gameOver || completed) return;
    finalizeRun(false, elapsedMs);
  }, [gameOver, completed, elapsedMs]);

  const timeSec = (elapsedMs / 1000).toFixed(2);

  return (
    <div className="relative flex items-start justify-center gap-8">
      <GameLayout
        canvas={
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
        }
        sidebar={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              background: "var(--ui-panel-bg, #1c1c1c)",
              borderRadius: "10px",
              padding: "20px 30px",
              boxShadow: "0 0 15px rgba(0,0,0,0.6)",
              width: "240px",
            }}
          >
            <h2 style={{ color: "#facc15" }}>Mode Sprint</h2>
            <StatCard label="Temps" value={`${timeSec}s`} valueColor="#f472b6" accentColor="#cccccc" />
            <StatCard
              label="Lignes"
              value={`${lines}/${TARGET_LINES}`}
              valueColor="#93c5fd"
              accentColor="#cccccc"
            />

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: "16px",
                width: "100%",
                paddingTop: "10px",
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
          </div>
        }
      />

      <FullScreenOverlay show={gameOver}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "2rem",
            fontWeight: "bold",
            gap: "12px",
          }}
        >
          <p>GAME OVER</p>
          <button
            onClick={() => {
              reset();
              setCountdown(3);
              resetRunTracking();
            }}
            style={{
              padding: "10px 20px",
              background: "#e11d48",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
            }}
          >
            Rejouer
          </button>
        </div>
      </FullScreenOverlay>

      <FullScreenOverlay show={completed}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#4ade80",
            fontSize: "2rem",
            fontWeight: "bold",
            gap: "12px",
          }}
        >
          <p>Sprint terminé</p>
          <p>Temps final : {timeSec}s</p>
          <button
            onClick={() => {
              reset();
              setCountdown(3);
              resetRunTracking();
            }}
            style={{
              padding: "10px 20px",
              background: "#22c55e",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
            }}
          >
            Rejouer
          </button>
        </div>
      </FullScreenOverlay>

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
