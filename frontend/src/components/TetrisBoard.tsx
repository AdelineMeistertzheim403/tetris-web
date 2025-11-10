import React, { useEffect, useRef, useState } from "react";

const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30; // px

type Cell = 0 | 1;

export default function TetrisBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<Cell[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [piece, setPiece] = useState({ x: 3, y: 0 });

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);

    // dessiner le plateau
    ctx.strokeStyle = "#333";
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    // dessiner la pièce (simple bloc)
    ctx.fillStyle = "#00f";
    ctx.fillRect(piece.x * CELL_SIZE, piece.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }, [board, piece]);

  // Faire descendre la pièce toutes les 500 ms
  useEffect(() => {
    const interval = setInterval(() => {
      setPiece((prev) => ({ ...prev, y: prev.y + 1 }));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={COLS * CELL_SIZE}
      height={ROWS * CELL_SIZE}
      style={{ border: "2px solid black", background: "#111" }}
    />
  );
}
