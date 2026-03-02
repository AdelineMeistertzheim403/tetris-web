import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LevelDef } from "../types";
import { TILE } from "../constants";
import {
  deletePixelProtocolLevel,
  fetchPixelProtocolAdminLevels,
  savePixelProtocolLevel,
  type PixelProtocolAdminLevel,
} from "../services/pixelProtocolService";
import { useAuth } from "../../auth/context/AuthContext";
import "../../../styles/pixel-protocol-editor.css";

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

function parseStage(id: string) {
  const match = id.match(/w\d+-(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function sortAdminLevels(levels: PixelProtocolAdminLevel[]) {
  return [...levels].sort((a, b) => {
    if (a.world !== b.world) return a.world - b.world;
    const stageA = parseStage(a.id);
    const stageB = parseStage(b.id);
    return stageA - stageB;
  });
}

function makeNewLevel(levels: PixelProtocolAdminLevel[]): LevelDef {
  const world = 1;
  const existingStages = levels
    .filter((lvl) => lvl.world === world)
    .map((lvl) => parseStage(lvl.id))
    .filter((value) => Number.isFinite(value));
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

function isLevelDef(value: unknown): value is LevelDef {
  if (!value || typeof value !== "object") return false;
  const level = value as LevelDef;
  return (
    typeof level.id === "string" &&
    typeof level.name === "string" &&
    typeof level.world === "number" &&
    typeof level.worldWidth === "number" &&
    typeof level.requiredOrbs === "number" &&
    typeof level.spawn?.x === "number" &&
    typeof level.spawn?.y === "number" &&
    typeof level.portal?.x === "number" &&
    typeof level.portal?.y === "number" &&
    Array.isArray(level.platforms) &&
    Array.isArray(level.checkpoints) &&
    Array.isArray(level.orbs) &&
    Array.isArray(level.enemies)
  );
}

export default function PixelProtocolEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [levels, setLevels] = useState<PixelProtocolAdminLevel[]>([]);
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(TEMPLATE_BASE, null, 2)
  );
  const [published, setPublished] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const preview = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!isLevelDef(parsed)) {
        return { ok: false, reason: "Structure invalide" as const };
      }
      return { ok: true as const, level: parsed };
    } catch {
      return { ok: false, reason: "JSON invalide" as const };
    }
  }, [jsonText]);

  const selectLevel = (level: PixelProtocolAdminLevel) => {
    setSelectedId(level.id);
    setPublished(level.active);
    setJsonText(JSON.stringify(stripAdminFields(level), null, 2));
    setStatus(null);
    setError(null);
  };

  const refreshLevels = async () => {
    setLoading(true);
    try {
      const data = await fetchPixelProtocolAdminLevels();
      const sorted = sortAdminLevels(data);
      setLevels(sorted);
      if (sorted.length > 0) {
        selectLevel(sorted[0]);
      } else {
        const fresh = makeNewLevel([]);
        setJsonText(JSON.stringify(fresh, null, 2));
        setSelectedId(null);
        setPublished(true);
      }
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur chargement niveaux admin";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLevels();
  }, []);

  const save = async (forceActive?: boolean) => {
    if (!preview.ok) {
      setError(`Impossible de sauver: ${preview.reason}`);
      return;
    }

    const active = forceActive ?? published;
    try {
      const saved = await savePixelProtocolLevel(preview.level, active);
      setLevels((prev) => {
        const next = prev.filter((lvl) => lvl.id !== saved.id);
        return sortAdminLevels([saved, ...next]);
      });
      selectLevel(saved);
      setStatus(active ? "Niveau publie." : "Niveau sauvegarde (brouillon).");
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur sauvegarde niveau";
      setError(message);
    }
  };

  const remove = async (levelId: string) => {
    if (!levelId) return;
    if (!window.confirm(`Supprimer definitivement ${levelId} ?`)) return;
    try {
      await deletePixelProtocolLevel(levelId);
      setLevels((prev) => sortAdminLevels(prev.filter((lvl) => lvl.id !== levelId)));
      setStatus("Niveau supprime.");
      setError(null);
      if (selectedId === levelId) {
        const remaining = levels.filter((lvl) => lvl.id !== levelId);
        if (remaining.length > 0) {
          selectLevel(remaining[0]);
        } else {
          const fresh = makeNewLevel([]);
          setJsonText(JSON.stringify(fresh, null, 2));
          setSelectedId(null);
          setPublished(true);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur suppression niveau";
      setError(message);
    }
  };

  const startNewLevel = () => {
    const fresh = makeNewLevel(levels);
    setSelectedId(null);
    setPublished(false);
    setJsonText(JSON.stringify(fresh, null, 2));
    setStatus(null);
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
          <p>Creation, publication et maintenance des niveaux globaux.</p>
        </div>
        <div className="pp-editor-head-actions">
          <button type="button" className="retro-btn" onClick={startNewLevel}>
            Nouveau niveau
          </button>
          <button type="button" className="retro-btn" onClick={refreshLevels}>
            Actualiser
          </button>
          <button
            type="button"
            className="retro-btn"
            onClick={() => navigate("/pixel-protocol")}
          >
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
                    <button
                      type="button"
                      className="danger"
                      onClick={() => remove(lvl.id)}
                    >
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
              <h2>Configuration JSON</h2>
              <p className="pp-editor-muted">
                Modifie directement la definition LevelDef (platforms, orbs,
                checkpoints, ennemis).
              </p>
            </div>
            <label className="pp-editor-toggle">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Publie
            </label>
          </div>

          <textarea
            className="pp-editor-json"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />

          <div className="pp-editor-actions">
            <button type="button" onClick={() => save(false)}>
              Sauver brouillon
            </button>
            <button type="button" onClick={() => save(true)}>
              Publier
            </button>
          </div>

          <div className="pp-editor-preview">
            <h3>Preview</h3>
            {preview.ok ? (
              <div className="pp-editor-preview-grid">
                <div>Id: {preview.level.id}</div>
                <div>Nom: {preview.level.name}</div>
                <div>Monde: {preview.level.world}</div>
                <div>Largeur: {preview.level.worldWidth}px</div>
                <div>Orbs: {preview.level.requiredOrbs}</div>
                <div>Platforms: {preview.level.platforms.length}</div>
                <div>Checkpoints: {preview.level.checkpoints.length}</div>
                <div>Ennemis: {preview.level.enemies.length}</div>
              </div>
            ) : (
              <p className="pp-editor-muted">Preview indisponible: {preview.reason}</p>
            )}
          </div>

          {status && <div className="pp-editor-status success">{status}</div>}
          {error && <div className="pp-editor-status error">{error}</div>}
        </section>
      </div>
    </div>
  );
}
