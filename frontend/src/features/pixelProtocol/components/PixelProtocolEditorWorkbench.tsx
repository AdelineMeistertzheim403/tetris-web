import { memo, type PointerEventHandler, type RefObject } from "react";
import { PLATFORM_CLASS, TILE, WORLD_H } from "../constants";
import { PixelProtocolDecoration } from "../decorations";
import type { Selection, DragState, EditorMode } from "../editorShared";
import type {
  EditorIssue,
  PlatformRenderData,
  PlatformValidation,
  ReachabilityLink,
} from "../editorUtils";
import type {
  Checkpoint,
  DecorationDef,
  DataOrb,
  Enemy,
  LevelDef,
  PlatformDef,
  WorldTemplate,
} from "../types";

const EDITOR_TILE = 22;

type PixelProtocolEditorWorkbenchProps = {
  editorMode: EditorMode;
  selectedWorldTemplate: WorldTemplate | null;
  selectedDecoration: DecorationDef | null;
  selectedSpawn: boolean;
  selectedPortal: boolean;
  canDeleteSelection: boolean;
  abilities: { doubleJump: boolean; airDash: boolean };
  boardScrollRef: RefObject<HTMLDivElement | null>;
  worldTiles: number;
  editorTotalRows: number;
  editorYOffset: number;
  topPaddingRows: number;
  displayedLevel: LevelDef;
  draftLevel: LevelDef;
  selection: Selection;
  dragState: DragState | null;
  renderDecorations: DecorationDef[];
  duplicatePreviewDecorations: DecorationDef[];
  renderPlatforms: PlatformRenderData[];
  platformCenterMap: Map<string, { x: number; y: number }>;
  validation: PlatformValidation;
  validationWarnings: EditorIssue[];
  validationErrors: EditorIssue[];
  currentCompletion: object | null;
  canPublishCommunityLevel: boolean;
  isAdmin: boolean;
  isWorldEditor: boolean;
  ownPublishedLevel: { likeCount: number } | null;
  centerPanelSections: Record<"layoutState" | "validation" | "elements" | "linkedWorld", boolean>;
  setSelection: React.Dispatch<React.SetStateAction<Selection>>;
  handleAddPlatform: () => void;
  handleAddCheckpoint: () => void;
  handleAddOrb: () => void;
  handleAddEnemy: () => void;
  handleAddDecoration: () => void;
  handleDuplicateDecoration: () => void;
  handleDeleteSelection: () => void;
  startDecorationDrag: (event: React.PointerEvent<HTMLButtonElement>, decoration: DecorationDef) => void;
  startSpawnDrag: PointerEventHandler<HTMLButtonElement>;
  startPortalDrag: PointerEventHandler<HTMLButtonElement>;
  startPlatformDrag: (event: React.PointerEvent<HTMLButtonElement>, platform: PlatformDef) => void;
  startCheckpointDrag: (event: React.PointerEvent<HTMLButtonElement>, checkpoint: Checkpoint) => void;
  startOrbDrag: (event: React.PointerEvent<HTMLButtonElement>, orb: DataOrb) => void;
  startEnemyDrag: (event: React.PointerEvent<HTMLButtonElement>, enemy: Enemy) => void;
  setAllCenterPanelSections: (expanded: boolean) => void;
  toggleCenterPanelSection: (section: "layoutState" | "validation" | "elements" | "linkedWorld") => void;
};

function linkPoint(
  link: ReachabilityLink,
  platformCenterMap: Map<string, { x: number; y: number }>,
  displayedLevel: LevelDef,
  editorYOffset: number
) {
  if (link.from.kind === "spawn") {
    return {
      x: (displayedLevel.spawn.x / TILE) * EDITOR_TILE + 10,
      y: (displayedLevel.spawn.y / TILE) * EDITOR_TILE + editorYOffset + 10,
    };
  }
  const center = platformCenterMap.get(link.from.platformId);
  return center
    ? {
        x: (center.x / TILE) * EDITOR_TILE,
        y: (center.y / TILE) * EDITOR_TILE + editorYOffset,
      }
    : null;
}

