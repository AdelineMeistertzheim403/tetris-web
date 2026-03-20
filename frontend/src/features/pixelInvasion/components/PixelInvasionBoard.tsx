import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_Y,
  getEnemyCells,
  getEnemyGridStyle,
  renderPercent,
} from "../model";
import type { GameState, PixelInvasionStar } from "../model";

type PixelInvasionBoardProps = {
  game: GameState;
  stars: PixelInvasionStar[];
  onRestart: () => void;
};

export function PixelInvasionBoard({ game, stars, onRestart }: PixelInvasionBoardProps) {
  return (
    <section className="pixel-invasion-board-panel">
      <div
        className={`pixel-invasion-board ${
          game.flashTimer > 0 ? "pixel-invasion-board--flash" : ""
        }`}
      >
        <div className="pixel-invasion-scanlines" />
        {stars.map((star) => (
          <span
            key={star.id}
            className="pixel-invasion-star"
            style={{ left: star.left, top: star.top, animationDelay: star.delay }}
          />
        ))}

        <div className="pixel-invasion-lane pixel-invasion-lane--enemy" />
        <div className="pixel-invasion-lane pixel-invasion-lane--scrap" />

        {game.telegraphs.map((telegraph) => (
          <span
            key={telegraph.id}
            className={`pixel-invasion-telegraph pixel-invasion-telegraph--${telegraph.type}`}
            style={{
              left: renderPercent(telegraph.x, BOARD_WIDTH),
              top: renderPercent(telegraph.y, BOARD_HEIGHT),
              width: renderPercent(telegraph.width, BOARD_WIDTH),
              height: renderPercent(telegraph.height, BOARD_HEIGHT),
              transform: telegraph.angle ? `rotate(${telegraph.angle}deg)` : undefined,
            }}
          />
        ))}

        {game.impacts.map((impact) => (
          <span
            key={impact.id}
            className={`pixel-invasion-impact pixel-invasion-impact--${impact.type}`}
            style={{
              left: renderPercent(impact.x - impact.size / 2, BOARD_WIDTH),
              top: renderPercent(impact.y - impact.size / 2, BOARD_HEIGHT),
              width: renderPercent(impact.size, BOARD_WIDTH),
              height: renderPercent(impact.size, BOARD_HEIGHT),
              opacity: Math.max(0.2, impact.ttl / 0.32),
            }}
          />
        ))}

        <div className="pixel-invasion-scrap-grid">
          {game.scrapGrid.map((row, rowIndex) =>
            row.map((cell, columnIndex) => (
              <span
                key={`${rowIndex}-${columnIndex}`}
                className={`pixel-invasion-scrap-cell ${
                  cell ? "pixel-invasion-scrap-cell--filled" : ""
                }`}
                style={{ background: cell ?? undefined }}
              />
            ))
          )}
        </div>

        {game.enemies.map((enemy) => (
          <div
            key={enemy.id}
            className={`pixel-invasion-enemy pixel-invasion-enemy--${enemy.kind.toLowerCase()}`}
            style={getEnemyGridStyle(enemy)}
          >
            <div className="pixel-invasion-enemy-grid">
              {getEnemyCells(enemy.kind).flatMap((row, rowIndex) =>
                row.map((value, columnIndex) => (
                  <span
                    key={`${enemy.id}-${rowIndex}-${columnIndex}`}
                    className={`pixel-invasion-enemy-cell ${
                      value ? "pixel-invasion-enemy-cell--filled" : ""
                    }`}
                  />
                ))
              )}
            </div>
            <div className="pixel-invasion-enemy-hp">
              <span style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
            </div>
          </div>
        ))}

        {game.playerBullets.map((bullet) => (
          <span
            key={bullet.id}
            className="pixel-invasion-bullet pixel-invasion-bullet--player"
            style={{
              left: renderPercent(bullet.x, BOARD_WIDTH),
              top: renderPercent(bullet.y, BOARD_HEIGHT),
              width: renderPercent(bullet.width, BOARD_WIDTH),
              height: renderPercent(bullet.height, BOARD_HEIGHT),
            }}
          />
        ))}

        {game.enemyBullets.map((bullet) => (
          <span
            key={bullet.id}
            className="pixel-invasion-bullet pixel-invasion-bullet--enemy"
            style={{
              left: renderPercent(bullet.x, BOARD_WIDTH),
              top: renderPercent(bullet.y, BOARD_HEIGHT),
              width: renderPercent(bullet.width, BOARD_WIDTH),
              height: renderPercent(bullet.height, BOARD_HEIGHT),
            }}
          />
        ))}

        <div
          className="pixel-invasion-player"
          style={{
            left: renderPercent(game.playerX, BOARD_WIDTH),
            top: renderPercent(PLAYER_Y, BOARD_HEIGHT),
            width: renderPercent(PLAYER_WIDTH, BOARD_WIDTH),
            height: renderPercent(PLAYER_HEIGHT, BOARD_HEIGHT),
            transform: `translateX(${game.playerDriftX}px) rotate(${game.playerTilt}deg)`,
          }}
        >
          <span
            className={`pixel-invasion-player-thruster ${
              game.playerThrust > 0
                ? game.lastHorizontalDir < 0
                  ? "pixel-invasion-player-thruster--right"
                  : "pixel-invasion-player-thruster--left"
                : "pixel-invasion-player-thruster--center"
            } ${
              game.playerDashFx > 0 ? "pixel-invasion-player-thruster--dash" : ""
            }`}
            style={{
              opacity: Math.max(game.playerThrust * 0.9, game.playerDashFx * 2.6),
              transform: `scaleY(${1 + game.playerThrust * 0.45 + game.playerDashFx * 1.2})`,
            }}
          />
          {game.playerDashFx > 0 && (
            <span
              className="pixel-invasion-player-afterimage"
              style={{
                opacity: Math.min(0.7, game.playerDashFx * 3.2),
                transform: `translateX(${-game.lastHorizontalDir * 16}px) scale(${1 + game.playerDashFx * 0.8})`,
              }}
            />
          )}
          <img
            src="/Pixel_invasion/vaisseau_pixel.png"
            alt="Vaisseau de Pixel"
            className="pixel-invasion-player-sprite"
            draggable={false}
          />
        </div>

        {(game.gameOver || game.victory) && (
          <div className="pixel-invasion-overlay">
            <h2>{game.victory ? "Secteur securise" : "Secteur perdu"}</h2>
            <p>
              {game.victory
                ? "Pixel a tenu la ligne et stoppe le soulevement des Tetrobots."
                : "L'invasion a perce la ligne defensive."}
            </p>
            <div className="pixel-invasion-overlay-stats">
              <span>Score {game.score}</span>
              <span>Vague {game.wave}</span>
              <span>Lignes explosives {game.lineBursts}</span>
            </div>
            <button type="button" className="retro-btn" onClick={onRestart}>
              Rejouer
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
