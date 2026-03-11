import { memo } from "react";
import type { EditorMode } from "../editorShared";

type PixelProtocolEditorHeaderProps = {
  isAdmin: boolean;
  editorMode: EditorMode;
  onStartNew: () => void;
  onRefresh: () => void;
  onHelp: () => void;
  onResetUi: () => void;
  onBack: () => void;
};

export const PixelProtocolEditorHeader = memo(function PixelProtocolEditorHeader({
  isAdmin,
  editorMode,
  onStartNew,
  onRefresh,
  onHelp,
  onResetUi,
  onBack,
}: PixelProtocolEditorHeaderProps) {
  const isWorldEditor = editorMode === "world";

  return (
    <div className="pp-editor-head">
      <div>
        <h1>Pixel Protocol - {isAdmin ? "Editeur admin" : "Editeur custom"}</h1>
        <p>
          {isAdmin
            ? "Edition visuelle des niveaux officiels avec publication et validation de parcours."
            : "Cree, modifie et supprime tes propres niveaux. Les niveaux officiels restent en lecture seule."}
        </p>
      </div>
      <div className="pp-editor-head-actions">
        <button
          type="button"
          className={`pp-editor-icon-btn ${
            isWorldEditor ? "pp-editor-icon-btn--decoration" : "pp-editor-icon-btn--platform"
          }`}
          title={isWorldEditor ? "Nouveau monde" : "Nouveau niveau"}
          aria-label={isWorldEditor ? "Nouveau monde" : "Nouveau niveau"}
          onClick={onStartNew}
        >
          <i className="fa-solid fa-file-circle-plus" />
        </button>
        <button
          type="button"
          className="pp-editor-icon-btn pp-editor-icon-btn--refresh"
          title="Actualiser"
          aria-label="Actualiser"
          onClick={onRefresh}
        >
          <i className="fa-solid fa-rotate-right" />
        </button>
        <button
          type="button"
          className="pp-editor-icon-btn pp-editor-icon-btn--help"
          title="Aide"
          aria-label="Aide"
          onClick={onHelp}
        >
          <i className="fa-solid fa-circle-question" />
        </button>
        <button
          type="button"
          className="pp-editor-icon-btn pp-editor-icon-btn--reset-ui"
          title="Reinitialiser l'interface"
          aria-label="Reinitialiser l'interface"
          onClick={onResetUi}
        >
          <i className="fa-solid fa-rotate-left" />
        </button>
        <button
          type="button"
          className="pp-editor-icon-btn pp-editor-icon-btn--back"
          title="Retour"
          aria-label="Retour"
          onClick={onBack}
        >
          <i className="fa-solid fa-arrow-left" />
        </button>
      </div>
    </div>
  );
});
