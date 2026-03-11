import { memo, useMemo, type ChangeEvent, type RefObject } from "react";
import type { EditorStoredLevel } from "../editorShared";
import type { PixelProtocolCommunityLevel } from "../services/pixelProtocolService";
import type { WorldTemplate } from "../types";

type PixelProtocolEditorSidebarProps = {
  isAdmin: boolean;
  isWorldEditor: boolean;
  loading: boolean;
  selectedId: string | null;
  levels: EditorStoredLevel[];
  worldTemplates: WorldTemplate[];
  communityLevels: PixelProtocolCommunityLevel[];
  draftLevelId: string;
  validationIsValid: boolean;
  canPublishCommunityLevel: boolean;
  savedWorldsExpanded: boolean;
  exampleTemplatesExpanded: boolean;
  exampleSearch: string;
  exampleSort: string;
  filteredExamples: Array<{ id: string; name: string; theme: string; raw: string }>;
  importWorldInputRef: RefObject<HTMLInputElement | null>;
  onImportWorldTemplate: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleExamples: () => void;
  onToggleSaved: () => void;
  onExampleSearchChange: (value: string) => void;
  onExampleSortChange: (value: string) => void;
  onLoadExample: (raw: string) => void;
  onExportWorld: () => void;
  onSave: () => void;
  onOpenPreview: () => void;
  onPlayLevel: () => void;
  onPublishLevel: () => void;
  onLoadWorldTemplate: (world: WorldTemplate) => void;
  onLoadLevel: (level: EditorStoredLevel) => void;
  onRemove: (id: string) => void;
};

