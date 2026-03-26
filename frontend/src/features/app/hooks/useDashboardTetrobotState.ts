import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApexTrustState } from "../../achievements/lib/tetrobotAchievementLogic";
import type { AchievementStats } from "../../achievements/types/achievementStats";
import {
  TETROBOT_DASHBOARD_AVATARS,
  TETROBOT_DASHBOARD_LEVEL_COLORS,
  TETROBOT_IDS,
} from "../../tetrobots/data/tetrobotsContent";
import {
  type DashboardBot,
  type DashboardRelationEvent,
  getBotTip,
  getBotTipSelectionKey,
  getDashboardRelationChoices,
  getDashboardRelationEvent,
  getDashboardRelationScene,
  getDashboardRelationSummary,
} from "../../tetrobots/logic/dashboardNarrative";
import {
  type DashboardAchievementProgress,
  getDashboardPlayerContext,
} from "../logic/dashboardOverview";
import {
  DASHBOARD_BOT_ROTATION_MS,
  getDashboardChatRotationSlot,
  selectDashboardChatLine,
} from "../logic/dashboardChatLine";
import type {
  DashboardActiveBotViewModel,
  DashboardChatbotFeedback,
  DashboardChatLine,
  DashboardChatbotViewModel,
  DashboardRelationOverlayViewModel,
  DashboardTipViewModel,
} from "../logic/dashboardModels";
import {
  getTetrobotAnomalyProgress,
  getTetrobotFinaleState,
  isTetrobotAnomalyFound,
  TETROBOT_ANOMALY_SPEAKER_META,
} from "../../tetrobots/logic/tetrobotAnomalies";

type UseDashboardTetrobotStateArgs = {
  achievementProgress: DashboardAchievementProgress;
  clearLastTetrobotLevelUp: () => void;
  recentUnlockCount: number;
  recordTetrobotAnomaly: (anomalyId: string) => AchievementStats;
  setLastTetrobotTip: (bot: DashboardBot, tip: string) => void;
  stats: AchievementStats;
  syncTetrobotProgression: () => void;
};

const DASHBOARD_CHAT_LAST_SEEN_KEY = "tetris-dashboard-last-seen-at";
const DASHBOARD_RELATION_POPUP_SEEN_KEY = "tetris-dashboard-relation-popup-seen-v1";
const DASHBOARD_RELATION_POPUP_DURATION_MS = 6_500;
const DASHBOARD_RECENT_EVENT_WINDOW_MS = 1000 * 60 * 60 * 24;

