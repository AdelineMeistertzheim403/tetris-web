import { PixelProtocolControlsPanel } from "./PixelProtocolControlsPanel";
import { PixelProtocolInfoPanel } from "./PixelProtocolInfoPanel";
import { PixelProtocolWorld } from "./PixelProtocolWorld";
import { usePixelProtocolGame } from "../hooks/usePixelProtocolGame";
import type { LevelDef } from "../types";

type PixelProtocolDraftPreviewProps = {
  level: LevelDef;
  onClose: () => void;
};

export function PixelProtocolDraftPreview({
  level,
  onClose,
}: PixelProtocolDraftPreviewProps) {
  const {
    ability,
    chatLine,
    gameViewportRef,
    level: previewLevel,
    playerRunFrame,
    playerSprite,
    portalOpen,
    grapplePreview,
    resetLevel,
    runtime,
  } = usePixelProtocolGame([level]);

  return (
    <div className="pp-editor-preview-play">
      <div className="pp-editor-preview-head">
        <div>
          <h2>Test du draft</h2>
          <p className="pp-editor-muted">
            La preview charge le niveau en cours avec la physique reelle du mode.
          </p>
        </div>
        <button type="button" className="retro-btn" onClick={onClose}>
          Fermer
        </button>
      </div>

      <div className="pp-layout pp-editor-preview-layout">
        <PixelProtocolInfoPanel
          ability={ability}
          chatLine={chatLine}
          level={previewLevel}
          message={runtime.message}
          collected={runtime.collected}
          hp={runtime.player.hp}
          unlockedSkills={[]}
        />
        <PixelProtocolWorld
          gameViewportRef={gameViewportRef}
          level={previewLevel}
          playerRunFrame={playerRunFrame}
          playerSprite={playerSprite}
          portalOpen={portalOpen}
          grapplePreview={grapplePreview}
          runtime={runtime}
        />
        <PixelProtocolControlsPanel
          ability={ability}
          onReset={resetLevel}
          onExit={onClose}
          statusMessage="Test local du draft courant."
        />
      </div>
    </div>
  );
}
