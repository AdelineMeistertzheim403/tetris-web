import { useEffect, useRef, useState } from "react";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import NextPiece from "./NextPiece";
import FullScreenOverlay from "./FullScreenOverlay";
import StatCard from "./StatCard";
import GameLayout from "./GameLayout";
import { getScoreRunToken, saveScore } from "../services/scoreService";
import { useAuth } from "../context/AuthContext";
import { useTetrisGame } from "../hooks/useTetrisGame";

const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30;
const PREVIEW_SIZE = 4 * CELL_SIZE;
const TARGET_LINES = 40;

export default function TetrisBoardSprint() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const [countdown, setCountdown] = useState<number | null>(3);

  const { state, actions } = useTetrisGame({
    mode: "SPRINT",
    targetLines: TARGET_LINES,
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
    if (dir === "harddrop") return hardDrop();
    if (dir === "hold") return handleHold();
    movePiece(dir as "left" | "right" | "down" | "rotate");
  });

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
  }, [reset]);

  // Filet de sécurité : si le compte à rebours est fini mais que la boucle n'a pas démarré, on démarre.
  useEffect(() => {
    if (countdown === null && !running && !gameOver && !completed) {
      start();
    }
  }, [countdown, running, gameOver, completed, start]);

  const timeSec = (elapsedMs / 1000).toFixed(2);

  return (
    <div className="relative flex items-start justify-center gap-8">
      <GameLayout
        canvas={
          <canvas
            ref={canvasRef}
            width={COLS * CELL_SIZE}
            height={ROWS * CELL_SIZE}
            style={{
              border: "2px solid #555",
              background: "#111",
              boxShadow: "0 0 20px rgba(0,0,0,0.8)",
            }}
          />
        }
        sidebar={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              background: "#1c1c1c",
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
                borderTop: "1px solid #333",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h3 style={{ marginBottom: "8px", fontSize: "0.9rem", color: "#bbbbbb" }}>
                  HOLD
                </h3>
                <div
                  style={{
                    width: PREVIEW_SIZE,
                    height: PREVIEW_SIZE,
                    border: "2px solid #333",
                    background: "#111",
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
                <h3 style={{ marginBottom: "8px", fontSize: "0.9rem", color: "#bbbbbb" }}>
                  NEXT
                </h3>
                <div
                  style={{
                    width: PREVIEW_SIZE,
                    height: PREVIEW_SIZE,
                    border: "2px solid #333",
                    background: "#111",
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
