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
import { saveScore } from "../services/scoreService"; // ✅ on l’ajoutera après
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
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false); // ✅ pour la fin du sprint

  const tick = useGameLoop(running, 500);

  const movePiece = useCallback(
    (dir: "left" | "right" | "down" | "rotate") => {
      if (!running) return;
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
    [piece, board, running]
  );

  useKeyboardControls(movePiece);

  // 🎮 Descente automatique
  useEffect(() => {
    if (!running || gameOver || completed) return;

    const newY = piece.y + 1;

    if (checkCollision(board, piece.shape, piece.x, newY)) {
      const merged = mergePiece(board, piece.shape, piece.x, piece.y);
      const { newBoard, linesCleared } = clearFullLines(merged);

      if (linesCleared > 0) {
        const newLineCount = lines + linesCleared;
        setLines(newLineCount);

        // ✅ Fin du sprint
        if (newLineCount >= 40) {
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

  // 🎨 Dessin du plateau (identique)
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
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }, [board, piece]);

  // 🧠 Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (running && startTime) {
      timer = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
    }
    return () => clearInterval(timer);
  }, [running, startTime]);

  // 🔁 Démarrage
  useEffect(() => {
    setStartTime(Date.now());
    setRunning(true);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 text-white">
      <h2 className="text-2xl text-yellow-400">🏁 Mode Sprint — 40 Lignes</h2>

      <p className="text-lg">
        Temps : <span className="text-pink-400">{(elapsed / 1000).toFixed(1)}s</span>
      </p>
      <p className="text-lg">
        Lignes : <span className="text-pink-400">{lines}/40</span>
      </p>

      <canvas
        ref={canvasRef}
        width={COLS * CELL_SIZE}
        height={ROWS * CELL_SIZE}
        style={{
          border: "2px solid #ff33cc",
          background: "#111",
          boxShadow: "0 0 20px rgba(255,0,255,0.4)",
        }}
      />

      {completed && (
        <div className="mt-6 text-center">
          <h3 className="text-2xl text-green-400">🎉 Sprint terminé !</h3>
          <p className="text-lg">
            Temps final : <span className="text-yellow-400">{(elapsed / 1000).toFixed(2)}s</span>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="retro-btn mt-4"
          >
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
}
