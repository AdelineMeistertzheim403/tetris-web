import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import type { BrickfallLevel } from "../types/levels";
import { listCustomLevels, mergeCustomLevels } from "../utils/customLevels";
import { CAMPAIGN_TOTAL_LEVELS } from "../data/campaignLevels";
import {
  fetchBrickfallSoloCommunityLevels,
  fetchBrickfallSoloCustomLevels,
  fetchBrickfallSoloProgress,
  type BrickfallSoloCommunityLevel,
} from "../services/brickfallSoloService";
import "../../../styles/pixel-protocol-hub.css";

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
  const { user } = useAuth();
  const [savedLevel, setSavedLevel] = useState(() => readLocalProgress());
  const [customLevels, setCustomLevels] = useState<BrickfallLevel[]>([]);
  const [communityLevels, setCommunityLevels] = useState<BrickfallSoloCommunityLevel[]>([]);
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
        if (!cancelled) setSyncError("Mode hors ligne: donnees locales utilisees.");
      }

      try {
        const remoteCommunityLevels = await fetchBrickfallSoloCommunityLevels();
        if (!cancelled) setCommunityLevels(remoteCommunityLevels);
      } catch {
        if (!cancelled) setCommunityLevels([]);
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
  const ownPublishedLevelIds = useMemo(() => {
    const map = new Map<string, BrickfallSoloCommunityLevel>();
    for (const level of communityLevels) {
      if (level.isOwn) map.set(level.level.id, level);
    }
    return map;
  }, [communityLevels]);

  return (
    <div className="pp-hub font-['Press_Start_2P']">
      <div className="pp-hub-shell">
        <h1 className="pp-hub-title">Brickfall Solo</h1>

        <div className="pp-hub-grid">
          <section className="panel pp-hub-card">
            <h2 className="text-cyan-200">
              <i className="fa-solid fa-chart-line pp-hub-section-icon pp-hub-section-icon--campaign" aria-hidden="true" /> Profil campagne
            </h2>
            <div className="pp-hub-stat">Niveau max atteint: {savedLevel}/{CAMPAIGN_TOTAL_LEVELS}</div>
            <div className="pp-hub-stat">Monde atteint: {stage.world}</div>
            <div className="pp-hub-stat">Stage atteint: {stage.stage}</div>
            <div className="pp-hub-stat">Niveaux custom: {customLevels.length}</div>
            <div className="pp-hub-stat">Galerie joueurs: {communityLevels.length}</div>
            <div className="pp-hub-stat">Publication: {user ? "active" : "connexion requise"}</div>
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
                  title="Reprendre campagne"
                  aria-label="Reprendre campagne"
                  onClick={() => navigate(`/brickfall-solo/play?level=${savedLevel}`)}
                >
                  <i className="fa-solid fa-forward" aria-hidden="true" />
                </button>
                <button
                  className="pp-hub-icon-btn"
                  title="Nouvelle campagne"
                  aria-label="Nouvelle campagne"
                  onClick={() => navigate("/brickfall-solo/play?level=1")}
                >
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                </button>
              </div>
              <div className="pp-hub-action-row">
                <button
                  className="pp-hub-icon-btn"
                  title="Ouvrir editeur"
                  aria-label="Ouvrir editeur"
                  onClick={() => navigate("/brickfall-editor")}
                >
                  <i className="fa-solid fa-pen-ruler" aria-hidden="true" />
                </button>
                <button
                  className="pp-hub-icon-btn"
                  title="Aide editeur"
                  aria-label="Aide editeur"
                  onClick={() => navigate("/brickfall/help/editor")}
                >
                  <i className="fa-solid fa-circle-question" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="pp-hub-divider pp-hub-stack">
              <div className="text-cyan-200">Jouer niveau custom</div>
              <div className="pp-hub-inline-control">
                <select
                  className="pp-hub-select"
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
                  className="pp-hub-icon-btn"
                  title="Lancer niveau custom"
                  aria-label="Lancer niveau custom"
                  disabled={!selectedCustomId}
                  onClick={() => navigate(`/brickfall-solo/play?custom=${encodeURIComponent(selectedCustomId)}`)}
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
                onClick={() => navigate("/brickfall-solo/community")}
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
