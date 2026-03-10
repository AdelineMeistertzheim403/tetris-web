import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import {
  fetchPixelProtocolCommunityLevels,
  fetchPixelProtocolCustomLevels,
  fetchPixelProtocolProgress,
  fetchPixelProtocolWorldTemplates,
  type PixelProtocolCommunityLevel,
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
  const [communityLevels, setCommunityLevels] = useState<PixelProtocolCommunityLevel[]>([]);
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
        try {
          const publicLevels = await fetchPixelProtocolCommunityLevels();
          if (!cancelled) {
            setCommunityLevels(publicLevels);
          }
        } catch {
          if (!cancelled) {
            setCommunityLevels([]);
          }
        }
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
      }

      try {
        const remoteCommunityLevels = await fetchPixelProtocolCommunityLevels();
        if (!cancelled) {
          setCommunityLevels(remoteCommunityLevels);
        }
      } catch {
        if (!cancelled) setCommunityLevels([]);
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

  const ownPublishedLevelIds = useMemo(() => {
    const map = new Map<string, PixelProtocolCommunityLevel>();
    for (const level of communityLevels) {
      if (level.isOwn) {
        map.set(level.level.id, level);
      }
    }
    return map;
  }, [communityLevels]);

  return (
    <div className="pp-hub font-['Press_Start_2P']">
      <div className="pp-hub-shell">
        <h1 className="pp-hub-title">Pixel Protocol</h1>

        <div className="pp-hub-grid">
          <section className="panel pp-hub-card">
            <h2 className="text-cyan-200">
              <i className="fa-solid fa-chart-line pp-hub-section-icon pp-hub-section-icon--campaign" aria-hidden="true" /> Profil campagne
            </h2>
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
            <h2 className="text-pink-300">
              <i className="fa-solid fa-bolt" aria-hidden="true" /> Actions
            </h2>
            <div className="pp-hub-stack">
              <div className="pp-hub-action-row">
                <button
                  className="pp-hub-icon-btn"
                  title="Continuer campagne"
                  aria-label="Continuer campagne"
                  onClick={() => navigate(`/pixel-protocol/play?level=${progress.currentLevel}`)}
                >
                  <i className="fa-solid fa-forward" aria-hidden="true" />
                </button>
                <button
                  className="pp-hub-icon-btn"
                  title="Nouvelle campagne"
                  aria-label="Nouvelle campagne"
                  onClick={() => navigate("/pixel-protocol/play?level=1")}
                >
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                </button>
              </div>
              <div className="pp-hub-action-row">
                <button
                  className="pp-hub-icon-btn"
                  title={user?.role === "ADMIN" ? "Ouvrir editeur admin" : "Ouvrir editeur custom"}
                  aria-label={user?.role === "ADMIN" ? "Ouvrir editeur admin" : "Ouvrir editeur custom"}
                  onClick={() => {
                    setShowEditorChooser((current) => !current);
                  }}
                >
                  <i className="fa-solid fa-pen-ruler" aria-hidden="true" />
                </button>
                <button
                  className="pp-hub-icon-btn"
                  title="Aide editeur"
                  aria-label="Aide editeur"
                  onClick={() => navigate("/pixel-protocol/help/editor")}
                >
                  <i className="fa-solid fa-circle-question" aria-hidden="true" />
                </button>
              </div>
              {showEditorChooser && (
                <div className="pp-hub-action-row pp-hub-chooser">
                  <button
                    className="pp-hub-icon-btn"
                    title="Editeur mode niveau"
                    aria-label="Editeur mode niveau"
                    onClick={() => navigate("/pixel-protocol/editor?mode=level")}
                  >
                    <i className="fa-solid fa-layer-group" aria-hidden="true" />
                  </button>
                  <button
                    className="pp-hub-icon-btn"
                    title="Editeur mode monde"
                    aria-label="Editeur mode monde"
                    onClick={() => navigate("/pixel-protocol/editor?mode=world")}
                  >
                    <i className="fa-solid fa-mountain-city" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            <div className="pp-hub-divider pp-hub-stack">
              <div className="text-cyan-200">Jouer un niveau cree</div>
              <div className="pp-hub-inline-control">
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
                  className="pp-hub-icon-btn"
                  title="Lancer niveau custom"
                  aria-label="Lancer niveau custom"
                  disabled={!selectedCustomId}
                  onClick={() =>
                    navigate(`/pixel-protocol/play?custom=${encodeURIComponent(selectedCustomId)}`)
                  }
                >
                  <i className="fa-solid fa-play" aria-hidden="true" />
                </button>
              </div>
              {selectedCustomId && ownPublishedLevelIds.has(selectedCustomId) && (
                <div className="pp-hub-stat text-cyan-200">
                  Deja publie dans la galerie joueurs
                </div>
              )}
            </div>

            <div className="pp-hub-divider pp-hub-stack">
              <div className="text-cyan-200">Mondes custom</div>
              <div className="pp-hub-inline-control">
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
                  className="pp-hub-icon-btn"
                  title="Modifier monde custom"
                  aria-label="Modifier monde custom"
                  disabled={!selectedWorldId}
                  onClick={() =>
                    navigate(`/pixel-protocol/editor?mode=world&template=${encodeURIComponent(selectedWorldId)}`)
                  }
                >
                  <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="pp-hub-divider pp-hub-action-row">
              <button
                className="pp-hub-icon-btn"
                title="Niveaux joueurs"
                aria-label="Niveaux joueurs"
                onClick={() => navigate("/pixel-protocol/community")}
              >
                <i className="fa-solid fa-users" aria-hidden="true" />
              </button>
              <button
                className="pp-hub-icon-btn pp-hub-icon-btn--secondary"
                title="Retour dashboard"
                aria-label="Retour dashboard"
                onClick={() => navigate("/dashboard")}
              >
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
