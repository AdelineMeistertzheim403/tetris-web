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
import {
  mergePixelProtocolProgress,
  readLocalPixelProtocolProgress,
} from "../utils/progress";
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

  const { loading, syncError } = useGameModeHubBootstrap({
    deps: [user],
    enabled: Boolean(user),
    loadLocal: () => ({
      progress: readLocalPixelProtocolProgress(),
      customLevels: listPixelProtocolCustomLevels(),
      worldTemplates: listPixelProtocolWorldTemplates(),
    }),
    applyLocal: ({ progress: localProgress, customLevels: localCustomLevels, worldTemplates: localWorldTemplates }) => {
      setProgress(localProgress);
      setCustomLevels(localCustomLevels);
      setWorldTemplates(localWorldTemplates);
    },
    fetchRemote: async ({ progress: localProgress }) => {
      const [remoteProgress, remoteCustomLevels, remoteWorldTemplates] = await Promise.all([
        fetchPixelProtocolProgress(),
        fetchPixelProtocolCustomLevels(),
        fetchPixelProtocolWorldTemplates(),
      ]);
      return {
        progress: mergePixelProtocolProgress(localProgress, remoteProgress),
        customLevels: mergePixelProtocolCustomLevels(remoteCustomLevels),
        worldTemplates: mergePixelProtocolWorldTemplates(remoteWorldTemplates),
      };
    },
    applyRemote: ({ progress: remoteProgress, customLevels: remoteCustomLevels, worldTemplates: remoteWorldTemplates }) => {
      setProgress(remoteProgress);
      setCustomLevels(remoteCustomLevels);
      setWorldTemplates(remoteWorldTemplates);
    },
    offlineMessage: "Mode hors ligne: donnees locales utilisees.",
    fetchCommunity: fetchPixelProtocolCommunityLevels,
    applyCommunity: setCommunityLevels,
    communityFallback: [],
  });

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

  const stats: GameModeHubStat[] = [
    { content: <>Checkpoint: niveau {progress.currentLevel}</> },
    { content: <>Plus haut niveau: {progress.highestLevel}</> },
    { content: <>Monde: {stage.world}</> },
    { content: <>Stage: {stage.stage}</> },
    {
      content: (
        <>
          Modules:{" "}
          {unlockedSkills.length ? unlockedSkills.join(", ").replaceAll("_", " ") : "aucun"}
        </>
      ),
    },
    {
      content: <>Role editeur: {user?.role === "ADMIN" ? "admin" : "custom prive"}</>,
    },
  ];

  if (syncError) {
    stats.push({ content: syncError, className: "text-yellow-300" });
  }

  if (loading) {
    stats.push({ content: "Chargement...", className: "text-gray-300" });
  }

  return (
    <GameModeHubLayout title="Pixel Protocol" stats={stats}>
      <HubStack>
        <HubActionRow>
          <HubIconButton
            icon="fa-forward"
            title="Continuer campagne"
            onClick={() => navigate(`/pixel-protocol/play?level=${progress.currentLevel}`)}
          />
          <HubIconButton
            icon="fa-rotate-right"
            title="Nouvelle campagne"
            onClick={() => navigate(`${PATHS.pixelProtocolPlay}?level=1`)}
          />
        </HubActionRow>
        <HubActionRow>
          <HubIconButton
            icon="fa-pen-ruler"
            title={user?.role === "ADMIN" ? "Ouvrir editeur admin" : "Ouvrir editeur custom"}
            onClick={() => {
              setShowEditorChooser((current) => !current);
            }}
          />
          <HubIconButton
            icon="fa-circle-question"
            title="Aide editeur"
            onClick={() => navigate(PATHS.pixelProtocolEditorHelp)}
          />
        </HubActionRow>
        {showEditorChooser && (
          <HubActionRow className="pp-hub-chooser">
            <HubIconButton
              icon="fa-layer-group"
              title="Editeur mode niveau"
              onClick={() => navigate(`${PATHS.pixelProtocolEditor}?mode=level`)}
            />
            <HubIconButton
              icon="fa-mountain-city"
              title="Editeur mode monde"
              onClick={() => navigate(`${PATHS.pixelProtocolEditor}?mode=world`)}
            />
          </HubActionRow>
        )}
      </HubStack>

      <HubSection title="Jouer un niveau cree">
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
              navigate(`/pixel-protocol/play?custom=${encodeURIComponent(selectedCustomId)}`)
            }
          />
        </HubInlineControl>
        {selectedCustomId && ownPublishedLevelIds.has(selectedCustomId) && (
          <div className="pp-hub-stat text-cyan-200">Deja publie dans la galerie joueurs</div>
        )}
      </HubSection>

      <HubSection title="Mondes custom">
        <HubInlineControl>
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
          <HubIconButton
            icon="fa-wand-magic-sparkles"
            title="Modifier monde custom"
            disabled={!selectedWorldId}
            onClick={() =>
              navigate(
                `/pixel-protocol/editor?mode=world&template=${encodeURIComponent(selectedWorldId)}`
              )
            }
          />
        </HubInlineControl>
      </HubSection>

      <HubActionRow className="pp-hub-divider">
        <HubIconButton
          icon="fa-users"
          title="Niveaux joueurs"
          onClick={() => navigate(PATHS.pixelProtocolCommunity)}
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
