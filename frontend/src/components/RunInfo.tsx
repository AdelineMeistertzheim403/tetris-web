type Props = {
  linesUntilNextPerk: number;
  perkProgress: number;
  mode?: "perk" | "mutation";
};

export default function RunInfo({
  linesUntilNextPerk,
  perkProgress,
  mode = "perk",
}: Props) {
  const isMutation = mode === "mutation";
  return (
    <div className="run-info">
      <div className="run-title">RUN</div>

      <div className="next-perk">
        <span className="label">
          {isMutation ? "PROCHAINE MUTATION" : "PROCHAIN PERK"}
        </span>
        <span className="value">
          {linesUntilNextPerk === 0
            ? isMutation ? "CHOIX DE MUTATION !" : "CHOIX DE PERK !"
            : `${linesUntilNextPerk} lignes`}
        </span>
      </div>

      <div className="perk-progress">
        <div
          className="perk-progress-fill"
          style={{
            width: `${Math.min(1, perkProgress) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
