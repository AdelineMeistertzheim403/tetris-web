import { useAuth } from "../../auth/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import {
  useAchievements,
} from "../../achievements/hooks/useAchievements";
import {
  DASHBOARD_COMMUNITY_SHORTCUTS,
  DASHBOARD_EDITOR_SHORTCUTS,
  DASHBOARD_MODE_CARDS,
  getDashboardAchievementFocus,
  getDashboardAchievementProgress,
  getDashboardQuickResume,
  getDashboardRecentActivity,
  readDashboardCampaignProgress,
} from "../logic/dashboardOverview";
import { DashboardChatbotPanel } from "../components/dashboard/DashboardChatbotPanel";
import {
  DashboardActivityPanel,
  DashboardFocusPanel,
  DashboardModesPanel,
  DashboardProgressPanel,
  DashboardResumePanel,
  DashboardShortcutPanel,
} from "../components/dashboard/DashboardOverviewPanels";
import { DashboardRelationPopup } from "../components/dashboard/DashboardRelationPopup";
import { DashboardTipPanel } from "../components/dashboard/DashboardTipPanel";
import { useDashboardNavigation } from "../hooks/useDashboardNavigation";
import { useDashboardTetrobotState } from "../hooks/useDashboardTetrobotState";
import TetrobotFinaleOverlay from "../../tetrobots/components/TetrobotFinaleOverlay";
import { getTetrobotFinaleState } from "../../tetrobots/logic/tetrobotAnomalies";
import "../../../styles/dashboard.scss";

export default function Dashboard() {
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
  const campaignProgress = useMemo(
    () => readDashboardCampaignProgress(),
    []
  );
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
    if (finaleState.canTrigger) {
      setFinaleOpen(true);
    }
  }, [finaleState.canTrigger]);

  return (
    <div className="min-h-screen flex flex-col text-pink-300 font-['Press_Start_2P'] py-4 px-2 md:px-3 overflow-x-hidden">
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
      <div className="dashboard-top-row">
        <DashboardChatbotPanel
          chatbot={chatbot}
          actions={{
            ...chatbotActions,
            analyzeAnomaly: analyzeCurrentLine,
          }}
          userPseudo={user?.pseudo}
        />

        <DashboardTipPanel tip={tip} />

        <DashboardResumePanel
          quickResume={quickResume}
          onOpenPath={openPath}
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col">
          <DashboardModesPanel
            modeCards={DASHBOARD_MODE_CARDS}
            onOpenMode={openPath}
          />
          <DashboardFocusPanel achievementFocus={achievementFocus} />
          <DashboardProgressPanel campaignProgress={campaignProgress} />
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <DashboardActivityPanel recentActivity={recentActivity} />
        <DashboardShortcutPanel
          eyebrow="Creer"
          title="Raccourcis editeurs"
          panelClassName="dashboard-panel dashboard-panel--create"
          shortcuts={DASHBOARD_EDITOR_SHORTCUTS}
          onOpenShortcut={openPath}
        />
        <DashboardShortcutPanel
          eyebrow="Communaute"
          title="Explorer les niveaux joueurs"
          panelClassName="dashboard-panel dashboard-panel--community"
          shortcuts={DASHBOARD_COMMUNITY_SHORTCUTS}
          onOpenShortcut={openPath}
        />
      </div>
    </div>
  );
}
