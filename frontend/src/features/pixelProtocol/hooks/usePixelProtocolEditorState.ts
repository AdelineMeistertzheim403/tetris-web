import { useEffect, useState } from "react";
import {
  CENTER_PANEL_SECTIONS,
  CHECKPOINT_INSPECTOR_SECTIONS,
  DECORATION_INSPECTOR_SECTIONS,
  defaultEditorUiPrefs,
  type DragState,
  type EditorMode,
  type EditorStoredLevel,
  getEditorUiScope,
  ENEMY_INSPECTOR_SECTIONS,
  ORB_INSPECTOR_SECTIONS,
  PLATFORM_INSPECTOR_SECTIONS,
  readEditorUiPrefs,
  type Selection,
  TEMPLATE_BASE,
  withAutoWorldBounds,
  writeEditorUiPrefs,
} from "../editorShared";
import type {
  LevelDef,
  WorldTemplate,
} from "../types";
import { listPixelProtocolWorldTemplates } from "../utils/worldTemplates";
import type { PixelProtocolCommunityLevel } from "../services/pixelProtocolService";

export function usePixelProtocolEditorState(editorMode: EditorMode, isAdmin: boolean) {
  const uiScope = getEditorUiScope(editorMode, isAdmin);

  const [levels, setLevels] = useState<EditorStoredLevel[]>([]);
  const [worldTemplates, setWorldTemplates] = useState<WorldTemplate[]>(() =>
    listPixelProtocolWorldTemplates()
  );
  const [draftLevel, setDraftLevel] = useState<LevelDef>(() =>
    withAutoWorldBounds(TEMPLATE_BASE)
  );
  const [published, setPublished] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewLevel, setPreviewLevel] = useState<LevelDef | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [communityLevels, setCommunityLevels] = useState<PixelProtocolCommunityLevel[]>([]);
  const [editorExpanded, setEditorExpanded] = useState(true);
  const [duplicateOffsetX, setDuplicateOffsetX] = useState(32);
  const [duplicateOffsetY, setDuplicateOffsetY] = useState(32);
  const [duplicateColumns, setDuplicateColumns] = useState(1);
  const [duplicateRows, setDuplicateRows] = useState(1);
  const [duplicateMirrorX, setDuplicateMirrorX] = useState(false);
  const [duplicateMirrorY, setDuplicateMirrorY] = useState(false);
  const [duplicateAlternateMirror, setDuplicateAlternateMirror] = useState(false);
  const [duplicateLayout, setDuplicateLayout] = useState<"grid" | "circle">("grid");
  const [duplicateStartAngle, setDuplicateStartAngle] = useState(0);
  const [duplicateArcAngle, setDuplicateArcAngle] = useState(360);
  const [decorationSourceFilter, setDecorationSourceFilter] =
    useState<"all" | "builtin" | "svg_pack" | "tileset" | "3d">("all");
  const [exampleTemplatesExpanded, setExampleTemplatesExpanded] = useState(
    () => readEditorUiPrefs(uiScope).exampleTemplatesExpanded
  );
  const [savedWorldsExpanded, setSavedWorldsExpanded] = useState(
    () => readEditorUiPrefs(uiScope).savedWorldsExpanded
  );
  const [decorationInspectorSections, setDecorationInspectorSections] = useState<
    Record<(typeof DECORATION_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).decorationInspectorSections);
  const [platformInspectorSections, setPlatformInspectorSections] = useState<
    Record<(typeof PLATFORM_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).platformInspectorSections);
  const [checkpointInspectorSections, setCheckpointInspectorSections] = useState<
    Record<(typeof CHECKPOINT_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).checkpointInspectorSections);
  const [orbInspectorSections, setOrbInspectorSections] = useState<
    Record<(typeof ORB_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).orbInspectorSections);
  const [enemyInspectorSections, setEnemyInspectorSections] = useState<
    Record<(typeof ENEMY_INSPECTOR_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).enemyInspectorSections);
  const [centerPanelSections, setCenterPanelSections] = useState<
    Record<(typeof CENTER_PANEL_SECTIONS)[number], boolean>
  >(() => readEditorUiPrefs(uiScope).centerPanelSections);
  const [exampleSearch, setExampleSearch] = useState("");
  const [exampleSort, setExampleSort] =
    useState<"recent" | "a-z" | "showcase" | "ambiance">("recent");
  useEffect(() => {
    const prefs = readEditorUiPrefs(uiScope);
    setExampleTemplatesExpanded(prefs.exampleTemplatesExpanded);
    setSavedWorldsExpanded(prefs.savedWorldsExpanded);
    setDecorationInspectorSections(prefs.decorationInspectorSections);
    setPlatformInspectorSections(prefs.platformInspectorSections);
    setCheckpointInspectorSections(prefs.checkpointInspectorSections);
    setOrbInspectorSections(prefs.orbInspectorSections);
    setEnemyInspectorSections(prefs.enemyInspectorSections);
    setCenterPanelSections(prefs.centerPanelSections);
  }, [uiScope]);

  useEffect(() => {
    writeEditorUiPrefs(uiScope, {
      exampleTemplatesExpanded,
      savedWorldsExpanded,
      decorationInspectorSections,
      platformInspectorSections,
      checkpointInspectorSections,
      orbInspectorSections,
      enemyInspectorSections,
      centerPanelSections,
    });
  }, [
    uiScope,
    exampleTemplatesExpanded,
    savedWorldsExpanded,
    decorationInspectorSections,
    platformInspectorSections,
    checkpointInspectorSections,
    orbInspectorSections,
    enemyInspectorSections,
    centerPanelSections,
  ]);

  const resetEditorUi = () => {
    const prefs = defaultEditorUiPrefs();
    setExampleTemplatesExpanded(prefs.exampleTemplatesExpanded);
    setSavedWorldsExpanded(prefs.savedWorldsExpanded);
    setDecorationInspectorSections(prefs.decorationInspectorSections);
    setPlatformInspectorSections(prefs.platformInspectorSections);
    setCheckpointInspectorSections(prefs.checkpointInspectorSections);
    setOrbInspectorSections(prefs.orbInspectorSections);
    setEnemyInspectorSections(prefs.enemyInspectorSections);
    setCenterPanelSections(prefs.centerPanelSections);
    setStatus("Interface reinitialisee pour ce mode.");
    setError(null);
  };

  return {
    uiScope,
    levels,
    setLevels,
    worldTemplates,
    setWorldTemplates,
    draftLevel,
    setDraftLevel,
    published,
    setPublished,
    selectedId,
    setSelectedId,
    selection,
    setSelection,
    status,
    setStatus,
    error,
    setError,
    loading,
    setLoading,
    dragState,
    setDragState,
    previewLevel,
    setPreviewLevel,
    previewKey,
    setPreviewKey,
    communityLevels,
    setCommunityLevels,
    editorExpanded,
    setEditorExpanded,
    duplicateOffsetX,
    setDuplicateOffsetX,
    duplicateOffsetY,
    setDuplicateOffsetY,
    duplicateColumns,
    setDuplicateColumns,
    duplicateRows,
    setDuplicateRows,
    duplicateMirrorX,
    setDuplicateMirrorX,
    duplicateMirrorY,
    setDuplicateMirrorY,
    duplicateAlternateMirror,
    setDuplicateAlternateMirror,
    duplicateLayout,
    setDuplicateLayout,
    duplicateStartAngle,
    setDuplicateStartAngle,
    duplicateArcAngle,
    setDuplicateArcAngle,
    decorationSourceFilter,
    setDecorationSourceFilter,
    exampleTemplatesExpanded,
    setExampleTemplatesExpanded,
    savedWorldsExpanded,
    setSavedWorldsExpanded,
    decorationInspectorSections,
    setDecorationInspectorSections,
    platformInspectorSections,
    setPlatformInspectorSections,
    checkpointInspectorSections,
    setCheckpointInspectorSections,
    orbInspectorSections,
    setOrbInspectorSections,
    enemyInspectorSections,
    setEnemyInspectorSections,
    centerPanelSections,
    setCenterPanelSections,
    exampleSearch,
    setExampleSearch,
    exampleSort,
    setExampleSort,
    resetEditorUi,
  };
}
