import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GameModeHubLayout,
  HubActionRow,
  HubIconButton,
  HubInlineControl,
  HubSection,
  HubStack,
  type GameModeHubStat,
} from "../../app/components/hub/GameModeHub";
import { useGameModeHubBootstrap } from "../../app/hooks/useGameModeHubBootstrap";
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
import {
  mergeTetromazeProgress,
  readLocalTetromazeProgress,
  writeLocalTetromazeProgress,
} from "../utils/progress";
import "../../../styles/pixel-protocol-hub.css";

export default function TetromazeHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState<TetromazeProgress>(() => readLocalTetromazeProgress());
  const [customLevels, setCustomLevels] = useState(() => listTetromazeCustomLevels());
  const [communityLevels, setCommunityLevels] = useState<TetromazeCommunityLevel[]>([]);
  const [selectedUnlocked, setSelectedUnlocked] = useState(1);
  const [selectedCustomId, setSelectedCustomId] = useState("");

  const { loading, syncError } = useGameModeHubBootstrap({
    deps: [],
    loadLocal: () => ({
      progress: readLocalTetromazeProgress(),
      customLevels: listTetromazeCustomLevels(),
    }),
    applyLocal: ({ progress: localProgress, customLevels: localCustomLevels }) => {
      setProgress(localProgress);
      setSelectedUnlocked(Math.max(1, Math.min(localProgress.currentLevel, localProgress.highestLevel)));
      setCustomLevels(localCustomLevels);
    },
    fetchRemote: async ({ progress: localProgress }) => {
      const [remoteProgress, remoteCustomLevels] = await Promise.all([
        fetchTetromazeProgress(),
        fetchTetromazeCustomLevels(),
      ]);
      return {
        progress: mergeTetromazeProgress(localProgress, remoteProgress),
        customLevels: mergeTetromazeCustomLevels(remoteCustomLevels),
      };
    },
    applyRemote: ({ progress: remoteProgress, customLevels: remoteCustomLevels }) => {
      setProgress(remoteProgress);
      setSelectedUnlocked(Math.max(1, Math.min(remoteProgress.currentLevel, remoteProgress.highestLevel)));
      setCustomLevels(remoteCustomLevels);
      writeLocalTetromazeProgress(remoteProgress);
    },
    offlineMessage: "Mode hors ligne: progression locale utilisee.",
    fetchCommunity: fetchTetromazeCommunityLevels,
    applyCommunity: setCommunityLevels,
    communityFallback: [],
  });

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

  const stats: GameModeHubStat[] = [
    { content: <>Niveau max: {progress.highestLevel}/{TETROMAZE_TOTAL_LEVELS}</> },
    { content: <>Checkpoint: {progress.currentLevel}/{TETROMAZE_TOTAL_LEVELS}</> },
    { content: <>Monde: {worldStage.world}</> },
    { content: <>Niveau du monde: {worldStage.stage}</> },
    { content: <>Niveaux custom: {customLevels.length}</> },
    { content: <>Galerie joueurs: {communityLevels.length}</> },
    { content: <>Publication: {user ? "active" : "connexion requise"}</> },
  ];

  if (syncError) {
    stats.push({ content: syncError, className: "text-yellow-300" });
  }

  if (loading) {
    stats.push({ content: "Chargement...", className: "text-gray-300" });
  }

  return (
    <GameModeHubLayout title="Tetromaze" stats={stats}>
      <HubStack>
        <HubActionRow>
          <HubIconButton
            icon="fa-forward"
            title="Continuer campagne"
            onClick={() => navigate(`/tetromaze/play?level=${progress.currentLevel}`)}
          />
          <HubIconButton
            icon="fa-rotate-right"
            title="Nouvelle campagne"
            onClick={() => navigate(`${PATHS.tetromazePlay}?level=1`)}
          />
        </HubActionRow>
        <HubActionRow>
          <HubIconButton
            icon="fa-pen-ruler"
            title="Ouvrir editeur"
            onClick={() => navigate(PATHS.tetromazeEditor)}
          />
          <HubIconButton
            icon="fa-circle-question"
            title="Aide editeur"
            onClick={() => navigate(PATHS.tetromazeEditorHelp)}
          />
        </HubActionRow>
      </HubStack>

      <HubSection title="Jouer niveau debloque">
        <HubInlineControl>
          <select
            className="pp-hub-select"
            value={selectedUnlocked}
            onChange={(event) =>
              setSelectedUnlocked(
                Math.max(
                  1,
                  Math.min(Number.parseInt(event.target.value, 10) || 1, progress.highestLevel)
                )
              )
            }
          >
            {Array.from({ length: progress.highestLevel }, (_, index) => index + 1).map((level) => (
              <option key={level} value={level}>
                Niveau {level}
              </option>
            ))}
          </select>
          <HubIconButton
            icon="fa-play"
            title="Lancer ce niveau"
            onClick={() => navigate(`/tetromaze/play?level=${selectedUnlocked}`)}
          />
        </HubInlineControl>
      </HubSection>

      <HubSection title="Jouer niveau cree">
        <HubInlineControl>
          <select
            className="pp-hub-select"
            value={selectedCustomId}
            onChange={(event) => setSelectedCustomId(event.target.value)}
          >
            <option value="">-- choisir --</option>
            {customLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name ?? level.id}
              </option>
            ))}
          </select>
          <HubIconButton
            icon="fa-play"
            title="Lancer niveau custom"
            disabled={!selectedCustomId}
            onClick={() => navigate(`/tetromaze/play?custom=${encodeURIComponent(selectedCustomId)}`)}
          />
        </HubInlineControl>
        {selectedCustomId && ownPublishedLevelIds.has(selectedCustomId) && (
          <div className="pp-hub-stat text-cyan-200">Deja publie dans la galerie joueurs</div>
        )}
      </HubSection>

      <HubActionRow className="pp-hub-divider">
        <HubIconButton
          icon="fa-users"
          title="Niveaux joueurs"
          onClick={() => navigate(PATHS.tetromazeCommunity)}
        />
        <HubIconButton
          icon="fa-arrow-left"
          title="Retour dashboard"
          variant="secondary"
          onClick={() => navigate(PATHS.dashboard)}
        />
      </HubActionRow>
    </GameModeHubLayout>
  );
}
