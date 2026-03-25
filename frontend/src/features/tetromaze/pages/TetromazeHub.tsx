import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { PATHS } from "../../../routes/paths";
import {
  fetchTetromazeCommunityLevels,
  fetchTetromazeCustomLevels,
  fetchTetromazeProgress,
  type TetromazeCommunityLevel,
  type TetromazeProgress,
} from "../services/tetromazeService";
import { listTetromazeCustomLevels, mergeTetromazeCustomLevels } from "../utils/customLevels";
import { TETROMAZE_TOTAL_LEVELS, toWorldStage } from "../data/campaignLevels";
import "../../../styles/pixel-protocol-hub.css";

const PROGRESS_STORAGE_KEY = "tetromaze-campaign-progress-v1";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function readLocalProgress(): TetromazeProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return { highestLevel: 1, currentLevel: 1, levelScores: {} };
    const parsed = JSON.parse(raw) as TetromazeProgress;
    return {
      highestLevel: clamp(Number(parsed.highestLevel) || 1, 1, TETROMAZE_TOTAL_LEVELS),
      currentLevel: clamp(Number(parsed.currentLevel) || 1, 1, TETROMAZE_TOTAL_LEVELS),
      levelScores: parsed.levelScores ?? {},
    };
  } catch {
    return { highestLevel: 1, currentLevel: 1, levelScores: {} };
  }
}

