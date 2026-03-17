import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import { useAuth } from "../../auth/context/AuthContext";
import {
  exportLevelJson,
  listCustomLevels,
  mergeCustomLevels,
  parseLevelsFromJson,
  removeCustomLevel,
  upsertCustomLevel,
} from "../utils/customLevels";
import type { BrickType, BrickfallBrick, BrickfallLevel } from "../types/levels";
import {
  deleteBrickfallSoloCustomLevel,
  fetchBrickfallSoloCommunityLevels,
  fetchBrickfallSoloCustomLevels,
  publishBrickfallSoloCommunityLevel,
  saveBrickfallSoloCustomLevel,
  type BrickfallSoloCommunityLevel,
} from "../services/brickfallSoloService";
import {
  getBrickfallSoloCustomLevelCompletion,
  hasCompletedCurrentBrickfallSoloLevel,
} from "../utils/communityCompletion";
import "../../../styles/roguelike.css";
import "../../../styles/pixel-protocol-editor.css";
import "../../../styles/brickfall-editor.css";

const GRID_W = 25;
const GRID_H = 20;
const CELL_SIZE = 35;

const TYPE_COLORS: Record<BrickType, string> = {
  normal: "#ff7b00",
  armor: "#8b8b8b",
  bonus: "#22c55e",
  malus: "#ef4444",
  explosive: "#facc15",
  cursed: "#7c3aed",
  mirror: "#22d3ee",
};

function makeEmptyLevel(): BrickfallLevel {
  const ts = Date.now().toString(36);
  return {
    id: `custom-${ts}`,
    name: "Niveau custom",
    width: GRID_W,
    height: GRID_H,
    bricks: [],
    boss: false,
  };
}

