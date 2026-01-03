type Props = {
  linesUntilNextPerk: number;
  perkProgress: number;
};

export default function RunInfo({
  linesUntilNextPerk,
  perkProgress,
}: Props) {
  return (
    <div className="run-info">
      <div className="run-title">RUN</div>

      <div className="next-perk">
        <span className="label">PROCHAIN PERK</span>
        <span className="value">
          {linesUntilNextPerk === 0
            ? "CHOIX DE PERK !"
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
