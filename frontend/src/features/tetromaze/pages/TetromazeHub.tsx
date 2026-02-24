import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchTetromazeProgress,
  type TetromazeProgress,
} from "../services/tetromazeService";
import { listTetromazeCustomLevels } from "../utils/customLevels";
import { TETROMAZE_TOTAL_LEVELS, toWorldStage } from "../data/campaignLevels";
import "../../../styles/tetromaze-hub.css";

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
  const [progress, setProgress] = useState<TetromazeProgress>(() => readLocalProgress());
  const [customLevels, setCustomLevels] = useState(() => listTetromazeCustomLevels());
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
        const remote = await fetchTetromazeProgress();
        const merged: TetromazeProgress = {
          highestLevel: Math.max(local.highestLevel, remote.highestLevel),
          currentLevel: Math.max(local.currentLevel, remote.currentLevel),
          levelScores: { ...local.levelScores, ...remote.levelScores },
        };
        if (cancelled) return;
        setProgress(merged);
        setSelectedUnlocked(clamp(merged.currentLevel, 1, merged.highestLevel));
        writeLocalProgress(merged);
      } catch {
        if (!cancelled) setSyncError("Mode hors ligne: progression locale utilisee.");
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
    const custom = listTetromazeCustomLevels();
    setCustomLevels(custom);
    if (custom.length && !selectedCustomId) {
      setSelectedCustomId(custom[0].id);
    }
  }, [selectedCustomId]);

  const worldStage = useMemo(() => toWorldStage(progress.currentLevel), [progress.currentLevel]);

  return (
    <div className="tetromaze-hub font-['Press_Start_2P']">
      <div className="tetromaze-hub-shell">
        <h1 className="tetromaze-hub-title">Tetromaze</h1>

        <div className="tetromaze-hub-grid">
          <section className="panel tetromaze-hub-card">
            <h2 className="text-cyan-200">Profil campagne</h2>
            <div className="tetromaze-hub-stat">Niveau max: {progress.highestLevel}/{TETROMAZE_TOTAL_LEVELS}</div>
            <div className="tetromaze-hub-stat">Checkpoint: {progress.currentLevel}/{TETROMAZE_TOTAL_LEVELS}</div>
            <div className="tetromaze-hub-stat">Monde: {worldStage.world}</div>
            <div className="tetromaze-hub-stat">Niveau du monde: {worldStage.stage}</div>
            {syncError && <div className="tetromaze-hub-stat text-yellow-300">{syncError}</div>}
            {loading && <div className="tetromaze-hub-stat text-gray-300">Chargement...</div>}
          </section>

          <section className="panel tetromaze-hub-card">
            <h2 className="text-pink-300">Actions</h2>
            <div className="tetromaze-hub-stack">
              <button className="tetromaze-hub-btn" onClick={() => navigate(`/tetromaze/play?level=${progress.currentLevel}`)}>
                Continuer campagne
              </button>
              <button className="tetromaze-hub-btn" onClick={() => navigate("/tetromaze/play?level=1")}>
                Nouvelle campagne
              </button>
            </div>

            <div className="tetromaze-hub-divider tetromaze-hub-stack">
              <div className="text-cyan-200">Jouer niveau debloque</div>
              <select
                className="tetromaze-hub-select"
                value={selectedUnlocked}
                onChange={(e) => setSelectedUnlocked(clamp(Number.parseInt(e.target.value, 10) || 1, 1, progress.highestLevel))}
              >
                {Array.from({ length: progress.highestLevel }, (_, idx) => idx + 1).map((lvl) => (
                  <option key={lvl} value={lvl}>Niveau {lvl}</option>
                ))}
              </select>
              <button className="tetromaze-hub-btn" onClick={() => navigate(`/tetromaze/play?level=${selectedUnlocked}`)}>
                Lancer ce niveau
              </button>
            </div>

            <div className="tetromaze-hub-divider tetromaze-hub-stack">
              <button className="tetromaze-hub-btn" onClick={() => navigate("/tetromaze/editor")}>
                Ouvrir editeur de niveau
              </button>
              <div className="text-cyan-200">Jouer niveau cree</div>
              <select
                className="tetromaze-hub-select"
                value={selectedCustomId}
                onChange={(e) => setSelectedCustomId(e.target.value)}
              >
                <option value="">-- choisir --</option>
                {customLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>{lvl.name ?? lvl.id}</option>
                ))}
              </select>
              <button
                className="tetromaze-hub-btn"
                disabled={!selectedCustomId}
                onClick={() => navigate(`/tetromaze/play?custom=${encodeURIComponent(selectedCustomId)}`)}
              >
                Lancer niveau custom
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
