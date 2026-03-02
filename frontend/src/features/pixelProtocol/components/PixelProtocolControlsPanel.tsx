type PixelProtocolControlsPanelProps = {
  onExit: () => void;
  onReset: () => void;
};

export function PixelProtocolControlsPanel({
  onExit,
  onReset,
}: PixelProtocolControlsPanelProps) {
  return (
    <aside className="pp-panel">
      <div className="pp-infoCard">
        <p className="pp-panelTitle">Controles</p>
        <p>Deplacement: Fleches ou WASD</p>
        <p>Saut: Espace, Haut ou W</p>
        <p>Double saut: Monde 2+</p>
        <p>Dash: Shift, Monde 3+</p>
        <p>Hack: E, Monde 3+</p>
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
        <button type="button" onClick={onExit}>
          Quitter
        </button>
      </div>
    </aside>
  );
}
