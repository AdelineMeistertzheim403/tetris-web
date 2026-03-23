import { memo } from "react";
import { PixelInvasionEntityCanvas } from "./PixelInvasionEntityCanvas";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_Y,
  renderPercent,
} from "../model";
import type { GameState, PixelInvasionStar } from "../model";

type PixelInvasionBoardProps = {
  game: GameState;
  stars: PixelInvasionStar[];
  onRestart: () => void;
};

const ScrapGrid = memo(function ScrapGrid({ scrapGrid }: { scrapGrid: GameState["scrapGrid"] }) {
  return (
    <div className="pixel-invasion-scrap-grid">
      {scrapGrid.flatMap((row, rowIndex) =>
        row.map((cell, columnIndex) =>
          cell ? (
            <span
              key={`${rowIndex}-${columnIndex}`}
              className="pixel-invasion-scrap-block"
              style={{
                left: `${columnIndex * 10}%`,
                top: `${rowIndex * 12.5}%`,
                background: cell,
              }}
            />
          ) : null
        )
      )}
    </div>
  );
});

export function PixelInvasionBoard({ game, stars, onRestart }: PixelInvasionBoardProps) {
  const highDensity =
    game.enemies.length >= 18 ||
    game.enemyBullets.length >= 28 ||
    game.playerBullets.length >= 18 ||
    game.impacts.length >= 14;
  const visibleTelegraphs = game.telegraphs.slice(-(highDensity ? 6 : 12));
  const visibleImpacts = game.impacts.slice(-(highDensity ? 8 : 18));
  const visiblePlayerBullets = game.playerBullets.slice(-(highDensity ? 16 : 28));
  const visibleEnemyBullets = game.enemyBullets.slice(-(highDensity ? 26 : 44));
  const visibleDrops = game.drops.slice(0, 1);
  const visibleStars = highDensity ? stars.slice(0, 8) : stars;
  const countdown = Math.max(1, Math.ceil(game.waveTransition - 0.02));
  const chapterLabel = getWaveChapterLabel(game.wave);
  const stageLabel = getWaveStageLabel(game.wave, game.waveTheme);
  const activeBossTheme = game.enemies.find((enemy) => enemy.kind === "APEX")?.bossTheme;
  const isBossWarning = game.waveTransition > 0 && Boolean(activeBossTheme);
  const chapterIntro = getChapterIntro(game.wave);
  const isChapterIntro = game.waveTransition > 0 && chapterIntro !== null;
  const formationPhase = getFormationVisualPhase(game);
  const shakeX = game.boardShakeTimer > 0 ? Math.sin(game.boardShakeTimer * 160) * game.boardShakeTimer * 14 : 0;
  const shakeY = game.boardShakeTimer > 0 ? Math.cos(game.boardShakeTimer * 140) * game.boardShakeTimer * 9 : 0;

  return (
    <section className="pixel-invasion-board-panel">
      <div
        className={`pixel-invasion-board ${
          game.flashTimer > 0 ? "pixel-invasion-board--flash" : ""
        } ${
          formationPhase ? `pixel-invasion-board--${formationPhase}` : ""
        }`}
        style={{
          transform: game.boardShakeTimer > 0 ? `translate(${shakeX}px, ${shakeY}px)` : undefined,
        }}
      >
        {!highDensity && <div className="pixel-invasion-scanlines" />}
        {visibleStars.map((star) => (
          <span
            key={star.id}
            className="pixel-invasion-star"
            style={{ left: star.left, top: star.top, animationDelay: star.delay }}
          />
        ))}

        {!highDensity && formationPhase === "opening" && (
          <div className="pixel-invasion-phase-fx pixel-invasion-phase-fx--opening" />
        )}
        {!highDensity && formationPhase === "compression" && (
          <div className="pixel-invasion-phase-fx pixel-invasion-phase-fx--compression" />
        )}
        {!highDensity && formationPhase === "punish" && (
          <div className="pixel-invasion-phase-fx pixel-invasion-phase-fx--punish" />
        )}
        {game.lineBurstFxTimer > 0 && (
          <div
            className="pixel-invasion-line-burst-fx"
            style={{ opacity: Math.min(highDensity ? 0.2 : 0.48, game.lineBurstFxTimer * 1.8) }}
          />
        )}

        <div className="pixel-invasion-lane pixel-invasion-lane--enemy" />
        <div className="pixel-invasion-lane pixel-invasion-lane--scrap" />
        <PixelInvasionEntityCanvas
          enemies={game.enemies}
          telegraphs={visibleTelegraphs}
          impacts={visibleImpacts}
          playerBullets={visiblePlayerBullets}
          enemyBullets={visibleEnemyBullets}
          drops={visibleDrops}
          reducedFx={highDensity}
        />

        <ScrapGrid scrapGrid={game.scrapGrid} />

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

        {!game.gameOver && !game.victory && game.waveTransition > 0 && (
          <div
            className={`pixel-invasion-wave-overlay ${
              isChapterIntro && chapterIntro
                ? `pixel-invasion-wave-overlay--chapter pixel-invasion-wave-overlay--${chapterIntro.tone}`
                : ""
            } ${
              isBossWarning && activeBossTheme
                ? `pixel-invasion-wave-overlay--boss pixel-invasion-wave-overlay--${activeBossTheme}`
                : ""
            }`}
          >
            <span className="pixel-invasion-wave-overlay-kicker">
              {isChapterIntro && chapterIntro ? chapterIntro.kicker : chapterLabel}
            </span>
            <h2>
              {isBossWarning
                ? "Boss Warning"
                : isChapterIntro && chapterIntro
                  ? chapterIntro.title
                  : `Vague ${game.wave}`}
            </h2>
            <p>
              {isBossWarning
                ? getBossWarningLabel(game.wave, activeBossTheme)
                : isChapterIntro && chapterIntro
                  ? chapterIntro.subtitle
                  : stageLabel}
            </p>
            <div className="pixel-invasion-wave-countdown">{countdown}</div>
            <span className="pixel-invasion-wave-overlay-note">
              {isBossWarning
                ? getBossWarningNote(activeBossTheme)
                : isChapterIntro && chapterIntro
                  ? chapterIntro.note
                : "Debut du combat imminent"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function getFormationVisualPhase(game: GameState) {
  if (game.waveTransition > 0) return null;

  if (game.waveTheme === "rookie") {
    return Math.cos(game.formationPulse * 1.3) > 0.93 ? "opening" : null;
  }

  if (game.waveTheme === "pulse") {
    const pulse = Math.sin(game.formationPulse * 1.9);
    if (pulse > 0.94) return "compression";
    if (pulse < -0.92) return "opening";
    return null;
  }

  const apexPhase = Math.sin(game.formationPulse * 2.7);
  if (apexPhase > 0.94) return "punish";
  if (apexPhase < -0.9) return "opening";
  return null;
}

function getWaveChapterLabel(wave: number) {
  if (wave >= 98) return "Finale";
  if (wave >= 95) return "Prelude Finale";

  const blockIndex = Math.floor((wave - 1) / 10);
  const cycle = Math.floor(blockIndex / 3) + 1;
  const act = (blockIndex % 3) + 1;
  return `Cycle ${cycle} · Acte ${act}`;
}

function getWaveStageLabel(wave: number, theme: GameState["waveTheme"]) {
  if (wave >= 98) {
    return wave === 98
      ? "Boss final Rookie"
      : wave === 99
        ? "Boss final Pulse"
        : "Boss final Apex";
  }

  if (wave >= 95) {
    return wave === 95 ? "Retour Rookie" : wave === 96 ? "Retour Pulse" : "Retour Apex";
  }

  const waveInBlock = ((wave - 1) % 10) + 1;
  if (waveInBlock === 10) {
    return theme === "rookie"
      ? "Boss Rookie"
      : theme === "pulse"
        ? "Boss Pulse"
        : "Boss Apex";
  }

  return theme === "rookie"
    ? "Niveau Rookie"
    : theme === "pulse"
      ? "Niveau Pulse"
      : "Niveau Apex";
}

function getBossWarningLabel(
  wave: number,
  bossTheme: NonNullable<GameState["enemies"][number]["bossTheme"]> | undefined
) {
  if (!bossTheme) return `Boss vague ${wave}`;

  if (wave >= 98) {
    return bossTheme === "rookie"
      ? "Boss final Rookie"
      : bossTheme === "pulse"
        ? "Boss final Pulse"
        : "Boss final Apex";
  }

  return bossTheme === "rookie"
    ? "Chassis veterant detecte"
    : bossTheme === "pulse"
      ? "Noeud tactique Pulse detecte"
      : "Protocole Apex detecte";
}

function getBossWarningNote(
  bossTheme: NonNullable<GameState["enemies"][number]["bossTheme"]> | undefined
) {
  if (!bossTheme) return "Debut du combat imminent";

  return bossTheme === "rookie"
    ? "Pattern lisible, coque epaisse"
    : bossTheme === "pulse"
      ? "Cadence precise, pression montee"
      : "Rafales denses, priorite survie";
}

function getChapterIntro(wave: number) {
  if (wave === 1) {
    return {
      kicker: "Campagne",
      title: "Acte Rookie",
      subtitle: "Les premiers Tetrobots entrent dans le secteur.",
      note: "Faible pression, bonne mise en jambes",
      tone: "rookie",
    };
  }

  if (wave === 11) {
    return {
      kicker: "Campagne",
      title: "Acte Pulse",
      subtitle: "Les formations deviennent plus nerveuses et plus precises.",
      note: "Cadence en hausse",
      tone: "pulse",
    };
  }

  if (wave === 21) {
    return {
      kicker: "Campagne",
      title: "Acte Apex",
      subtitle: "Le protocole d'assaut lourd prend le relais.",
      note: "Priorite survie",
      tone: "apex",
    };
  }

  if ([31, 61].includes(wave)) {
    return {
      kicker: "Cycle",
      title: `Cycle ${wave === 31 ? 2 : 3}`,
      subtitle: "Les vieux patterns reviennent, mais avec plus de blindage.",
      note: "Les anciens reflexes ne suffisent plus",
      tone: "rookie",
    };
  }

  if ([41, 71].includes(wave)) {
    return {
      kicker: "Cycle",
      title: `Cycle ${wave === 41 ? 2 : 3}`,
      subtitle: "Pulse reconfigure le champ de tir et resserre la pression.",
      note: "Lecture rapide exigee",
      tone: "pulse",
    };
  }

  if ([51, 81].includes(wave)) {
    return {
      kicker: "Cycle",
      title: `Cycle ${wave === 51 ? 2 : 3}`,
      subtitle: "Apex relance l'offensive avec des vagues plus denses.",
      note: "Fenetre de punition reduite",
      tone: "apex",
    };
  }

  if (wave === 91) {
    return {
      kicker: "Dernier cycle",
      title: "Cycle 4",
      subtitle: "Le secteur tient encore, mais la marge d'erreur a disparu.",
      note: "Preparation finale",
      tone: "apex",
    };
  }

  if (wave === 95) {
    return {
      kicker: "Finale",
      title: "Prelude Finale",
      subtitle: "Rookie, Pulse et Apex reviennent une derniere fois.",
      note: "Trois tests avant les boss finaux",
      tone: "pulse",
    };
  }

  if (wave === 98) {
    return {
      kicker: "Finale",
      title: "Trilogie des Boss",
      subtitle: "Les trois chefs reviennent pour verrouiller le secteur.",
      note: "Aucune erreur ne passe",
      tone: "apex",
    };
  }

  return null;
}
