

type Props = {
  score: number;
  lines: number;
};

export default function ScoreBoard({ score, lines }: Props) {
  return (
    <div
      style={{
        background: "#222",
        color: "white",
        padding: "10px 20px",
        borderRadius: "8px",
        marginBottom: "10px",
        display: "inline-block",
      }}
    >
      <h3>Score : {score}</h3>
      <h4>Lignes : {lines}</h4>
    </div>
  );
}
