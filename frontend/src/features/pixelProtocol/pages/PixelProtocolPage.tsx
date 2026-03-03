import { useNavigate } from "react-router-dom";
import { PixelProtocolControlsPanel } from "../components/PixelProtocolControlsPanel";
import { PixelProtocolInfoPanel } from "../components/PixelProtocolInfoPanel";
import { PixelProtocolWorld } from "../components/PixelProtocolWorld";
import { usePixelProtocolGame } from "../hooks/usePixelProtocolGame";
import { usePixelProtocolLevels } from "../hooks/usePixelProtocolLevels";
import { LEVELS as DEFAULT_LEVELS } from "../levels";
import "../../../styles/pixel-protocol.css";
import { useAuth } from "../../auth/context/AuthContext";

export default function PixelProtocolPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { levels, loading, error, usingFallback } = usePixelProtocolLevels();
  const hasLevels = levels.length > 0;
  const gameLevels = hasLevels ? levels : DEFAULT_LEVELS;
  const {
    ability,
    gameViewportRef,
    level,
    playerRunFrame,
    playerSprite,
    portalOpen,
    resetLevel,
    runtime,
  } = usePixelProtocolGame(gameLevels);
  const isAdmin = user?.role === "ADMIN";

  if (!loading && !error && !hasLevels) {
    return (
      <div className="pp-shell">
        <div className="pp-layout">
          <div className="pp-panel">
            <div className="pp-header">
              <h1>Pixel Protocol</h1>
              <p>Aucun niveau publie pour le moment.</p>
            </div>
            <div className="pp-infoCard">
              <p className="pp-panelTitle">Info</p>
              <p>Reviens plus tard ou contacte un administrateur.</p>
            </div>
            <div className="pp-actions">
              <button type="button" onClick={() => navigate("/dashboard")}>
                Retour dashboard
              </button>
              {isAdmin && (
                <button type="button" onClick={() => navigate("/pixel-protocol/editor")}>
                  Editeur de niveaux
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-shell">
      <div className="pp-layout">
        <PixelProtocolInfoPanel
          ability={ability}
          level={level}
          message={runtime.message}
          collected={runtime.collected}
          hp={runtime.player.hp}
        />

        <PixelProtocolWorld
          gameViewportRef={gameViewportRef}
          level={level}
          playerRunFrame={playerRunFrame}
          playerSprite={playerSprite}
          portalOpen={portalOpen}
          runtime={runtime}
        />

        <PixelProtocolControlsPanel
          onReset={resetLevel}
          onExit={() => navigate("/dashboard")}
          onEditor={
            isAdmin ? () => navigate("/pixel-protocol/editor") : undefined
          }
          statusMessage={
            loading
              ? "Chargement des niveaux..."
              : error || usingFallback
                ? "Serveur indisponible, niveaux locaux utilises."
                : null
          }
        />
      </div>
    </div>
  );
}
