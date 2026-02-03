import { useSettings } from "../../../settings/context/SettingsContext";
import { formatKeyLabel } from "../../utils/controls";

type Props = {
  bombs: number;
  timeFreezeCharges: number;
  chaosMode: boolean;
  paused: boolean;
  onTogglePause: () => void;
};

export default function ControlsPanel({
  bombs,
  timeFreezeCharges,
  chaosMode,
  paused,
  onTogglePause,
}: Props) {
  const { settings } = useSettings();
  const { keyBindings } = settings;

  return (
    <div className="controls-panel">
      <h3 className="controls-title">CONTRÔLES</h3>

      <div className="control-row control-row--full">
        <button className="control-pause-btn" onClick={onTogglePause} aria-pressed={paused}>
          {paused ? "Reprendre" : "Pause"}
        </button>
      </div>

      <Control
        label={`${formatKeyLabel(keyBindings.left)} ${formatKeyLabel(keyBindings.right)}`}
        action="Déplacer"
      />
      <Control label={formatKeyLabel(keyBindings.down)} action="Accélérer" />
      <Control label={formatKeyLabel(keyBindings.rotate)} action="Rotation" />
      <Control label={formatKeyLabel(keyBindings.harddrop)} action="Hard Drop" />
      <Control label={formatKeyLabel(keyBindings.hold)} action="Hold" />

      {bombs > 0 && (
        <Control label={formatKeyLabel(keyBindings.bomb)} action="Bombe" count={bombs} />
      )}

      {timeFreezeCharges > 0 && (
        <Control
          label={formatKeyLabel(keyBindings.freeze)}
          action="Time Freeze"
          count={timeFreezeCharges}
        />
      )}

      {chaosMode && <Control label="!" action="Mode Chaos actif" />}
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
      {count !== undefined && <span className="control-count">x{count}</span>}
    </div>
  );
}
