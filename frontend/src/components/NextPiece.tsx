import { useRef, useEffect } from "react";


type Props = {
  piece: {
    shape: number[][];
    color: string;
  };
};

const CELL_SIZE = 20;

export default function NextPiece({ piece }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 4 * CELL_SIZE, 4 * CELL_SIZE);
    ctx.fillStyle = piece.color;

    piece.shape.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val) {
          ctx.fillRect(
            x * CELL_SIZE,
            y * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
          );
        }
      });
    });

    ctx.strokeStyle = "#222";
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }, [piece]);

  return (
    <div style={{ textAlign: "center" }}>
      <h3>Prochaine pièce</h3>
      <canvas
        ref={canvasRef}
        width={4 * CELL_SIZE}
        height={4 * CELL_SIZE}
        style={{
          border: "2px solid #333",
          background: "#111",
          margin: "auto",
        }}
      />
    </div>
  );
}