export function useDashboardTetrobotState({
  achievementProgress,
  clearLastTetrobotLevelUp,
  recentUnlockCount,
  recordTetrobotAnomaly,
  setLastTetrobotTip,
  stats,
  syncTetrobotProgression,
}: UseDashboardTetrobotStateArgs) {
  const [chatLine, setChatLine] = useState<DashboardChatLine>({
    bot: "rookie",
    speaker: "rookie",
    text: "Initialisation du flux Tetrobots...",
    anomaly: null,
  });
  const [relationPopup, setRelationPopup] = useState<DashboardRelationEvent | null>(null);
  const [tetrobotTip, setTetrobotTip] = useState(() =>
    getBotTip(
      "rookie",
      1,
      "neutral",
      {
        favoriteMode: "ton mode prefere",
        lastPlayedMode: "mode classique",
      },
      "boot:rookie:1:neutral"
    )
  );
  const [anomalyFeedback, setAnomalyFeedback] = useState<DashboardChatbotFeedback | null>(null);
  const chatTimerRef = useRef<number | null>(null);
  const inactiveRef = useRef(false);
  const hasInitializedChatRef = useRef(false);
  const levelUpDismissTimerRef = useRef<number | null>(null);
  const relationPopupTimerRef = useRef<number | null>(null);
  const anomalyCountersRef = useRef(stats.counters);
  const tipComputationRef = useRef<{ key: string; tip: string } | null>(null);

  const rookieLevel = stats.tetrobotProgression.rookie.level;
  const pulseLevel = stats.tetrobotProgression.pulse.level;
  const apexLevel = stats.tetrobotProgression.apex.level;
  const playerContext = useMemo(() => {
    return getDashboardPlayerContext(stats, achievementProgress, recentUnlockCount);
  }, [
    achievementProgress.totalAchievements,
    achievementProgress.unlockedCount,
    recentUnlockCount,
    stats.hardDropCount,
    stats.lastPlayedMode,
    stats.lowestWinrateMode,
    stats.mostPlayedMode,
    stats.playerBehaviorByMode,
    stats.playerLongTermMemory.activeConflict,
    stats.playerLongTermMemory.activeExclusiveAlignment,
    stats.playerLongTermMemory.disciplineScore,
    stats.playerLongTermMemory.lingeringResentment,
    stats.playerLongTermMemory.regularityScore,
    stats.playerLongTermMemory.strategyScore,
    stats.playerLongTermMemory.weakestModeFocus,
    stats.playerMistakesByMode,
    stats.runsPlayed,
  ]);
  const activeBotState = stats.tetrobotProgression[chatLine.bot];
  const activeBotLevel = activeBotState?.level ?? 1;
  const activeBotMood = activeBotState?.mood ?? "neutral";
  const activeBotLastTip = activeBotState?.lastTip ?? "";
  const activeRecommendation = stats.playerLongTermMemory.activeRecommendations[chatLine.bot];
  const rookieRecommendation = stats.playerLongTermMemory.activeRecommendations.rookie;
  const pulseRecommendation = stats.playerLongTermMemory.activeRecommendations.pulse;
  const apexRecommendation = stats.playerLongTermMemory.activeRecommendations.apex;
  const apexTrustState = getApexTrustState(
    stats.playerLongTermMemory,
    stats.tetrobotProgression.apex?.affinity ?? 0
  );
  const botAccentColor =
    TETROBOT_DASHBOARD_LEVEL_COLORS[chatLine.bot][activeBotLevel];
  const levelUpNotice = stats.lastTetrobotLevelUp;
  const botMood = activeBotMood;
  const botAffinity = activeBotState?.affinity ?? 0;
  const botAvatar = TETROBOT_DASHBOARD_AVATARS[chatLine.bot][botMood];
  const activeBotMemories = stats.tetrobotMemories[chatLine.bot] ?? [];
  const relationSummary = getDashboardRelationSummary(
    chatLine.bot,
    botMood,
    botAffinity,
    apexTrustState
  );
  const relationEvent = getDashboardRelationEvent(
    chatLine.bot,
    activeBotMemories,
    levelUpNotice,
    stats.playerLongTermMemory.activeConflict,
    stats.playerLongTermMemory.activeExclusiveAlignment
  );
  const relationScene = useMemo(
    () =>
      relationPopup
        ? getDashboardRelationScene(
            relationPopup,
            stats.playerLongTermMemory.activeExclusiveAlignment
          )
        : [],
    [relationPopup, stats.playerLongTermMemory.activeExclusiveAlignment]
  );
  const relationChoices = useMemo(
    () =>
      relationPopup
        ? getDashboardRelationChoices(
            relationPopup,
            stats.lowestWinrateMode ?? undefined,
            stats.activeTetrobotChallenge,
            stats.playerLongTermMemory.activeConflict,
            stats.playerLongTermMemory.activeExclusiveAlignment
          )
        : [],
    [
      relationPopup,
      stats.activeTetrobotChallenge,
      stats.lowestWinrateMode,
      stats.playerLongTermMemory.activeConflict,
      stats.playerLongTermMemory.activeExclusiveAlignment,
    ]
  );
  const latestRelationEvent = useMemo(() => {
    return TETROBOT_IDS
      .map((bot) =>
        getDashboardRelationEvent(
          bot,
          stats.tetrobotMemories[bot] ?? [],
          stats.lastTetrobotLevelUp?.bot === bot ? stats.lastTetrobotLevelUp : null,
          stats.playerLongTermMemory.activeConflict,
          stats.playerLongTermMemory.activeExclusiveAlignment
        )
      )
      .filter((event): event is DashboardRelationEvent => Boolean(event))
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  }, [
    stats.lastTetrobotLevelUp,
    stats.playerLongTermMemory.activeConflict,
    stats.playerLongTermMemory.activeExclusiveAlignment,
    stats.tetrobotMemories,
  ]);
  const canReopenLatestEvent = Boolean(
    latestRelationEvent &&
      Date.now() - latestRelationEvent.createdAt <= DASHBOARD_RECENT_EVENT_WINDOW_MS
  );
  const anomalyProgress = useMemo(
    () => getTetrobotAnomalyProgress(stats.counters),
    [stats.counters]
  );
  const finaleState = useMemo(() => getTetrobotFinaleState(stats.counters), [stats.counters]);
  const tipContextKey = useMemo(
    () =>
      JSON.stringify({
        apexTrustState,
        selectionKey: getBotTipSelectionKey(chatLine.bot, activeBotLevel, activeBotMood, {
          ...playerContext,
          recommendation: activeRecommendation,
          rookieRecommendation,
          pulseRecommendation,
          apexRecommendation,
        }),
      }),
    [
      activeBotLevel,
      activeBotMood,
      activeRecommendation,
      apexRecommendation,
      apexTrustState,
      chatLine.bot,
      playerContext,
      pulseRecommendation,
      rookieRecommendation,
    ]
  );
  const computedTip = useMemo(() => {
    if (tipComputationRef.current?.key === tipContextKey) {
      return tipComputationRef.current.tip;
    }

    const nextTip =
      chatLine.bot === "apex" && apexTrustState === "refusing"
        ? "Non. Tu veux des conseils, mais tu refuses encore d'affronter ce qu'il faut travailler."
        : getBotTip(
            chatLine.bot,
            activeBotLevel,
            activeBotMood,
            {
              ...playerContext,
              recommendation: activeRecommendation,
              rookieRecommendation,
              pulseRecommendation,
              apexRecommendation,
            },
            tipContextKey
          );

    tipComputationRef.current = {
      key: tipContextKey,
      tip: nextTip,
    };

    return nextTip;
  }, [
    activeBotLevel,
    activeBotMood,
    activeRecommendation,
    apexRecommendation,
    apexTrustState,
    chatLine.bot,
    playerContext,
    pulseRecommendation,
    rookieRecommendation,
    tipContextKey,
  ]);
  const activeBot = useMemo<DashboardActiveBotViewModel>(() => {
    return {
      bot: chatLine.bot,
      state: activeBotState,
      accentColor: botAccentColor,
      affinity: botAffinity,
      mood: botMood,
      avatar: botAvatar,
    };
  }, [activeBotState, botAccentColor, botAffinity, botAvatar, botMood, chatLine.bot]);
  const speaker = useMemo(() => {
    if (chatLine.speaker === "pixel") {
      const pixel = TETROBOT_ANOMALY_SPEAKER_META.pixel;
      return {
        id: "pixel" as const,
        label: pixel.label,
        accent: pixel.accent,
        avatar: pixel.avatar,
        fallbackAvatar: pixel.fallbackAvatar,
        showRelationData: false,
      };
    }

    const meta = TETROBOT_ANOMALY_SPEAKER_META[chatLine.speaker];
    return {
      id: chatLine.speaker,
      label: meta.label,
      accent: activeBot.accentColor,
      avatar: activeBot.avatar,
      fallbackAvatar: meta.fallbackAvatar,
      showRelationData: true,
    };
  }, [activeBot.accentColor, activeBot.avatar, chatLine.speaker]);

  const closeRelationPopup = useCallback(() => {
    setRelationPopup(null);
    if (relationPopupTimerRef.current) {
      window.clearTimeout(relationPopupTimerRef.current);
      relationPopupTimerRef.current = null;
    }
  }, []);

  const openRelationPopup = useCallback((event: DashboardRelationEvent) => {
    setRelationPopup(event);
    if (relationPopupTimerRef.current) {
      window.clearTimeout(relationPopupTimerRef.current);
    }
    relationPopupTimerRef.current = window.setTimeout(() => {
      setRelationPopup(null);
      relationPopupTimerRef.current = null;
    }, DASHBOARD_RELATION_POPUP_DURATION_MS);
  }, []);

  const openLatestRelationPopup = useCallback(() => {
    if (latestRelationEvent) {
      openRelationPopup(latestRelationEvent);
    }
  }, [latestRelationEvent, openRelationPopup]);

  const analyzeCurrentLine = useCallback(() => {
    const anomaly = chatLine.anomaly;
    if (!anomaly) {
      setAnomalyFeedback({
        tone: "error",
        text: "Analyse incorrecte. Aucun fragment instable detecte sur cette ligne.",
      });
      return;
    }

    const alreadyFound = isTetrobotAnomalyFound(anomalyCountersRef.current, anomaly.id);
    if (!alreadyFound) {
      const next = recordTetrobotAnomaly(anomaly.id);
      anomalyCountersRef.current = next.counters;
    }

    setAnomalyFeedback({
      tone: alreadyFound ? "info" : "success",
      text: alreadyFound ? "Fragment deja archive dans le journal." : anomaly.foundMessage,
    });
  }, [chatLine.anomaly, recordTetrobotAnomaly]);

  useEffect(() => {
    const now = Date.now();
    const previous = Number(localStorage.getItem(DASHBOARD_CHAT_LAST_SEEN_KEY) ?? "0");
    inactiveRef.current = previous > 0 && now - previous > 1000 * 60 * 60 * 24 * 4;
    localStorage.setItem(DASHBOARD_CHAT_LAST_SEEN_KEY, String(now));
  }, []);

  useEffect(() => {
    anomalyCountersRef.current = stats.counters;
  }, [stats.counters]);

  useEffect(() => {
    syncTetrobotProgression();
  }, [
    syncTetrobotProgression,
    stats.botApexWins,
    stats.hardDropCount,
    stats.level10Modes,
    stats.modesVisited,
    stats.playerBehaviorByMode,
    stats.scoredModes,
    stats.tetromazeEscapesTotal,
  ]);

  useEffect(() => {
    const generateLine = (previousBot: DashboardBot): DashboardChatLine =>
      selectDashboardChatLine({
        apexLevel,
        botMatches: stats.botMatches,
        botWins: stats.botWins,
        brickfallWins: stats.brickfallWins,
        counters: anomalyCountersRef.current,
        finaleChoice: finaleState.choice,
        inactive: inactiveRef.current,
        previousBot,
        pulseLevel,
        roguelikeVersusMatches: stats.roguelikeVersusMatches,
        roguelikeVersusWins: stats.roguelikeVersusWins,
        rookieLevel,
        rotationSlot: getDashboardChatRotationSlot(),
        tetromazeWins: stats.tetromazeWins,
        versusMatches: stats.versusMatches,
        versusWins: stats.versusWins,
      });

    const scheduleNext = () => {
      if (chatTimerRef.current) {
        window.clearTimeout(chatTimerRef.current);
      }
      const nextRotationAt =
        (getDashboardChatRotationSlot() + 1) * DASHBOARD_BOT_ROTATION_MS - Date.now();
      chatTimerRef.current = window.setTimeout(() => {
        setChatLine((previous) => generateLine(previous.bot));
        scheduleNext();
      }, Math.max(250, nextRotationAt + 25));
    };

    if (!hasInitializedChatRef.current) {
      setChatLine((previous) => generateLine(previous.bot));
      hasInitializedChatRef.current = true;
    }
    scheduleNext();

    return () => {
      if (chatTimerRef.current) {
        window.clearTimeout(chatTimerRef.current);
        chatTimerRef.current = null;
      }
    };
  }, [
    stats.botMatches,
    stats.botWins,
    stats.brickfallWins,
    apexLevel,
    finaleState.choice,
    pulseLevel,
    rookieLevel,
    stats.roguelikeVersusMatches,
    stats.roguelikeVersusWins,
    stats.tetromazeWins,
    stats.versusMatches,
    stats.versusWins,
  ]);

  useEffect(() => {
    setAnomalyFeedback(null);
  }, [chatLine.anomaly, chatLine.speaker, chatLine.text]);

  useEffect(() => {
    if (tetrobotTip !== computedTip) {
      setTetrobotTip(computedTip);
    }
    if (activeBotLastTip !== computedTip) {
      setLastTetrobotTip(chatLine.bot, computedTip);
    }
  }, [
    activeBotLastTip,
    chatLine.bot,
    computedTip,
    setLastTetrobotTip,
    tetrobotTip,
  ]);

  useEffect(() => {
    if (!stats.lastTetrobotLevelUp) return;
    if (levelUpDismissTimerRef.current) {
      window.clearTimeout(levelUpDismissTimerRef.current);
    }
    levelUpDismissTimerRef.current = window.setTimeout(() => {
      clearLastTetrobotLevelUp();
      levelUpDismissTimerRef.current = null;
    }, 10000);
    return () => {
      if (levelUpDismissTimerRef.current) {
        window.clearTimeout(levelUpDismissTimerRef.current);
        levelUpDismissTimerRef.current = null;
      }
    };
  }, [clearLastTetrobotLevelUp, stats.lastTetrobotLevelUp]);

  useEffect(() => {
    return () => {
      if (relationPopupTimerRef.current) {
        window.clearTimeout(relationPopupTimerRef.current);
        relationPopupTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const latestEvent = latestRelationEvent;
    if (!latestEvent) return;
    if (Date.now() - latestEvent.createdAt > DASHBOARD_RECENT_EVENT_WINDOW_MS) return;

    try {
      const seenId = localStorage.getItem(DASHBOARD_RELATION_POPUP_SEEN_KEY);
      if (seenId === latestEvent.id) return;
      localStorage.setItem(DASHBOARD_RELATION_POPUP_SEEN_KEY, latestEvent.id);
    } catch {
      // no-op
    }

    openRelationPopup(latestEvent);
  }, [latestRelationEvent, openRelationPopup]);

  const chatbot = useMemo<DashboardChatbotViewModel>(() => {
    return {
      activeBot,
      chatLine,
      canReopenLatestEvent,
      relationEvent,
      relationSummary,
      speaker,
      anomalyFeedback,
      anomalyProgress,
      hasActiveAnomaly: Boolean(chatLine.anomaly),
    };
  }, [
    activeBot,
    anomalyFeedback,
    anomalyProgress,
    canReopenLatestEvent,
    chatLine,
    relationEvent,
    relationSummary,
    speaker,
  ]);

  const tip = useMemo<DashboardTipViewModel>(() => {
    return {
      activeBot,
      levelUpNotice,
      tetrobotTip,
    };
  }, [activeBot, levelUpNotice, tetrobotTip]);

  const relationOverlay = useMemo<DashboardRelationOverlayViewModel>(() => {
    return {
      popup: relationPopup,
      scene: relationScene,
      choices: relationChoices,
    };
  }, [relationChoices, relationPopup, relationScene]);

  return {
    activeBot,
    analyzeCurrentLine,
    chatbot,
    closeRelationPopup,
    openLatestRelationPopup,
    relationOverlay,
    tip,
  };
}
