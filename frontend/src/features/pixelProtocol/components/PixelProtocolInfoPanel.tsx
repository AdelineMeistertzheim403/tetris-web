import type { LevelDef, PixelSkill } from "../types";
import type { PixelProtocolChatLine } from "../dialogue";

type PixelProtocolInfoPanelProps = {
  ability: {
    airDash: boolean;
    doubleJump: boolean;
    hackWave: boolean;
    dataGrapple: boolean;
    overclockMode: boolean;
    phaseShift: boolean;
    pulseShock: boolean;
    timeBuffer: boolean;
    platformSpawn: boolean;
  };
  chatLine: PixelProtocolChatLine | null;
  level: LevelDef;
  message: string;
  collected: number;
  hp: number;
  health: number;
  maxHealth: number;
  unlockedSkills: PixelSkill[];
};

export function PixelProtocolInfoPanel({
  ability,
  chatLine,
  level,
  message,
  collected,
  hp,
  health,
  maxHealth,
  unlockedSkills,
}: PixelProtocolInfoPanelProps) {
  const parts = level.id.split("-");
  const levelNumber = parts[1] ?? level.id;
  const activeAbilities = [
    ability.doubleJump ? "DJ" : null,
    ability.airDash ? "Dash" : null,
    ability.hackWave ? "Hack" : null,
    ability.dataGrapple ? "Grapple" : null,
    ability.phaseShift ? "Phase" : null,
    ability.pulseShock ? "Shock" : null,
    ability.overclockMode ? "OC" : null,
    ability.timeBuffer ? "Rewind" : null,
    ability.platformSpawn ? "Spawn" : null,
  ].filter(Boolean);

  const healthRatio = maxHealth > 0 ? Math.max(0, Math.min(1, health / maxHealth)) : 0;
  const healthColor =
    healthRatio > 0.6
      ? "#46ff9a"
      : healthRatio > 0.3
        ? "#ffe56a"
        : "#ff7a66";

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
        <div className="pp-healthBlock">
          <span>Vies: {hp}</span>
          <div className="pp-healthBar" aria-label={`Integrite ${health}/${maxHealth}`}>
            <div
              className="pp-healthBar__fill"
              style={{
                width: `${healthRatio * 100}%`,
                background: `linear-gradient(90deg, ${healthColor} 0%, ${healthColor}dd 100%)`,
                boxShadow: `0 0 10px ${healthColor}aa`,
              }}
            />
          </div>
          <span>Integrite: {health}/{maxHealth}</span>
        </div>
        <span>
          Data-Orbs: {collected}/{level.requiredOrbs}
        </span>
        <span>Capacites: {activeAbilities.length > 0 ? activeAbilities.join(" / ") : "Aucune"}</span>
      </div>

      {unlockedSkills.length > 0 && (
        <div className="pp-infoCard">
          <p className="pp-panelTitle">Modules Pixel</p>
          <p>{unlockedSkills.join(", ").replaceAll("_", " ")}</p>
        </div>
      )}

      <div className="pp-infoCard">
        <p className="pp-panelTitle">Mission</p>
        <p>{message}</p>
      </div>

      {chatLine && (
        <div className="pp-botCard">
          <p className="pp-panelTitle">Signal Tetrobots</p>
          <p className="pp-botCard__speaker" style={{ color: chatLine.color }}>
            {chatLine.name}
          </p>
          <p className="pp-botCard__text">{chatLine.text}</p>
        </div>
      )}
    </aside>
  );
}