function writeLocalProgress(progress: TetromazeProgress) {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export default function TetromazeHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState<TetromazeProgress>(() => readLocalProgress());
  const [customLevels, setCustomLevels] = useState(() => listTetromazeCustomLevels());
  const [communityLevels, setCommunityLevels] = useState<TetromazeCommunityLevel[]>([]);
  const [selectedUnlocked, setSelectedUnlocked] = useState(1);
  const [selectedCustomId, setSelectedCustomId] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      setSyncError(null);

      const local = readLocalProgress();
      if (!cancelled) {
        setProgress(local);
        setSelectedUnlocked(clamp(local.currentLevel, 1, local.highestLevel));
        setCustomLevels(listTetromazeCustomLevels());
      }

      try {
        const [remoteProgress, remoteCustomLevels] = await Promise.all([
          fetchTetromazeProgress(),
          fetchTetromazeCustomLevels(),
        ]);
        const merged: TetromazeProgress = {
          highestLevel: Math.max(local.highestLevel, remoteProgress.highestLevel),
          currentLevel: Math.max(local.currentLevel, remoteProgress.currentLevel),
          levelScores: { ...local.levelScores, ...remoteProgress.levelScores },
        };
        if (cancelled) return;
        setProgress(merged);
        setSelectedUnlocked(clamp(merged.currentLevel, 1, merged.highestLevel));
        setCustomLevels(mergeTetromazeCustomLevels(remoteCustomLevels));
        writeLocalProgress(merged);
      } catch {
        if (!cancelled) setSyncError("Mode hors ligne: progression locale utilisee.");
      }

      try {
        const remoteCommunityLevels = await fetchTetromazeCommunityLevels();
        if (!cancelled) setCommunityLevels(remoteCommunityLevels);
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
  }, []);

  useEffect(() => {
    if (customLevels.length && !selectedCustomId) {
      setSelectedCustomId(customLevels[0].id);
    }
  }, [customLevels, selectedCustomId]);

  const worldStage = useMemo(() => toWorldStage(progress.currentLevel), [progress.currentLevel]);
  const ownPublishedLevelIds = useMemo(() => {
    const map = new Map<string, TetromazeCommunityLevel>();
    for (const level of communityLevels) {
      if (level.isOwn) map.set(level.level.id, level);
    }
    return map;
  }, [communityLevels]);

  return (
    <div className="pp-hub font-['Press_Start_2P']">
      <div className="pp-hub-shell">
        <h1 className="pp-hub-title">Tetromaze</h1>

        <div className="pp-hub-grid">
          <section className="panel pp-hub-card">
            <h2 className="text-cyan-200">
              <i className="fa-solid fa-chart-line pp-hub-section-icon pp-hub-section-icon--campaign" aria-hidden="true" /> Profil campagne
            </h2>
            <div className="pp-hub-stat">Niveau max: {progress.highestLevel}/{TETROMAZE_TOTAL_LEVELS}</div>
            <div className="pp-hub-stat">Checkpoint: {progress.currentLevel}/{TETROMAZE_TOTAL_LEVELS}</div>
            <div className="pp-hub-stat">Monde: {worldStage.world}</div>
            <div className="pp-hub-stat">Niveau du monde: {worldStage.stage}</div>
            <div className="pp-hub-stat">Niveaux custom: {customLevels.length}</div>
            <div className="pp-hub-stat">Galerie joueurs: {communityLevels.length}</div>
            <div className="pp-hub-stat">
              Publication: {user ? "active" : "connexion requise"}
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
                  onClick={() => navigate(`/tetromaze/play?level=${progress.currentLevel}`)}
                >
                  <i className="fa-solid fa-forward" aria-hidden="true" />
                </button>
                <button
                  className="pp-hub-icon-btn"
                  title="Nouvelle campagne"
                  aria-label="Nouvelle campagne"
                  onClick={() => navigate(`${PATHS.tetromazePlay}?level=1`)}
                >
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                </button>
              </div>
              <div className="pp-hub-action-row">
                <button
                  className="pp-hub-icon-btn"
                  title="Ouvrir editeur"
                  aria-label="Ouvrir editeur"
                  onClick={() => navigate(PATHS.tetromazeEditor)}
                >
                  <i className="fa-solid fa-pen-ruler" aria-hidden="true" />
                </button>
                <button
                  className="pp-hub-icon-btn"
                  title="Aide editeur"
                  aria-label="Aide editeur"
                  onClick={() => navigate(PATHS.tetromazeEditorHelp)}
                >
                  <i className="fa-solid fa-circle-question" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="pp-hub-divider pp-hub-stack">
              <div className="text-cyan-200">Jouer niveau debloque</div>
              <div className="pp-hub-inline-control">
                <select
                  className="pp-hub-select"
                  value={selectedUnlocked}
                  onChange={(e) =>
                    setSelectedUnlocked(
                      clamp(Number.parseInt(e.target.value, 10) || 1, 1, progress.highestLevel)
                    )
                  }
                >
                  {Array.from({ length: progress.highestLevel }, (_, idx) => idx + 1).map((lvl) => (
                    <option key={lvl} value={lvl}>Niveau {lvl}</option>
                  ))}
                </select>
                <button
                  className="pp-hub-icon-btn"
                  title="Lancer ce niveau"
                  aria-label="Lancer ce niveau"
                  onClick={() => navigate(`/tetromaze/play?level=${selectedUnlocked}`)}
                >
                  <i className="fa-solid fa-play" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="pp-hub-divider pp-hub-stack">
              <div className="text-cyan-200">Jouer niveau cree</div>
              <div className="pp-hub-inline-control">
                <select
                  className="pp-hub-select"
                  value={selectedCustomId}
                  onChange={(e) => setSelectedCustomId(e.target.value)}
                >
                  <option value="">-- choisir --</option>
                  {customLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>{lvl.name ?? lvl.id}</option>
                  ))}
                </select>
                <button
                  className="pp-hub-icon-btn"
                  title="Lancer niveau custom"
                  aria-label="Lancer niveau custom"
                  disabled={!selectedCustomId}
                  onClick={() => navigate(`/tetromaze/play?custom=${encodeURIComponent(selectedCustomId)}`)}
                >
                  <i className="fa-solid fa-play" aria-hidden="true" />
                </button>
              </div>
              {selectedCustomId && ownPublishedLevelIds.has(selectedCustomId) && (
                <div className="pp-hub-stat text-cyan-200">Deja publie dans la galerie joueurs</div>
              )}
            </div>

            <div className="pp-hub-divider pp-hub-action-row">
              <button
                className="pp-hub-icon-btn"
                title="Niveaux joueurs"
                aria-label="Niveaux joueurs"
                onClick={() => navigate(PATHS.tetromazeCommunity)}
              >
                <i className="fa-solid fa-users" aria-hidden="true" />
              </button>
              <button
                className="pp-hub-icon-btn pp-hub-icon-btn--secondary"
                title="Retour dashboard"
                aria-label="Retour dashboard"
                onClick={() => navigate(PATHS.dashboard)}
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
