import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PixelProtocolControlsPanel } from "../components/PixelProtocolControlsPanel";
import { PixelProtocolInfoPanel } from "../components/PixelProtocolInfoPanel";
import { PixelProtocolWorld } from "../components/PixelProtocolWorld";
import { PLATFORM_CLASS, TILE, WORLD_H } from "../constants";
import { platformRenderData, validatePlatformLayout } from "../editorUtils";
import { usePixelProtocolGame } from "../hooks/usePixelProtocolGame";
import { abilityFlags } from "../logic";
import type {
  Checkpoint,
  DataOrb,
  Enemy,
  LevelDef,
  PlatformDef,
  PlatformType,
  Tetromino,
} from "../types";
import {
  deletePixelProtocolLevel,
  fetchPixelProtocolAdminLevels,
  savePixelProtocolLevel,
  type PixelProtocolAdminLevel,
} from "../services/pixelProtocolService";
import { useAuth } from "../../auth/context/AuthContext";
import "../../../styles/pixel-protocol.css";
import "../../../styles/pixel-protocol-editor.css";

const EDITOR_TILE = 22;
const WORLD_ROWS = WORLD_H / TILE;
const TETROMINOS: Tetromino[] = ["I", "O", "T", "L", "J", "S", "Z"];
const PLATFORM_TYPES: PlatformType[] = [
  "stable",
  "bounce",
  "unstable",
  "rotating",
  "glitch",
  "armored",
  "hackable",
];
const DEFAULT_ROTATE_EVERY_MS = 1800;

const TEMPLATE_BASE: LevelDef = {
  id: "w1-1",
  world: 1,
  name: "Nouveau niveau",
  worldWidth: 30 * TILE,
  requiredOrbs: 3,
  spawn: { x: 96, y: 450 },
  portal: { x: 960, y: 260 },
  platforms: [],
  checkpoints: [],
  orbs: [],
  enemies: [],
};

type Selection =
  | { kind: "platform"; id: string }
  | { kind: "checkpoint"; id: string }
  | { kind: "orb"; id: string }
  | { kind: "enemy"; id: string }
  | null;

type DragState =
  | {
      kind: "platform";
      id: string;
      candidateTileX: number;
      candidateTileY: number;
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: "checkpoint";
      id: string;
      candidateTileX: number;
      candidateTileY: number;
    }
  | {
      kind: "orb";
      id: string;
      candidateTileX: number;
      candidateTileY: number;
    }
  | {
      kind: "enemy";
      id: string;
      candidateTileX: number;
      candidateTileY: number;
    };

