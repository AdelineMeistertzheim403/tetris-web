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
import type { BrickfallLevel } from "../types/levels";
import { listCustomLevels, mergeCustomLevels } from "../utils/customLevels";
import { CAMPAIGN_TOTAL_LEVELS } from "../data/campaignLevels";
import {
  mergeBrickfallSoloProgress,
  readLocalBrickfallSoloProgress,
} from "../utils/progress";
import {
  fetchBrickfallSoloCommunityLevels,
  fetchBrickfallSoloCustomLevels,
  fetchBrickfallSoloProgress,
  type BrickfallSoloCommunityLevel,
} from "../services/brickfallSoloService";
import "../../../styles/pixel-protocol-hub.css";

const LEVELS_PER_WORLD = 9;

function toWorldStage(index: number) {
  const world = Math.floor((index - 1) / LEVELS_PER_WORLD) + 1;
  const stage = ((index - 1) % LEVELS_PER_WORLD) + 1;
  return { world, stage };
}

export default function BrickfallSolo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedLevel, setSavedLevel] = useState(() => readLocalBrickfallSoloProgress());
  const [customLevels, setCustomLevels] = useState<BrickfallLevel[]>(() => listCustomLevels());
  const [communityLevels, setCommunityLevels] = useState<BrickfallSoloCommunityLevel[]>([]);
  const [selectedCustomId, setSelectedCustomId] = useState("");

  const { loading, syncError } = useGameModeHubBootstrap({
    deps: [],
    loadLocal: () => ({
      progress: readLocalBrickfallSoloProgress(),
      customLevels: listCustomLevels(),
    }),
    applyLocal: ({ progress, customLevels: localCustomLevels }) => {
      setSavedLevel(progress);
      setCustomLevels(localCustomLevels);
    },
    fetchRemote: async ({ progress }) => {
      const [remoteProgress, remoteLevels] = await Promise.all([
        fetchBrickfallSoloProgress(),
        fetchBrickfallSoloCustomLevels(),
      ]);
      return {
        progress: mergeBrickfallSoloProgress(progress, remoteProgress),
        customLevels: mergeCustomLevels(remoteLevels),
      };
    },
    applyRemote: ({ progress, customLevels: remoteCustomLevels }) => {
      setSavedLevel(progress);
      setCustomLevels(remoteCustomLevels);
    },
    offlineMessage: "Mode hors ligne: donnees locales utilisees.",
    fetchCommunity: fetchBrickfallSoloCommunityLevels,
    applyCommunity: setCommunityLevels,
    communityFallback: [],
  });

  useEffect(() => {
    if (customLevels.length && !selectedCustomId) {
      setSelectedCustomId(customLevels[0].id);
    }
  }, [customLevels, selectedCustomId]);

  const stage = useMemo(() => toWorldStage(savedLevel), [savedLevel]);
  const ownPublishedLevelIds = useMemo(() => {
    const map = new Map<string, BrickfallSoloCommunityLevel>();
    for (const level of communityLevels) {
      if (level.isOwn) map.set(level.level.id, level);
    }
    return map;
  }, [communityLevels]);

  const stats: GameModeHubStat[] = [
    { content: <>Niveau max atteint: {savedLevel}/{CAMPAIGN_TOTAL_LEVELS}</> },
    { content: <>Monde atteint: {stage.world}</> },
    { content: <>Stage atteint: {stage.stage}</> },
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
    <GameModeHubLayout title="Brickfall Solo" stats={stats}>
      <HubStack>
        <HubActionRow>
          <HubIconButton
            icon="fa-forward"
            title="Reprendre campagne"
            onClick={() => navigate(`/brickfall-solo/play?level=${savedLevel}`)}
          />
          <HubIconButton
            icon="fa-rotate-right"
            title="Nouvelle campagne"
            onClick={() => navigate(`${PATHS.brickfallSoloPlay}?level=1`)}
          />
        </HubActionRow>
        <HubActionRow>
          <HubIconButton
            icon="fa-pen-ruler"
            title="Ouvrir editeur"
            onClick={() => navigate(PATHS.brickfallEditor)}
          />
          <HubIconButton
            icon="fa-circle-question"
            title="Aide editeur"
            onClick={() => navigate(PATHS.brickfallEditorHelp)}
          />
        </HubActionRow>
      </HubStack>

      <HubSection title="Jouer niveau custom">
        <HubInlineControl>
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
          <HubIconButton
            icon="fa-play"
            title="Lancer niveau custom"
            disabled={!selectedCustomId}
            onClick={() =>
              navigate(`/brickfall-solo/play?custom=${encodeURIComponent(selectedCustomId)}`)
            }
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
          onClick={() => navigate(PATHS.brickfallSoloCommunity)}
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