export const PixelProtocolEditorSidebar = memo(function PixelProtocolEditorSidebar(
  props: PixelProtocolEditorSidebarProps
) {
  const {
    isAdmin,
    isWorldEditor,
    loading,
    selectedId,
    levels,
    worldTemplates,
    communityLevels,
    draftLevelId,
    validationIsValid,
    canPublishCommunityLevel,
    savedWorldsExpanded,
    exampleTemplatesExpanded,
    exampleSearch,
    exampleSort,
    filteredExamples,
    importWorldInputRef,
    onImportWorldTemplate,
    onToggleExamples,
    onToggleSaved,
    onExampleSearchChange,
    onExampleSortChange,
    onLoadExample,
    onExportWorld,
    onSave,
    onOpenPreview,
    onPlayLevel,
    onPublishLevel,
    onLoadWorldTemplate,
    onLoadLevel,
    onRemove,
  } = props;
  const publishedCommunityLevelIds = useMemo(
    () =>
      new Set(
        communityLevels
          .filter((communityLevel) => communityLevel.isOwn)
          .map((communityLevel) => communityLevel.level.id)
      ),
    [communityLevels]
  );

  return (
    <aside className="pp-editor-panel pp-editor-list">
      {isWorldEditor && (
        <input
          ref={importWorldInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onImportWorldTemplate}
        />
      )}
      {(!isAdmin || isWorldEditor) && (
        <div
          className="pp-editor-list-actions"
          aria-label={
            isWorldEditor
              ? isAdmin
                ? "Actions monde admin"
                : "Actions monde custom"
              : "Actions niveau custom"
          }
        >
          {isWorldEditor && (
            <button
              type="button"
              className="pp-editor-icon-btn pp-editor-icon-btn--example"
              title="Charger le monde d'exemple"
              aria-label="Charger le monde d'exemple"
              onClick={() => onLoadExample(filteredExamples[0]?.raw ?? "")}
              disabled={filteredExamples.length === 0}
            >
              <i className="fa-solid fa-wand-magic-sparkles" />
            </button>
          )}
          {isWorldEditor && (
            <button
              type="button"
              className="pp-editor-icon-btn pp-editor-icon-btn--import"
              title="Importer un monde JSON"
              aria-label="Importer un monde JSON"
              onClick={() => importWorldInputRef.current?.click()}
            >
              <i className="fa-solid fa-file-arrow-up" />
            </button>
          )}
          {isWorldEditor && (
            <button
              type="button"
              className="pp-editor-icon-btn pp-editor-icon-btn--export"
              title="Exporter le monde courant en JSON"
              aria-label="Exporter le monde courant en JSON"
              onClick={onExportWorld}
            >
              <i className="fa-solid fa-file-arrow-down" />
            </button>
          )}
          <button
            type="button"
            className="pp-editor-icon-btn pp-editor-icon-btn--save"
            title="Sauvegarder"
            aria-label="Sauvegarder"
            onClick={onSave}
          >
            <i className="fa-solid fa-floppy-disk" />
          </button>
          {!isAdmin && !isWorldEditor && (
            <>
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--test"
                title="Tester le niveau"
                aria-label="Tester le niveau"
                onClick={onOpenPreview}
              >
                <i className="fa-solid fa-vial-circle-check" />
              </button>
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--play"
                title="Jouer ce niveau"
                aria-label="Jouer ce niveau"
                onClick={onPlayLevel}
              >
                <i className="fa-solid fa-play" />
              </button>
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--publish"
                title={
                  validationIsValid
                    ? canPublishCommunityLevel
                      ? "Publier dans la galerie"
                      : "Finis d'abord cette version exacte du niveau"
                    : "Le layout doit etre valide pour publier"
                }
                aria-label="Publier dans la galerie"
                onClick={onPublishLevel}
                disabled={!canPublishCommunityLevel}
              >
                <i className="fa-solid fa-upload" />
              </button>
            </>
          )}
        </div>
      )}
      {isWorldEditor && (
        <div className="pp-editor-collapsible">
          <button type="button" className="pp-editor-collapsible__toggle" onClick={onToggleExamples}>
            <span>{`Mondes d'exemple (${filteredExamples.length})`}</span>
            <i
              className={`fa-solid ${exampleTemplatesExpanded ? "fa-chevron-up" : "fa-chevron-down"}`}
              aria-hidden="true"
            />
          </button>
          {exampleTemplatesExpanded && (
            <>
              <div className="pp-editor-example-toolbar">
                <input
                  type="search"
                  value={exampleSearch}
                  onChange={(event) => onExampleSearchChange(event.target.value)}
                  placeholder="Rechercher un exemple"
                  aria-label="Rechercher un monde d'exemple"
                />
                <select
                  value={exampleSort}
                  onChange={(event) => onExampleSortChange(event.target.value)}
                  aria-label="Trier les mondes d'exemple"
                >
                  <option value="recent">Recents</option>
                  <option value="a-z">A-Z</option>
                  <option value="showcase">Showcase</option>
                  <option value="ambiance">Ambiance</option>
                </select>
              </div>
              <div className="pp-editor-example-actions" aria-label="Mondes d'exemple">
                {filteredExamples.map((example) => (
                  <button
                    key={example.id}
                    type="button"
                    className="pp-editor-example-btn"
                    onClick={() => onLoadExample(example.raw)}
                  >
                    <strong>{example.name}</strong>
                    <span>{example.theme}</span>
                  </button>
                ))}
              </div>
              {filteredExamples.length === 0 && (
                <p className="pp-editor-muted">Aucun monde d'exemple pour cette recherche.</p>
              )}
            </>
          )}
        </div>
      )}
      <div className="pp-editor-collapsible">
        <button type="button" className="pp-editor-collapsible__toggle" onClick={onToggleSaved}>
          <span>
            {isWorldEditor
              ? `Tes mondes custom (${worldTemplates.length})`
              : isAdmin
                ? `Niveaux disponibles (${levels.length})`
                : `Tes niveaux custom (${levels.length})`}
          </span>
          <i
            className={`fa-solid ${savedWorldsExpanded ? "fa-chevron-up" : "fa-chevron-down"}`}
            aria-hidden="true"
          />
        </button>
        {savedWorldsExpanded &&
          (loading ? (
            <p className="pp-editor-muted">Chargement...</p>
          ) : (isWorldEditor ? worldTemplates.length === 0 : levels.length === 0) ? (
            <p className="pp-editor-muted">
              {isWorldEditor
                ? "Aucun monde custom pour le moment."
                : isAdmin
                  ? "Aucun niveau en base."
                  : "Aucun niveau custom pour le moment."}
            </p>
          ) : (
            <div className="pp-editor-list-scroll">
              {(isWorldEditor ? worldTemplates : levels).map((lvl) => (
                <div
                  key={lvl.id}
                  className={`pp-editor-level ${lvl.id === selectedId ? "is-active" : ""}`}
                >
                  <div className="pp-editor-level-head">
                    <span>{lvl.name}</span>
                    {isWorldEditor ? (
                      <span className="tag tag-draft">Monde</span>
                    ) : isAdmin ? (
                      <span className={(lvl as EditorStoredLevel).active ? "tag tag-live" : "tag tag-draft"}>
                        {(lvl as EditorStoredLevel).active ? "Publie" : "Brouillon"}
                      </span>
                    ) : (
                      <span className="tag tag-draft">Prive</span>
                    )}
                  </div>
                  <div className="pp-editor-level-meta">
                    <span>ID: {lvl.id}</span>
                    <span>
                      {isWorldEditor
                        ? `Decors ${(lvl as WorldTemplate).decorations.length}`
                        : `Monde ${(lvl as EditorStoredLevel).world}`}
                    </span>
                    {!isAdmin &&
                      !isWorldEditor &&
                      publishedCommunityLevelIds.has(lvl.id) && <span>Galerie: publie</span>}
                    {!isWorldEditor && (lvl as EditorStoredLevel).worldTemplateId && (
                      <span>Decor: {(lvl as EditorStoredLevel).worldTemplateId}</span>
                    )}
                    {!isWorldEditor && lvl.id === draftLevelId && <span>Edition: courant</span>}
                  </div>
                  <div className="pp-editor-level-actions">
                    <button
                      type="button"
                      className="pp-editor-icon-btn pp-editor-icon-btn--load"
                      title="Charger"
                      aria-label="Charger"
                      onClick={() =>
                        isWorldEditor
                          ? onLoadWorldTemplate(lvl as WorldTemplate)
                          : onLoadLevel(lvl as EditorStoredLevel)
                      }
                    >
                      <i className="fa-solid fa-folder-open" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="pp-editor-icon-btn pp-editor-icon-btn--danger"
                      title="Supprimer"
                      aria-label="Supprimer"
                      onClick={() => onRemove(lvl.id)}
                    >
                      <i className="fa-solid fa-trash" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </aside>
  );
});
