import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { TetrobotAchievementEvent } from "../../achievements/types/tetrobots";
import {
  TETROBOT_MODE_HUB_ROUTE_MAP,
  TETROBOT_MODE_PLAY_ROUTE_MAP,
} from "../../tetrobots/data/tetrobotsContent";
import type {
  DashboardBot,
  DashboardRelationChoice,
  DashboardRelationEvent,
} from "../../tetrobots/logic/dashboardNarrative";
import type { DashboardChatbotActions } from "../logic/dashboardModels";
import { PATHS } from "../../../routes/paths";

type UseDashboardNavigationArgs = {
  acceptActiveTetrobotChallenge: () => void;
  activeBot: DashboardBot;
  activeChallengeTargetMode: string | null;
  chooseActiveTetrobotConflict: (bot: DashboardBot) => void;
  closeRelationPopup: () => void;
  lowestWinrateMode: string | null;
  openLatestRelationPopup: () => void;
  recordTetrobotEvent: (event: TetrobotAchievementEvent) => void;
  relationPopup: DashboardRelationEvent | null;
};

function buildRelationPath(bot: DashboardBot) {
  return `${PATHS.tetrobotsRelations}?bot=${bot}`;
}

function getWeakestModePath(lowestWinrateMode: string | null) {
  return lowestWinrateMode
    ? TETROBOT_MODE_HUB_ROUTE_MAP[lowestWinrateMode] ?? PATHS.tetrisHub
    : PATHS.tetrisHub;
}

function getChallengeModePath(mode: string | null) {
  return mode
    ? TETROBOT_MODE_PLAY_ROUTE_MAP[mode] ??
        TETROBOT_MODE_HUB_ROUTE_MAP[mode] ??
        PATHS.tetrisHub
    : null;
}

export function useDashboardNavigation({
  acceptActiveTetrobotChallenge,
  activeBot,
  activeChallengeTargetMode,
  chooseActiveTetrobotConflict,
  closeRelationPopup,
  lowestWinrateMode,
  openLatestRelationPopup,
  recordTetrobotEvent,
  relationPopup,
}: UseDashboardNavigationArgs) {
  const navigate = useNavigate();
  const challengeModePath = getChallengeModePath(activeChallengeTargetMode);

  const openPath = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const openActiveTetrobotHelp = useCallback(() => {
    recordTetrobotEvent({ type: "tip_read", bot: activeBot });
    navigate(PATHS.tetrobotsHelp);
  }, [activeBot, navigate, recordTetrobotEvent]);

  const openActiveTetrobotRelation = useCallback(() => {
    recordTetrobotEvent({ type: "tip_read", bot: activeBot });
    navigate(buildRelationPath(activeBot));
  }, [activeBot, navigate, recordTetrobotEvent]);

  const chatbotActions = useMemo<DashboardChatbotActions>(() => {
    return {
      analyzeAnomaly: () => undefined,
      openHelp: openActiveTetrobotHelp,
      openLatestEvent: openLatestRelationPopup,
      openAnomalies: () => navigate(PATHS.tetrobotsAnomalies),
      openRelation: openActiveTetrobotRelation,
    };
  }, [
    navigate,
    openActiveTetrobotHelp,
    openActiveTetrobotRelation,
    openLatestRelationPopup,
  ]);

  const handleRelationChoice = useCallback((choice: DashboardRelationChoice) => {
    if (!relationPopup) return;

    if (choice.action === "dismiss") {
      closeRelationPopup();
      return;
    }

    if (choice.action === "open_relation") {
      closeRelationPopup();
      navigate(buildRelationPath(relationPopup.bot));
      return;
    }

    if (choice.action === "open_tetris_hub") {
      closeRelationPopup();
      navigate(PATHS.tetrisHub);
      return;
    }

    if (choice.action === "choose_conflict" && choice.bot) {
      chooseActiveTetrobotConflict(choice.bot);
      closeRelationPopup();
      navigate(buildRelationPath(choice.bot));
      return;
    }

    if (choice.action === "accept_challenge") {
      acceptActiveTetrobotChallenge();
      closeRelationPopup();
      navigate(challengeModePath ?? getWeakestModePath(lowestWinrateMode));
      return;
    }

    closeRelationPopup();
    navigate(challengeModePath ?? getWeakestModePath(lowestWinrateMode));
  }, [
    acceptActiveTetrobotChallenge,
    challengeModePath,
    chooseActiveTetrobotConflict,
    closeRelationPopup,
    lowestWinrateMode,
    navigate,
    relationPopup,
  ]);

  return {
    chatbotActions,
    handleRelationChoice,
    openPath,
  };
}
