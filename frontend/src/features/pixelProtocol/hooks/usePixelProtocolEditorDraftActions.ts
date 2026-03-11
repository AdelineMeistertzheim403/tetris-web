import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { TILE } from "../constants";
import { DECORATION_PRESETS, getDecorationPreset } from "../decorations";
import { withAutoWorldBounds, type DragState, type Selection } from "../editorShared";
import { validatePlatformLayout } from "../editorUtils";
import type {
  Checkpoint,
  DecorationDef,
  DataOrb,
  Enemy,
  LevelDef,
  PlatformDef,
} from "../types";
import {
  applyDragPreview,
  buildDecorationDuplicates,
  checkpointFromTile,
  cloneDraftLevel,
  decorationFromTile,
  enemyFromTile,
  nextId,
  normalizePlatformSettings,
  normalizeTileOffset,
  orbFromTile,
  updateCheckpoint,
  updateDecoration,
  updateEnemy,
  updateOrb,
  updatePlatform,
} from "../editorDraftUtils";

const EDITOR_TILE = 22;

type UsePixelProtocolEditorDraftActionsArgs = {
  draftLevel: LevelDef;
  selection: Selection;
  selectedPlatform: PlatformDef | null;
  selectedCheckpoint: Checkpoint | null;
  selectedOrb: DataOrb | null;
  selectedEnemy: Enemy | null;
  selectedDecoration: DecorationDef | null;
  isWorldEditor: boolean;
  topPaddingRows: number;
  duplicateOffsetX: number;
  duplicateOffsetY: number;
  duplicateColumns: number;
  duplicateRows: number;
  duplicateMirrorX: boolean;
  duplicateMirrorY: boolean;
  duplicateAlternateMirror: boolean;
  duplicateLayout: "grid" | "circle";
  duplicateStartAngle: number;
  duplicateArcAngle: number;
  boardScrollRef: RefObject<HTMLDivElement | null>;
  draftLevelRef: MutableRefObject<LevelDef>;
  dragStateRef: MutableRefObject<DragState | null>;
  setDraftLevel: Dispatch<SetStateAction<LevelDef>>;
  setSelection: Dispatch<SetStateAction<Selection>>;
  setStatus: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setDragState: Dispatch<SetStateAction<DragState | null>>;
  setPreviewLevel: Dispatch<SetStateAction<LevelDef | null>>;
  setPreviewKey: Dispatch<SetStateAction<number>>;
};

