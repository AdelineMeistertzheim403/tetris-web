type OpponentBoardProps = {
  board: number[][] | null;
};

// Rendu simplifié du board adverse en Versus (read-only).
const CELL_SIZE = 12;

export default function OpponentBoard({ board }: OpponentBoardProps) {
  if (!board) {
    return <p className="text-xs text-gray-400">En attente de l'adversaire...</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${board[0]?.length || 10}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${board.length || 20}, ${CELL_SIZE}px)`,
        gap: "1px",
        background: "#111",
        padding: "4px",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      {board.flat().map((cell, idx) => (
        <div
          key={idx}
          style={{
            width: `${CELL_SIZE}px`,
            height: `${CELL_SIZE}px`,
            background: cell ? "#f472b6" : "#1f2937",
          }}
        />
      ))}
    </div>
  );
}
