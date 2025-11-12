import { useEffect, useRef, useState, useCallback } from "react";
import { useGameLoop } from "../hooks/useGameLoop";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import {
  getRandomPiece,
  checkCollision,
  mergePiece,
  rotateMatrix,
  clearFullLines,
} from "../logic/boardUtils";
import NextPiece from "./NextPiece";
import { saveScore } from "../services/scoreService";
import { useAuth } from "../context/AuthContext";

const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30;

export default function TetrisBoardSprint() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();

  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [piece, setPiece] = useState(getRandomPiece());
  const [nextPiece, setNextPiece] = useState(getRandomPiece());
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);

  const tick = useGameLoop(running, 500);

  // 🕹️ Mouvement clavier
  const movePiece = useCallback(
    (dir: "left" | "right" | "down" | "rotate") => {
      if (!running || gameOver || completed) return;
      let newX = piece.x;
      let newY = piece.y;
      let newShape = piece.shape;

      if (dir === "left") newX--;
      if (dir === "right") newX++;
      if (dir === "down") newY++;
      if (dir === "rotate") newShape = rotateMatrix(piece.shape);

      if (!checkCollision(board, newShape, newX, newY)) {
        setPiece({ ...piece, x: newX, y: newY, shape: newShape });
      }
    },
    [piece, board, running, gameOver, completed]
  );

  useKeyboardControls(movePiece);

  // 🎯 Descente automatique
  useEffect(() => {
    if (!running || gameOver || completed) return;

    const newY = piece.y + 1;

    if (checkCollision(board, piece.shape, piece.x, newY)) {
      const merged = mergePiece(board, piece.shape, piece.x, piece.y);
      const { newBoard, linesCleared } = clearFullLines(merged);

      if (piece.y <= 0) {
        setGameOver(true);
        setRunning(false);
        return;
      }

      if (linesCleared > 0) {
        const totalLines = lines + linesCleared;
        setLines(totalLines);

        if (totalLines >= 40) {
          setCompleted(true);
          setRunning(false);
          setElapsed(Date.now() - (startTime ?? Date.now()));

          if (user) {
            saveScore({
              userId: user.id,
              value: Math.round((Date.now() - (startTime ?? 0)) / 1000),
              level: 1,
              lines: 40,
              mode: "SPRINT",
            });
          }
          return;
        }
      }

      setBoard(newBoard);
      const newPiece = nextPiece;
      if (checkCollision(newBoard, newPiece.shape, newPiece.x, newPiece.y)) {
        setGameOver(true);
        setRunning(false);
        return;
      }

      setPiece(newPiece);
      setNextPiece(getRandomPiece());
    } else {
      setPiece({ ...piece, y: newY });
    }
  }, [tick]);

  // 🎨 Dessin du plateau
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
  }, [board, piece]);

  // 🧮 Compte à rebours (comme dans le mode classique)
  useEffect(() => {
    if (countdown === null) return;
    if (countdown < 0) {
      setCountdown(null);
      setRunning(true);
      setStartTime(Date.now());
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // ⏱️ Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (running && startTime) {
      timer = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
    }
    return () => clearInterval(timer);
  }, [running, startTime]);

  // 🔁 Redémarrage
  function handleRestart() {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setPiece(getRandomPiece());
    setNextPiece(getRandomPiece());
    setLines(0);
    setGameOver(false);
    setCompleted(false);
    setRunning(false);
    setCountdown(3);
    setElapsed(0);
  }

  // Démarrage initial
  useEffect(() => {
    handleRestart();
  }, []);

  return (
    <div className="relative flex items-start justify-center gap-8">
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "60px",
          minHeight: "70vh",
          background: "linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%)",
          color: "white",
          paddingTop: "40px",
        }}
      >
        {/* 🎮 Grille */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
        </div>

        {/* 📊 Panneau latéral */}
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
          }}
        >
          <h2 style={{ color: "#facc15" }}>🏁 Mode Sprint</h2>
          <div style={{ textAlign: "center" }}>
            <h3>Temps</h3>
            <div
              style={{
                background: "#000",
                border: "2px solid #333",
                borderRadius: "5px",
                padding: "10px 20px",
                fontSize: "1.2rem",
                color: "#f472b6",
              }}
            >
              {(elapsed / 1000).toFixed(1)}s
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <h3>Lignes</h3>
            <div
              style={{
                background: "#000",
                border: "2px solid #333",
                borderRadius: "5px",
                padding: "10px 20px",
                fontSize: "1.1rem",
                color: "#93c5fd",
              }}
            >
              {lines}/40
            </div>
          </div>

          <NextPiece piece={nextPiece} />
        </div>
      </div>

      {/* 💀 Game Over */}
      {gameOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "2rem",
            fontWeight: "bold",
          }}
        >
          <p>GAME OVER</p>
          <button
            onClick={handleRestart}
            style={{
              marginTop: "20px",
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
      )}

      {/* 🏆 Fin du sprint */}
      {completed && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#4ade80",
            fontSize: "2rem",
            fontWeight: "bold",
          }}
        >
          <p>🎉 Sprint terminé 🎉</p>
          <p>Temps final : {(elapsed / 1000).toFixed(2)}s</p>
          <button
            onClick={handleRestart}
            style={{
              marginTop: "20px",
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
      )}

      {/* ⏳ Compte à rebours (identique au mode classique) */}
      {countdown !== null && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "white",
            fontSize: countdown === 0 ? "3rem" : "8rem",
            fontWeight: "bold",
            animation: "fadeInOut 1s ease-in-out",
          }}
        >
          {countdown === 0 ? "GO!" : countdown}
        </div>
      )}
    </div>
  );
}
