// Tableau score/lignes/niveau utilisé par les modes arcade classiques.
type Props = {
  score: number;
  lines: number;
  level: number;
};

export default function ScoreBoard({ score, lines, level }: Props) {
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
      <div style={{ textAlign: "center" }}>
  <h3 style={{ margin: "10px 0 5px" }}>Niveau</h3>
  <div
    style={{
      background: "#000",
      border: "2px solid #333",
      borderRadius: "5px",
      padding: "10px 20px",
      fontSize: "1.1rem",
      color: "#facc15",
    }}
  >
    {level}
  </div>
</div>
    </div>
  );
}
