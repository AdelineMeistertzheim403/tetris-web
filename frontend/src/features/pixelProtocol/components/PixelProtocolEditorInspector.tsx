import { memo } from "react";
import {
  CHECKPOINT_INSPECTOR_SECTIONS,
  DECORATION_INSPECTOR_SECTIONS,
  ENEMY_INSPECTOR_SECTIONS,
  ORB_INSPECTOR_SECTIONS,
  PLATFORM_INSPECTOR_SECTIONS,
  type Selection,
} from "../editorShared";
import {
  MOVING_DEFAULT_AXIS,
  MOVING_DEFAULT_PATTERN,
  MOVING_DEFAULT_RANGE_TILES,
  MOVING_DEFAULT_SPEED,
} from "../constants";
import {
  DECORATION_CATEGORY_ORDER,
  PixelProtocolDecoration,
  getDecorationPreset,
} from "../decorations";
import type {
  Checkpoint,
  DecorationAnimation,
  DecorationDef,
  DecorationLayer,
  DataOrb,
  DataOrbAffinity,
  DecorationType,
  Enemy,
  PixelSkill,
  PlatformDef,
  PlatformType,
  Tetromino,
} from "../types";

const DEFAULT_ROTATE_EVERY_MS = 1800;

function decorationCategoryLabel(category: string) {
  if (category === "three_d") return "3D";
  return category;
}

function decorationSourceMeta(
  source: "all" | "builtin" | "svg_pack" | "tileset" | "3d"
) {
  switch (source) {
    case "all":
      return { icon: "fa-globe", label: "Toutes les sources" };
    case "builtin":
      return { icon: "fa-wand-magic-sparkles", label: "Décors intégrés" };
    case "svg_pack":
      return { icon: "fa-bezier-curve", label: "Pack SVG" };
    case "3d":
      return { icon: "fa-cubes", label: "Décors 3D" };
    case "tileset":
      return { icon: "fa-table-cells-large", label: "Tileset" };
  }
}

function applyParallaxPreset(
  preset: "off" | "subtle" | "medium" | "deep",
  decoration: DecorationDef
): DecorationDef {
  switch (preset) {
    case "off":
      return {
        ...decoration,
        parallaxEnabled: false,
      };
    case "subtle":
      return {
        ...decoration,
        parallaxEnabled: true,
        parallaxX: 0.82,
        parallaxY: 0.72,
      };
    case "medium":
      return {
        ...decoration,
        parallaxEnabled: true,
        parallaxX: 0.62,
        parallaxY: 0.48,
      };
    case "deep":
      return {
        ...decoration,
        parallaxEnabled: true,
        parallaxX: 0.32,
        parallaxY: 0.18,
      };
  }
}

function parallaxPresetMeta(preset: "off" | "subtle" | "medium" | "deep") {
  switch (preset) {
    case "off":
      return { icon: "fa-ban", label: "Parallax désactivé" };
    case "subtle":
      return { icon: "fa-align-left", label: "Parallax subtil" };
    case "medium":
      return { icon: "fa-align-center", label: "Parallax moyen" };
    case "deep":
      return { icon: "fa-align-right", label: "Parallax profond" };
  }
}

function isParallaxPresetActive(
  preset: "off" | "subtle" | "medium" | "deep",
  decoration: DecorationDef
) {
  if (preset === "off") {
    return decoration.parallaxEnabled === false;
  }

  if (decoration.parallaxEnabled === false) return false;

  const currentX = decoration.parallaxX;
  const currentY = decoration.parallaxY;

  switch (preset) {
    case "subtle":
      return currentX === 0.82 && currentY === 0.72;
    case "medium":
      return currentX === 0.62 && currentY === 0.48;
    case "deep":
      return currentX === 0.32 && currentY === 0.18;
    default:
      return false;
  }
}