export function usePixelProtocolEditorDraftActions({
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
}: UsePixelProtocolEditorDraftActionsArgs) {
  const applyDraftLevel = useCallback(
    (nextLevel: LevelDef, nextSelection: Selection = selection) => {
      const normalizedLevel = withAutoWorldBounds(nextLevel);
      const nextValidation = validatePlatformLayout(normalizedLevel);
      setDraftLevel(normalizedLevel);
      setSelection(nextSelection);
      setStatus(null);
      setError(nextValidation.isValid ? null : nextValidation.issues[0]?.message ?? null);
      return nextValidation.isValid;
    },
    [selection, setDraftLevel, setError, setSelection, setStatus]
  );

  const handleDuplicateDecoration = useCallback(() => {
    if (!selectedDecoration) return;
    const nextDecorations = [...(draftLevel.decorations ?? [])];
    const duplicates = buildDecorationDuplicates({
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
    });
    let lastId = selectedDecoration.id;
    duplicates.forEach((duplicate) => {
      const id = nextId(nextDecorations, "d");
      lastId = id;
      nextDecorations.push({
        ...duplicate,
        id,
      });
    });

    applyDraftLevel(
      {
        ...draftLevel,
        decorations: nextDecorations,
      },
      { kind: "decoration", id: lastId }
    );
    setStatus(
      duplicates.length === 1
        ? `Decoration dupliquee: ${lastId}`
        : `${duplicates.length} decorations dupliquees.`
    );
  }, [
    applyDraftLevel,
    draftLevel,
    duplicateAlternateMirror,
    duplicateArcAngle,
    duplicateColumns,
    duplicateLayout,
    duplicateMirrorX,
    duplicateMirrorY,
    duplicateOffsetX,
    duplicateOffsetY,
    duplicateRows,
    duplicateStartAngle,
    selectedDecoration,
    setStatus,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isWorldEditor || !selectedDecoration) return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isTypingTarget =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        Boolean(target?.isContentEditable);
      if (isTypingTarget) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDuplicateDecoration();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleDuplicateDecoration, isWorldEditor, selectedDecoration]);

  useEffect(() => {
    const currentDrag = dragStateRef.current;
    if (!currentDrag) return;

    const pointerToTile = (clientX: number, clientY: number) => {
      const scroller = boardScrollRef.current;
      if (!scroller) return null;
      const rect = scroller.getBoundingClientRect();
      const localX = clientX - rect.left + scroller.scrollLeft;
      const localY = clientY - rect.top + scroller.scrollTop;
      return {
        x: Math.max(0, Math.floor(localX / EDITOR_TILE)),
        y: Math.max(0, Math.floor(localY / EDITOR_TILE) - topPaddingRows),
      };
    };

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const tile = pointerToTile(event.clientX, event.clientY);
      if (!tile) return;

      setDragState((current) => {
        if (!current) return current;
        if (current.kind === "platform") {
          return {
            ...current,
            candidateTileX: tile.x - current.offsetX,
            candidateTileY: tile.y - current.offsetY,
          };
        }
        return {
          ...current,
          candidateTileX: tile.x,
          candidateTileY: tile.y,
        };
      });
    };

    const onPointerUp = () => {
      const activeDrag = dragStateRef.current;
      if (!activeDrag) return;
      const nextLevel = applyDragPreview(draftLevelRef.current, activeDrag);
      const nextSelection: Selection =
        activeDrag.kind === "spawn" || activeDrag.kind === "portal"
          ? { kind: activeDrag.kind }
          : { kind: activeDrag.kind, id: activeDrag.id };
      applyDraftLevel(nextLevel, nextSelection);
      setDragState(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [applyDraftLevel, boardScrollRef, draftLevelRef, dragStateRef, setDragState, topPaddingRows]);

  const setLevelField = useCallback(
    <K extends keyof LevelDef>(field: K, value: LevelDef[K]) => {
      const next = { ...draftLevel, [field]: value };
      if (
        field === "portal" ||
        field === "spawn" ||
        field === "platforms" ||
        field === "checkpoints" ||
        field === "orbs" ||
        field === "enemies"
      ) {
        applyDraftLevel(withAutoWorldBounds(next));
        return;
      }
      applyDraftLevel(next);
    },
    [applyDraftLevel, draftLevel]
  );

  const handleAddPlatform = useCallback(() => {
    const newId = nextId(draftLevel.platforms, "p");
    const basePlatform: PlatformDef = selectedPlatform
      ? {
          ...selectedPlatform,
          id: newId,
          x: selectedPlatform.x + 4,
          y: Math.max(1, selectedPlatform.y - 1),
        }
      : {
          id: newId,
          tetromino: "I",
          type: "stable",
          rotation: 0,
          x: 6,
          y: 14,
        };
    const normalizedPlatform = normalizePlatformSettings(basePlatform);
    applyDraftLevel(
      { ...draftLevel, platforms: [...draftLevel.platforms, normalizedPlatform] },
      { kind: "platform", id: newId }
    );
  }, [applyDraftLevel, draftLevel, selectedPlatform]);

  const handleAddCheckpoint = useCallback(() => {
    const id = nextId(draftLevel.checkpoints, "c");
    const checkpoint = checkpointFromTile(id, 8, 14);
    applyDraftLevel(
      { ...draftLevel, checkpoints: [...draftLevel.checkpoints, checkpoint] },
      { kind: "checkpoint", id }
    );
  }, [applyDraftLevel, draftLevel]);

  const handleAddOrb = useCallback(() => {
    const id = nextId(draftLevel.orbs, "o");
    const orb = orbFromTile(id, 10, 13);
    applyDraftLevel({ ...draftLevel, orbs: [...draftLevel.orbs, orb] }, { kind: "orb", id });
  }, [applyDraftLevel, draftLevel]);

  const handleAddEnemy = useCallback(() => {
    const id = nextId(draftLevel.enemies, "e");
    const enemy = enemyFromTile(id, 12, 13);
    applyDraftLevel(
      { ...draftLevel, enemies: [...draftLevel.enemies, enemy] },
      { kind: "enemy", id }
    );
  }, [applyDraftLevel, draftLevel]);

  const handleAddDecoration = useCallback(() => {
    const id = nextId(draftLevel.decorations ?? [], "d");
    const preset = DECORATION_PRESETS[0];
    const decoration = decorationFromTile(id, 8, 8, preset.type);
    applyDraftLevel(
      {
        ...draftLevel,
        decorations: [...(draftLevel.decorations ?? []), decoration],
      },
      { kind: "decoration", id }
    );
  }, [applyDraftLevel, draftLevel]);

  const handleDeleteSelection = useCallback(() => {
    if (!selection) return;
    if (selection.kind === "spawn" || selection.kind === "portal") return;
    if (selection.kind === "platform") {
      const nextPlatforms = draftLevel.platforms.filter((item) => item.id !== selection.id);
      applyDraftLevel(
        { ...draftLevel, platforms: nextPlatforms },
        nextPlatforms[0] ? { kind: "platform", id: nextPlatforms[0].id } : null
      );
      return;
    }
    if (selection.kind === "checkpoint") {
      const next = draftLevel.checkpoints.filter((item) => item.id !== selection.id);
      applyDraftLevel(
        { ...draftLevel, checkpoints: next },
        next[0] ? { kind: "checkpoint", id: next[0].id } : null
      );
      return;
    }
    if (selection.kind === "orb") {
      const next = draftLevel.orbs.filter((item) => item.id !== selection.id);
      applyDraftLevel({ ...draftLevel, orbs: next }, next[0] ? { kind: "orb", id: next[0].id } : null);
      return;
    }
    if (selection.kind === "decoration") {
      const next = (draftLevel.decorations ?? []).filter((item) => item.id !== selection.id);
      applyDraftLevel(
        { ...draftLevel, decorations: next },
        next[0] ? { kind: "decoration", id: next[0].id } : null
      );
      return;
    }
    const next = draftLevel.enemies.filter((item) => item.id !== selection.id);
    applyDraftLevel({ ...draftLevel, enemies: next }, next[0] ? { kind: "enemy", id: next[0].id } : null);
  }, [applyDraftLevel, draftLevel, selection]);

  const handleSelectedPlatformChange = useCallback(
    (updater: (platform: PlatformDef) => PlatformDef) => {
      if (!selectedPlatform) return;
      applyDraftLevel(
        updatePlatform(draftLevel, selectedPlatform.id, (platform) => {
          const nextPlatform = updater(platform);
          return normalizePlatformSettings(nextPlatform);
        }),
        selection
      );
    },
    [applyDraftLevel, draftLevel, selectedPlatform, selection]
  );

  const handleSelectedCheckpointChange = useCallback(
    (updater: (checkpoint: Checkpoint) => Checkpoint) => {
      if (!selectedCheckpoint) return;
      applyDraftLevel(updateCheckpoint(draftLevel, selectedCheckpoint.id, updater), selection);
    },
    [applyDraftLevel, draftLevel, selectedCheckpoint, selection]
  );

  const handleSelectedOrbChange = useCallback(
    (updater: (orb: DataOrb) => DataOrb) => {
      if (!selectedOrb) return;
      applyDraftLevel(updateOrb(draftLevel, selectedOrb.id, updater), selection);
    },
    [applyDraftLevel, draftLevel, selectedOrb, selection]
  );

  const handleSelectedEnemyChange = useCallback(
    (updater: (enemy: Enemy) => Enemy) => {
      if (!selectedEnemy) return;
      applyDraftLevel(updateEnemy(draftLevel, selectedEnemy.id, updater), selection);
    },
    [applyDraftLevel, draftLevel, selectedEnemy, selection]
  );

  const handleSelectedDecorationChange = useCallback(
    (updater: (decoration: DecorationDef) => DecorationDef) => {
      if (!selectedDecoration) return;
      applyDraftLevel(
        updateDecoration(draftLevel, selectedDecoration.id, (decoration) => {
          const next = updater(decoration);
          const preset = getDecorationPreset(next.type);
          return {
            ...next,
            width: Math.max(4, next.width || preset.defaultWidth),
            height: Math.max(4, next.height || preset.defaultHeight),
            opacity: Math.min(1, Math.max(0, next.opacity ?? 0.9)),
            layer: next.layer ?? "mid",
            animation: next.animation ?? "none",
          };
        }),
        selection
      );
    },
    [applyDraftLevel, draftLevel, selectedDecoration, selection]
  );

  const startPlatformDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, platform: PlatformDef) => {
      event.preventDefault();
      const scroller = boardScrollRef.current;
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const tileX = Math.floor((event.clientX - rect.left + scroller.scrollLeft) / EDITOR_TILE);
      const tileY =
        Math.floor((event.clientY - rect.top + scroller.scrollTop) / EDITOR_TILE) - topPaddingRows;
      setSelection({ kind: "platform", id: platform.id });
      setDragState({
        kind: "platform",
        id: platform.id,
        offsetX: tileX - platform.x,
        offsetY: Math.max(0, tileY) - platform.y,
        candidateTileX: platform.x,
        candidateTileY: platform.y,
      });
    },
    [boardScrollRef, setDragState, setSelection, topPaddingRows]
  );

  const startCheckpointDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, checkpoint: Checkpoint) => {
      event.preventDefault();
      setSelection({ kind: "checkpoint", id: checkpoint.id });
      setDragState({
        kind: "checkpoint",
        id: checkpoint.id,
        candidateTileX: Math.round((checkpoint.x - 10) / TILE),
        candidateTileY: Math.round((checkpoint.y + 42) / TILE),
      });
    },
    [setDragState, setSelection]
  );

  const startOrbDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, orb: DataOrb) => {
      event.preventDefault();
      setSelection({ kind: "orb", id: orb.id });
      setDragState({
        kind: "orb",
        id: orb.id,
        candidateTileX: Math.round((orb.x - 7) / TILE),
        candidateTileY: Math.round((orb.y + 20) / TILE),
      });
    },
    [setDragState, setSelection]
  );

  const startEnemyDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, enemy: Enemy) => {
      event.preventDefault();
      setSelection({ kind: "enemy", id: enemy.id });
      setDragState({
        kind: "enemy",
        id: enemy.id,
        candidateTileX: Math.round(enemy.x / TILE),
        candidateTileY: Math.round((enemy.y + 26) / TILE),
      });
    },
    [setDragState, setSelection]
  );

  const startDecorationDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, decoration: DecorationDef) => {
      event.preventDefault();
      setSelection({ kind: "decoration", id: decoration.id });
      setDragState({
        kind: "decoration",
        id: decoration.id,
        offsetX: normalizeTileOffset(decoration.x),
        offsetY: normalizeTileOffset(decoration.y),
        candidateTileX: Math.floor(decoration.x / TILE),
        candidateTileY: Math.floor(decoration.y / TILE),
      });
    },
    [setDragState, setSelection]
  );

  const startSpawnDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setSelection({ kind: "spawn" });
      setDragState({
        kind: "spawn",
        candidateTileX: Math.floor(draftLevel.spawn.x / TILE),
        candidateTileY: Math.floor(draftLevel.spawn.y / TILE),
        offsetX: normalizeTileOffset(draftLevel.spawn.x),
        offsetY: normalizeTileOffset(draftLevel.spawn.y),
      });
    },
    [draftLevel.spawn.x, draftLevel.spawn.y, setDragState, setSelection]
  );

  const startPortalDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setSelection({ kind: "portal" });
      setDragState({
        kind: "portal",
        candidateTileX: Math.floor(draftLevel.portal.x / TILE),
        candidateTileY: Math.floor(draftLevel.portal.y / TILE),
        offsetX: normalizeTileOffset(draftLevel.portal.x),
        offsetY: normalizeTileOffset(draftLevel.portal.y),
      });
    },
    [draftLevel.portal.x, draftLevel.portal.y, setDragState, setSelection]
  );

  const openPreview = useCallback(() => {
    const layoutValidation = validatePlatformLayout(draftLevel);
    if (!layoutValidation.isValid) {
      setError(layoutValidation.issues[0]?.message ?? "Corrige le layout avant le test.");
      return;
    }
    setPreviewLevel(cloneDraftLevel(draftLevel));
    setPreviewKey((current) => current + 1);
    setError(null);
  }, [draftLevel, setError, setPreviewKey, setPreviewLevel]);

  return {
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
  };
}
