type Props = {
  bombs: number;
  timeFreezeCharges: number;
  chaosMode: boolean;
};

export default function ControlsPanel({
  bombs,
  timeFreezeCharges,
  chaosMode,
}: Props) {
  return (
    <div className="controls-panel">
      <h3 className="controls-title">CONTRÔLES</h3>

      <Control label="← →" action="Déplacer" />
      <Control label="↓" action="Accélérer" />
      <Control label="↑" action="Rotation" />
      <Control label="ESPACE" action="Hard Drop" />
      <Control label="C" action="Hold" />

      {bombs > 0 && (
        <Control label="B" action="Bombe" count={bombs} />
      )}

      {timeFreezeCharges > 0 && (
        <Control label="F" action="Time Freeze" count={timeFreezeCharges} />
      )}

      {chaosMode && (
        <Control label="⚠️" action="Mode Chaos actif" />
      )}
    </div>
  );
}

function Control({
  label,
  action,
  count,
}: {
  label: string;
  action: string;
  count?: number;
}) {
  return (
    <div className="control-row">
      <span className="control-key">{label}</span>
      <span className="control-action">{action}</span>
      {count !== undefined && (
        <span className="control-count">x{count}</span>
      )}
    </div>
  );
}
