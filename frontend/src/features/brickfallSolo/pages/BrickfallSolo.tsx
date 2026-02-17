import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BrickfallLevel } from "../types/levels";
import { listCustomLevels, mergeCustomLevels } from "../utils/customLevels";
import { CAMPAIGN_TOTAL_LEVELS } from "../data/campaignLevels";
import {
  fetchBrickfallSoloCustomLevels,
  fetchBrickfallSoloProgress,
} from "../services/brickfallSoloService";
import "../../../styles/roguelike.css";
import "../../../styles/brickfall-solo-hub.css";

const LEVELS_PER_WORLD = 9;
const PROGRESS_STORAGE_KEY = "brickfall-solo-campaign-progress-v1";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function readLocalProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return 1;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return 1;
    return clamp(parsed, 1, CAMPAIGN_TOTAL_LEVELS);
  } catch {
    return 1;
  }
}

function toWorldStage(index: number) {
  const world = Math.floor((index - 1) / LEVELS_PER_WORLD) + 1;
  const stage = ((index - 1) % LEVELS_PER_WORLD) + 1;
  return { world, stage };
}

export default function BrickfallSolo() {
  const navigate = useNavigate();
  const [savedLevel, setSavedLevel] = useState(() => readLocalProgress());
  const [customLevels, setCustomLevels] = useState<BrickfallLevel[]>([]);
  const [selectedCustomId, setSelectedCustomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setSyncError(null);

      let levels = listCustomLevels();
      let checkpoint = readLocalProgress();

      try {
        const [remoteProgress, remoteLevels] = await Promise.all([
          fetchBrickfallSoloProgress(),
          fetchBrickfallSoloCustomLevels(),
        ]);
        checkpoint = Math.max(checkpoint, remoteProgress);
        levels = mergeCustomLevels(remoteLevels);
      } catch {
        setSyncError("Mode hors ligne: donnees locales utilisees.");
      }

      if (cancelled) return;
      setSavedLevel(clamp(checkpoint, 1, CAMPAIGN_TOTAL_LEVELS));
      setCustomLevels(levels);
      if (levels.length > 0) setSelectedCustomId((prev) => prev || levels[0].id);
      setLoading(false);
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const stage = useMemo(() => toWorldStage(savedLevel), [savedLevel]);

  return (
    <div className="brickfall-solo-hub font-['Press_Start_2P']">
      <div className="brickfall-solo-shell">
        <h1 className="brickfall-solo-title">Brickfall Solo</h1>

        <div className="brickfall-solo-grid">
          <section className="panel brickfall-solo-card">
            <h2 className="text-cyan-200">Profil campagne</h2>
            <div className="brickfall-solo-stat">Niveau max atteint: {savedLevel}/{CAMPAIGN_TOTAL_LEVELS}</div>
            <div className="brickfall-solo-stat">Monde atteint: {stage.world}</div>
            <div className="brickfall-solo-stat">Stage atteint: {stage.stage}</div>
            {syncError && <div className="brickfall-solo-stat text-yellow-300">{syncError}</div>}
            {loading && <div className="brickfall-solo-stat text-gray-300">Chargement...</div>}
          </section>

          <section className="panel brickfall-solo-card">
            <h2 className="text-pink-300">Actions</h2>
            <div className="brickfall-solo-stack">
            <button
              className="brickfall-solo-btn"
              onClick={() => navigate(`/brickfall-solo/play?level=${savedLevel}`)}
            >
              Reprendre campagne
            </button>
            <button
              className="brickfall-solo-btn"
              onClick={() => navigate("/brickfall-solo/play?level=1")}
            >
              Nouvelle campagne
            </button>
            <button className="brickfall-solo-btn" onClick={() => navigate("/brickfall-editor")}>
              Ouvrir editeur
            </button>
            </div>

            <div className="brickfall-solo-divider brickfall-solo-stack">
              <div className="text-cyan-200">Jouer niveau custom</div>
              <select
                className="brickfall-solo-select"
                value={selectedCustomId}
                onChange={(e) => setSelectedCustomId(e.target.value)}
              >
                <option value="">-- choisir --</option>
                {customLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name} ({lvl.id})
                  </option>
                ))}
              </select>
              <button
                className="brickfall-solo-btn"
                disabled={!selectedCustomId}
                onClick={() => navigate(`/brickfall-solo/play?custom=${encodeURIComponent(selectedCustomId)}`)}
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
