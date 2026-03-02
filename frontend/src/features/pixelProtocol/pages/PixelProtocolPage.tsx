import { useNavigate } from "react-router-dom";
import { PixelProtocolControlsPanel } from "../components/PixelProtocolControlsPanel";
import { PixelProtocolInfoPanel } from "../components/PixelProtocolInfoPanel";
import { PixelProtocolWorld } from "../components/PixelProtocolWorld";
import { usePixelProtocolGame } from "../hooks/usePixelProtocolGame";
import "../../../styles/pixel-protocol.css";

export default function PixelProtocolPage() {
  const navigate = useNavigate();
  const {
    ability,
    gameViewportRef,
    level,
    playerRunFrame,
    playerSprite,
    portalOpen,
    resetLevel,
    runtime,
  } = usePixelProtocolGame();

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
        />
      </div>
    </div>
  );
}
