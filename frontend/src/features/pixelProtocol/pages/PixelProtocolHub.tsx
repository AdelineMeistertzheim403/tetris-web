import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import {
  fetchPixelProtocolCustomLevels,
  fetchPixelProtocolProgress,
  fetchPixelProtocolWorldTemplates,
  type PixelProtocolProgress,
} from "../services/pixelProtocolService";
import {
  listPixelProtocolCustomLevels,
  mergePixelProtocolCustomLevels,
} from "../utils/customLevels";
import { readLocalPixelProtocolProgress } from "../utils/progress";
import { readLocalPixelProtocolSkills } from "../utils/skills";
import {
  listPixelProtocolWorldTemplates,
  mergePixelProtocolWorldTemplates,
} from "../utils/worldTemplates";
import type { LevelDef, WorldTemplate } from "../types";
import "../../../styles/pixel-protocol-hub.css";

function toWorldStage(levelIndex: number) {
  const levelsPerWorld = 5;
  const world = Math.floor((levelIndex - 1) / levelsPerWorld) + 1;
  const stage = ((levelIndex - 1) % levelsPerWorld) + 1;
  return { world, stage };
}

export default function PixelProtocolHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState<PixelProtocolProgress>(() =>
    readLocalPixelProtocolProgress()
  );
  const [customLevels, setCustomLevels] = useState<LevelDef[]>(() =>
    listPixelProtocolCustomLevels()
  );
  const [selectedCustomId, setSelectedCustomId] = useState("");
  const [worldTemplates, setWorldTemplates] = useState<WorldTemplate[]>(() =>
    listPixelProtocolWorldTemplates()
  );
  const [selectedWorldId, setSelectedWorldId] = useState("");
  const [showEditorChooser, setShowEditorChooser] = useState(false);
  const [unlockedSkills] = useState(() => readLocalPixelProtocolSkills());
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setSyncError(null);

      const localProgress = readLocalPixelProtocolProgress();
      const localCustomLevels = listPixelProtocolCustomLevels();

      if (!cancelled) {
        setProgress(localProgress);
        setCustomLevels(localCustomLevels);
        setWorldTemplates(listPixelProtocolWorldTemplates());
      }

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const [remoteProgress, remoteCustomLevels, remoteWorldTemplates] = await Promise.all([
          fetchPixelProtocolProgress(),
          fetchPixelProtocolCustomLevels(),
          fetchPixelProtocolWorldTemplates(),
        ]);
        if (cancelled) return;

        setProgress({
          highestLevel: Math.max(localProgress.highestLevel, remoteProgress.highestLevel),
          currentLevel: Math.max(localProgress.currentLevel, remoteProgress.currentLevel),
          updatedAt: remoteProgress.updatedAt ?? localProgress.updatedAt ?? null,
        });
        setCustomLevels(mergePixelProtocolCustomLevels(remoteCustomLevels));
        setWorldTemplates(mergePixelProtocolWorldTemplates(remoteWorldTemplates));
      } catch {
        if (!cancelled) {
          setSyncError("Mode hors ligne: donnees locales utilisees.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (customLevels.length > 0 && !selectedCustomId) {
      setSelectedCustomId(customLevels[0].id);
    }
  }, [customLevels, selectedCustomId]);

  useEffect(() => {
    if (worldTemplates.length > 0 && !selectedWorldId) {
      setSelectedWorldId(worldTemplates[0].id);
    }
  }, [worldTemplates, selectedWorldId]);

  const stage = useMemo(
    () => toWorldStage(progress.currentLevel),
    [progress.currentLevel]
  );

  return (
    <div className="pp-hub font-['Press_Start_2P']">
      <div className="pp-hub-shell">
        <h1 className="pp-hub-title">Pixel Protocol</h1>

        <div className="pp-hub-grid">
          <section className="panel pp-hub-card">
            <h2 className="text-cyan-200">Profil campagne</h2>
            <div className="pp-hub-stat">Checkpoint: niveau {progress.currentLevel}</div>
            <div className="pp-hub-stat">Plus haut niveau: {progress.highestLevel}</div>
            <div className="pp-hub-stat">Monde: {stage.world}</div>
            <div className="pp-hub-stat">Stage: {stage.stage}</div>
            <div className="pp-hub-stat">
              Modules: {unlockedSkills.length ? unlockedSkills.join(", ").replaceAll("_", " ") : "aucun"}
            </div>
            <div className="pp-hub-stat">
              Role editeur: {user?.role === "ADMIN" ? "admin" : "custom prive"}
            </div>
            {syncError && <div className="pp-hub-stat text-yellow-300">{syncError}</div>}
            {loading && <div className="pp-hub-stat text-gray-300">Chargement...</div>}
          </section>

          <section className="panel pp-hub-card">
            <h2 className="text-pink-300">Actions</h2>
            <div className="pp-hub-stack">
              <button
                className="pp-hub-btn"
                onClick={() => navigate(`/pixel-protocol/play?level=${progress.currentLevel}`)}
              >
                Continuer campagne
              </button>
              <button
                className="pp-hub-btn"
                onClick={() => navigate("/pixel-protocol/play?level=1")}
              >
                Nouvelle campagne
              </button>
              <button
                className="pp-hub-btn"
                onClick={() => {
                  setShowEditorChooser((current) => !current);
                }}
              >
                {user?.role === "ADMIN" ? "Ouvrir editeur admin" : "Ouvrir editeur custom"}
              </button>
              {showEditorChooser && (
                <div className="pp-hub-stack pp-hub-chooser">
                  <button
                    className="pp-hub-btn"
                    onClick={() => navigate("/pixel-protocol/editor?mode=level")}
                  >
                    Mode niveau
                  </button>
                  <button
                    className="pp-hub-btn"
                    onClick={() => navigate("/pixel-protocol/editor?mode=world")}
                  >
                    Mode monde
                  </button>
                </div>
              )}
              <button
                className="pp-hub-btn"
                onClick={() => navigate("/pixel-protocol/help/editor")}
              >
                Aide editeur
              </button>
            </div>

            <div className="pp-hub-divider pp-hub-stack">
              <div className="text-cyan-200">Jouer un niveau cree</div>
              <select
                className="pp-hub-select"
                value={selectedCustomId}
                onChange={(event) => setSelectedCustomId(event.target.value)}
              >
                <option value="">-- choisir --</option>
                {customLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name} ({level.id})
                  </option>
                ))}
              </select>
              <button
                className="pp-hub-btn"
                disabled={!selectedCustomId}
                onClick={() =>
                  navigate(`/pixel-protocol/play?custom=${encodeURIComponent(selectedCustomId)}`)
                }
              >
                Lancer niveau custom
              </button>
            </div>

            <div className="pp-hub-divider pp-hub-stack">
              <div className="text-cyan-200">Mondes custom</div>
              <select
                className="pp-hub-select"
                value={selectedWorldId}
                onChange={(event) => setSelectedWorldId(event.target.value)}
              >
                <option value="">-- choisir --</option>
                {worldTemplates.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name} ({world.id})
                  </option>
                ))}
              </select>
              <button
                className="pp-hub-btn"
                disabled={!selectedWorldId}
                onClick={() =>
                  navigate(`/pixel-protocol/editor?mode=world&template=${encodeURIComponent(selectedWorldId)}`)
                }
              >
                Modifier monde
              </button>
            </div>

            <div className="pp-hub-divider pp-hub-stack">
              <button className="pp-hub-btn pp-hub-btn--secondary" onClick={() => navigate("/dashboard")}>
                Retour dashboard
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