type PixelProtocolEditorInspectorProps = {
  editorMode: "level" | "world";
  selection: Selection;
  selectedSpawn: boolean;
  selectedPortal: boolean;
  selectedPlatform: PlatformDef | null;
  selectedCheckpoint: Checkpoint | null;
  selectedOrb: DataOrb | null;
  selectedEnemy: Enemy | null;
  selectedDecoration: DecorationDef | null;
  selectedDecorationUsesEmbeddedArtwork: boolean;
  platformInspectorSections: Record<(typeof PLATFORM_INSPECTOR_SECTIONS)[number], boolean>;
  checkpointInspectorSections: Record<(typeof CHECKPOINT_INSPECTOR_SECTIONS)[number], boolean>;
  orbInspectorSections: Record<(typeof ORB_INSPECTOR_SECTIONS)[number], boolean>;
  enemyInspectorSections: Record<(typeof ENEMY_INSPECTOR_SECTIONS)[number], boolean>;
  decorationInspectorSections: Record<(typeof DECORATION_INSPECTOR_SECTIONS)[number], boolean>;
  tetrominos: Tetromino[];
  platformTypes: PlatformType[];
  movingAxes: readonly ("x" | "y")[];
  movingPatterns: readonly ("pingpong" | "loop")[];
  orbAffinities: DataOrbAffinity[];
  pixelSkills: PixelSkill[];
  decorationLayers: DecorationLayer[];
  decorationAnimations: DecorationAnimation[];
  decorationSources: readonly ("all" | "builtin" | "svg_pack" | "tileset" | "3d")[];
  filteredDecorationPresets: Array<{ type: DecorationType; label: string; category: string }>;
  decorationSourceFilter: "all" | "builtin" | "svg_pack" | "tileset" | "3d";
  duplicateOffsetX: number;
  setDuplicateOffsetX: (value: number) => void;
  duplicateOffsetY: number;
  setDuplicateOffsetY: (value: number) => void;
  duplicateColumns: number;
  setDuplicateColumns: (value: number) => void;
  duplicateRows: number;
  setDuplicateRows: (value: number) => void;
  duplicateLayout: "grid" | "circle";
  setDuplicateLayout: (value: "grid" | "circle") => void;
  duplicateStartAngle: number;
  setDuplicateStartAngle: (value: number) => void;
  duplicateArcAngle: number;
  setDuplicateArcAngle: (value: number) => void;
  duplicateMirrorX: boolean;
  setDuplicateMirrorX: (value: boolean) => void;
  duplicateMirrorY: boolean;
  setDuplicateMirrorY: (value: boolean) => void;
  duplicateAlternateMirror: boolean;
  setDuplicateAlternateMirror: (value: boolean) => void;
  duplicatePreviewCount: number;
  setDecorationSourceFilter: (value: "all" | "builtin" | "svg_pack" | "tileset" | "3d") => void;
  setAllInspectorSections: (expanded: boolean) => void;
  togglePlatformInspectorSection: (
    section: (typeof PLATFORM_INSPECTOR_SECTIONS)[number]
  ) => void;
  toggleCheckpointInspectorSection: (
    section: (typeof CHECKPOINT_INSPECTOR_SECTIONS)[number]
  ) => void;
  toggleOrbInspectorSection: (section: (typeof ORB_INSPECTOR_SECTIONS)[number]) => void;
  toggleEnemyInspectorSection: (section: (typeof ENEMY_INSPECTOR_SECTIONS)[number]) => void;
  toggleDecorationInspectorSection: (
    section: (typeof DECORATION_INSPECTOR_SECTIONS)[number]
  ) => void;
  handleSelectedPlatformChange: (updater: (platform: PlatformDef) => PlatformDef) => void;
  handleSelectedCheckpointChange: (updater: (checkpoint: Checkpoint) => Checkpoint) => void;
  handleSelectedOrbChange: (updater: (orb: DataOrb) => DataOrb) => void;
  handleSelectedEnemyChange: (updater: (enemy: Enemy) => Enemy) => void;
  handleSelectedDecorationChange: (updater: (decoration: DecorationDef) => DecorationDef) => void;
  handleDuplicateDecoration: () => void;
};

