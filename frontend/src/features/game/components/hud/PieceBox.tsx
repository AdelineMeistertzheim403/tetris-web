// Grille miniature générique pour HOLD/NEXT.
export default function PieceBox({
  title,
  piece,
}: {
  title: string
  piece?: number[][]
}) {
  return (
    <div className="piece-box">
      <span className="piece-title">{title}</span>

      <div className="piece-preview">
        {piece
          ? piece.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`mini-cell ${cell ? 'filled' : ''}`}
                />
              ))
            )
          : null}
      </div>
    </div>
  )
}
