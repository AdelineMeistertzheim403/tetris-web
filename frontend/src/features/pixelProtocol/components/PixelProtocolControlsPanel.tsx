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
  return (
    <aside className="pp-panel">
      <div className="pp-infoCard">
        <p className="pp-panelTitle">Controles</p>
        <p>Deplacement: Fleches ou WASD</p>
        <p>Saut: Espace, Fleche haut ou W</p>
        {ability.doubleJump && <p>Double saut: actif</p>}
        {ability.airDash && <p>Dash: Shift</p>}
        {ability.hackWave && <p>Hack: E</p>}
        {ability.dataGrapple && <p>Data Grapple: fleches/WASD + G, visee libre en accroche</p>}
        {ability.phaseShift && <p>Phase Shift: F</p>}
        {ability.pulseShock && <p>Pulse Shock: Q</p>}
        {ability.overclockMode && <p>Overclock: C</p>}
        {ability.timeBuffer && <p>Time Buffer: X</p>}
        {ability.platformSpawn && <p>Platform Spawn: V</p>}
        <p>Respawn checkpoint: R</p>
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
