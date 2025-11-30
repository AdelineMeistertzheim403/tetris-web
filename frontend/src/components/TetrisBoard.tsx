import { useEffect, useRef, useState } from "react";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import NextPiece from "./NextPiece";
import FullScreenOverlay from "./FullScreenOverlay";
import StatCard from "./StatCard";
import GameLayout from "./GameLayout";
import { addScore } from "../services/scoreService";
import { useTetrisGame } from "../hooks/useTetrisGame";

type TetrisBoardProps = {
  bagSequence?: string[];
  incomingGarbage?: number;
  onConsumeLines?: (lines: number) => void;
  onGarbageConsumed?: () => void;
  autoStart?: boolean;
  onBoardUpdate?: (board: number[][]) => void;
  onLocalGameOver?: (score: number, lines: number) => void;
  hideGameOverOverlay?: boolean;
};

const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30;
const PREVIEW_SIZE = 4 * CELL_SIZE;

export default function TetrisBoard({
  bagSequence,
  incomingGarbage = 0,
  onConsumeLines,
  onGarbageConsumed,
  autoStart = true,
  onBoardUpdate,
  onLocalGameOver,
  hideGameOverOverlay = false,
}: TetrisBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState<number | null>(autoStart ? 3 : null);
  const { state, actions } = useTetrisGame({
    mode: "CLASSIQUE",
    bagSequence,
    onConsumeLines,
    incomingGarbage,
    onGarbageConsumed,
    onGameOver: async (score, level, lines) => {
      if (onLocalGameOver) onLocalGameOver(score, lines);
      try {
        await addScore(score, level, lines, "CLASSIQUE");
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

    if (onBoardUpdate) onBoardUpdate(board);
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
    if (autoStart) setCountdown(3);
  }, [reset, autoStart]);

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
              background: "#141414",
              borderRadius: "12px",
              padding: "25px 30px",
              boxShadow: "0 0 20px rgba(0,0,0,0.6)",
              width: "220px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
              <StatCard label="SCORE" value={score} valueColor="#00eaff" accentColor="#f5f5f5" />
              <StatCard label="LIGNES" value={lines} valueColor="#9eff8c" accentColor="#cccccc" />
              <StatCard label="NIVEAU" value={level} valueColor="#facc15" accentColor="#cccccc" />

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
          </div>
        }
      />

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