export default function BrickfallEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkAchievements, updateStats } = useAchievements();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [levels, setLevels] = useState<BrickfallLevel[]>([]);
  const [communityLevels, setCommunityLevels] = useState<BrickfallSoloCommunityLevel[]>([]);
  const [active, setActive] = useState<BrickfallLevel>(makeEmptyLevel());
  const [selectedType, setSelectedType] = useState<BrickType>("normal");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const local = listCustomLevels();
    setLevels(local);
    (async () => {
      try {
        const [remote, remoteCommunity] = await Promise.all([
          fetchBrickfallSoloCustomLevels(),
          fetchBrickfallSoloCommunityLevels().catch(() => []),
        ]);
        const merged = mergeCustomLevels(remote);
        setLevels(merged);
        setCommunityLevels(remoteCommunity);
      } catch {
        // Non bloquant: l'editeur reste utilisable avec localStorage.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brickMap = useMemo(() => {
    const map = new Map<string, BrickfallBrick>();
    for (const b of active.bricks) map.set(`${b.x}:${b.y}`, b);
    return map;
  }, [active.bricks]);
  const currentCompletion = useMemo(() => getBrickfallSoloCustomLevelCompletion(active), [active]);
  const ownPublishedLevel = useMemo(
    () => communityLevels.find((item) => item.isOwn && item.level.id === active.id) ?? null,
    [active.id, communityLevels]
  );
  const canPublishCommunityLevel = Boolean(user) && hasCompletedCurrentBrickfallSoloLevel(active);

  const updateCell = (x: number, y: number) => {
    setActive((prev) => {
      const key = `${x}:${y}`;
      const next = new Map<string, BrickfallBrick>();
      for (const b of prev.bricks) next.set(`${b.x}:${b.y}`, b);
      const existing = next.get(key);
      if (existing && existing.type === selectedType) {
        next.delete(key);
      } else {
        next.set(key, {
          x,
          y,
          type: selectedType,
          hp: selectedType === "armor" ? 3 : 1,
        });
      }
      return { ...prev, bricks: [...next.values()] };
    });
  };

  const save = async () => {
    const merged = upsertCustomLevel(active);
    setLevels(merged);
    try {
      await saveBrickfallSoloCustomLevel(active);
      setError(null);
    } catch {
      setError("Sauvegarde locale OK, mais echec de synchro BDD.");
    }
    const next = updateStats((prev) => ({
      ...prev,
      brickfallSoloEditorCreated: prev.brickfallSoloEditorCreated + 1,
    }));
    checkAchievements({
      mode: "BRICKFALL_SOLO",
      custom: { bf_editor_create: next.brickfallSoloEditorCreated >= 1 },
    });
  };

  const loadLevel = (level: BrickfallLevel) => {
    setActive(level);
  };

  const del = async (id: string) => {
    const next = removeCustomLevel(id);
    setLevels(next);
    try {
      await deleteBrickfallSoloCustomLevel(id);
      setError(null);
    } catch {
      setError("Suppression locale OK, mais echec de synchro BDD.");
    }
    if (active.id === id) {
      const fallback = next[0] ?? makeEmptyLevel();
      setActive(fallback);
    }
  };

  const importFromJsonText = async (jsonText: string) => {
    try {
      const parsed = parseLevelsFromJson(jsonText);
      if (!parsed.length) {
        setError("JSON invalide ou vide");
        return;
      }
      const merged = mergeCustomLevels(parsed);
      setLevels(merged);
      setActive(parsed[0]);
      await Promise.allSettled(parsed.map((lvl) => saveBrickfallSoloCustomLevel(lvl)));
      setError(null);
    } catch {
      setError("Impossible d'importer ce JSON");
    }
  };

  const openImportFileDialog = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const onImportFileSelected = async (evt: ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    try {
      const jsonText = await file.text();
      await importFromJsonText(jsonText);
    } catch {
      setError("Impossible de lire ce fichier JSON");
    }
  };

  const exportActive = () => {
    const json = exportLevelJson(active);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const publish = async () => {
    if (!user) {
      setError("Connecte-toi pour publier un niveau.");
      return;
    }
    if (!hasCompletedCurrentBrickfallSoloLevel(active)) {
      setError("Tu dois finir cette version exacte du niveau avant de le publier.");
      return;
    }

    const merged = upsertCustomLevel(active);
    setLevels(merged);
    try {
      await saveBrickfallSoloCustomLevel(active);
      const publishedLevel = await publishBrickfallSoloCommunityLevel(active.id);
      setCommunityLevels((current) => {
        const next = [publishedLevel, ...current.filter((item) => item.id !== publishedLevel.id)];
        next.sort((a, b) => b.likeCount - a.likeCount || b.id - a.id);
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publication impossible");
    }
  };

  return (
    <div className="brickfall-editor text-pink-300 font-['Press_Start_2P']">
      <div className="pp-editor-shell brickfall-editor-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onImportFileSelected}
      />
      <div className="pp-editor-head brickfall-editor-head">
        <div className="brickfall-editor-head-main">
          <h1>Brickfall Solo - Editeur de niveaux</h1>
          <p>Compose la grille, teste la version courante puis publie-la apres un clear valide.</p>
          <div className="brickfall-editor-head-fields">
            <div>
              <div className="brickfall-editor-label">ID</div>
              <input
                className="brickfall-editor-input"
                value={active.id}
                onChange={(e) => setActive((p) => ({ ...p, id: e.target.value }))}
              />
            </div>
            <div>
              <div className="brickfall-editor-label">Nom</div>
              <input
                className="brickfall-editor-input"
                value={active.name}
                onChange={(e) => setActive((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="pp-editor-head-actions">
          <button
            className="pp-editor-icon-btn pp-editor-icon-btn--help"
            type="button"
            title="Aide"
            aria-label="Aide editeur"
            onClick={() => navigate("/brickfall/help/editor")}
          >
            <i className="fa-solid fa-circle-question" />
          </button>
          <button
            className="brickfall-editor-icon-btn pp-editor-icon-btn pp-editor-icon-btn--save"
            type="button"
            title="Sauver"
            aria-label="Sauver le niveau"
            onClick={save}
          >
            <i className="fa-solid fa-floppy-disk" />
          </button>
          <button
            className="brickfall-editor-icon-btn pp-editor-icon-btn pp-editor-icon-btn--build"
            type="button"
            title="Nouveau"
            aria-label="Nouveau niveau"
            onClick={() => {
              const empty = makeEmptyLevel();
              setActive(empty);
            }}
          >
            <i className="fa-solid fa-file-circle-plus" />
          </button>
          <button
            className="brickfall-editor-icon-btn pp-editor-icon-btn pp-editor-icon-btn--export"
            type="button"
            title="Export JSON"
            aria-label="Exporter en JSON"
            onClick={exportActive}
          >
            <i className="fa-solid fa-file-export" />
          </button>
          <button
            className="brickfall-editor-icon-btn pp-editor-icon-btn pp-editor-icon-btn--import"
            type="button"
            title="Import JSON"
            aria-label="Importer un JSON"
            onClick={openImportFileDialog}
          >
            <i className="fa-solid fa-file-import" />
          </button>
          <button
            className="brickfall-editor-icon-btn pp-editor-icon-btn pp-editor-icon-btn--publish"
            type="button"
            title={
              !user
                ? "Connexion requise"
                : canPublishCommunityLevel
                  ? "Publier dans la galerie"
                  : "Finis ce niveau avant publication"
            }
            aria-label="Publier dans la galerie joueurs"
            onClick={publish}
            disabled={!canPublishCommunityLevel}
          >
            <i className="fa-solid fa-users" />
          </button>
          <button
            className="brickfall-editor-icon-btn pp-editor-icon-btn pp-editor-icon-btn--play"
            type="button"
            title="Jouer ce niveau"
            aria-label="Jouer ce niveau"
            onClick={() => navigate(`/brickfall-solo/play?custom=${encodeURIComponent(active.id)}`)}
          >
            <i className="fa-solid fa-play" />
          </button>
          <button
            className="pp-editor-icon-btn pp-editor-icon-btn--back"
            type="button"
            title="Retour Solo"
            aria-label="Retour hub Brickfall Solo"
            onClick={() => navigate("/brickfall-solo")}
          >
            <i className="fa-solid fa-arrow-left" />
          </button>
        </div>
      </div>

      <div className="brickfall-editor-columns">
        <div className="panel pp-editor-panel brickfall-editor-side">
          <h2 className="brickfall-editor-side-title">Niveaux sauvegardes</h2>
          <div className="brickfall-editor-levels">
            {levels.length === 0 && <div className="brickfall-editor-empty">Aucun niveau custom.</div>}
            {levels.map((lvl) => (
              <div key={lvl.id} className={`pp-editor-level brickfall-editor-level-card ${lvl.id === active.id ? "is-active" : ""}`}>
                <div className="pp-editor-level-head">
                  <span>{lvl.name}</span>
                </div>
                <div className="pp-editor-level-meta">
                  <span>id: {lvl.id}</span>
                  <span>blocs: {lvl.bricks.length}</span>
                </div>
                <div className="pp-editor-level-actions">
                  <button
                    className="brickfall-editor-icon-btn pp-editor-icon-btn pp-editor-icon-btn--load brickfall-editor-icon-btn--full"
                    type="button"
                    title="Charger"
                    aria-label={`Charger ${lvl.name}`}
                    onClick={() => loadLevel(lvl)}
                  >
                    <i className="fa-solid fa-folder-open" />
                  </button>
                  <button
                    className="brickfall-editor-icon-btn pp-editor-icon-btn pp-editor-icon-btn--danger brickfall-editor-icon-btn--danger brickfall-editor-icon-btn--full"
                    type="button"
                    title="Supprimer"
                    aria-label={`Supprimer ${lvl.name}`}
                    onClick={() => del(lvl.id)}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel pp-editor-panel brickfall-editor-grid-card">
          <div
            className="brickfall-editor-grid"
            style={{ gridTemplateColumns: `repeat(${GRID_W}, ${CELL_SIZE}px)`, gap: "0px" }}
          >
            {Array.from({ length: GRID_H * GRID_W }, (_, i) => {
              const x = i % GRID_W;
              const y = Math.floor(i / GRID_W);
              const brick = brickMap.get(`${x}:${y}`);
              return (
                <div
                  key={`${x}:${y}`}
                  onClick={() => updateCell(x, y)}
                  className="brickfall-editor-cell"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: brick ? TYPE_COLORS[brick.type] : "#0b0b14",
                  }}
                  title={`${x},${y}${brick ? ` - ${brick.type}` : ""}`}
                />
              );
            })}
          </div>
        </div>

        <div className="panel pp-editor-panel brickfall-editor-side space-y-3">
          <label className="brickfall-editor-checkbox">
            <input
              type="checkbox"
              checked={Boolean(active.boss)}
              onChange={(e) => setActive((p) => ({ ...p, boss: e.target.checked }))}
            />
            Boss
          </label>

          <div className="brickfall-editor-label">Type de bloc</div>
          <div className="brickfall-editor-type-grid">
            {(["normal", "armor", "bonus", "malus", "explosive", "cursed", "mirror"] as BrickType[]).map((t) => (
              <button
                key={t}
                className={`brickfall-editor-type-btn ${selectedType === t ? "is-active" : ""}`}
                style={{ borderColor: selectedType === t ? "#facc15" : undefined }}
                onClick={() => setSelectedType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="brickfall-editor-status">
            {currentCompletion
              ? `Test valide: ${new Date(currentCompletion.completedAt).toLocaleString("fr-FR")}`
              : "Publication verrouillee tant que ce niveau n'a pas ete termine."}
          </div>
          {ownPublishedLevel && (
            <div className="brickfall-editor-status">
              Niveau deja publie. Likes actuels: {ownPublishedLevel.likeCount}.
            </div>
          )}

          {error && <div className="brickfall-editor-error">{error}</div>}
        </div>
      </div>
      </div>
    </div>
  );
}
