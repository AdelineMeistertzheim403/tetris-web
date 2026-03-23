import {
  DASH_COOLDOWN,
  MAX_LIVES,
  TOTAL_WAVES,
  getPowerupLabel,
  getWaveThemeLabel,
} from "../model";
import type { GameState } from "../model";

type PixelInvasionSidebarProps = {
  game: GameState;
  shieldRatio: number;
  bestScore: number;
  bestWave: number;
  side: "left" | "right";
};

export function PixelInvasionSidebar({
  game,
  shieldRatio,
  bestScore,
  bestWave,
  side,
}: PixelInvasionSidebarProps) {
  const activeBotLabel = game.message.bot.toUpperCase();

  if (side === "left") {
    return (
      <aside className="pixel-invasion-sidebar pixel-invasion-sidebar--left">
        <section
          className={`pixel-invasion-card pixel-invasion-card--message pixel-invasion-card--${game.message.tone}`}
        >
          <div className="pixel-invasion-card-title">Canal Tetrobots</div>
          <div className="pixel-invasion-message-bot">{activeBotLabel}</div>
          <p>{game.message.text}</p>
        </section>

        <section className="pixel-invasion-card">
          <div className="pixel-invasion-card-title">Controles</div>
          <ul className="pixel-invasion-list">
            <li>`A` / `D` ou fleches : deplacement</li>
            <li>`Space` : tir</li>
            <li>`Shift` : dash</li>
            <li>`B` : bombe de nettoyage</li>
          </ul>
        </section>
      </aside>
    );
  }

  return (
    <aside className="pixel-invasion-sidebar pixel-invasion-sidebar--right">
      <section className="pixel-invasion-card pixel-invasion-card--stats">
        <div className="pixel-invasion-card-title">Flux combat</div>
        <div className="pixel-invasion-stat-grid">
          <div>
            <span>Score</span>
            <strong>{game.score}</strong>
          </div>
          <div>
            <span>Meilleur</span>
            <strong>{bestScore}</strong>
          </div>
          <div>
            <span>Vague max</span>
            <strong>{bestWave}</strong>
          </div>
          <div>
            <span>Vague</span>
            <strong>
              {game.wave}/{TOTAL_WAVES}
            </strong>
          </div>
          <div>
            <span>Tir</span>
            <strong>Niv. {game.weaponLevel}</strong>
          </div>
          <div>
            <span>Power-up</span>
            <strong>{getPowerupLabel(game.weaponPowerup)}</strong>
          </div>
          <div>
            <span>Modules au sol</span>
            <strong>{game.drops.length}/1</strong>
          </div>
          <div>
            <span>En attente</span>
            <strong>{game.queuedDrops.length}</strong>
          </div>
          <div>
            <span>Eliminations</span>
            <strong>{game.kills}</strong>
          </div>
          <div>
            <span>Lignes explosives</span>
            <strong>{game.lineBursts}</strong>
          </div>
          <div>
            <span>Combo max</span>
            <strong>x{game.maxCombo}</strong>
          </div>
          <div>
            <span>Bombes</span>
            <strong>{game.bombs}</strong>
          </div>
          <div>
            <span>Secteur</span>
            <strong>{getWaveThemeLabel(game.waveTheme)}</strong>
          </div>
        </div>

        <div className="pixel-invasion-bars">
          <div>
            <span>Bouclier</span>
            <div className="pixel-invasion-bar">
              <i style={{ width: `${shieldRatio * 100}%` }} />
            </div>
          </div>
          <div>
            <span>Vies</span>
            <div className="pixel-invasion-life-row">
              {Array.from({ length: MAX_LIVES }, (_, index) => (
                <span
                  key={index}
                  className={
                    index < game.lives
                      ? "pixel-invasion-life pixel-invasion-life--active"
                      : "pixel-invasion-life"
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <span>Dash</span>
            <div className="pixel-invasion-bar pixel-invasion-bar--secondary">
              <i style={{ width: `${(1 - game.dashCooldown / DASH_COOLDOWN) * 100}%` }} />
            </div>
          </div>
          <div>
            <span>Slow field</span>
            <div className="pixel-invasion-bar">
              <i style={{ width: `${Math.min(100, (game.slowFieldTimer / 6) * 100)}%` }} />
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
