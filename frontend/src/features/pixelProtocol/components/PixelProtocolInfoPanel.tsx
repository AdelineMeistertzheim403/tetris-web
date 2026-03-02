import type { LevelDef } from "../types";

type PixelProtocolInfoPanelProps = {
  ability: {
    airDash: boolean;
    doubleJump: boolean;
    hackWave: boolean;
  };
  level: LevelDef;
  message: string;
  collected: number;
  hp: number;
};

export function PixelProtocolInfoPanel({
  ability,
  level,
  message,
  collected,
  hp,
}: PixelProtocolInfoPanelProps) {
  const parts = level.id.split("-");
  const levelNumber = parts[1] ?? level.id;

  return (
    <aside className="pp-panel">
      <header className="pp-header">
        <div>
          <h1>Pixel Protocol</h1>
          <p>
            Monde {level.world} - Niveau {levelNumber}
          </p>
          <p>
            {level.name}
          </p>
        </div>
      </header>

      <div className="pp-stats">
        <span>HP: {hp}</span>
        <span>
          Data-Orbs: {collected}/{level.requiredOrbs}
        </span>
        <span>
          Capacites: {ability.doubleJump ? "DJ" : "-"}{" "}
          {ability.airDash ? "Dash" : "-"}{" "}
          {ability.hackWave ? "Hack" : "-"}
        </span>
      </div>

      <div className="pp-infoCard">
        <p className="pp-panelTitle">Mission</p>
        <p>{message}</p>
      </div>
    </aside>
  );
}