function parseStage(id: string) {
  const match = id.match(/w\d+-(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function sortAdminLevels(levels: PixelProtocolAdminLevel[]) {
  return [...levels].sort((a, b) => {
    if (a.world !== b.world) return a.world - b.world;
    return parseStage(a.id) - parseStage(b.id);
  });
}

function makeNewLevel(levels: PixelProtocolAdminLevel[]): LevelDef {
  const world = 1;
  const existingStages = levels
    .filter((lvl) => lvl.world === world)
    .map((lvl) => parseStage(lvl.id))
    .filter(Number.isFinite);
  const nextStage = (existingStages.length ? Math.max(...existingStages) : 0) + 1;

  return {
    ...TEMPLATE_BASE,
    id: `w${world}-${nextStage}`,
    world,
    name: `Nouveau niveau ${nextStage}`,
  };
}

function stripAdminFields(level: PixelProtocolAdminLevel): LevelDef {
  const { active: _active, sortOrder: _sortOrder, updatedAt: _updatedAt, ...rest } = level;
  return rest;
}

function cloneDraftLevel(level: LevelDef): LevelDef {
  return JSON.parse(JSON.stringify(level)) as LevelDef;
}

function nextId(items: Array<{ id: string }>, prefix: string) {
  let index = items.length + 1;
  while (items.some((item) => item.id === `${prefix}${index}`)) {
    index += 1;
  }
  return `${prefix}${index}`;
}

function updatePlatform(level: LevelDef, platformId: string, updater: (platform: PlatformDef) => PlatformDef) {
  return {
    ...level,
    platforms: level.platforms.map((platform) =>
      platform.id === platformId ? updater(platform) : platform
    ),
  };
}

function updateCheckpoint(level: LevelDef, checkpointId: string, updater: (checkpoint: Checkpoint) => Checkpoint) {
  return {
    ...level,
    checkpoints: level.checkpoints.map((checkpoint) =>
      checkpoint.id === checkpointId ? updater(checkpoint) : checkpoint
    ),
  };
}

function updateOrb(level: LevelDef, orbId: string, updater: (orb: DataOrb) => DataOrb) {
  return {
    ...level,
    orbs: level.orbs.map((orb) => (orb.id === orbId ? updater(orb) : orb)),
  };
}

function updateEnemy(level: LevelDef, enemyId: string, updater: (enemy: Enemy) => Enemy) {
  return {
    ...level,
    enemies: level.enemies.map((enemy) => (enemy.id === enemyId ? updater(enemy) : enemy)),
  };
}

function checkpointFromTile(id: string, tileX: number, tileY: number): Checkpoint {
  return {
    id,
    x: tileX * TILE + 10,
    y: tileY * TILE - 42,
    spawnX: tileX * TILE + 4,
    spawnY: tileY * TILE - 30,
  };
}

function orbFromTile(id: string, tileX: number, tileY: number): DataOrb {
  return {
    id,
    x: tileX * TILE + 7,
    y: tileY * TILE - 20,
  };
}

function enemyFromTile(id: string, tileX: number, tileY: number): Enemy {
  return {
    id,
    kind: "rookie",
    x: tileX * TILE,
    y: tileY * TILE - 26,
    vx: 90,
    minX: Math.max(0, tileX * TILE - TILE * 2),
    maxX: tileX * TILE + TILE * 3,
    stunnedUntil: 0,
  };
}

function applyDragPreview(level: LevelDef, dragState: DragState | null): LevelDef {
  if (!dragState) return level;

  if (dragState.kind === "platform") {
    return updatePlatform(level, dragState.id, (platform) => ({
      ...platform,
      x: dragState.candidateTileX,
      y: dragState.candidateTileY,
    }));
  }

  if (dragState.kind === "checkpoint") {
    return updateCheckpoint(level, dragState.id, () =>
      checkpointFromTile(dragState.id, dragState.candidateTileX, dragState.candidateTileY)
    );
  }

  if (dragState.kind === "orb") {
    return updateOrb(level, dragState.id, () =>
      orbFromTile(dragState.id, dragState.candidateTileX, dragState.candidateTileY)
    );
  }

  return updateEnemy(level, dragState.id, (enemy) => {
    const nextX = dragState.candidateTileX * TILE;
    const nextY = dragState.candidateTileY * TILE - 26;
    const deltaX = nextX - enemy.x;
    return {
      ...enemy,
      x: nextX,
      y: nextY,
      minX: enemy.minX + deltaX,
      maxX: enemy.maxX + deltaX,
    };
  });
}

function PixelProtocolDraftPreview({
  level,
  onClose,
}: {
  level: LevelDef;
  onClose: () => void;
}) {
  const {
    ability,
    gameViewportRef,
    level: previewLevel,
    playerRunFrame,
    playerSprite,
    portalOpen,
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
          level={previewLevel}
          message={runtime.message}
          collected={runtime.collected}
          hp={runtime.player.hp}
        />
        <PixelProtocolWorld
          gameViewportRef={gameViewportRef}
          level={previewLevel}
          playerRunFrame={playerRunFrame}
          playerSprite={playerSprite}
          portalOpen={portalOpen}
          runtime={runtime}
        />
        <PixelProtocolControlsPanel
          onReset={resetLevel}
          onExit={onClose}
          statusMessage="Test local du draft courant."
        />
      </div>
    </div>
  );
}

export default function PixelProtocolEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const draftLevelRef = useRef<LevelDef>(TEMPLATE_BASE);
  const dragStateRef = useRef<DragState | null>(null);

  const [levels, setLevels] = useState<PixelProtocolAdminLevel[]>([]);
  const [draftLevel, setDraftLevel] = useState<LevelDef>(TEMPLATE_BASE);
  const [published, setPublished] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewLevel, setPreviewLevel] = useState<LevelDef | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

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

  const worldTiles = Math.max(12, Math.round(draftLevel.worldWidth / TILE));
  const abilities = abilityFlags(displayedLevel.world);
  const readonlyJson = useMemo(() => JSON.stringify(draftLevel, null, 2), [draftLevel]);

  const resetMessages = () => {
    setStatus(null);
    setError(null);
  };

  const applyDraftLevel = (nextLevel: LevelDef, nextSelection: Selection = selection) => {
    const nextValidation = validatePlatformLayout(nextLevel);
    setDraftLevel(nextLevel);
    setSelection(nextSelection);
    setStatus(null);
    setError(nextValidation.isValid ? null : nextValidation.issues[0]?.message ?? null);
    return nextValidation.isValid;
  };

  const selectLevel = (level: PixelProtocolAdminLevel) => {
    const cleanLevel = stripAdminFields(level);
    setSelectedId(level.id);
    setPublished(level.active);
    setDraftLevel(cleanLevel);
    setSelection(cleanLevel.platforms[0] ? { kind: "platform", id: cleanLevel.platforms[0].id } : null);
    setPreviewLevel(null);
    resetMessages();
  };

  const refreshLevels = async () => {
    setLoading(true);
    try {
      const sorted = sortAdminLevels(await fetchPixelProtocolAdminLevels());
      setLevels(sorted);
      if (sorted.length > 0) {
        selectLevel(sorted[0]);
      } else {
        const fresh = makeNewLevel([]);
        setSelectedId(null);
        setPublished(true);
        setDraftLevel(fresh);
        setSelection(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement niveaux admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLevels();
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const pointerToTile = (clientX: number, clientY: number) => {
      const scroller = boardScrollRef.current;
      if (!scroller) return null;
      const rect = scroller.getBoundingClientRect();
      const localX = clientX - rect.left + scroller.scrollLeft;
      const localY = clientY - rect.top + scroller.scrollTop;
      return {
        x: Math.max(0, Math.floor(localX / EDITOR_TILE)),
        y: Math.max(0, Math.floor(localY / EDITOR_TILE)),
      };
    };

    const onPointerMove = (event: PointerEvent) => {
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
      const currentDrag = dragStateRef.current;
      if (!currentDrag) return;
      const nextLevel = applyDragPreview(draftLevelRef.current, currentDrag);
      const nextSelection: Selection = { kind: currentDrag.kind, id: currentDrag.id };
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
  }, [dragState, selection]);

  const save = async (forceActive?: boolean) => {
    const layoutValidation = validatePlatformLayout(draftLevel);
    if (!layoutValidation.isValid) {
      setError(layoutValidation.issues[0]?.message ?? "Le layout des plateformes est invalide.");
      return;
    }

    const active = forceActive ?? published;
    try {
      const saved = await savePixelProtocolLevel(draftLevel, active);
      setLevels((prev) => sortAdminLevels([saved, ...prev.filter((lvl) => lvl.id !== saved.id)]));
      setSelectedId(saved.id);
      setPublished(saved.active);
      setDraftLevel(stripAdminFields(saved));
      setSelection(saved.platforms[0] ? { kind: "platform", id: saved.platforms[0].id } : null);
      setStatus(active ? "Niveau publie." : "Niveau sauvegarde en brouillon.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur sauvegarde niveau");
    }
  };

  const removeLevel = async (levelId: string) => {
    if (!window.confirm(`Supprimer definitivement ${levelId} ?`)) return;
    try {
      await deletePixelProtocolLevel(levelId);
      const remaining = sortAdminLevels(levels.filter((lvl) => lvl.id !== levelId));
      setLevels(remaining);
      setStatus("Niveau supprime.");
      if (selectedId !== levelId) return;
      if (remaining.length > 0) {
        selectLevel(remaining[0]);
      } else {
        const fresh = makeNewLevel([]);
        setSelectedId(null);
        setPublished(true);
        setDraftLevel(fresh);
        setSelection(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression niveau");
    }
  };

  const startNewLevel = () => {
    const fresh = makeNewLevel(levels);
    setSelectedId(null);
    setPublished(false);
    setDraftLevel(fresh);
    setSelection(null);
    setPreviewLevel(null);
    resetMessages();
  };

  const setLevelField = <K extends keyof LevelDef>(field: K, value: LevelDef[K]) => {
    applyDraftLevel({ ...draftLevel, [field]: value });
  };

  const handleAddPlatform = () => {
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
    applyDraftLevel(
      { ...draftLevel, platforms: [...draftLevel.platforms, basePlatform] },
      { kind: "platform", id: newId }
    );
  };

  const handleAddCheckpoint = () => {
    const id = nextId(draftLevel.checkpoints, "c");
    const checkpoint = checkpointFromTile(id, 8, 14);
    applyDraftLevel(
      { ...draftLevel, checkpoints: [...draftLevel.checkpoints, checkpoint] },
      { kind: "checkpoint", id }
    );
  };

  const handleAddOrb = () => {
    const id = nextId(draftLevel.orbs, "o");
    const orb = orbFromTile(id, 10, 13);
    applyDraftLevel({ ...draftLevel, orbs: [...draftLevel.orbs, orb] }, { kind: "orb", id });
  };

  const handleAddEnemy = () => {
    const id = nextId(draftLevel.enemies, "e");
    const enemy = enemyFromTile(id, 12, 13);
    applyDraftLevel(
      { ...draftLevel, enemies: [...draftLevel.enemies, enemy] },
      { kind: "enemy", id }
    );
  };

  const handleDeleteSelection = () => {
    if (!selection) return;
    if (selection.kind === "platform") {
      const nextPlatforms = draftLevel.platforms.filter((item) => item.id !== selection.id);
      applyDraftLevel({ ...draftLevel, platforms: nextPlatforms }, nextPlatforms[0] ? { kind: "platform", id: nextPlatforms[0].id } : null);
      return;
    }
    if (selection.kind === "checkpoint") {
      const next = draftLevel.checkpoints.filter((item) => item.id !== selection.id);
      applyDraftLevel({ ...draftLevel, checkpoints: next }, next[0] ? { kind: "checkpoint", id: next[0].id } : null);
      return;
    }
    if (selection.kind === "orb") {
      const next = draftLevel.orbs.filter((item) => item.id !== selection.id);
      applyDraftLevel({ ...draftLevel, orbs: next }, next[0] ? { kind: "orb", id: next[0].id } : null);
      return;
    }
    const next = draftLevel.enemies.filter((item) => item.id !== selection.id);
    applyDraftLevel({ ...draftLevel, enemies: next }, next[0] ? { kind: "enemy", id: next[0].id } : null);
  };

  const handleSelectedPlatformChange = (updater: (platform: PlatformDef) => PlatformDef) => {
    if (!selectedPlatform) return;
    applyDraftLevel(
      updatePlatform(draftLevel, selectedPlatform.id, (platform) => {
        const nextPlatform = updater(platform);
        if (nextPlatform.type === "rotating" && !nextPlatform.rotateEveryMs) {
          return {
            ...nextPlatform,
            rotateEveryMs: DEFAULT_ROTATE_EVERY_MS,
          };
        }
        return nextPlatform;
      }),
      selection
    );
  };

  const handleSelectedCheckpointChange = (updater: (checkpoint: Checkpoint) => Checkpoint) => {
    if (!selectedCheckpoint) return;
    applyDraftLevel(updateCheckpoint(draftLevel, selectedCheckpoint.id, updater), selection);
  };

  const handleSelectedOrbChange = (updater: (orb: DataOrb) => DataOrb) => {
    if (!selectedOrb) return;
    applyDraftLevel(updateOrb(draftLevel, selectedOrb.id, updater), selection);
  };

  const handleSelectedEnemyChange = (updater: (enemy: Enemy) => Enemy) => {
    if (!selectedEnemy) return;
    applyDraftLevel(updateEnemy(draftLevel, selectedEnemy.id, updater), selection);
  };

  const startPlatformDrag = (event: React.PointerEvent<HTMLButtonElement>, platform: PlatformDef) => {
    event.preventDefault();
    const scroller = boardScrollRef.current;
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    const tileX = Math.floor((event.clientX - rect.left + scroller.scrollLeft) / EDITOR_TILE);
    const tileY = Math.floor((event.clientY - rect.top + scroller.scrollTop) / EDITOR_TILE);
    setSelection({ kind: "platform", id: platform.id });
    setDragState({
      kind: "platform",
      id: platform.id,
      offsetX: tileX - platform.x,
      offsetY: tileY - platform.y,
      candidateTileX: platform.x,
      candidateTileY: platform.y,
    });
  };

  const startCheckpointDrag = (event: React.PointerEvent<HTMLButtonElement>, checkpoint: Checkpoint) => {
    event.preventDefault();
    setSelection({ kind: "checkpoint", id: checkpoint.id });
    setDragState({
      kind: "checkpoint",
      id: checkpoint.id,
      candidateTileX: Math.round((checkpoint.x - 10) / TILE),
      candidateTileY: Math.round((checkpoint.y + 42) / TILE),
    });
  };

  const startOrbDrag = (event: React.PointerEvent<HTMLButtonElement>, orb: DataOrb) => {
    event.preventDefault();
    setSelection({ kind: "orb", id: orb.id });
    setDragState({
      kind: "orb",
      id: orb.id,
      candidateTileX: Math.round((orb.x - 7) / TILE),
      candidateTileY: Math.round((orb.y + 20) / TILE),
    });
  };

  const startEnemyDrag = (event: React.PointerEvent<HTMLButtonElement>, enemy: Enemy) => {
    event.preventDefault();
    setSelection({ kind: "enemy", id: enemy.id });
    setDragState({
      kind: "enemy",
      id: enemy.id,
      candidateTileX: Math.round(enemy.x / TILE),
      candidateTileY: Math.round((enemy.y + 26) / TILE),
    });
  };

  const openPreview = () => {
    const layoutValidation = validatePlatformLayout(draftLevel);
    if (!layoutValidation.isValid) {
      setError(layoutValidation.issues[0]?.message ?? "Corrige le layout avant le test.");
      return;
    }
    setPreviewLevel(cloneDraftLevel(draftLevel));
    setPreviewKey((current) => current + 1);
    setError(null);
  };

  if (user && user.role !== "ADMIN") {
    return (
      <div className="pp-editor-shell">
        <div className="pp-editor-panel">
          <h1>Acces interdit</h1>
          <p>Ce panneau est reserve aux administrateurs.</p>
          <button type="button" onClick={() => navigate("/pixel-protocol")}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-editor-shell">
      <div className="pp-editor-head">
        <div>
          <h1>Pixel Protocol - Editeur admin</h1>
          <p>Edition visuelle des plateformes, objets et ennemis avec validation de parcours.</p>
        </div>
        <div className="pp-editor-head-actions">
          <button type="button" className="retro-btn" onClick={startNewLevel}>
            Nouveau niveau
          </button>
          <button type="button" className="retro-btn" onClick={refreshLevels}>
            Actualiser
          </button>
          <button type="button" className="retro-btn" onClick={() => navigate("/pixel-protocol")}>
            Retour
          </button>
        </div>
      </div>

      <div className="pp-editor-layout">
        <aside className="pp-editor-panel pp-editor-list">
          <h2>Niveaux disponibles</h2>
          {loading ? (
            <p className="pp-editor-muted">Chargement...</p>
          ) : levels.length === 0 ? (
            <p className="pp-editor-muted">Aucun niveau en base.</p>
          ) : (
            <div className="pp-editor-list-scroll">
              {levels.map((lvl) => (
                <div
                  key={lvl.id}
                  className={`pp-editor-level ${lvl.id === selectedId ? "is-active" : ""}`}
                >
                  <div className="pp-editor-level-head">
                    <span>{lvl.name}</span>
                    <span className={lvl.active ? "tag tag-live" : "tag tag-draft"}>
                      {lvl.active ? "Publie" : "Brouillon"}
                    </span>
                  </div>
                  <div className="pp-editor-level-meta">
                    <span>ID: {lvl.id}</span>
                    <span>Monde {lvl.world}</span>
                  </div>
                  <div className="pp-editor-level-actions">
                    <button type="button" onClick={() => selectLevel(lvl)}>
                      Charger
                    </button>
                    <button type="button" className="danger" onClick={() => removeLevel(lvl.id)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="pp-editor-panel pp-editor-main">
          <div className="pp-editor-main-head">
            <div>
              <h2>Edition du niveau</h2>
              <p className="pp-editor-muted">
                Les plateformes invalides sont signalees et les liens atteignables sont traces.
              </p>
            </div>
            <label className="pp-editor-toggle">
              <input
                type="checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
              />
              Publie
            </label>
          </div>

          <div className="pp-editor-form-grid">
            <label>
              <span>ID</span>
              <input value={draftLevel.id} onChange={(event) => setLevelField("id", event.target.value)} />
            </label>
            <label>
              <span>Nom</span>
              <input value={draftLevel.name} onChange={(event) => setLevelField("name", event.target.value)} />
            </label>
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
            <label>
              <span>Largeur (tuiles)</span>
              <input
                type="number"
                min={12}
                max={180}
                value={worldTiles}
                onChange={(event) => {
                  const tiles = Math.max(12, Number(event.target.value) || 12);
                  setLevelField("worldWidth", tiles * TILE);
                }}
              />
            </label>
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
                onChange={(event) =>
                  setLevelField("spawn", { ...draftLevel.spawn, x: Number(event.target.value) || 0 })
                }
              />
            </label>
            <label>
              <span>Spawn Y</span>
              <input
                type="number"
                value={draftLevel.spawn.y}
                onChange={(event) =>
                  setLevelField("spawn", { ...draftLevel.spawn, y: Number(event.target.value) || 0 })
                }
              />
            </label>
            <label>
              <span>Portail X</span>
              <input
                type="number"
                value={draftLevel.portal.x}
                onChange={(event) =>
                  setLevelField("portal", { ...draftLevel.portal, x: Number(event.target.value) || 0 })
                }
              />
            </label>
            <label>
              <span>Portail Y</span>
              <input
                type="number"
                value={draftLevel.portal.y}
                onChange={(event) =>
                  setLevelField("portal", { ...draftLevel.portal, y: Number(event.target.value) || 0 })
                }
              />
            </label>
          </div>

          <div className="pp-editor-workbench">
            <div className="pp-editor-canvas-card">
              <div className="pp-editor-toolbar">
                <div className="pp-editor-toolbar-group">
                  <button type="button" onClick={handleAddPlatform}>Ajouter plateforme</button>
                  <button type="button" onClick={handleAddCheckpoint}>Ajouter checkpoint</button>
                  <button type="button" onClick={handleAddOrb}>Ajouter orb</button>
                  <button type="button" onClick={handleAddEnemy}>Ajouter ennemi</button>
                  <button type="button" onClick={handleDeleteSelection} disabled={!selection}>
                    Supprimer selection
                  </button>
                </div>
                <div className="pp-editor-toolbar-hint">
                  Capacites actives: {abilities.doubleJump ? "double jump" : "saut simple"} / {abilities.airDash ? "dash" : "pas de dash"}
                </div>
              </div>

              <div ref={boardScrollRef} className="pp-editor-world-scroll">
                <div
                  className="pp-editor-world"
                  style={{ width: worldTiles * EDITOR_TILE, height: WORLD_ROWS * EDITOR_TILE }}
                >
                  <svg className="pp-editor-links" width={worldTiles * EDITOR_TILE} height={WORLD_ROWS * EDITOR_TILE}>
                    {validation.links.map((link, index) => {
                      const from =
                        link.from.kind === "spawn"
                          ? {
                              x: (displayedLevel.spawn.x / TILE) * EDITOR_TILE + 10,
                              y: (displayedLevel.spawn.y / TILE) * EDITOR_TILE + 10,
                            }
                          : platformCenterMap.get(link.from.platformId)
                            ? {
                                x: (platformCenterMap.get(link.from.platformId)!.x / TILE) * EDITOR_TILE,
                                y: (platformCenterMap.get(link.from.platformId)!.y / TILE) * EDITOR_TILE,
                              }
                            : null;
                      const toCenter = platformCenterMap.get(link.to.platformId);
                      const to = toCenter
                        ? {
                            x: (toCenter.x / TILE) * EDITOR_TILE,
                            y: (toCenter.y / TILE) * EDITOR_TILE,
                          }
                        : null;
                      if (!from || !to) return null;
                      return <line key={`${link.to.platformId}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
                    })}
                  </svg>

                  <div
                    className="pp-editor-ground"
                    style={{ top: (WORLD_ROWS - 1) * EDITOR_TILE, height: EDITOR_TILE }}
                  />

                  <div
                    className="pp-editor-spawn"
                    style={{
                      left: (displayedLevel.spawn.x / TILE) * EDITOR_TILE,
                      top: (displayedLevel.spawn.y / TILE) * EDITOR_TILE,
                    }}
                  >
                    Spawn
                  </div>
                  <div
                    className="pp-editor-portal"
                    style={{
                      left: (displayedLevel.portal.x / TILE) * EDITOR_TILE,
                      top: (displayedLevel.portal.y / TILE) * EDITOR_TILE,
                    }}
                  >
                    Exit
                  </div>

                  {renderPlatforms.map(({ platform, blocks, bounds }) => (
                    <button
                      key={platform.id}
                      type="button"
                      className={`pp-editor-platform-layer ${
                        selection?.kind === "platform" && selection.id === platform.id ? "is-selected" : ""
                      } ${dragState?.kind === "platform" && dragState.id === platform.id ? "is-dragging" : ""}`}
                      onPointerDown={(event) => startPlatformDrag(event, platform)}
                      onClick={() => setSelection({ kind: "platform", id: platform.id })}
                      style={
                        bounds
                          ? {
                              left: (bounds.left / TILE) * EDITOR_TILE,
                              top: (bounds.top / TILE) * EDITOR_TILE,
                              width: (bounds.width / TILE) * EDITOR_TILE,
                              height: (bounds.height / TILE) * EDITOR_TILE,
                            }
                          : undefined
                      }
                    >
                      {blocks.map((block, index) => (
                        <span
                          key={`${platform.id}-${index}`}
                          className={`pp-platform ${PLATFORM_CLASS[platform.type]} pp-editor-platform-block ${
                            validation.reachablePlatformIds.includes(platform.id) ? "is-reachable" : "is-unreachable"
                          }`}
                          style={{
                            left: ((block.x - (bounds?.left ?? 0)) / TILE) * EDITOR_TILE,
                            top: ((block.y - (bounds?.top ?? 0)) / TILE) * EDITOR_TILE,
                            width: EDITOR_TILE,
                            height: EDITOR_TILE,
                          }}
                        />
                      ))}
                      <span className="pp-editor-platform-badge">{platform.id}</span>
                    </button>
                  ))}

                  {displayedLevel.checkpoints.map((checkpoint) => (
                    <button
                      key={checkpoint.id}
                      type="button"
                      className={`pp-editor-entity pp-editor-entity--checkpoint ${
                        selection?.kind === "checkpoint" && selection.id === checkpoint.id ? "is-selected" : ""
                      }`}
                      style={{
                        left: (checkpoint.x / TILE) * EDITOR_TILE,
                        top: (checkpoint.y / TILE) * EDITOR_TILE,
                      }}
                      onPointerDown={(event) => startCheckpointDrag(event, checkpoint)}
                      onClick={() => setSelection({ kind: "checkpoint", id: checkpoint.id })}
                    >
                      {checkpoint.id}
                    </button>
                  ))}

                  {displayedLevel.orbs.map((orb) => (
                    <button
                      key={orb.id}
                      type="button"
                      className={`pp-editor-entity pp-editor-entity--orb ${
                        selection?.kind === "orb" && selection.id === orb.id ? "is-selected" : ""
                      }`}
                      style={{
                        left: (orb.x / TILE) * EDITOR_TILE,
                        top: (orb.y / TILE) * EDITOR_TILE,
                      }}
                      onPointerDown={(event) => startOrbDrag(event, orb)}
                      onClick={() => setSelection({ kind: "orb", id: orb.id })}
                    >
                      {orb.id}
                    </button>
                  ))}

                  {displayedLevel.enemies.map((enemy) => (
                    <button
                      key={enemy.id}
                      type="button"
                      className={`pp-editor-entity pp-editor-entity--enemy ${
                        selection?.kind === "enemy" && selection.id === enemy.id ? "is-selected" : ""
                      }`}
                      style={{
                        left: (enemy.x / TILE) * EDITOR_TILE,
                        top: (enemy.y / TILE) * EDITOR_TILE,
                      }}
                      onPointerDown={(event) => startEnemyDrag(event, enemy)}
                      onClick={() => setSelection({ kind: "enemy", id: enemy.id })}
                    >
                      <span>{enemy.id}</span>
                      <span className="pp-editor-entity-range" style={{ width: ((enemy.maxX - enemy.minX) / TILE) * EDITOR_TILE }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pp-editor-preview">
                <h3>Etat du layout</h3>
                <div className="pp-editor-preview-grid">
                  <div>Platforms: {draftLevel.platforms.length}</div>
                  <div>Reachable: {validation.reachablePlatformIds.length}</div>
                  <div>Checkpoints: {draftLevel.checkpoints.length}</div>
                  <div>Orbs: {draftLevel.orbs.length}</div>
                  <div>Ennemis: {draftLevel.enemies.length}</div>
                  <div>Liens: {validation.links.length}</div>
                </div>
              </div>
            </div>

            <aside className="pp-editor-inspector">
              <div className="pp-editor-panel pp-editor-subpanel">
                <h2>Selection</h2>
                {selectedPlatform && (
                  <>
                    <div className="pp-editor-code">{selectedPlatform.id}</div>
                    <div className="pp-editor-chip-grid">
                      {TETROMINOS.map((tetromino) => (
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
                    <div className="pp-editor-chip-grid">
                      {PLATFORM_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          className={selectedPlatform.type === type ? "is-active" : ""}
                          onClick={() =>
                            handleSelectedPlatformChange((platform) => ({
                              ...platform,
                              type,
                              rotateEveryMs:
                                type === "rotating"
                                  ? platform.rotateEveryMs ?? DEFAULT_ROTATE_EVERY_MS
                                  : platform.rotateEveryMs,
                            }))
                          }
                        >
                          {type}
                        </button>
                      ))}
                    </div>
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
                                rotateEveryMs:
                                  Math.max(100, Number(event.target.value) || DEFAULT_ROTATE_EVERY_MS),
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                  </>
                )}

                {selectedCheckpoint && (
                  <>
                    <div className="pp-editor-code">{selectedCheckpoint.id}</div>
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
                  </>
                )}

                {selectedOrb && (
                  <>
                    <div className="pp-editor-code">{selectedOrb.id}</div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>X</span>
                        <input
                          type="number"
                          value={selectedOrb.x}
                          onChange={(event) =>
                            handleSelectedOrbChange((orb) => ({ ...orb, x: Number(event.target.value) || 0 }))
                          }
                        />
                      </label>
                      <label>
                        <span>Y</span>
                        <input
                          type="number"
                          value={selectedOrb.y}
                          onChange={(event) =>
                            handleSelectedOrbChange((orb) => ({ ...orb, y: Number(event.target.value) || 0 }))
                          }
                        />
                      </label>
                    </div>
                  </>
                )}

                {selectedEnemy && (
                  <>
                    <div className="pp-editor-code">{selectedEnemy.id}</div>
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
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>X</span>
                        <input
                          type="number"
                          value={selectedEnemy.x}
                          onChange={(event) =>
                            handleSelectedEnemyChange((enemy) => ({ ...enemy, x: Number(event.target.value) || 0 }))
                          }
                        />
                      </label>
                      <label>
                        <span>Y</span>
                        <input
                          type="number"
                          value={selectedEnemy.y}
                          onChange={(event) =>
                            handleSelectedEnemyChange((enemy) => ({ ...enemy, y: Number(event.target.value) || 0 }))
                          }
                        />
                      </label>
                    </div>
                    <div className="pp-editor-inline-fields">
                      <label>
                        <span>Min X</span>
                        <input
                          type="number"
                          value={selectedEnemy.minX}
                          onChange={(event) =>
                            handleSelectedEnemyChange((enemy) => ({ ...enemy, minX: Number(event.target.value) || 0 }))
                          }
                        />
                      </label>
                      <label>
                        <span>Max X</span>
                        <input
                          type="number"
                          value={selectedEnemy.maxX}
                          onChange={(event) =>
                            handleSelectedEnemyChange((enemy) => ({ ...enemy, maxX: Number(event.target.value) || 0 }))
                          }
                        />
                      </label>
                    </div>
                  </>
                )}

                {!selection && <p className="pp-editor-muted">Selectionne un element sur la grille.</p>}
              </div>

              <div className="pp-editor-panel pp-editor-subpanel">
                <h2>Elements du niveau</h2>
                <div className="pp-editor-platform-list">
                  {draftLevel.platforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      className={`pp-editor-platform-row ${
                        selection?.kind === "platform" && selection.id === platform.id ? "is-active" : ""
                      }`}
                      onClick={() => setSelection({ kind: "platform", id: platform.id })}
                    >
                      <span>{platform.id}</span>
                      <span>{platform.tetromino} / {platform.type}</span>
                      <span>({platform.x}, {platform.y})</span>
                    </button>
                  ))}
                  {draftLevel.checkpoints.map((checkpoint) => (
                    <button
                      key={checkpoint.id}
                      type="button"
                      className={`pp-editor-platform-row ${
                        selection?.kind === "checkpoint" && selection.id === checkpoint.id ? "is-active" : ""
                      }`}
                      onClick={() => setSelection({ kind: "checkpoint", id: checkpoint.id })}
                    >
                      <span>{checkpoint.id}</span>
                      <span>checkpoint</span>
                      <span>({checkpoint.x}, {checkpoint.y})</span>
                    </button>
                  ))}
                  {draftLevel.orbs.map((orb) => (
                    <button
                      key={orb.id}
                      type="button"
                      className={`pp-editor-platform-row ${
                        selection?.kind === "orb" && selection.id === orb.id ? "is-active" : ""
                      }`}
                      onClick={() => setSelection({ kind: "orb", id: orb.id })}
                    >
                      <span>{orb.id}</span>
                      <span>orb</span>
                      <span>({orb.x}, {orb.y})</span>
                    </button>
                  ))}
                  {draftLevel.enemies.map((enemy) => (
                    <button
                      key={enemy.id}
                      type="button"
                      className={`pp-editor-platform-row ${
                        selection?.kind === "enemy" && selection.id === enemy.id ? "is-active" : ""
                      }`}
                      onClick={() => setSelection({ kind: "enemy", id: enemy.id })}
                    >
                      <span>{enemy.id}</span>
                      <span>{enemy.kind}</span>
                      <span>({enemy.x}, {enemy.y})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pp-editor-panel pp-editor-subpanel">
                <h2>Validation</h2>
                {validation.isValid ? (
                  <div className="pp-editor-status success">
                    Layout valide: toutes les plateformes sont atteignables.
                  </div>
                ) : (
                  <div className="pp-editor-issues">
                    {validation.issues.map((issue, index) => (
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
                )}
              </div>
            </aside>
          </div>

          <div className="pp-editor-actions">
            <button type="button" onClick={() => save(false)}>Sauver brouillon</button>
            <button type="button" onClick={() => save(true)}>Publier</button>
            <button type="button" onClick={openPreview}>Tester le niveau</button>
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
