import PieceBox from "./PieceBox"

// Affiche la pièce en hold et la prochaine pièce de la file.
type HoldNextProps = {
  holdPiece?: number[][]
  nextPieces?: number[][][]
}

export default function HoldNext({
  holdPiece,
  nextPieces = [],
}: HoldNextProps) {
  return (
    <div className="hold-next">
      <PieceBox title="HOLD" piece={holdPiece} />
      <PieceBox title="NEXT" piece={nextPieces[0]} />
    </div>
  )
}
