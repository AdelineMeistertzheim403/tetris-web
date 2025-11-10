import React, { useEffect, useRef, useState, useCallback } from "react";
import { useGameLoop } from "../hooks/useGameLoop";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import { getRandomPiece, checkCollision, mergePiece, rotateMatrix, clearFullLines } from "../logic/boardUtils";
import ScoreBoard from "./ScoreBoard";
import NextPiece from "./NextPiece";

const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30;

export default function TetrisBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [piece, setPiece] = useState(getRandomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
const [nextPiece, setNextPiece] = useState(getRandomPiece());
  const tick = useGameLoop();
  const [gameOver, setGameOver] = useState(false);

  function handleRestart() {
  setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
  setPiece(getRandomPiece());
  setNextPiece(getRandomPiece());
  setScore(0);
  setLines(0);
  setGameOver(false);
}

  // 🔁 Descente automatique
  useEffect(() => {
  if (gameOver) return; // ⛔ stoppe la boucle si la partie est finie

  const newY = piece.y + 1;

  if (checkCollision(board, piece.shape, piece.x, newY)) {
    // Fusionne la pièce avec le plateau
    const merged = mergePiece(board, piece.shape, piece.x, piece.y);
    const { newBoard, linesCleared } = clearFullLines(merged);

    if (linesCleared > 0) {
      setScore((prev) => prev + linesCleared * 100);
      setLines((prev) => prev + linesCleared);
    }

    setBoard(newBoard);

    // 🧱 Vérifie si la nouvelle pièce peut apparaître
    const newPiece = nextPiece;
    if (checkCollision(newBoard, newPiece.shape, newPiece.x, newPiece.y)) {
      setGameOver(true);
      return;
    }

    setPiece(newPiece);
    setNextPiece(getRandomPiece());
  } else {
    setPiece({ ...piece, y: newY });
  }
}, [tick, gameOver]);

  // 🕹️ Mouvement clavier
  const movePiece = useCallback(
    (dir: "left" | "right" | "down" | "rotate") => {
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
    [piece, board]
  );

  useKeyboardControls(movePiece);

  // 🎨 Dessin du jeu
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);

    // plateau
    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          ctx.fillStyle = "#888";
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      });
    });

    // pièce active
    ctx.fillStyle = piece.color;
    piece.shape.forEach((row, dy) => {
      row.forEach((val, dx) => {
        if (val) {
          ctx.fillRect(
            (piece.x + dx) * CELL_SIZE,
            (piece.y + dy) * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
          );
        }
      });
    });

    // grille
    ctx.strokeStyle = "#222";
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }, [board, piece]);

  return (
    <div className="flex items-start justify-center gap-8">
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
      fontFamily: "sans-serif",
    }}
  >
    {/* 🎮 Zone de jeu (centrée) */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
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
      <div style={{ textAlign: "center" }}>
        <h2 style={{ margin: "0 0 10px" }}>Score</h2>
        <div
          style={{
            background: "#000",
            border: "2px solid #333",
            borderRadius: "5px",
            padding: "10px 20px",
            fontSize: "1.2rem",
            minWidth: "100px",
            textAlign: "center",
          }}
        >
          {score}
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "10px 0 5px" }}>Lignes</h3>
        <div
          style={{
            background: "#000",
            border: "2px solid #333",
            borderRadius: "5px",
            padding: "10px 20px",
            fontSize: "1.1rem",
          }}
        >
          {lines}
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "10px 0" }}>Prochaine pièce</h3>
        <NextPiece piece={nextPiece} />
      </div>
    </div>
  </div>
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
      onClick={() => handleRestart()}
      style={{
        marginTop: "20px",
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
)}
  </div>
);
}
