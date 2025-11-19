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
import { addScore } from "../services/scoreService";
import type { Piece } from "../types/Piece";


const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30;
const PREVIEW_SIZE = 4 * CELL_SIZE;

export default function TetrisBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [piece, setPiece] = useState<Piece>(getRandomPiece());
  const [nextPiece, setNextPiece] = useState<Piece>(getRandomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [running, setRunning] = useState(false); // contrôle la boucle
  const [level, setLevel] = useState(1);
  const [speed, setSpeed] = useState(1000);
  const [ghostPiece, setGhostPiece] = useState<Piece | null>(null);
  const [holdPiece, setHoldPiece] = useState<Piece | null>(null);
  const [canHold, setCanHold] = useState(true);

  const tick = useGameLoop(running, speed);

  const computeGhostPiece = useCallback(() => {
    if (!piece) return;

    let ghostY = piece.y;

    while (!checkCollision(board, piece.shape, piece.x, ghostY + 1)) {
      ghostY++;
    }

    setGhostPiece({
      ...piece,
      y: ghostY,
      ghost: true,
    });
  }, [piece, board]);

  const handleHold = useCallback(() => {
    if (!canHold || !piece) return;

    if (!holdPiece) {
      // Pas de pièce dans le hold → on stocke et on prend la next
      setHoldPiece(piece);
      setPiece(nextPiece);
      setNextPiece(getRandomPiece());
    } else {
      // Switch : échange piece <-> hold
      const swapped = holdPiece;
      setHoldPiece(piece);
      setPiece({
        ...swapped,
        x: COLS / 2 - Math.floor(swapped.shape[0].length / 2),
        y: 0,
      });
    }

    setCanHold(false); // On bloque jusqu'à la prochaine pièce
  }, [piece, holdPiece, nextPiece, canHold]);
  // 🕹️ Mouvement clavier
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

  async function handleGameOver() {
    setRunning(false);
    setGameOver(true);

    // Déterminer le niveau (exemple simple)
    const level = Math.floor(lines / 10) + 1;

    try {
      await addScore(score, level, lines, "CLASSIQUE");
      console.log("✅ Score sauvegardé :", { score, level, lines });
    } catch (err) {
      console.error("❌ Erreur enregistrement score :", err);
    }
  }

  useKeyboardControls(movePiece);

  // 🎮 Descente automatique
  useEffect(() => {
    if (!running || gameOver) return;

    const newY = piece.y + 1;

    if (checkCollision(board, piece.shape, piece.x, newY)) {
      const merged = mergePiece(board, piece.shape, piece.x, piece.y);
      setCanHold(true);
      const { newBoard, linesCleared } = clearFullLines(merged);

      if (linesCleared > 0) {
        setScore((prev) => prev + linesCleared * 100);
        setLines((prev) => {
          const total = prev + linesCleared;
          // 🔹 Passage de niveau tous les 10 lignes
          const newLevel = Math.floor(total / 10) + 1;
          setLevel(newLevel);
          // 🔹 Ajuster la vitesse (plus le niveau est haut, plus c’est rapide)
          setSpeed(Math.max(200, 1000 - (newLevel - 1) * 100)); // limite min 200ms
          return total;
        });
      }

      setBoard(newBoard);

      const newPiece = nextPiece;
      if (checkCollision(newBoard, newPiece.shape, newPiece.x, newPiece.y)) {
        handleGameOver();
        return;
      }

      setPiece(newPiece);
      setNextPiece(getRandomPiece());
    } else {
      setPiece({ ...piece, y: newY });
    }
  }, [tick]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key.toLowerCase() === "c") {
        handleHold();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleHold]);

  // 🎨 Dessin du plateau
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);
    computeGhostPiece();
    // plateau
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

    // pièce active
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

    // grille
    ctx.strokeStyle = "#222";
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }, [board, piece]);

  // 🧠 Compte à rebours (au démarrage et redémarrage)
  useEffect(() => {
    if (countdown === null) return;
    if (countdown < 0) {
      setCountdown(null);
      setRunning(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // 🔁 Redémarrage complet
  function handleRestart() {
    setGameOver(false);
    setCountdown(3);
    setRunning(false);
    setScore(0);
    setLines(0);
    setLevel(1);
    setSpeed(1000);
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setPiece(getRandomPiece());
    setNextPiece(getRandomPiece());
  }

  // 📜 Premier lancement du jeu
  useEffect(() => {
    handleRestart(); // déclenche le compte à rebours dès le premier rendu
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
          fontFamily: "sans-serif",
        }}
      >
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

       {/* Panneau latéral modernisé façon Tetris 99 */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "25px",
    background: "#141414",
    borderRadius: "12px",
    padding: "25px 30px",
    boxShadow: "0 0 20px rgba(0,0,0,0.6)",
    width: "220px",
  }}
>
  {/* SCORE */}
  <div style={{ width: "100%", textAlign: "center" }}>
    <h2
      style={{
        marginBottom: "8px",
        fontSize: "1.1rem",
        letterSpacing: "1px",
        color: "#f5f5f5",
      }}
    >
      SCORE
    </h2>
    <div
      style={{
        background: "#000",
        border: "2px solid #444",
        borderRadius: "6px",
        padding: "12px",
        fontSize: "1.4rem",
        fontWeight: "bold",
        color: "#00eaff",
        textShadow: "0 0 6px rgba(0,234,255,0.7)",
      }}
    >
      {score}
    </div>
  </div>

  {/* LIGNES */}
  <div style={{ width: "100%", textAlign: "center" }}>
    <h3
      style={{
        marginBottom: "8px",
        fontSize: "1rem",
        letterSpacing: "1px",
        color: "#cccccc",
      }}
    >
      LIGNES
    </h3>
    <div
      style={{
        background: "#000",
        border: "2px solid #444",
        borderRadius: "6px",
        padding: "10px",
        fontSize: "1.2rem",
        color: "#9eff8c",
        fontWeight: "bold",
      }}
    >
      {lines}
    </div>
  </div>

  {/* NIVEAU */}
  <div style={{ width: "100%", textAlign: "center" }}>
    <h3
      style={{
        marginBottom: "8px",
        fontSize: "1rem",
        letterSpacing: "1px",
        color: "#cccccc",
      }}
    >
      NIVEAU
    </h3>
    <div
      style={{
        background: "#000",
        border: "2px solid #444",
        borderRadius: "6px",
        padding: "10px",
        fontSize: "1.2rem",
        color: "#facc15",
        fontWeight: "bold",
      }}
    >
      {level}
    </div>
  </div>

  {/* HOLD + NEXT alignés */}
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
  {/* HOLD */}
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

  {/* NEXT */}
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

      {/* 🩸 Écran de Game Over */}
      {gameOver && countdown === null && (
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
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Rejouer
          </button>
        </div>
      )}

      {/* ⏳ Compte à rebours */}
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
