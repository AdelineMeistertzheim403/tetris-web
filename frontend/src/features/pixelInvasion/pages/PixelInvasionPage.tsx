import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/pixel-invasion.css";
import { PixelInvasionBoard } from "../components/PixelInvasionBoard";
import { PixelInvasionSidebar } from "../components/PixelInvasionSidebar";
import { usePixelInvasionGame } from "../hooks/usePixelInvasionGame";
import { createStars } from "../model";

export default function PixelInvasionPage() {
  const navigate = useNavigate();
  const { game, resetGame, shieldRatio } = usePixelInvasionGame();
  const stars = useMemo(() => createStars(), []);

  return (
    <div className="pixel-invasion-page font-['Press_Start_2P']">
      <div className="pixel-invasion-shell">
        <header className="pixel-invasion-header">
          <div>
            <p className="pixel-invasion-kicker">Nouveau mode</p>
            <h1>Pixel Invasion</h1>
            <p className="pixel-invasion-subtitle">
              Un shooter arcade dans le Tetroverse: Pixel defend la ligne, les Tetrobots tombent,
              et chaque destruction nourrit une grille explosive.
            </p>
          </div>

          <div className="pixel-invasion-actions">
            <button type="button" className="retro-btn" onClick={resetGame}>
              Relancer
            </button>
            <button type="button" className="retro-btn" onClick={() => navigate("/tetris-hub")}>
              Retour hub
            </button>
          </div>
        </header>

        <div className="pixel-invasion-layout">
          <PixelInvasionBoard game={game} stars={stars} onRestart={resetGame} />
          <PixelInvasionSidebar game={game} shieldRatio={shieldRatio} />
        </div>
      </div>
    </div>
  );
}
