import { memo } from "react";
import { TILE, WORLD_H } from "../constants";
import type { Selection } from "../editorShared";
import type { LevelDef, WorldTemplate } from "../types";
import { applyWorldTemplateToLevel } from "../utils/resolveWorldTemplate";

type PixelProtocolEditorFormProps = {
  editorMode: "level" | "world";
  isWorldEditor: boolean;
  isAdmin: boolean;
  editorExpanded: boolean;
  setEditorExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  published: boolean;
  setPublished: React.Dispatch<React.SetStateAction<boolean>>;
  draftLevel: LevelDef;
  worldTemplates: WorldTemplate[];
  selectedWorldTemplate: WorldTemplate | null;
  worldTiles: number;
  worldRows: number;
  topPaddingRows: number;
  minWorldTiles: number;
  minWorldRows: number;
  selection: Selection;
  setLevelField: <K extends keyof LevelDef>(field: K, value: LevelDef[K]) => void;
  applyDraftLevel: (nextLevel: LevelDef, nextSelection?: Selection) => boolean;
  setStatus: React.Dispatch<React.SetStateAction<string | null>>;
};

export const PixelProtocolEditorForm = memo(function PixelProtocolEditorForm(
  props: PixelProtocolEditorFormProps
) {
  const {
    editorMode,
    isWorldEditor,
    isAdmin,
    editorExpanded,
    setEditorExpanded,
    published,
    setPublished,
    draftLevel,
    worldTemplates,
    selectedWorldTemplate,
    worldTiles,
    worldRows,
    topPaddingRows,
    minWorldTiles,
    minWorldRows,
    selection,
    setLevelField,
    applyDraftLevel,
    setStatus,
  } = props;

  return (
    <>
      <div className="pp-editor-main-head">
        <div>
          <h2>{isWorldEditor ? "Edition du monde" : "Edition du niveau"}</h2>
          <p className="pp-editor-muted">
            {isWorldEditor
              ? "Compose un decor reutilisable, puis applique-le ensuite dans le mode niveau."
              : "Les plateformes invalides sont signalees et les liens atteignables sont traces."}
          </p>
        </div>
        <div className="pp-editor-main-actions">
          <button
            type="button"
            className="pp-editor-icon-btn pp-editor-icon-btn--info"
            title={editorExpanded ? "Reduire l'edition" : "Agrandir l'edition"}
            aria-label={editorExpanded ? "Reduire l'edition" : "Agrandir l'edition"}
            onClick={() => setEditorExpanded((current) => !current)}
          >
            <i className={`fa-solid ${editorExpanded ? "fa-compress" : "fa-expand"}`} aria-hidden="true" />
          </button>
          {isAdmin ? (
            <label className="pp-editor-toggle">
              <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
              Publie
            </label>
          ) : (
            <div className="pp-editor-muted">Visibilite: privee</div>
          )}
        </div>
      </div>

      {editorExpanded && (
        <div className="pp-editor-form-sections">
          <div className="pp-editor-form-grid">
            <label>
              <span>ID</span>
              <input value={draftLevel.id} onChange={(event) => setLevelField("id", event.target.value)} />
            </label>
            <label>
              <span>Nom</span>
              <input value={draftLevel.name} onChange={(event) => setLevelField("name", event.target.value)} />
            </label>
            {editorMode === "level" && (
              <label>
                <span>Monde</span>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={draftLevel.world}
                  onChange={(event) => setLevelField("world", Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
            )}
          </div>
          {editorMode === "level" ? (
            <>
              <div className="pp-editor-form-split">
                <section className="pp-editor-form-card">
                  <h3>Dimensions gameplay</h3>
                  <p className="pp-editor-muted">
                    Ces valeurs controlent le sol, la hauteur jouable et la marge camera du niveau.
                  </p>
                  <div className="pp-editor-form-grid">
                    <label>
                      <span>Largeur (tuiles)</span>
                      <input
                        type="number"
                        min={minWorldTiles}
                        max={180}
                        value={worldTiles}
                        onChange={(event) => {
                          const tiles = Math.max(minWorldTiles, Number(event.target.value) || minWorldTiles);
                          setLevelField("worldWidth", tiles * TILE);
                        }}
                      />
                    </label>
                    <label>
                      <span>Hauteur (tuiles)</span>
                      <input
                        type="number"
                        min={minWorldRows}
                        max={80}
                        value={worldRows}
                        onChange={(event) => {
                          const rows = Math.max(minWorldRows, Number(event.target.value) || minWorldRows);
                          setLevelField("worldHeight", rows * TILE);
                        }}
                      />
                    </label>
                    <label>
                      <span>Marge haute (tuiles)</span>
                      <input
                        type="number"
                        min={0}
                        max={24}
                        value={topPaddingRows}
                        onChange={(event) => {
                          const rows = Math.max(0, Number(event.target.value) || 0);
                          setLevelField("worldTopPadding", rows * TILE);
                        }}
                      />
                    </label>
                  </div>
                </section>
                <section className="pp-editor-form-card">
                  <h3>Monde decoratif</h3>
                  <p className="pp-editor-muted">
                    Le monde lie applique les decors et la largeur visuelle, sans modifier la hauteur gameplay.
                  </p>
                  <div className="pp-editor-form-grid">
                    <label>
                      <span>Monde decoratif</span>
                      <select
                        value={draftLevel.worldTemplateId ?? ""}
                        onChange={(event) => {
                          const nextId = event.target.value;
                          if (!nextId) {
                            setLevelField("worldTemplateId", null);
                            return;
                          }
                          const world = worldTemplates.find((item) => item.id === nextId);
                          if (!world) return;
                          applyDraftLevel(applyWorldTemplateToLevel(draftLevel, world), selection);
                          setStatus(`Monde applique: ${world.name}`);
                        }}
                      >
                        <option value="">-- aucun --</option>
                        {worldTemplates.map((world) => (
                          <option key={world.id} value={world.id}>
                            {world.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="pp-editor-world-summary">
                    <div><span>Decor lie</span><strong>{selectedWorldTemplate?.name ?? "Aucun"}</strong></div>
                    <div><span>Largeur decor</span><strong>{selectedWorldTemplate ? `${Math.round(selectedWorldTemplate.worldWidth / TILE)} tuiles` : "-"}</strong></div>
                    <div><span>Hauteur decor</span><strong>{selectedWorldTemplate ? `${Math.round((selectedWorldTemplate.worldHeight ?? WORLD_H) / TILE)} tuiles` : "-"}</strong></div>
                    <div><span>Marge decor</span><strong>{selectedWorldTemplate ? `${Math.round((selectedWorldTemplate.worldTopPadding ?? 0) / TILE)} tuiles` : "-"}</strong></div>
                  </div>
                  {selectedWorldTemplate && selectedWorldTemplate.worldWidth < draftLevel.worldWidth && (
                    <div className="pp-editor-status warning">
                      Le decor lie est plus etroit que la largeur gameplay. Une partie du niveau peut depasser de la zone decorative.
                    </div>
                  )}
                </section>
              </div>
              <section className="pp-editor-form-card">
                <h3>Objectifs et points clefs</h3>
                <div className="pp-editor-form-grid">
                  <label>
                    <span>Orbs requises</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={draftLevel.requiredOrbs}
                      onChange={(event) => setLevelField("requiredOrbs", Math.max(0, Number(event.target.value) || 0))}
                    />
                  </label>
                  <label>
                    <span>Spawn X</span>
                    <input
                      type="number"
                      value={draftLevel.spawn.x}
                      onChange={(event) => setLevelField("spawn", { ...draftLevel.spawn, x: Number(event.target.value) || 0 })}
                    />
                  </label>
                  <label>
                    <span>Spawn Y</span>
                    <input
                      type="number"
                      value={draftLevel.spawn.y}
                      onChange={(event) => setLevelField("spawn", { ...draftLevel.spawn, y: Number(event.target.value) || 0 })}
                    />
                  </label>
                  <label>
                    <span>Portail X</span>
                    <input
                      type="number"
                      value={draftLevel.portal.x}
                      onChange={(event) => setLevelField("portal", { ...draftLevel.portal, x: Number(event.target.value) || 0 })}
                    />
                  </label>
                  <label>
                    <span>Portail Y</span>
                    <input
                      type="number"
                      value={draftLevel.portal.y}
                      onChange={(event) => setLevelField("portal", { ...draftLevel.portal, y: Number(event.target.value) || 0 })}
                    />
                  </label>
                </div>
              </section>
            </>
          ) : (
            <div className="pp-editor-form-grid">
              <label>
                <span>Largeur (tuiles)</span>
                <input
                  type="number"
                  min={minWorldTiles}
                  max={180}
                  value={worldTiles}
                  onChange={(event) => {
                    const tiles = Math.max(minWorldTiles, Number(event.target.value) || minWorldTiles);
                    setLevelField("worldWidth", tiles * TILE);
                  }}
                />
              </label>
              <label>
                <span>Hauteur (tuiles)</span>
                <input
                  type="number"
                  min={minWorldRows}
                  max={80}
                  value={worldRows}
                  onChange={(event) => {
                    const rows = Math.max(minWorldRows, Number(event.target.value) || minWorldRows);
                    setLevelField("worldHeight", rows * TILE);
                  }}
                />
              </label>
              <label>
                <span>Marge haute (tuiles)</span>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={topPaddingRows}
                  onChange={(event) => {
                    const rows = Math.max(0, Number(event.target.value) || 0);
                    setLevelField("worldTopPadding", rows * TILE);
                  }}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </>
  );
});
