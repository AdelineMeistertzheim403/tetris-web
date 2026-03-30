import { formatKeyLabel, getModeKeyBindings } from "../../game/utils/controls";
import { useSettings } from "../../settings/context/SettingsContext";
import type { AbilityFlags } from "../types";

type PixelProtocolControlsPanelProps = {
  ability: Pick<
    AbilityFlags,
    | "doubleJump"
    | "airDash"
    | "hackWave"
    | "dataGrapple"
    | "phaseShift"
    | "pulseShock"
    | "overclockMode"
    | "timeBuffer"
    | "platformSpawn"
  >;
  onExit: () => void;
  onReset: () => void;
  onEditor?: () => void;
  statusMessage?: string | null;
};

export function PixelProtocolControlsPanel({
  ability,
  onExit,
  onReset,
  onEditor,
  statusMessage,
}: PixelProtocolControlsPanelProps) {
  const { settings } = useSettings();
  const keyBindings = getModeKeyBindings(settings, "PIXEL_PROTOCOL");
  const directionKeys = [
    formatKeyLabel(keyBindings.left),
    formatKeyLabel(keyBindings.right),
    formatKeyLabel(keyBindings.up),
    formatKeyLabel(keyBindings.down),
  ].join(" / ");

  return (
    <aside className="pp-panel">
      <div className="pp-infoCard">
        <p className="pp-panelTitle">Controles</p>
        <p>Deplacement: {directionKeys}</p>
        <p>Saut: {formatKeyLabel(keyBindings.jump)}</p>
        {ability.doubleJump && <p>Double saut: actif</p>}
        {ability.airDash && <p>Dash: {formatKeyLabel(keyBindings.dash)}</p>}
        {ability.hackWave && <p>Hack: {formatKeyLabel(keyBindings.hack)}</p>}
        {ability.dataGrapple && (
          <p>
            Data Grapple: {formatKeyLabel(keyBindings.grapple)} + {directionKeys}, visee libre en
            accroche
          </p>
        )}
        {ability.phaseShift && <p>Phase Shift: {formatKeyLabel(keyBindings.phaseShift)}</p>}
        {ability.pulseShock && <p>Pulse Shock: {formatKeyLabel(keyBindings.pulseShock)}</p>}
        {ability.overclockMode && <p>Overclock: {formatKeyLabel(keyBindings.overclock)}</p>}
        {ability.timeBuffer && <p>Time Buffer: {formatKeyLabel(keyBindings.timeBuffer)}</p>}
        {ability.platformSpawn && (
          <p>Platform Spawn: {formatKeyLabel(keyBindings.platformSpawn)}</p>
        )}
        <p>Respawn checkpoint: {formatKeyLabel(keyBindings.respawn)}</p>
      </div>

      <div className="pp-infoCard">
        <p className="pp-panelTitle">Systeme</p>
        <p>Recupere les Data-Orbs pour ouvrir le portail.</p>
        <p>Neutralise les Tetrobots par-dessus ou via le hack.</p>
      </div>

      <div className="pp-actions">
        <button type="button" onClick={onReset}>
          Recommencer le niveau
        </button>
        {onEditor && (
          <button type="button" onClick={onEditor}>
            Editeur de niveaux
          </button>
        )}
        <button type="button" onClick={onExit}>
          Quitter
        </button>
      </div>
      {statusMessage && (
        <div className="pp-infoCard">
          <p className="pp-panelTitle">Statut</p>
          <p>{statusMessage}</p>
        </div>
      )}
    </aside>
  );
}