export const PixelProtocolEditorWorkbench = memo(function PixelProtocolEditorWorkbench(
  props: PixelProtocolEditorWorkbenchProps
) {
  const {
    editorMode,
    selectedWorldTemplate,
    selectedDecoration,
    selectedSpawn,
    selectedPortal,
    canDeleteSelection,
    abilities,
    boardScrollRef,
    worldTiles,
    editorTotalRows,
    editorYOffset,
    topPaddingRows,
    displayedLevel,
    draftLevel,
    selection,
    dragState,
    renderDecorations,
    duplicatePreviewDecorations,
    renderPlatforms,
    platformCenterMap,
    validation,
    validationWarnings,
    validationErrors,
    currentCompletion,
    canPublishCommunityLevel,
    isAdmin,
    isWorldEditor,
    ownPublishedLevel,
    centerPanelSections,
    setSelection,
    handleAddPlatform,
    handleAddCheckpoint,
    handleAddOrb,
    handleAddEnemy,
    handleAddDecoration,
    handleDuplicateDecoration,
    handleDeleteSelection,
    startDecorationDrag,
    startSpawnDrag,
    startPortalDrag,
    startPlatformDrag,
    startCheckpointDrag,
    startOrbDrag,
    startEnemyDrag,
    setAllCenterPanelSections,
    toggleCenterPanelSection,
  } = props;

  return (
    <>
      <div className="pp-editor-canvas-card">
        <div className="pp-editor-toolbar">
          <div className="pp-editor-toolbar-hint">
            {editorMode === "level"
              ? `Mode Niveau${selectedWorldTemplate ? ` - Monde: ${selectedWorldTemplate.name}` : ""}`
              : "Mode Monde - Edition du decor reutilisable"}
          </div>
          <div className="pp-editor-toolbar-group">
            {editorMode === "level" ? (
              <>
                <button type="button" className="pp-editor-icon-btn pp-editor-icon-btn--platform" title="Ajouter plateforme" aria-label="Ajouter plateforme" onClick={handleAddPlatform}>
                  <i className="fa-solid fa-cubes" aria-hidden="true" />
                </button>
                <button type="button" className="pp-editor-icon-btn pp-editor-icon-btn--checkpoint" title="Ajouter checkpoint" aria-label="Ajouter checkpoint" onClick={handleAddCheckpoint}>
                  <i className="fa-solid fa-flag" aria-hidden="true" />
                </button>
                <button type="button" className="pp-editor-icon-btn pp-editor-icon-btn--orb" title="Ajouter orb" aria-label="Ajouter orb" onClick={handleAddOrb}>
                  <i className="fa-solid fa-circle-nodes" aria-hidden="true" />
                </button>
                <button type="button" className="pp-editor-icon-btn pp-editor-icon-btn--enemy" title="Ajouter ennemi" aria-label="Ajouter ennemi" onClick={handleAddEnemy}>
                  <i className="fa-solid fa-robot" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <button type="button" className="pp-editor-icon-btn pp-editor-icon-btn--decoration" title="Ajouter decoration" aria-label="Ajouter decoration" onClick={handleAddDecoration}>
                  <i className="fa-solid fa-shapes" aria-hidden="true" />
                </button>
                <button type="button" className="pp-editor-icon-btn pp-editor-icon-btn--duplicate" title="Dupliquer decoration" aria-label="Dupliquer decoration" onClick={handleDuplicateDecoration} disabled={!selectedDecoration}>
                  <i className="fa-solid fa-clone" aria-hidden="true" />
                </button>
              </>
            )}
            <button type="button" className="pp-editor-icon-btn pp-editor-icon-btn--danger" title="Supprimer selection" aria-label="Supprimer selection" onClick={handleDeleteSelection} disabled={!canDeleteSelection}>
              <i className="fa-solid fa-trash-can" aria-hidden="true" />
            </button>
          </div>
          <div className="pp-editor-toolbar-hint">
            {editorMode === "level"
              ? `Capacites actives: ${abilities.doubleJump ? "double jump" : "saut simple"} / ${abilities.airDash ? "dash" : "pas de dash"}`
              : "Mode Monde: edition de la couche decorative (sans collision)."}
          </div>
        </div>

        <div ref={boardScrollRef} className="pp-editor-world-scroll">
          <div className="pp-editor-world" style={{ width: worldTiles * EDITOR_TILE, height: editorTotalRows * EDITOR_TILE }}>
            <svg className="pp-editor-links" width={worldTiles * EDITOR_TILE} height={editorTotalRows * EDITOR_TILE}>
              {validation.links.map((link, index) => {
                const from = linkPoint(link, platformCenterMap, displayedLevel, editorYOffset);
                const toCenter = platformCenterMap.get(link.to.platformId);
                const to = toCenter
                  ? {
                      x: (toCenter.x / TILE) * EDITOR_TILE,
                      y: (toCenter.y / TILE) * EDITOR_TILE + editorYOffset,
                    }
                  : null;
                if (!from || !to) return null;
                return <line key={`${link.to.platformId}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
              })}
            </svg>

            {topPaddingRows > 0 && <div className="pp-editor-top-padding" style={{ top: editorYOffset - 2, height: 2 }} />}
            <div className="pp-editor-ground" style={{ top: (editorTotalRows - 1) * EDITOR_TILE, height: EDITOR_TILE }} />

            {renderDecorations.map((decoration) => {
              const scaledX = (decoration.x / TILE) * EDITOR_TILE;
              const scaledY = (decoration.y / TILE) * EDITOR_TILE;
              const scaledW = (decoration.width / TILE) * EDITOR_TILE;
              const scaledH = (decoration.height / TILE) * EDITOR_TILE;
              const isSelected = selection?.kind === "decoration" && selection.id === decoration.id;
              return (
                <button
                  key={decoration.id}
                  type="button"
                  className={`pp-editor-decoration-layer ${isSelected ? "is-selected" : ""} ${dragState?.kind === "decoration" && dragState.id === decoration.id ? "is-dragging" : ""} ${editorMode === "world" ? "" : "is-readonly"}`}
                  style={{ left: scaledX, top: scaledY, width: scaledW, height: scaledH, pointerEvents: editorMode === "world" ? "auto" : "none" }}
                  onPointerDown={(event) => startDecorationDrag(event, decoration)}
                  onClick={() => setSelection({ kind: "decoration", id: decoration.id })}
                >
                  <PixelProtocolDecoration decoration={{ ...decoration, x: 0, y: 0, width: scaledW, height: scaledH }} className="pp-editor-decoration-preview" selected={isSelected} />
                  <span className="pp-editor-decoration-badge">{decoration.id}</span>
                </button>
              );
            })}

            {duplicatePreviewDecorations.map((decoration) => {
              const scaledX = (decoration.x / TILE) * EDITOR_TILE;
              const scaledY = (decoration.y / TILE) * EDITOR_TILE;
              const scaledW = (decoration.width / TILE) * EDITOR_TILE;
              const scaledH = (decoration.height / TILE) * EDITOR_TILE;
              return (
                <div key={decoration.id} className="pp-editor-decoration-layer pp-editor-decoration-layer--ghost" style={{ left: scaledX, top: scaledY, width: scaledW, height: scaledH }}>
                  <PixelProtocolDecoration decoration={{ ...decoration, x: 0, y: 0, width: scaledW, height: scaledH }} className="pp-editor-decoration-preview" />
                </div>
              );
            })}

            {editorMode === "level" && (
              <>
                <button type="button" className={`pp-editor-spawn ${selectedSpawn ? "is-selected" : ""} ${dragState?.kind === "spawn" ? "is-dragging" : ""}`} style={{ left: (displayedLevel.spawn.x / TILE) * EDITOR_TILE, top: (displayedLevel.spawn.y / TILE) * EDITOR_TILE + editorYOffset }} onPointerDown={startSpawnDrag} onClick={() => setSelection({ kind: "spawn" })}>
                  Spawn
                </button>
                <button type="button" className={`pp-editor-portal ${selectedPortal ? "is-selected" : ""} ${dragState?.kind === "portal" ? "is-dragging" : ""}`} style={{ left: (displayedLevel.portal.x / TILE) * EDITOR_TILE, top: (displayedLevel.portal.y / TILE) * EDITOR_TILE + editorYOffset }} onPointerDown={startPortalDrag} onClick={() => setSelection({ kind: "portal" })}>
                  Exit
                </button>

                {renderPlatforms.map(({ platform, blocks, bounds }) => (
                  <button
                    key={platform.id}
                    type="button"
                    className={`pp-editor-platform-layer ${platform.type === "grapplable" ? "pp-editor-platform-layer--grapplable" : ""} ${selection?.kind === "platform" && selection.id === platform.id ? "is-selected" : ""} ${dragState?.kind === "platform" && dragState.id === platform.id ? "is-dragging" : ""}`}
                    onPointerDown={(event) => startPlatformDrag(event, platform)}
                    onClick={() => setSelection({ kind: "platform", id: platform.id })}
                    style={
                      bounds
                        ? {
                            left: (bounds.left / TILE) * EDITOR_TILE,
                            top: (bounds.top / TILE) * EDITOR_TILE + editorYOffset,
                            width: (bounds.width / TILE) * EDITOR_TILE,
                            height: (bounds.height / TILE) * EDITOR_TILE,
                            pointerEvents: "auto",
                          }
                        : undefined
                    }
                  >
                    {blocks.map((block, index) => (
                      <span
                        key={`${platform.id}-${index}`}
                        className={`pp-platform ${PLATFORM_CLASS[platform.type]} pp-editor-platform-block ${platform.type === "grapplable" ? "pp-editor-platform-block--grapplable" : ""} ${validation.reachablePlatformIds.includes(platform.id) ? "is-reachable" : "is-unreachable"}`}
                        style={{ left: ((block.x - (bounds?.left ?? 0)) / TILE) * EDITOR_TILE, top: ((block.y - (bounds?.top ?? 0)) / TILE) * EDITOR_TILE, width: EDITOR_TILE, height: EDITOR_TILE }}
                      />
                    ))}
                    {platform.type === "grapplable" && <span className="pp-editor-grappleAnchor" aria-hidden="true" />}
                    <span className="pp-editor-platform-badge">{platform.id}</span>
                  </button>
                ))}

                {displayedLevel.checkpoints.map((checkpoint) => (
                  <button key={checkpoint.id} type="button" className={`pp-editor-entity pp-editor-entity--checkpoint ${selection?.kind === "checkpoint" && selection.id === checkpoint.id ? "is-selected" : ""}`} style={{ left: (checkpoint.x / TILE) * EDITOR_TILE, top: (checkpoint.y / TILE) * EDITOR_TILE + editorYOffset }} onPointerDown={(event) => startCheckpointDrag(event, checkpoint)} onClick={() => setSelection({ kind: "checkpoint", id: checkpoint.id })}>
                    {checkpoint.id}
                  </button>
                ))}

                {displayedLevel.orbs.map((orb) => (
                  <button key={orb.id} type="button" className={`pp-editor-entity pp-editor-entity--orb ${selection?.kind === "orb" && selection.id === orb.id ? "is-selected" : ""}`} style={{ left: (orb.x / TILE) * EDITOR_TILE, top: (orb.y / TILE) * EDITOR_TILE + editorYOffset }} onPointerDown={(event) => startOrbDrag(event, orb)} onClick={() => setSelection({ kind: "orb", id: orb.id })}>
                    {orb.id}
                  </button>
                ))}

                {displayedLevel.enemies.map((enemy) => (
                  <button key={enemy.id} type="button" className={`pp-editor-entity pp-editor-entity--enemy ${selection?.kind === "enemy" && selection.id === enemy.id ? "is-selected" : ""}`} style={{ left: (enemy.x / TILE) * EDITOR_TILE, top: (enemy.y / TILE) * EDITOR_TILE + editorYOffset }} onPointerDown={(event) => startEnemyDrag(event, enemy)} onClick={() => setSelection({ kind: "enemy", id: enemy.id })}>
                    <span>{enemy.id}</span>
                    <span className="pp-editor-entity-range" style={{ width: ((enemy.maxX - enemy.minX) / TILE) * EDITOR_TILE }} />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="pp-editor-center-actions">
          <button type="button" className="pp-editor-icon-btn pp-editor-icon-btn--info" aria-label="Tout ouvrir la colonne centrale" title="Tout ouvrir la colonne centrale" onClick={() => setAllCenterPanelSections(true)}>
            <i className="fa-solid fa-angles-down" aria-hidden="true" />
          </button>
          <button type="button" className="pp-editor-icon-btn pp-editor-icon-btn--info" aria-label="Tout fermer la colonne centrale" title="Tout fermer la colonne centrale" onClick={() => setAllCenterPanelSections(false)}>
            <i className="fa-solid fa-angles-up" aria-hidden="true" />
          </button>
        </div>

        <div className="pp-editor-preview">
          <button type="button" className="pp-editor-panel-toggle" onClick={() => toggleCenterPanelSection("layoutState")}>
            <span><i className="fa-solid fa-chart-simple" aria-hidden="true" /> Etat du layout</span>
            <i className={`fa-solid ${centerPanelSections.layoutState ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
          </button>
          {centerPanelSections.layoutState && (
            <div className="pp-editor-preview-grid">
              <div>Platforms: {draftLevel.platforms.length}</div>
              <div>Reachable: {validation.reachablePlatformIds.length}</div>
              <div>Checkpoints: {draftLevel.checkpoints.length}</div>
              <div>Orbs: {draftLevel.orbs.length}</div>
              <div>Ennemis: {draftLevel.enemies.length}</div>
              <div>Decors: {(draftLevel.decorations ?? []).length}</div>
              <div>Liens: {validation.links.length}</div>
            </div>
          )}
        </div>

        {editorMode === "level" && (
          <div className="pp-editor-panel pp-editor-subpanel">
            <button type="button" className="pp-editor-panel-toggle" onClick={() => toggleCenterPanelSection("validation")}>
              <span><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Validation</span>
              <i className={`fa-solid ${centerPanelSections.validation ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
            </button>
            {centerPanelSections.validation &&
              (validation.isValid ? (
                <>
                  <div className="pp-editor-status success">Layout valide: toutes les plateformes sont atteignables.</div>
                  {!isAdmin && !isWorldEditor && (
                    <div className={`pp-editor-status ${currentCompletion && canPublishCommunityLevel ? "success" : "warning"}`}>
                      {currentCompletion && canPublishCommunityLevel
                        ? "Publication joueur debloquee: cette version du niveau a deja ete terminee."
                        : currentCompletion
                          ? "Le niveau a ete fini, mais le layout a change depuis. Rejoue-le avant publication."
                          : "Pour publier, tu dois encore finir ce niveau via Jouer ce niveau."}
                    </div>
                  )}
                  {!isAdmin && !isWorldEditor && ownPublishedLevel && (
                    <div className="pp-editor-status success">
                      Niveau deja publie dans la galerie joueurs. Likes actuels: {ownPublishedLevel.likeCount}.
                    </div>
                  )}
                  {validationWarnings.length > 0 && (
                    <div className="pp-editor-issues">
                      {validationWarnings.map((issue, index) => (
                        <div key={`${issue.platformId ?? "warning"}-${index}`} className="pp-editor-issue">
                          {issue.message}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="pp-editor-issues">
                  {validationErrors.map((issue, index) => (
                    <button
                      key={`${issue.platformId ?? "global"}-${index}`}
                      type="button"
                      className="pp-editor-issue"
                      onClick={() => {
                        if (issue.platformId) setSelection({ kind: "platform", id: issue.platformId });
                      }}
                    >
                      {issue.message}
                    </button>
                  ))}
                </div>
              ))}
          </div>
        )}

        <div className="pp-editor-panel pp-editor-subpanel">
          <button type="button" className="pp-editor-panel-toggle" onClick={() => toggleCenterPanelSection("elements")}>
            <span><i className="fa-solid fa-list" aria-hidden="true" /> Elements du niveau</span>
            <i className={`fa-solid ${centerPanelSections.elements ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
          </button>
          {centerPanelSections.elements && (
            <div className="pp-editor-platform-list">
              {editorMode === "level" && draftLevel.platforms.map((platform) => (
                <button key={platform.id} type="button" className={`pp-editor-platform-row ${selection?.kind === "platform" && selection.id === platform.id ? "is-active" : ""}`} onClick={() => setSelection({ kind: "platform", id: platform.id })}>
                  <span>{platform.id}</span>
                  <span className="pp-editor-inline-tags">
                    <span className="pp-editor-mini-tag pp-editor-mini-tag--shape">{platform.tetromino}</span>
                    <span className={`pp-editor-mini-tag pp-editor-mini-tag--${platform.type}`}>{platform.type}</span>
                  </span>
                  <span>({platform.x}, {platform.y})</span>
                </button>
              ))}
              {editorMode === "level" && draftLevel.checkpoints.map((checkpoint) => (
                <button key={checkpoint.id} type="button" className={`pp-editor-platform-row ${selection?.kind === "checkpoint" && selection.id === checkpoint.id ? "is-active" : ""}`} onClick={() => setSelection({ kind: "checkpoint", id: checkpoint.id })}>
                  <span>{checkpoint.id}</span>
                  <span className="pp-editor-inline-tags">
                    <span className="pp-editor-mini-tag pp-editor-mini-tag--checkpoint">checkpoint</span>
                  </span>
                  <span>({checkpoint.x}, {checkpoint.y})</span>
                </button>
              ))}
              {editorMode === "level" && draftLevel.orbs.map((orb) => (
                <button key={orb.id} type="button" className={`pp-editor-platform-row ${selection?.kind === "orb" && selection.id === orb.id ? "is-active" : ""}`} onClick={() => setSelection({ kind: "orb", id: orb.id })}>
                  <span>{orb.id}</span>
                  <span className="pp-editor-inline-tags">
                    <span className="pp-editor-mini-tag pp-editor-mini-tag--orb">orb</span>
                    {orb.affinity && orb.affinity !== "standard" && <span className={`pp-editor-mini-tag pp-editor-mini-tag--affinity-${orb.affinity}`}>{orb.affinity}</span>}
                    {orb.grantsSkill && <span className="pp-editor-mini-tag pp-editor-mini-tag--skill">{orb.grantsSkill}</span>}
                  </span>
                  <span>({orb.x}, {orb.y})</span>
                </button>
              ))}
              {editorMode === "level" && draftLevel.enemies.map((enemy) => (
                <button key={enemy.id} type="button" className={`pp-editor-platform-row ${selection?.kind === "enemy" && selection.id === enemy.id ? "is-active" : ""}`} onClick={() => setSelection({ kind: "enemy", id: enemy.id })}>
                  <span>{enemy.id}</span>
                  <span className="pp-editor-inline-tags">
                    <span className={`pp-editor-mini-tag pp-editor-mini-tag--enemy-${enemy.kind}`}>{enemy.kind}</span>
                  </span>
                  <span>({enemy.x}, {enemy.y})</span>
                </button>
              ))}
              {editorMode === "world" && (draftLevel.decorations ?? []).map((decoration) => (
                <button key={decoration.id} type="button" className={`pp-editor-platform-row ${selection?.kind === "decoration" && selection.id === decoration.id ? "is-active" : ""}`} onClick={() => setSelection({ kind: "decoration", id: decoration.id })}>
                  <span>{decoration.id}</span>
                  <span className="pp-editor-inline-tags">
                    <span className="pp-editor-mini-tag pp-editor-mini-tag--decoration">{decoration.type}</span>
                    <span className="pp-editor-mini-tag pp-editor-mini-tag--layer">{decoration.layer ?? "mid"}</span>
                  </span>
                  <span>({decoration.x}, {decoration.y})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {editorMode === "level" && selectedWorldTemplate && (
          <div className="pp-editor-panel pp-editor-subpanel">
            <button type="button" className="pp-editor-panel-toggle" onClick={() => toggleCenterPanelSection("linkedWorld")}>
              <span><i className="fa-solid fa-globe" aria-hidden="true" /> Monde lie</span>
              <i className={`fa-solid ${centerPanelSections.linkedWorld ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
            </button>
            {centerPanelSections.linkedWorld && (
              <div className="pp-editor-platform-list">
                <div className="pp-editor-platform-row is-active">
                  <span>{selectedWorldTemplate.name}</span>
                  <span className="pp-editor-inline-tags">
                    <span className="pp-editor-mini-tag pp-editor-mini-tag--layer">{selectedWorldTemplate.id}</span>
                    <span className="pp-editor-mini-tag pp-editor-mini-tag--decoration">{selectedWorldTemplate.decorations.length} decors</span>
                  </span>
                  <span>
                    {Math.round(selectedWorldTemplate.worldWidth / TILE)}x
                    {Math.round((selectedWorldTemplate.worldHeight ?? WORLD_H) / TILE)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
});
