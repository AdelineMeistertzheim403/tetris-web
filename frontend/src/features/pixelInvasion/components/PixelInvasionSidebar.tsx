import { memo } from "react";
import type { PixelRuntimeEvent } from "../../pixelMode/context/pixelModeContext";
import {
  DASH_COOLDOWN,
  MAX_LIVES,
  TOTAL_WAVES,
  getPowerupLabel,
  getWaveThemeLabel,
} from "../model";

type PixelInvasionLeftSidebarProps = {
  bot: string;
  tone: "info" | "warning" | "boss" | "success";
  text: string;
};

type PixelInvasionRightSidebarProps = {
  score: number;
  shieldRatio: number;
  bestScore: number;
  bestWave: number;
  wave: number;
  weaponLevel: number;
  weaponPowerup: "multi_shot" | "laser" | "piercing" | "charge";
  dropsCount: number;
  queuedDropsCount: number;
  kills: number;
  lineBursts: number;
  maxCombo: number;
  bombs: number;
  waveTheme: "standard" | "rookie" | "pulse" | "apex";
  lives: number;
  dashCooldown: number;
  slowFieldTimer: number;
  pixelAnomaly?: PixelRuntimeEvent | null;
};

export const PixelInvasionLeftSidebar = memo(function PixelInvasionLeftSidebar({
  bot,
  tone,
  text,
}: PixelInvasionLeftSidebarProps) {
  return (
    <aside className="pixel-invasion-sidebar pixel-invasion-sidebar--left">
      <section className={`pixel-invasion-card pixel-invasion-card--message pixel-invasion-card--${tone}`}>
        <div className="pixel-invasion-card-title">Canal Tetrobots</div>
        <div className="pixel-invasion-message-bot">{bot.toUpperCase()}</div>
        <p>{text}</p>
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
});

export const PixelInvasionRightSidebar = memo(function PixelInvasionRightSidebar({
  score,
  shieldRatio,
  bestScore,
  bestWave,
  wave,
  weaponLevel,
  weaponPowerup,
  dropsCount,
  queuedDropsCount,
  kills,
  lineBursts,
  maxCombo,
  bombs,
  waveTheme,
  lives,
  dashCooldown,
  slowFieldTimer,
  pixelAnomaly = null,
}: PixelInvasionRightSidebarProps) {
  return (
    <aside className="pixel-invasion-sidebar pixel-invasion-sidebar--right">
      <section className="pixel-invasion-card pixel-invasion-card--stats">
        <div className="pixel-invasion-card-title">Flux combat</div>
        <div className="pixel-invasion-stat-grid">
          <div>
            <span>Score</span>
            <strong>{score}</strong>
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
              {wave}/{TOTAL_WAVES}
            </strong>
          </div>
          <div>
            <span>Tir</span>
            <strong>Niv. {weaponLevel}</strong>
          </div>
          <div>
            <span>Power-up</span>
            <strong>{getPowerupLabel(weaponPowerup)}</strong>
          </div>
          <div>
            <span>Modules au sol</span>
            <strong>{dropsCount}/1</strong>
          </div>
          <div>
            <span>En attente</span>
            <strong>{queuedDropsCount}</strong>
          </div>
          <div>
            <span>Eliminations</span>
            <strong>{kills}</strong>
          </div>
          <div>
            <span>Lignes explosives</span>
            <strong>{lineBursts}</strong>
          </div>
          <div>
            <span>Combo max</span>
            <strong>x{maxCombo}</strong>
          </div>
          <div>
            <span>Bombes</span>
            <strong>{bombs}</strong>
          </div>
          <div>
            <span>Secteur</span>
            <strong>{getWaveThemeLabel(waveTheme)}</strong>
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
                    index < lives
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
              <i style={{ width: `${(1 - dashCooldown / DASH_COOLDOWN) * 100}%` }} />
            </div>
          </div>
          <div>
            <span>Slow field</span>
            <div className="pixel-invasion-bar">
              <i style={{ width: `${Math.min(100, (slowFieldTimer / 6) * 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      {pixelAnomaly ? (
        <section
          className={`pixel-invasion-card ${
            pixelAnomaly.severity === "high"
              ? "pixel-invasion-card--boss"
              : pixelAnomaly.severity === "medium"
                ? "pixel-invasion-card--warning"
                : ""
          }`}
        >
          <div className="pixel-invasion-card-title">Anomalie Pixel</div>
          <div className="pixel-invasion-anomaly-title">{pixelAnomaly.title}</div>
          <p className="pixel-invasion-anomaly-text">{pixelAnomaly.description}</p>
        </section>
      ) : null}
    </aside>
  );
});