export const PixelProtocolEditorInspector = memo(function PixelProtocolEditorInspector(
  props: PixelProtocolEditorInspectorProps
) {
  const {
    editorMode,
    selection,
    selectedSpawn,
    selectedPortal,
    selectedPlatform,
    selectedCheckpoint,
    selectedOrb,
    selectedEnemy,
    selectedDecoration,
    selectedDecorationUsesEmbeddedArtwork,
    platformInspectorSections,
    checkpointInspectorSections,
    orbInspectorSections,
    enemyInspectorSections,
    decorationInspectorSections,
    tetrominos,
    platformTypes,
    movingAxes,
    movingPatterns,
    orbAffinities,
    pixelSkills,
    decorationLayers,
    decorationAnimations,
    decorationSources,
    filteredDecorationPresets,
    decorationSourceFilter,
    duplicateOffsetX,
    setDuplicateOffsetX,
    duplicateOffsetY,
    setDuplicateOffsetY,
    duplicateColumns,
    setDuplicateColumns,
    duplicateRows,
    setDuplicateRows,
    duplicateLayout,
    setDuplicateLayout,
    duplicateStartAngle,
    setDuplicateStartAngle,
    duplicateArcAngle,
    setDuplicateArcAngle,
    duplicateMirrorX,
    setDuplicateMirrorX,
    duplicateMirrorY,
    setDuplicateMirrorY,
    duplicateAlternateMirror,
    setDuplicateAlternateMirror,
    duplicatePreviewCount,
    setDecorationSourceFilter,
    setAllInspectorSections,
    togglePlatformInspectorSection,
    toggleCheckpointInspectorSection,
    toggleOrbInspectorSection,
    toggleEnemyInspectorSection,
    toggleDecorationInspectorSection,
    handleSelectedPlatformChange,
    handleSelectedCheckpointChange,
    handleSelectedOrbChange,
    handleSelectedEnemyChange,
    handleSelectedDecorationChange,
    handleDuplicateDecoration,
  } = props;

  return (
    <aside className="pp-editor-inspector">
      <div className="pp-editor-panel pp-editor-subpanel">
        <div className="pp-editor-inspector-head">
          <h2>Selection</h2>
          {(selectedPlatform || selectedCheckpoint || selectedOrb || selectedEnemy || selectedDecoration) && (
            <div className="pp-editor-inspector-actions">
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--info"
                aria-label="Tout ouvrir"
                title="Tout ouvrir"
                onClick={() => setAllInspectorSections(true)}
              >
                <i className="fa-solid fa-angles-down" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--info"
                aria-label="Tout fermer"
                title="Tout fermer"
                onClick={() => setAllInspectorSections(false)}
              >
                <i className="fa-solid fa-angles-up" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {selectedPlatform && (
          <>
            <div className="pp-editor-code">{selectedPlatform.id}</div>
            <div className="pp-editor-inspector-groups">
              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => togglePlatformInspectorSection("shape")}
                >
                  <span><i className="fa-solid fa-cubes" aria-hidden="true" /> Forme & type</span>
                  <i className={`fa-solid ${platformInspectorSections.shape ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {platformInspectorSections.shape && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-chip-grid pp-editor-chip-grid--tetrominos">
                      {tetrominos.map((tetromino) => (
                        <button
                          key={tetromino}
                          type="button"
                          className={selectedPlatform.tetromino === tetromino ? "is-active" : ""}
                          onClick={() => handleSelectedPlatformChange((platform) => ({ ...platform, tetromino }))}
                        >
                          {tetromino}
                        </button>
                      ))}
                    </div>
                    <div className="pp-editor-chip-grid pp-editor-chip-grid--platform-types">
                      {platformTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          className={`pp-editor-chip-grid__button ${selectedPlatform.type === type ? "is-active" : ""}`}
                          onClick={() =>
                            handleSelectedPlatformChange((platform) => ({
                              ...platform,
                              type,
                              rotateEveryMs:
                                type === "rotating"
                                  ? platform.rotateEveryMs ?? DEFAULT_ROTATE_EVERY_MS
                                  : platform.rotateEveryMs,
                              moveAxis: type === "moving" ? platform.moveAxis ?? MOVING_DEFAULT_AXIS : platform.moveAxis,
                              movePattern:
                                type === "moving" ? platform.movePattern ?? MOVING_DEFAULT_PATTERN : platform.movePattern,
                              moveRangeTiles:
                                type === "moving" ? platform.moveRangeTiles ?? MOVING_DEFAULT_RANGE_TILES : platform.moveRangeTiles,
                              moveSpeed:
                                type === "moving" ? platform.moveSpeed ?? MOVING_DEFAULT_SPEED : platform.moveSpeed,
                            }))
                          }
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => togglePlatformInspectorSection("layout")}
                >
                  <span><i className="fa-solid fa-up-down-left-right" aria-hidden="true" /> Position & rotation</span>
                  <i className={`fa-solid ${platformInspectorSections.layout ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {platformInspectorSections.layout && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-chip-grid pp-editor-chip-grid--small">
                      {[0, 1, 2, 3].map((rotation) => (
                        <button
                          key={rotation}
                          type="button"
                          className={(selectedPlatform.rotation ?? 0) === rotation ? "is-active" : ""}
                          onClick={() =>
                            handleSelectedPlatformChange((platform) => ({
                              ...platform,
                              rotation: rotation as 0 | 1 | 2 | 3,
                            }))
                          }
                        >
                          Rot {rotation}
                        </button>
                      ))}
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>X</span>
                        <input
                          type="number"
                          value={selectedPlatform.x}
                          onChange={(event) =>
                            handleSelectedPlatformChange((platform) => ({ ...platform, x: Number(event.target.value) || 0 }))
                          }
                        />
                      </label>
                      <label>
                        <span>Y</span>
                        <input
                          type="number"
                          value={selectedPlatform.y}
                          onChange={(event) =>
                            handleSelectedPlatformChange((platform) => ({ ...platform, y: Number(event.target.value) || 0 }))
                          }
                        />
                      </label>
                    </div>
                    {selectedPlatform.type === "rotating" && (
                      <div className="pp-editor-inline-fields">
                        <label>
                          <span>Rotation ms</span>
                          <input
                            type="number"
                            min={100}
                            step={10}
                            value={selectedPlatform.rotateEveryMs ?? DEFAULT_ROTATE_EVERY_MS}
                            onChange={(event) =>
                              handleSelectedPlatformChange((platform) => ({
                                ...platform,
                                rotateEveryMs: Math.max(100, Number(event.target.value) || DEFAULT_ROTATE_EVERY_MS),
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => togglePlatformInspectorSection("behavior")}
                >
                  <span><i className="fa-solid fa-sliders" aria-hidden="true" /> Comportement</span>
                  <i className={`fa-solid ${platformInspectorSections.behavior ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {platformInspectorSections.behavior && (
                  <div className="pp-editor-inspector-group__body">
                    {selectedPlatform.type === "moving" ? (
                      <>
                        <div className="pp-editor-inline-fields">
                          <label>
                            <span>Axe</span>
                            <select
                              value={selectedPlatform.moveAxis ?? MOVING_DEFAULT_AXIS}
                              onChange={(event) =>
                                handleSelectedPlatformChange((platform) => ({
                                  ...platform,
                                  moveAxis: event.target.value as (typeof movingAxes)[number],
                                }))
                              }
                            >
                              {movingAxes.map((axis) => (
                                <option key={axis} value={axis}>
                                  {axis}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Pattern</span>
                            <select
                              value={selectedPlatform.movePattern ?? MOVING_DEFAULT_PATTERN}
                              onChange={(event) =>
                                handleSelectedPlatformChange((platform) => ({
                                  ...platform,
                                  movePattern: event.target.value as (typeof movingPatterns)[number],
                                }))
                              }
                            >
                              {movingPatterns.map((pattern) => (
                                <option key={pattern} value={pattern}>
                                  {pattern}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="pp-editor-inline-fields">
                          <label>
                            <span>Portee (tuiles)</span>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={selectedPlatform.moveRangeTiles ?? MOVING_DEFAULT_RANGE_TILES}
                              onChange={(event) =>
                                handleSelectedPlatformChange((platform) => ({
                                  ...platform,
                                  moveRangeTiles: Math.max(1, Number(event.target.value) || MOVING_DEFAULT_RANGE_TILES),
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Vitesse (px/s)</span>
                            <input
                              type="number"
                              min={20}
                              max={420}
                              value={selectedPlatform.moveSpeed ?? MOVING_DEFAULT_SPEED}
                              onChange={(event) =>
                                handleSelectedPlatformChange((platform) => ({
                                  ...platform,
                                  moveSpeed: Math.max(20, Number(event.target.value) || MOVING_DEFAULT_SPEED),
                                }))
                              }
                            />
                          </label>
                        </div>
                      </>
                    ) : (
                      <p className="pp-editor-muted">
                        Aucun parametre avance necessaire pour ce type de plateforme.
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {selectedSpawn && (
          <>
            <div className="pp-editor-code">spawn</div>
            <p className="pp-editor-muted">
              Point de depart du joueur. Deplace-le sur la grille ou via les champs globaux.
            </p>
          </>
        )}

        {selectedPortal && (
          <>
            <div className="pp-editor-code">portal</div>
            <p className="pp-editor-muted">
              Portail de fin de niveau. Deplace-le sur la grille ou via les champs globaux.
            </p>
          </>
        )}

        {selectedCheckpoint && (
          <>
            <div className="pp-editor-code">{selectedCheckpoint.id}</div>
            <div className="pp-editor-inspector-groups">
              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleCheckpointInspectorSection("position")}
                >
                  <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Position</span>
                  <i className={`fa-solid ${checkpointInspectorSections.position ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {checkpointInspectorSections.position && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>X</span>
                        <input
                          type="number"
                          value={selectedCheckpoint.x}
                          onChange={(event) =>
                            handleSelectedCheckpointChange((checkpoint) => ({
                              ...checkpoint,
                              x: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Y</span>
                        <input
                          type="number"
                          value={selectedCheckpoint.y}
                          onChange={(event) =>
                            handleSelectedCheckpointChange((checkpoint) => ({
                              ...checkpoint,
                              y: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleCheckpointInspectorSection("respawn")}
                >
                  <span><i className="fa-solid fa-flag-checkered" aria-hidden="true" /> Respawn</span>
                  <i className={`fa-solid ${checkpointInspectorSections.respawn ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {checkpointInspectorSections.respawn && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Spawn X</span>
                        <input
                          type="number"
                          value={selectedCheckpoint.spawnX}
                          onChange={(event) =>
                            handleSelectedCheckpointChange((checkpoint) => ({
                              ...checkpoint,
                              spawnX: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Spawn Y</span>
                        <input
                          type="number"
                          value={selectedCheckpoint.spawnY}
                          onChange={(event) =>
                            handleSelectedCheckpointChange((checkpoint) => ({
                              ...checkpoint,
                              spawnY: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {selectedOrb && (
          <>
            <div className="pp-editor-code">{selectedOrb.id}</div>
            <div className="pp-editor-inspector-groups">
              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleOrbInspectorSection("position")}
                >
                  <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Position</span>
                  <i className={`fa-solid ${orbInspectorSections.position ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {orbInspectorSections.position && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>X</span>
                        <input
                          type="number"
                          value={selectedOrb.x}
                          onChange={(event) =>
                            handleSelectedOrbChange((orb) => ({
                              ...orb,
                              x: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Y</span>
                        <input
                          type="number"
                          value={selectedOrb.y}
                          onChange={(event) =>
                            handleSelectedOrbChange((orb) => ({
                              ...orb,
                              y: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleOrbInspectorSection("ability")}
                >
                  <span><i className="fa-solid fa-circle-nodes" aria-hidden="true" /> Affinite & skill</span>
                  <i className={`fa-solid ${orbInspectorSections.ability ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {orbInspectorSections.ability && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Affinite</span>
                        <select
                          value={selectedOrb.affinity ?? "standard"}
                          onChange={(event) =>
                            handleSelectedOrbChange((orb) => ({
                              ...orb,
                              affinity: event.target.value as DataOrbAffinity,
                              grantsSkill: event.target.value === "standard" ? null : orb.grantsSkill ?? "OVERJUMP",
                            }))
                          }
                        >
                          {orbAffinities.map((affinity) => (
                            <option key={affinity} value={affinity}>
                              {affinity}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Skill</span>
                        <select
                          value={selectedOrb.grantsSkill ?? ""}
                          onChange={(event) =>
                            handleSelectedOrbChange((orb) => ({
                              ...orb,
                              grantsSkill: event.target.value ? (event.target.value as PixelSkill) : null,
                            }))
                          }
                        >
                          <option value="">aucune</option>
                          {pixelSkills.map((skill) => (
                            <option key={skill} value={skill}>
                              {skill}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {selectedEnemy && (
          <>
            <div className="pp-editor-code">{selectedEnemy.id}</div>
            <div className="pp-editor-inspector-groups">
              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleEnemyInspectorSection("type")}
                >
                  <span><i className="fa-solid fa-robot" aria-hidden="true" /> Type</span>
                  <i className={`fa-solid ${enemyInspectorSections.type ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {enemyInspectorSections.type && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-chip-grid pp-editor-chip-grid--small">
                      {(["rookie", "pulse", "apex"] as const).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          className={selectedEnemy.kind === kind ? "is-active" : ""}
                          onClick={() => handleSelectedEnemyChange((enemy) => ({ ...enemy, kind }))}
                        >
                          {kind}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleEnemyInspectorSection("position")}
                >
                  <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Position</span>
                  <i className={`fa-solid ${enemyInspectorSections.position ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {enemyInspectorSections.position && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>X</span>
                        <input
                          type="number"
                          value={selectedEnemy.x}
                          onChange={(event) =>
                            handleSelectedEnemyChange((enemy) => ({
                              ...enemy,
                              x: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Y</span>
                        <input
                          type="number"
                          value={selectedEnemy.y}
                          onChange={(event) =>
                            handleSelectedEnemyChange((enemy) => ({
                              ...enemy,
                              y: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleEnemyInspectorSection("patrol")}
                >
                  <span><i className="fa-solid fa-ruler-horizontal" aria-hidden="true" /> Patrouille</span>
                  <i className={`fa-solid ${enemyInspectorSections.patrol ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {enemyInspectorSections.patrol && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Min X</span>
                        <input
                          type="number"
                          value={selectedEnemy.minX}
                          onChange={(event) =>
                            handleSelectedEnemyChange((enemy) => ({
                              ...enemy,
                              minX: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Max X</span>
                        <input
                          type="number"
                          value={selectedEnemy.maxX}
                          onChange={(event) =>
                            handleSelectedEnemyChange((enemy) => ({
                              ...enemy,
                              maxX: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {editorMode === "world" && selectedDecoration && (
          <>
            <div className="pp-editor-code">{selectedDecoration.id}</div>
            <div className="pp-editor-decoration-preview-card">
              <PixelProtocolDecoration
                decoration={{
                  ...selectedDecoration,
                  x: 0,
                  y: 0,
                  width: 96,
                  height: 96,
                }}
              />
            </div>
            <div className="pp-editor-inspector-groups">
              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleDecorationInspectorSection("source")}
                >
                  <span><i className="fa-solid fa-shapes" aria-hidden="true" /> Source & type</span>
                  <i className={`fa-solid ${decorationInspectorSections.source ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {decorationInspectorSections.source && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Source</span>
                        <div className="pp-editor-source-filter-row">
                          {decorationSources.map((source) => {
                            const meta = decorationSourceMeta(source);
                            return (
                              <button
                                key={source}
                                type="button"
                                className={`pp-editor-source-filter-btn ${decorationSourceFilter === source ? "is-active" : ""}`}
                                onClick={() => setDecorationSourceFilter(source)}
                                aria-label={meta.label}
                                title={meta.label}
                                data-tooltip={meta.label}
                              >
                                <i className={`fa-solid ${meta.icon}`} aria-hidden="true" />
                              </button>
                            );
                          })}
                        </div>
                      </label>
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Type</span>
                        <select
                          value={selectedDecoration.type}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => {
                              const nextType = event.target.value as DecorationType;
                              const preset = getDecorationPreset(nextType);
                              return {
                                ...decoration,
                                type: nextType,
                                width: decoration.width || preset.defaultWidth,
                                height: decoration.height || preset.defaultHeight,
                                color: decoration.color ?? preset.color,
                                colorSecondary: decoration.colorSecondary ?? preset.colorSecondary,
                              };
                            })
                          }
                        >
                          {DECORATION_CATEGORY_ORDER.map((category) => (
                            <optgroup key={category} label={decorationCategoryLabel(category)}>
                              {filteredDecorationPresets
                                .filter((preset) => preset.category === category)
                                .map((preset) => (
                                  <option key={preset.type} value={preset.type}>
                                    {preset.label}
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Layer</span>
                        <select
                          value={selectedDecoration.layer ?? "mid"}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              layer: event.target.value as DecorationLayer,
                            }))
                          }
                        >
                          {decorationLayers.map((layer) => (
                            <option key={layer} value={layer}>
                              {layer}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleDecorationInspectorSection("transform")}
                >
                  <span><i className="fa-solid fa-up-down-left-right" aria-hidden="true" /> Transform</span>
                  <i className={`fa-solid ${decorationInspectorSections.transform ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {decorationInspectorSections.transform && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>X</span>
                        <input
                          type="number"
                          value={selectedDecoration.x}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              x: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Y</span>
                        <input
                          type="number"
                          value={selectedDecoration.y}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              y: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Largeur</span>
                        <input
                          type="number"
                          min={4}
                          value={selectedDecoration.width}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              width: Math.max(4, Number(event.target.value) || 4),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Hauteur</span>
                        <input
                          type="number"
                          min={4}
                          value={selectedDecoration.height}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              height: Math.max(4, Number(event.target.value) || 4),
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Rotation</span>
                        <input
                          type="number"
                          min={-360}
                          max={360}
                          value={selectedDecoration.rotation ?? 0}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              rotation: Number(event.target.value) || 0,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Opacite</span>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.05}
                          value={selectedDecoration.opacity ?? 0.9}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              opacity: Math.min(1, Math.max(0, Number(event.target.value) || 0)),
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleDecorationInspectorSection("style")}
                >
                  <span><i className="fa-solid fa-palette" aria-hidden="true" /> Couleurs & style</span>
                  <i className={`fa-solid ${decorationInspectorSections.style ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {decorationInspectorSections.style && (
                  <div className="pp-editor-inspector-group__body">
                    {selectedDecorationUsesEmbeddedArtwork && (
                      <p className="pp-editor-muted">
                        Asset integre: les couleurs proviennent directement du fichier source.
                      </p>
                    )}
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Couleur</span>
                        <input
                          type="color"
                          disabled={selectedDecorationUsesEmbeddedArtwork}
                          value={selectedDecoration.color ?? "#00ffff"}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              color: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Couleur 2</span>
                        <input
                          type="color"
                          disabled={selectedDecorationUsesEmbeddedArtwork}
                          value={selectedDecoration.colorSecondary ?? "#ff00ff"}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              colorSecondary: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleDecorationInspectorSection("animation")}
                >
                  <span><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Animation & symetrie</span>
                  <i className={`fa-solid ${decorationInspectorSections.animation ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {decorationInspectorSections.animation && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Animation</span>
                        <select
                          value={selectedDecoration.animation ?? "none"}
                          onChange={(event) =>
                            handleSelectedDecorationChange((decoration) => ({
                              ...decoration,
                              animation: event.target.value as DecorationAnimation,
                            }))
                          }
                        >
                          {decorationAnimations.map((animation) => (
                            <option key={animation} value={animation}>
                              {animation}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Symetrie</span>
                        <div className="pp-editor-inline-checkboxes">
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(selectedDecoration.flipX)}
                              onChange={(event) =>
                                handleSelectedDecorationChange((decoration) => ({
                                  ...decoration,
                                  flipX: event.target.checked,
                                }))
                              }
                            />
                            Flip X
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(selectedDecoration.flipY)}
                              onChange={(event) =>
                                handleSelectedDecorationChange((decoration) => ({
                                  ...decoration,
                                  flipY: event.target.checked,
                                }))
                              }
                            />
                            Flip Y
                          </label>
                        </div>
                      </label>
                    </div>
                    {selectedDecoration.animation && selectedDecoration.animation !== "none" && (
                      <div className="pp-editor-inline-fields">
                        <label>
                          <span>Vitesse</span>
                          <input
                            type="number"
                            min={0.1}
                            max={4}
                            step={0.1}
                            value={selectedDecoration.animationSpeed ?? 1}
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                animationSpeed: Math.max(0.1, Number(event.target.value) || 1),
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Delai</span>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            value={selectedDecoration.animationDelay ?? 0}
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                animationDelay: Math.max(0, Number(event.target.value) || 0),
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                    {selectedDecoration.animation && selectedDecoration.animation !== "none" && (
                      <div className="pp-editor-inline-fields">
                        <label>
                          <span>Intensite</span>
                          <input
                            type="number"
                            min={0}
                            max={3}
                            step={0.1}
                            value={selectedDecoration.animationIntensity ?? 1}
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                animationIntensity: Math.max(0, Number(event.target.value) || 1),
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                    {selectedDecoration.animation === "flow" && (
                      <div className="pp-editor-inline-fields">
                        <label>
                          <span>Direction</span>
                          <select
                            value={selectedDecoration.animationDirection ?? "x"}
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                animationDirection: event.target.value as
                                  | "x"
                                  | "y"
                                  | "diag-up"
                                  | "diag-down",
                              }))
                            }
                          >
                            <option value="x">Horizontal</option>
                            <option value="y">Vertical</option>
                            <option value="diag-up">Diagonale haut</option>
                            <option value="diag-down">Diagonale bas</option>
                          </select>
                        </label>
                      </div>
                    )}
                    {selectedDecoration.animation === "pulse" && (
                      <div className="pp-editor-inline-fields">
                        <label>
                          <span>Pulse scale</span>
                          <input
                            type="number"
                            min={1}
                            max={2}
                            step={0.01}
                            value={selectedDecoration.animationPulseScale ?? 1.05}
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                animationPulseScale: Math.max(1, Number(event.target.value) || 1.05),
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                    {selectedDecoration.animation === "glitch" && (
                      <div className="pp-editor-inline-fields">
                        <label>
                          <span>Jitter X</span>
                          <input
                            type="number"
                            min={0}
                            max={12}
                            step={0.5}
                            value={selectedDecoration.animationJitterX ?? 1}
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                animationJitterX: Math.max(0, Number(event.target.value) || 1),
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Jitter Y</span>
                          <input
                            type="number"
                            min={0}
                            max={12}
                            step={0.5}
                            value={selectedDecoration.animationJitterY ?? 1}
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                animationJitterY: Math.max(0, Number(event.target.value) || 1),
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                    {selectedDecoration.animation === "glitch" && (
                      <div className="pp-editor-inline-fields">
                        <label>
                          <span>Hue shift</span>
                          <input
                            type="number"
                            min={0}
                            max={180}
                            step={1}
                            value={selectedDecoration.animationHueShift ?? 24}
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                animationHueShift: Math.max(0, Number(event.target.value) || 24),
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Parallax</span>
                        <div className="pp-editor-inline-checkboxes">
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedDecoration.parallaxEnabled !== false}
                              onChange={(event) =>
                                handleSelectedDecorationChange((decoration) => ({
                                  ...decoration,
                                  parallaxEnabled: event.target.checked,
                                }))
                              }
                            />
                            {selectedDecoration.parallaxEnabled !== false ? "Actif" : "Inactif"}
                          </label>
                        </div>
                      </label>
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Presets</span>
                        <div className="pp-editor-parallax-preset-row">
                          {(["off", "subtle", "medium", "deep"] as const).map((preset) => {
                            const meta = parallaxPresetMeta(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                className={`pp-editor-chip-grid__button pp-editor-icon-chip ${
                                  isParallaxPresetActive(preset, selectedDecoration)
                                    ? "is-active"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleSelectedDecorationChange((decoration) =>
                                    applyParallaxPreset(preset, decoration)
                                  )
                                }
                                aria-label={meta.label}
                                title={meta.label}
                                data-tooltip={meta.label}
                              >
                                <i className={`fa-solid ${meta.icon}`} aria-hidden="true" />
                              </button>
                            );
                          })}
                        </div>
                      </label>
                    </div>
                    {selectedDecoration.parallaxEnabled !== false && (
                      <div className="pp-editor-inline-fields">
                        <label>
                          <span>Parallax X</span>
                          <input
                            type="number"
                            min={0}
                            max={1.5}
                            step={0.05}
                            value={selectedDecoration.parallaxX ?? ""}
                            placeholder="auto"
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                parallaxX:
                                  event.target.value === ""
                                    ? undefined
                                    : Math.max(0, Number(event.target.value) || 0),
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Parallax Y</span>
                          <input
                            type="number"
                            min={0}
                            max={1.5}
                            step={0.05}
                            value={selectedDecoration.parallaxY ?? ""}
                            placeholder="auto"
                            onChange={(event) =>
                              handleSelectedDecorationChange((decoration) => ({
                                ...decoration,
                                parallaxY:
                                  event.target.value === ""
                                    ? undefined
                                    : Math.max(0, Number(event.target.value) || 0),
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="pp-editor-inspector-group">
                <button
                  type="button"
                  className="pp-editor-inspector-group__toggle"
                  onClick={() => toggleDecorationInspectorSection("duplication")}
                >
                  <span><i className="fa-solid fa-clone" aria-hidden="true" /> Duplication</span>
                  <i className={`fa-solid ${decorationInspectorSections.duplication ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
                </button>
                {decorationInspectorSections.duplication && (
                  <div className="pp-editor-inspector-group__body">
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Duplication X</span>
                        <input
                          type="number"
                          value={duplicateOffsetX}
                          onChange={(event) => setDuplicateOffsetX(Math.round(Number(event.target.value) || 0))}
                        />
                      </label>
                      <label>
                        <span>Duplication Y</span>
                        <input
                          type="number"
                          value={duplicateOffsetY}
                          onChange={(event) => setDuplicateOffsetY(Math.round(Number(event.target.value) || 0))}
                        />
                      </label>
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Colonnes</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={duplicateColumns}
                          onChange={(event) =>
                            setDuplicateColumns(Math.min(20, Math.max(1, Math.round(Number(event.target.value) || 1))))
                          }
                        />
                      </label>
                      <label>
                        <span>Lignes</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={duplicateRows}
                          onChange={(event) =>
                            setDuplicateRows(Math.min(20, Math.max(1, Math.round(Number(event.target.value) || 1))))
                          }
                        />
                      </label>
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Mode</span>
                        <select
                          value={duplicateLayout}
                          onChange={(event) => setDuplicateLayout((event.target.value as "grid" | "circle") ?? "grid")}
                        >
                          <option value="grid">Grille</option>
                          <option value="circle">Cercle</option>
                        </select>
                      </label>
                      {duplicateLayout === "circle" && (
                        <label>
                          <span>Angle depart</span>
                          <input
                            type="number"
                            min={-360}
                            max={360}
                            value={duplicateStartAngle}
                            onChange={(event) =>
                              setDuplicateStartAngle(Math.max(-360, Math.min(360, Math.round(Number(event.target.value) || 0))))
                            }
                          />
                        </label>
                      )}
                      {duplicateLayout === "circle" && (
                        <label>
                          <span>Arc</span>
                          <input
                            type="number"
                            min={1}
                            max={360}
                            value={duplicateArcAngle}
                            onChange={(event) =>
                              setDuplicateArcAngle(Math.max(1, Math.min(360, Math.round(Number(event.target.value) || 360))))
                            }
                          />
                        </label>
                      )}
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Miroir</span>
                        <div className="pp-editor-inline-checkboxes">
                          <label>
                            <input
                              type="checkbox"
                              checked={duplicateMirrorX}
                              onChange={(event) => setDuplicateMirrorX(event.target.checked)}
                            />
                            X
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={duplicateMirrorY}
                              onChange={(event) => setDuplicateMirrorY(event.target.checked)}
                            />
                            Y
                          </label>
                        </div>
                      </label>
                      <label>
                        <span>Alterne</span>
                        <div className="pp-editor-inline-checkboxes">
                          <label>
                            <input
                              type="checkbox"
                              checked={duplicateAlternateMirror}
                              onChange={(event) => setDuplicateAlternateMirror(event.target.checked)}
                            />
                            Miroir 1/2
                          </label>
                        </div>
                      </label>
                      <label>
                        <span>Apercu</span>
                        <div className="pp-editor-duplicate-shortcut">{duplicatePreviewCount} copie(s)</div>
                      </label>
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Action</span>
                        <button
                          type="button"
                          className="pp-editor-duplicate-action"
                          onClick={handleDuplicateDecoration}
                        >
                          Dupliquer
                        </button>
                      </label>
                      <label>
                        <span>Raccourci</span>
                        <div className="pp-editor-duplicate-shortcut">Ctrl/Cmd + D</div>
                      </label>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {!selection && <p className="pp-editor-muted">Selectionne un element sur la grille.</p>}
      </div>
    </aside>
  );
});
