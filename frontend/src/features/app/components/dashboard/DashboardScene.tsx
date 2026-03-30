import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAchievements } from "../../../achievements/hooks/useAchievements";
import { useAuth } from "../../../auth/context/AuthContext";
import TetrobotFinaleOverlay from "../../../tetrobots/components/TetrobotFinaleOverlay";
import { getTetrobotFinaleState } from "../../../tetrobots/logic/tetrobotAnomalies";
import {
  DASHBOARD_COMMUNITY_SHORTCUTS,
  DASHBOARD_EDITOR_SHORTCUTS,
  DASHBOARD_MODE_CARDS,
  getDashboardAchievementFocus,
  getDashboardAchievementProgress,
  getDashboardQuickResume,
  getDashboardRecentActivity,
  readDashboardCampaignProgress,
} from "../../logic/dashboardOverview";
import type { DashboardWidgetId } from "../../logic/dashboardWidgets";
import { DashboardChatbotPanel } from "./DashboardChatbotPanel";
import {
  DashboardActivityPanel,
  DashboardFocusPanel,
  DashboardModesPanel,
  DashboardProgressPanel,
  DashboardResumePanel,
  DashboardShortcutPanel,
} from "./DashboardOverviewPanels";
import { DashboardRelationPopup } from "./DashboardRelationPopup";
import { DashboardTipPanel } from "./DashboardTipPanel";
import { useDashboardNavigation } from "../../hooks/useDashboardNavigation";
import { useDashboardTetrobotState } from "../../hooks/useDashboardTetrobotState";

type DashboardSceneProps = {
  showOverlays?: boolean;
  embedded?: boolean;
  children: (params: {
    renderWidget: (widgetId: DashboardWidgetId) => ReactNode;
  }) => ReactNode;
};

export function DashboardScene({
  showOverlays = true,
  embedded = false,
  children,
}: DashboardSceneProps) {
  const { user } = useAuth();
  const [finaleOpen, setFinaleOpen] = useState(false);
  const {
    stats,
    achievements,
    recentUnlocks,
    resolveTetrobotFinaleChoice,
    syncTetrobotProgression,
    setLastTetrobotTip,
    recordTetrobotAnomaly,
    recordTetrobotEvent,
    clearLastTetrobotLevelUp,
    chooseActiveTetrobotConflict,
    acceptActiveTetrobotChallenge,
  } = useAchievements();

  const campaignProgress = useMemo(() => readDashboardCampaignProgress(), []);
  const achievementProgress = useMemo(
    () => getDashboardAchievementProgress(achievements, stats.modesVisited),
    [achievements, stats.modesVisited]
  );
  const quickResume = getDashboardQuickResume(campaignProgress);
  const finaleState = useMemo(() => getTetrobotFinaleState(stats.counters), [stats.counters]);
  const achievementFocus = getDashboardAchievementFocus(
    achievementProgress,
    stats.tetromazeWins
  );
  const recentActivity = getDashboardRecentActivity({
    recentUnlockName: recentUnlocks[0]?.name,
    unlockedCount: achievementProgress.unlockedCount,
    brickfallBestWorld: stats.brickfallSoloBestWorld,
    tetromazeEscapesTotal: stats.tetromazeEscapesTotal,
    pixelProtocolLevel: campaignProgress.pixelProtocol.currentLevel,
  });
  const {
    analyzeCurrentLine,
    chatbot,
    closeRelationPopup,
    openLatestRelationPopup,
    relationOverlay,
    tip,
  } = useDashboardTetrobotState({
    achievementProgress,
    clearLastTetrobotLevelUp,
    recentUnlockCount: recentUnlocks.length,
    recordTetrobotAnomaly,
    setLastTetrobotTip,
    stats,
    syncTetrobotProgression,
  });
  const {
    chatbotActions,
    handleRelationChoice,
    openPath,
  } = useDashboardNavigation({
    acceptActiveTetrobotChallenge,
    activeBot: chatbot.activeBot.bot,
    activeChallengeTargetMode:
      stats.activeTetrobotChallenge?.status === "completed"
        ? null
        : stats.activeTetrobotChallenge?.targetMode ?? null,
    chooseActiveTetrobotConflict,
    closeRelationPopup,
    lowestWinrateMode: stats.lowestWinrateMode,
    openLatestRelationPopup,
    recordTetrobotEvent,
    relationPopup: relationOverlay.popup,
  });

  useEffect(() => {
    if (showOverlays && finaleState.canTrigger) {
      setFinaleOpen(true);
    }
  }, [finaleState.canTrigger, showOverlays]);

  const renderWidget = (widgetId: DashboardWidgetId) => {
    switch (widgetId) {
      case "chatbot":
        return (
          <DashboardChatbotPanel
            chatbot={chatbot}
            actions={{
              ...chatbotActions,
              analyzeAnomaly: analyzeCurrentLine,
            }}
            userPseudo={user?.pseudo}
          />
        );
      case "tip":
        return <DashboardTipPanel tip={tip} />;
      case "resume":
        return <DashboardResumePanel quickResume={quickResume} onOpenPath={openPath} />;
      case "modes":
        return <DashboardModesPanel modeCards={DASHBOARD_MODE_CARDS} onOpenMode={openPath} />;
      case "focus":
        return <DashboardFocusPanel achievementFocus={achievementFocus} />;
      case "progress":
        return <DashboardProgressPanel campaignProgress={campaignProgress} />;
      case "activity":
        return <DashboardActivityPanel recentActivity={recentActivity} />;
      case "create":
        return (
          <DashboardShortcutPanel
            eyebrow="Creer"
            title="Raccourcis editeurs"
            panelClassName="dashboard-panel dashboard-panel--create"
            shortcuts={DASHBOARD_EDITOR_SHORTCUTS}
            onOpenShortcut={openPath}
          />
        );
      case "community":
        return (
          <DashboardShortcutPanel
            eyebrow="Communaute"
            title="Explorer les niveaux joueurs"
            panelClassName="dashboard-panel dashboard-panel--community"
            shortcuts={DASHBOARD_COMMUNITY_SHORTCUTS}
            onOpenShortcut={openPath}
          />
        );
      default:
        return null;
    }
  };

  const content = (
    <>
      {showOverlays ? (
        <>
          <TetrobotFinaleOverlay
            open={finaleOpen}
            onResolve={(choice) => {
              resolveTetrobotFinaleChoice(choice);
              setFinaleOpen(false);
            }}
          />
          <DashboardRelationPopup
            relationOverlay={relationOverlay}
            onChoice={handleRelationChoice}
            onClose={closeRelationPopup}
          />
        </>
      ) : null}

      {children({ renderWidget })}
    </>
  );

  if (embedded) return content;

  return (
    <div className="dashboard-page min-h-screen flex flex-col text-pink-300 font-['Press_Start_2P'] py-4 px-2 md:px-3 overflow-x-hidden">
      {content}
    </div>
  );
}
