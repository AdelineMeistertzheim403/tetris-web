import { useCallback, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PixelProtocolDraftPreview } from "../components/PixelProtocolDraftPreview";
import { PixelProtocolEditorHeader } from "../components/PixelProtocolEditorHeader";
import { PixelProtocolEditorForm } from "../components/PixelProtocolEditorForm";
import { PixelProtocolEditorInspector } from "../components/PixelProtocolEditorInspector";
import { PixelProtocolEditorSidebar } from "../components/PixelProtocolEditorSidebar";
import { PixelProtocolEditorWorkbench } from "../components/PixelProtocolEditorWorkbench";
import {
  CENTER_PANEL_SECTIONS,
  CHECKPOINT_INSPECTOR_SECTIONS,
  DECORATION_INSPECTOR_SECTIONS,
  ENEMY_INSPECTOR_SECTIONS,
  type EditorMode,
  ORB_INSPECTOR_SECTIONS,
  PLATFORM_INSPECTOR_SECTIONS,
  getLevelWorldHeight,
  getLevelWorldTopPadding,
  levelFromWorldTemplate,
  worldTemplateFromLevel,
  TEMPLATE_BASE,
  withAutoWorldBounds,
  type DragState,
} from "../editorShared";
import { TILE, WORLD_H } from "../constants";
import {
  DECORATION_PRESETS,
  decorationLayerOrder,
  usesEmbeddedDecorationArtwork,
} from "../decorations";
import {
  DECORATION_ANIMATIONS,
  DECORATION_LAYERS,
  DECORATION_SOURCES,
  MOVING_AXES,
  MOVING_PATTERNS,
  ORB_AFFINITIES,
  PIXEL_SKILLS,
  PLATFORM_TYPES,
  TETROMINOS,
  WORLD_EXAMPLES,
  decorationSource,
  isShowcaseExample,
  isThreeDDecorationType,
} from "../editorConfig";
import { platformRenderData, validatePlatformLayout } from "../editorUtils";
import { usePixelProtocolEditorActions } from "../hooks/usePixelProtocolEditorActions";
import { usePixelProtocolEditorDraftActions } from "../hooks/usePixelProtocolEditorDraftActions";
import { usePixelProtocolEditorState } from "../hooks/usePixelProtocolEditorState";
import { abilityFlags } from "../logic";
import type {
  LevelDef,
  WorldTemplate,
} from "../types";
import {
  isWorldTemplate,
  upsertPixelProtocolWorldTemplate,
} from "../utils/worldTemplates";
import {
  getPixelProtocolCustomLevelCompletion,
  hasCompletedCurrentPixelProtocolLevel,
} from "../utils/communityCompletion";
import { applyDragPreview, buildDecorationDuplicates } from "../editorDraftUtils";
import { useAuth } from "../../auth/context/AuthContext";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { readLocalPixelProtocolProgress } from "../utils/progress";
import "../../../styles/pixel-protocol.css";
import "../../../styles/pixel-protocol-editor.css";

const EDITOR_TILE = 22;
const MIN_WORLD_TILES = 12;
const MIN_WORLD_ROWS = WORLD_H / TILE;

export default function PixelProtocolEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { checkAchievements, updateStats } = useAchievements();
  const editorMode: EditorMode = searchParams.get("mode") === "world" ? "world" : "level";
  const isAdmin = user?.role === "ADMIN";
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const draftLevelRef = useRef<LevelDef>(withAutoWorldBounds(TEMPLATE_BASE));
  const dragStateRef = useRef<DragState | null>(null);
  const importWorldInputRef = useRef<HTMLInputElement | null>(null);
  const {
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
  } = usePixelProtocolEditorState(editorMode, isAdmin);
  const requestedTemplateId = searchParams.get("template");
  const isWorldEditor = editorMode === "world";

  draftLevelRef.current = draftLevel;
  dragStateRef.current = dragState;

  const displayedLevel = useMemo(
    () => applyDragPreview(draftLevel, dragState),
    [draftLevel, dragState]
  );

  const validation = useMemo(
    () => validatePlatformLayout(displayedLevel),
    [
      displayedLevel,
    ]
  );

  const renderPlatforms = useMemo(() => platformRenderData(displayedLevel), [displayedLevel]);
  const platformCenterMap = useMemo(() => {
    return new Map(
      renderPlatforms
        .filter((item) => item.center)
        .map((item) => [item.platform.id, item.center!] as const)
    );
  }, [renderPlatforms]);

  const selectedPlatform =
    selection?.kind === "platform"
      ? draftLevel.platforms.find((platform) => platform.id === selection.id) ?? null
      : null;
  const selectedSpawn = selection?.kind === "spawn";
  const selectedPortal = selection?.kind === "portal";
  const selectedCheckpoint =
    selection?.kind === "checkpoint"
      ? draftLevel.checkpoints.find((checkpoint) => checkpoint.id === selection.id) ?? null
      : null;
  const selectedOrb =
    selection?.kind === "orb"
      ? draftLevel.orbs.find((orb) => orb.id === selection.id) ?? null
      : null;
  const selectedEnemy =
    selection?.kind === "enemy"
      ? draftLevel.enemies.find((enemy) => enemy.id === selection.id) ?? null
      : null;
  const selectedDecoration =
    selection?.kind === "decoration"
      ? (draftLevel.decorations ?? []).find((decoration) => decoration.id === selection.id) ?? null
      : null;
  const selectedDecorationUsesEmbeddedArtwork = selectedDecoration
    ? usesEmbeddedDecorationArtwork(selectedDecoration.type)
    : false;
  const selectedWorldTemplate =
    draftLevel.worldTemplateId
      ? worldTemplates.find((world) => world.id === draftLevel.worldTemplateId) ?? null
      : null;
  const filteredDecorationPresets = useMemo(
    () => {
      const filtered = DECORATION_PRESETS.filter((preset) =>
        (decorationSourceFilter === "all"
          ? true
          : decorationSourceFilter === "3d"
            ? isThreeDDecorationType(preset.type)
            : decorationSource(preset.type) === decorationSourceFilter)
      );
      if (
        selectedDecoration &&
        !filtered.some((preset) => preset.type === selectedDecoration.type)
      ) {
        const currentPreset = DECORATION_PRESETS.find(
          (preset) => preset.type === selectedDecoration.type
        );
        if (currentPreset) filtered.unshift(currentPreset);
      }
      return filtered;
    },
    [decorationSourceFilter, selectedDecoration]
  );
  const filteredExamples = useMemo(() => {
    const query = exampleSearch.trim().toLowerCase();
    const withIndex = WORLD_EXAMPLES.map((example, index) => ({ example, index }));
    const searched = withIndex.filter(({ example }) => {
      if (!query) return true;
      const haystack = `${example.name} ${example.theme} ${example.id}`.toLowerCase();
      return haystack.includes(query);
    });

    searched.sort((a, b) => {
      if (exampleSort === "recent") return b.index - a.index;
      if (exampleSort === "a-z") return a.example.name.localeCompare(b.example.name, "fr");
      if (exampleSort === "showcase") {
        const aShowcase = isShowcaseExample(a.example) ? 0 : 1;
        const bShowcase = isShowcaseExample(b.example) ? 0 : 1;
        return aShowcase - bShowcase || a.example.name.localeCompare(b.example.name, "fr");
      }
      const aAmbiance = isShowcaseExample(a.example) ? 1 : 0;
      const bAmbiance = isShowcaseExample(b.example) ? 1 : 0;
      return aAmbiance - bAmbiance || a.example.name.localeCompare(b.example.name, "fr");
    });

    return searched.map(({ example }) => example);
  }, [exampleSearch, exampleSort]);
  const renderDecorations = useMemo(
    () =>
      [...(displayedLevel.decorations ?? [])].sort(
        (a, b) => decorationLayerOrder(a.layer) - decorationLayerOrder(b.layer)
      ),
    [displayedLevel]
  );
  const duplicatePreviewDecorations = useMemo(() => {
    if (editorMode !== "world" || !selectedDecoration) return [];
    return buildDecorationDuplicates({
      base: selectedDecoration,
      columns: duplicateColumns,
      rows: duplicateRows,
      offsetX: duplicateOffsetX,
      offsetY: duplicateOffsetY,
      mirrorX: duplicateMirrorX,
      mirrorY: duplicateMirrorY,
      alternateMirror: duplicateAlternateMirror,
      layout: duplicateLayout,
      startAngleDeg: duplicateStartAngle,
      arcDeg: duplicateArcAngle,
    }).map((decoration, index) => ({
      ...decoration,
      id: `${selectedDecoration.id}-preview-${index + 1}`,
    }));
  }, [
    editorMode,
    selectedDecoration,
    duplicateColumns,
    duplicateRows,
    duplicateOffsetX,
    duplicateOffsetY,
    duplicateMirrorX,
    duplicateMirrorY,
    duplicateAlternateMirror,
    duplicateLayout,
    duplicateStartAngle,
    duplicateArcAngle,
  ]);

  const worldTiles = Math.max(MIN_WORLD_TILES, Math.round(displayedLevel.worldWidth / TILE));
  const worldRows = Math.max(MIN_WORLD_ROWS, Math.round(getLevelWorldHeight(displayedLevel) / TILE));
  const topPaddingRows = Math.max(0, Math.round(getLevelWorldTopPadding(displayedLevel) / TILE));
  const editorTotalRows = worldRows + topPaddingRows;
  const editorYOffset = topPaddingRows * EDITOR_TILE;
  const abilities = abilityFlags(displayedLevel.world);
  const readonlyJson = useMemo(() => JSON.stringify(draftLevel, null, 2), [draftLevel]);
  const canDeleteSelection =
    selection?.kind === "platform" ||
    selection?.kind === "checkpoint" ||
    selection?.kind === "orb" ||
    selection?.kind === "enemy" ||
    selection?.kind === "decoration";
  const validationWarnings = validation.issues.filter((issue) => issue.severity === "warning");
  const validationErrors = validation.issues.filter((issue) => issue.severity === "error");
  const currentCompletion = useMemo(
    () => getPixelProtocolCustomLevelCompletion(draftLevel),
    [draftLevel]
  );
  const ownPublishedLevel = useMemo(
    () =>
      communityLevels.find(
        (level) => level.isOwn && level.level.id === draftLevel.id
      ) ?? null,
    [communityLevels, draftLevel.id]
  );
  const canPublishCommunityLevel =
    !isAdmin &&
    !isWorldEditor &&
    validation.isValid &&
    hasCompletedCurrentPixelProtocolLevel(draftLevel);
  const ownPublishedLevels = useMemo(
    () => communityLevels.filter((item) => item.isOwn),
    [communityLevels]
  );
  const {
    selectLevel,
    selectWorldTemplate,
    refreshLevels,
    save,
    playCurrentLevel,
    publishCurrentLevel,
    removeLevel,
    startNewLevel,
  } = usePixelProtocolEditorActions({
    editorMode,
    isAdmin,
    requestedTemplateId,
    levels,
    worldTemplates,
    draftLevel,
    published,
    selectedId,
    validationIsValid: validation.isValid,
    validationErrorMessage: validation.issues[0]?.message ?? null,
    setLevels,
    setWorldTemplates,
    setDraftLevel,
    setPublished,
    setSelectedId,
    setSelection,
    setPreviewLevel,
    setCommunityLevels,
    setStatus,
    setError,
    setLoading,
    onWorldTemplateCreated: () => {
      const next = updateStats((prev) => ({
        ...prev,
        counters: {
          ...prev.counters,
          worlds_created: (prev.counters.worlds_created ?? 0) + 1,
        },
      }));
      checkAchievements({
        mode: "EDITOR",
        counters: {
          worlds_created: next.counters.worlds_created,
        },
      });
    },
    onCommunityLevelPublished: () => {
      const next = updateStats((prev) => ({
        ...prev,
        counters: {
          ...prev.counters,
          levels_published: (prev.counters.levels_published ?? 0) + 1,
        },
      }));
      checkAchievements({
        mode: "EDITOR",
        counters: {
          levels_published: next.counters.levels_published,
        },
      });
    },
  });

  useEffect(() => {
    const totalLikesReceived = ownPublishedLevels.reduce(
      (sum, item) => sum + item.likeCount,
      0
    );
    const maxPlaysOnOneLevel = ownPublishedLevels.reduce(
      (max, item) => Math.max(max, item.playCount),
      0
    );
    const maxLikesOnOneLevel = ownPublishedLevels.reduce(
      (max, item) => Math.max(max, item.likeCount),
      0
    );
    const localProgress = readLocalPixelProtocolProgress();
    const createdLevelsCount = levels.length;

    checkAchievements({
      mode: "EDITOR",
      counters: {
        level_likes_received: totalLikesReceived,
      },
      custom: {
        level_100_plays: maxPlaysOnOneLevel >= 100,
        level_1000_plays: maxPlaysOnOneLevel >= 1000,
        level_50_likes: maxLikesOnOneLevel >= 50,
        grid_master:
          localProgress.highestLevel >= 20 && createdLevelsCount >= 10,
      },
    });
  }, [checkAchievements, levels.length, ownPublishedLevels]);

  const handleRefresh = useCallback(() => {
    void refreshLevels();
  }, [refreshLevels]);

  const handleOpenHelp = useCallback(() => {
    navigate("/pixel-protocol/help/editor");
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate("/pixel-protocol");
  }, [navigate]);

  const toggleExamplesExpanded = useCallback(() => {
    setExampleTemplatesExpanded((current: boolean) => !current);
  }, [setExampleTemplatesExpanded]);

  const toggleSavedExpanded = useCallback(() => {
    setSavedWorldsExpanded((current: boolean) => !current);
  }, [setSavedWorldsExpanded]);

  const handleExampleSortChange = useCallback((value: string) => {
    setExampleSort(value as "recent" | "a-z" | "showcase" | "ambiance");
  }, [setExampleSort]);

  const handleSaveDraft = useCallback(() => {
    void save(false);
  }, [save]);

  const handlePlayLevel = useCallback(() => {
    void playCurrentLevel().then((savedLevel) => {
      if (savedLevel) {
        navigate(`/pixel-protocol/play?custom=${encodeURIComponent(savedLevel.id)}`);
      }
    });
  }, [navigate, playCurrentLevel]);

  const handlePublishLevel = useCallback(() => {
    void publishCurrentLevel();
  }, [publishCurrentLevel]);

  const handleRemoveLevel = useCallback((id: string) => {
    void removeLevel(id);
  }, [removeLevel]);

  const handleExportWorldTemplate = useCallback(() => {
    if (!isWorldEditor) return;
    const world = worldTemplateFromLevel(draftLevel);
    const filename = `${world.id || "pixel-protocol-world"}.json`;
    const blob = new Blob([JSON.stringify(world, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Monde exporte: ${filename}`);
    setError(null);
  }, [draftLevel, isWorldEditor, setError, setStatus]);

  const handleImportWorldTemplate = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const candidate =
        raw && typeof raw === "object" && "world" in raw
          ? (raw as { world?: unknown }).world
          : raw;

      if (!isWorldTemplate(candidate)) {
        throw new Error("Le fichier JSON ne correspond pas a un monde Pixel Protocol valide.");
      }

      const importedWorld: WorldTemplate = {
        ...candidate,
        updatedAt: new Date().toISOString(),
      };
      const worlds = upsertPixelProtocolWorldTemplate(importedWorld);
      setWorldTemplates(worlds);
      setSelectedId(importedWorld.id);
      setDraftLevel(levelFromWorldTemplate(importedWorld));
      setSelection(
        importedWorld.decorations[0]
          ? { kind: "decoration", id: importedWorld.decorations[0].id }
          : null
      );
      setStatus(`Monde importe: ${importedWorld.name}`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import JSON impossible");
      setStatus(null);
    }
  }, [setDraftLevel, setError, setSelection, setSelectedId, setStatus, setWorldTemplates]);

  const handleLoadExampleWorldTemplate = useCallback((rawExample: string) => {
    try {
      const raw = JSON.parse(rawExample) as unknown;
      if (!isWorldTemplate(raw)) {
        throw new Error("Le monde d'exemple embarque est invalide.");
      }
      const exampleWorld: WorldTemplate = {
        ...raw,
        updatedAt: new Date().toISOString(),
      };
      const worlds = upsertPixelProtocolWorldTemplate(exampleWorld);
      setWorldTemplates(worlds);
      setSelectedId(exampleWorld.id);
      setDraftLevel(levelFromWorldTemplate(exampleWorld));
      setSelection(
        exampleWorld.decorations[0]
          ? { kind: "decoration", id: exampleWorld.decorations[0].id }
          : null
      );
      setStatus(`Monde d'exemple charge: ${exampleWorld.name}`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement du monde d'exemple impossible");
      setStatus(null);
    }
  }, [setDraftLevel, setError, setSelection, setSelectedId, setStatus, setWorldTemplates]);
  const {
    applyDraftLevel,
    handleDuplicateDecoration,
    setLevelField,
    handleAddPlatform,
    handleAddCheckpoint,
    handleAddOrb,
    handleAddEnemy,
    handleAddDecoration,
    handleDeleteSelection,
    handleSelectedPlatformChange,
    handleSelectedCheckpointChange,
    handleSelectedOrbChange,
    handleSelectedEnemyChange,
    handleSelectedDecorationChange,
    startPlatformDrag,
    startCheckpointDrag,
    startOrbDrag,
    startEnemyDrag,
    startDecorationDrag,
    startSpawnDrag,
    startPortalDrag,
    openPreview,
  } = usePixelProtocolEditorDraftActions({
    draftLevel,
    selection,
    selectedPlatform,
    selectedCheckpoint,
    selectedOrb,
    selectedEnemy,
    selectedDecoration,
    isWorldEditor,
    topPaddingRows,
    duplicateOffsetX,
    duplicateOffsetY,
    duplicateColumns,
    duplicateRows,
    duplicateMirrorX,
    duplicateMirrorY,
    duplicateAlternateMirror,
    duplicateLayout,
    duplicateStartAngle,
    duplicateArcAngle,
    boardScrollRef,
    draftLevelRef,
    dragStateRef,
    setDraftLevel,
    setSelection,
    setStatus,
    setError,
    setDragState,
    setPreviewLevel,
    setPreviewKey,
  });

  const toggleDecorationInspectorSection = (
    section: (typeof DECORATION_INSPECTOR_SECTIONS)[number]
  ) => {
    setDecorationInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const togglePlatformInspectorSection = (
    section: (typeof PLATFORM_INSPECTOR_SECTIONS)[number]
  ) => {
    setPlatformInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleCheckpointInspectorSection = (
    section: (typeof CHECKPOINT_INSPECTOR_SECTIONS)[number]
  ) => {
    setCheckpointInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleOrbInspectorSection = (section: (typeof ORB_INSPECTOR_SECTIONS)[number]) => {
    setOrbInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleEnemyInspectorSection = (section: (typeof ENEMY_INSPECTOR_SECTIONS)[number]) => {
    setEnemyInspectorSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleCenterPanelSection = (section: (typeof CENTER_PANEL_SECTIONS)[number]) => {
    setCenterPanelSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const setAllCenterPanelSections = (expanded: boolean) => {
    setCenterPanelSections(
      Object.fromEntries(
        CENTER_PANEL_SECTIONS.map((section) => [section, expanded])
      ) as Record<(typeof CENTER_PANEL_SECTIONS)[number], boolean>
    );
  };

  const setAllInspectorSections = (expanded: boolean) => {
    if (selectedPlatform) {
      setPlatformInspectorSections(
        Object.fromEntries(
          PLATFORM_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof PLATFORM_INSPECTOR_SECTIONS)[number], boolean>
      );
      return;
    }
    if (selectedCheckpoint) {
      setCheckpointInspectorSections(
        Object.fromEntries(
          CHECKPOINT_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof CHECKPOINT_INSPECTOR_SECTIONS)[number], boolean>
      );
      return;
    }
    if (selectedOrb) {
      setOrbInspectorSections(
        Object.fromEntries(
          ORB_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof ORB_INSPECTOR_SECTIONS)[number], boolean>
      );
      return;
    }
    if (selectedEnemy) {
      setEnemyInspectorSections(
        Object.fromEntries(
          ENEMY_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof ENEMY_INSPECTOR_SECTIONS)[number], boolean>
      );
      return;
    }
    if (selectedDecoration) {
      setDecorationInspectorSections(
        Object.fromEntries(
          DECORATION_INSPECTOR_SECTIONS.map((section) => [section, expanded])
        ) as Record<(typeof DECORATION_INSPECTOR_SECTIONS)[number], boolean>
      );
    }
  };

  return (
    <div className="pp-editor-shell">
      <PixelProtocolEditorHeader
        isAdmin={isAdmin}
        editorMode={editorMode}
        onStartNew={startNewLevel}
        onRefresh={handleRefresh}
        onHelp={handleOpenHelp}
        onResetUi={resetEditorUi}
        onBack={handleBack}
      />

      <div className="pp-editor-layout">
        <PixelProtocolEditorSidebar
          isAdmin={isAdmin}
          isWorldEditor={isWorldEditor}
          loading={loading}
          selectedId={selectedId}
          levels={levels}
          worldTemplates={worldTemplates}
          communityLevels={communityLevels}
          draftLevelId={draftLevel.id}
          validationIsValid={validation.isValid}
          canPublishCommunityLevel={canPublishCommunityLevel}
          savedWorldsExpanded={savedWorldsExpanded}
          exampleTemplatesExpanded={exampleTemplatesExpanded}
          exampleSearch={exampleSearch}
          exampleSort={exampleSort}
          filteredExamples={filteredExamples}
          importWorldInputRef={importWorldInputRef}
          onImportWorldTemplate={handleImportWorldTemplate}
          onToggleExamples={toggleExamplesExpanded}
          onToggleSaved={toggleSavedExpanded}
          onExampleSearchChange={setExampleSearch}
          onExampleSortChange={handleExampleSortChange}
          onLoadExample={handleLoadExampleWorldTemplate}
          onExportWorld={handleExportWorldTemplate}
          onSave={handleSaveDraft}
          onOpenPreview={openPreview}
          onPlayLevel={handlePlayLevel}
          onPublishLevel={handlePublishLevel}
          onLoadWorldTemplate={selectWorldTemplate}
          onLoadLevel={selectLevel}
          onRemove={handleRemoveLevel}
        />

        <section className="pp-editor-panel pp-editor-main">
          <PixelProtocolEditorForm
            editorMode={editorMode}
            isWorldEditor={isWorldEditor}
            isAdmin={isAdmin}
            editorExpanded={editorExpanded}
            setEditorExpanded={setEditorExpanded}
            published={published}
            setPublished={setPublished}
            draftLevel={draftLevel}
            worldTemplates={worldTemplates}
            selectedWorldTemplate={selectedWorldTemplate}
            worldTiles={worldTiles}
            worldRows={worldRows}
            topPaddingRows={topPaddingRows}
            minWorldTiles={MIN_WORLD_TILES}
            minWorldRows={MIN_WORLD_ROWS}
            selection={selection}
            setLevelField={setLevelField}
            applyDraftLevel={applyDraftLevel}
            setStatus={setStatus}
          />

          <div className="pp-editor-workbench">
            <PixelProtocolEditorWorkbench
              editorMode={editorMode}
              selectedWorldTemplate={selectedWorldTemplate}
              selectedDecoration={selectedDecoration}
              selectedSpawn={selectedSpawn}
              selectedPortal={selectedPortal}
              canDeleteSelection={canDeleteSelection}
              abilities={abilities}
              boardScrollRef={boardScrollRef}
              worldTiles={worldTiles}
              editorTotalRows={editorTotalRows}
              editorYOffset={editorYOffset}
              topPaddingRows={topPaddingRows}
              displayedLevel={displayedLevel}
              draftLevel={draftLevel}
              selection={selection}
              dragState={dragState}
              renderDecorations={renderDecorations}
              duplicatePreviewDecorations={duplicatePreviewDecorations}
              renderPlatforms={renderPlatforms}
              platformCenterMap={platformCenterMap}
              validation={validation}
              validationWarnings={validationWarnings}
              validationErrors={validationErrors}
              currentCompletion={currentCompletion}
              canPublishCommunityLevel={canPublishCommunityLevel}
              isAdmin={isAdmin}
              isWorldEditor={isWorldEditor}
              ownPublishedLevel={ownPublishedLevel ? { likeCount: ownPublishedLevel.likeCount } : null}
              centerPanelSections={centerPanelSections}
              setSelection={setSelection}
              handleAddPlatform={handleAddPlatform}
              handleAddCheckpoint={handleAddCheckpoint}
              handleAddOrb={handleAddOrb}
              handleAddEnemy={handleAddEnemy}
              handleAddDecoration={handleAddDecoration}
              handleDuplicateDecoration={handleDuplicateDecoration}
              handleDeleteSelection={handleDeleteSelection}
              startDecorationDrag={startDecorationDrag}
              startSpawnDrag={startSpawnDrag}
              startPortalDrag={startPortalDrag}
              startPlatformDrag={startPlatformDrag}
              startCheckpointDrag={startCheckpointDrag}
              startOrbDrag={startOrbDrag}
              startEnemyDrag={startEnemyDrag}
              setAllCenterPanelSections={setAllCenterPanelSections}
              toggleCenterPanelSection={toggleCenterPanelSection}
            />

            <PixelProtocolEditorInspector
              editorMode={editorMode}
              selection={selection}
              selectedSpawn={selectedSpawn}
              selectedPortal={selectedPortal}
              selectedPlatform={selectedPlatform}
              selectedCheckpoint={selectedCheckpoint}
              selectedOrb={selectedOrb}
              selectedEnemy={selectedEnemy}
              selectedDecoration={selectedDecoration}
              selectedDecorationUsesEmbeddedArtwork={selectedDecorationUsesEmbeddedArtwork}
              platformInspectorSections={platformInspectorSections}
              checkpointInspectorSections={checkpointInspectorSections}
              orbInspectorSections={orbInspectorSections}
              enemyInspectorSections={enemyInspectorSections}
              decorationInspectorSections={decorationInspectorSections}
              tetrominos={TETROMINOS}
              platformTypes={PLATFORM_TYPES}
              movingAxes={MOVING_AXES}
              movingPatterns={MOVING_PATTERNS}
              orbAffinities={ORB_AFFINITIES}
              pixelSkills={PIXEL_SKILLS}
              decorationLayers={DECORATION_LAYERS}
              decorationAnimations={DECORATION_ANIMATIONS}
              decorationSources={DECORATION_SOURCES}
              filteredDecorationPresets={filteredDecorationPresets}
              decorationSourceFilter={decorationSourceFilter}
              duplicateOffsetX={duplicateOffsetX}
              setDuplicateOffsetX={setDuplicateOffsetX}
              duplicateOffsetY={duplicateOffsetY}
              setDuplicateOffsetY={setDuplicateOffsetY}
              duplicateColumns={duplicateColumns}
              setDuplicateColumns={setDuplicateColumns}
              duplicateRows={duplicateRows}
              setDuplicateRows={setDuplicateRows}
              duplicateLayout={duplicateLayout}
              setDuplicateLayout={setDuplicateLayout}
              duplicateStartAngle={duplicateStartAngle}
              setDuplicateStartAngle={setDuplicateStartAngle}
              duplicateArcAngle={duplicateArcAngle}
              setDuplicateArcAngle={setDuplicateArcAngle}
              duplicateMirrorX={duplicateMirrorX}
              setDuplicateMirrorX={setDuplicateMirrorX}
              duplicateMirrorY={duplicateMirrorY}
              setDuplicateMirrorY={setDuplicateMirrorY}
              duplicateAlternateMirror={duplicateAlternateMirror}
              setDuplicateAlternateMirror={setDuplicateAlternateMirror}
              duplicatePreviewCount={duplicatePreviewDecorations.length}
              setDecorationSourceFilter={setDecorationSourceFilter}
              setAllInspectorSections={setAllInspectorSections}
              togglePlatformInspectorSection={togglePlatformInspectorSection}
              toggleCheckpointInspectorSection={toggleCheckpointInspectorSection}
              toggleOrbInspectorSection={toggleOrbInspectorSection}
              toggleEnemyInspectorSection={toggleEnemyInspectorSection}
              toggleDecorationInspectorSection={toggleDecorationInspectorSection}
              handleSelectedPlatformChange={handleSelectedPlatformChange}
              handleSelectedCheckpointChange={handleSelectedCheckpointChange}
              handleSelectedOrbChange={handleSelectedOrbChange}
              handleSelectedEnemyChange={handleSelectedEnemyChange}
              handleSelectedDecorationChange={handleSelectedDecorationChange}
              handleDuplicateDecoration={handleDuplicateDecoration}
            />
          </div>

          <div className="pp-editor-actions">
            {isAdmin && (
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--save"
                title="Sauver brouillon"
                aria-label="Sauver brouillon"
                onClick={() => save(false)}
              >
                <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                className="pp-editor-icon-btn pp-editor-icon-btn--publish"
                title="Publier"
                aria-label="Publier"
                onClick={() => save(true)}
              >
                <i className="fa-solid fa-upload" aria-hidden="true" />
              </button>
            )}
          </div>

          {previewLevel && (
            <PixelProtocolDraftPreview
              key={previewKey}
              level={previewLevel}
              onClose={() => setPreviewLevel(null)}
            />
          )}

          <details className="pp-editor-json-panel">
            <summary>JSON lecture seule</summary>
            <textarea className="pp-editor-json" value={readonlyJson} readOnly spellCheck={false} />
          </details>

          {status && <div className="pp-editor-status success">{status}</div>}
          {error && <div className="pp-editor-status error">{error}</div>}
        </section>
      </div>
    </div>
  );
}
