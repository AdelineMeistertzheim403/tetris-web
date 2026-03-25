import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApexTrustState } from "../../achievements/lib/tetrobotAchievementLogic";
import type { AchievementStats } from "../../achievements/types/achievementStats";
import {
  TETROBOT_DASHBOARD_AVATARS,
  TETROBOT_DASHBOARD_CHAT_GLOBAL_LINES,
  TETROBOT_DASHBOARD_CHAT_META,
  TETROBOT_DASHBOARD_CHAT_RARE_LINES,
  TETROBOT_DASHBOARD_LEVEL_COLORS,
  TETROBOT_IDS,
} from "../../tetrobots/data/tetrobotsContent";
import {
  type DashboardBot,
  type DashboardRelationEvent,
  getBotTip,
  getChatLinesForLevel,
  getDashboardRelationChoices,
  getDashboardRelationEvent,
  getDashboardRelationScene,
  getDashboardRelationSummary,
} from "../../tetrobots/logic/dashboardNarrative";
import {
  type DashboardAchievementProgress,
  getDashboardPlayerContext,
} from "../logic/dashboardOverview";
import type {
  DashboardActiveBotViewModel,
  DashboardChatLine,
  DashboardChatbotViewModel,
  DashboardRelationOverlayViewModel,
  DashboardTipViewModel,
} from "../logic/dashboardModels";

type UseDashboardTetrobotStateArgs = {
  achievementProgress: DashboardAchievementProgress;
  clearLastTetrobotLevelUp: () => void;
  recentUnlockCount: number;
  setLastTetrobotTip: (bot: DashboardBot, tip: string) => void;
  stats: AchievementStats;
  syncTetrobotProgression: () => void;
};

const DASHBOARD_CHAT_LAST_SEEN_KEY = "tetris-dashboard-last-seen-at";
const DASHBOARD_RELATION_POPUP_SEEN_KEY = "tetris-dashboard-relation-popup-seen-v1";
const DASHBOARD_BOT_ROTATION_MS = 60_000;
const DASHBOARD_RELATION_POPUP_DURATION_MS = 6_500;
const DASHBOARD_RECENT_EVENT_WINDOW_MS = 1000 * 60 * 60 * 24;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function useDashboardTetrobotState({
  achievementProgress,
  clearLastTetrobotLevelUp,
  recentUnlockCount,
  setLastTetrobotTip,
  stats,
  syncTetrobotProgression,
}: UseDashboardTetrobotStateArgs) {
  const [chatLine, setChatLine] = useState<DashboardChatLine>({
    bot: "rookie",
    text: "Initialisation du flux Tétrobots...",
  });
  const [relationPopup, setRelationPopup] = useState<DashboardRelationEvent | null>(null);
  const [tetrobotTip, setTetrobotTip] = useState(() =>
    getBotTip("rookie", 1, "neutral", {
      favoriteMode: "ton mode prefere",
      lastPlayedMode: "mode classique",
    })
  );
  const chatTimerRef = useRef<number | null>(null);
  const inactiveRef = useRef(false);
  const levelUpDismissTimerRef = useRef<number | null>(null);
  const relationPopupTimerRef = useRef<number | null>(null);

  const rookieLevel = stats.tetrobotProgression.rookie.level;
  const pulseLevel = stats.tetrobotProgression.pulse.level;
  const apexLevel = stats.tetrobotProgression.apex.level;
  const playerContext = useMemo(() => {
    return getDashboardPlayerContext(stats, achievementProgress, recentUnlockCount);
  }, [achievementProgress, recentUnlockCount, stats]);
  const activeBotState = stats.tetrobotProgression[chatLine.bot];
  const activeRecommendation = stats.playerLongTermMemory.activeRecommendations[chatLine.bot];
  const rookieRecommendation = stats.playerLongTermMemory.activeRecommendations.rookie;
  const pulseRecommendation = stats.playerLongTermMemory.activeRecommendations.pulse;
  const apexRecommendation = stats.playerLongTermMemory.activeRecommendations.apex;
  const apexTrustState = getApexTrustState(
    stats.playerLongTermMemory,
    stats.tetrobotProgression.apex?.affinity ?? 0
  );
  const botAccentColor =
    TETROBOT_DASHBOARD_LEVEL_COLORS[chatLine.bot][activeBotState?.level ?? 1];
  const levelUpNotice = stats.lastTetrobotLevelUp;
  const botMood = activeBotState?.mood ?? "neutral";
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
  const relationScene = relationPopup
    ? getDashboardRelationScene(relationPopup, stats.playerLongTermMemory.activeExclusiveAlignment)
    : [];
  const relationChoices = relationPopup
    ? getDashboardRelationChoices(
        relationPopup,
        stats.lowestWinrateMode ?? undefined,
        stats.activeTetrobotChallenge,
        stats.playerLongTermMemory.activeConflict,
        stats.playerLongTermMemory.activeExclusiveAlignment
      )
    : [];
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

  useEffect(() => {
    const now = Date.now();
    const previous = Number(localStorage.getItem(DASHBOARD_CHAT_LAST_SEEN_KEY) ?? "0");
    inactiveRef.current = previous > 0 && now - previous > 1000 * 60 * 60 * 24 * 4;
    localStorage.setItem(DASHBOARD_CHAT_LAST_SEEN_KEY, String(now));
  }, []);

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
    const pickMetaLine = (): DashboardChatLine | null => {
      const versusLosses = Math.max(0, stats.versusMatches - stats.versusWins);
      const rvLosses = Math.max(
        0,
        stats.roguelikeVersusMatches - stats.roguelikeVersusWins
      );
      const botLosses = Math.max(0, stats.botMatches - stats.botWins);
      const totalWins =
        stats.versusWins +
        stats.roguelikeVersusWins +
        stats.botWins +
        stats.brickfallWins +
        stats.tetromazeWins;
      const totalLosses = versusLosses + rvLosses + botLosses;

      const metaChance = Math.random();
      if (inactiveRef.current && metaChance < 0.35) {
        const bot = pickRandom(TETROBOT_IDS);
        return { bot, text: TETROBOT_DASHBOARD_CHAT_META.inactive[bot] };
      }
      if (totalLosses >= Math.max(5, totalWins * 1.3) && metaChance < 0.35) {
        const bot = pickRandom(TETROBOT_IDS);
        return { bot, text: TETROBOT_DASHBOARD_CHAT_META.lowPerformance[bot] };
      }
      if (totalWins >= Math.max(8, totalLosses * 1.4) && metaChance < 0.35) {
        const bot = pickRandom(TETROBOT_IDS);
        return { bot, text: TETROBOT_DASHBOARD_CHAT_META.highPerformance[bot] };
      }
      return null;
    };

    const generateLine = (): DashboardChatLine => {
      if (Math.random() < 0.01) {
        const bot = pickRandom(TETROBOT_IDS);
        return { bot, text: pickRandom(TETROBOT_DASHBOARD_CHAT_RARE_LINES) };
      }

      const meta = pickMetaLine();
      if (meta) return meta;

      if (Math.random() < 0.22) {
        const bot = pickRandom(TETROBOT_IDS);
        return { bot, text: pickRandom(TETROBOT_DASHBOARD_CHAT_GLOBAL_LINES) };
      }

      const bot = pickRandom(TETROBOT_IDS);
      const level =
        bot === "rookie" ? rookieLevel : bot === "pulse" ? pulseLevel : apexLevel;
      return { bot, text: pickRandom(getChatLinesForLevel(bot, level)) };
    };

    const scheduleNext = () => {
      if (chatTimerRef.current) {
        window.clearTimeout(chatTimerRef.current);
      }
      chatTimerRef.current = window.setTimeout(() => {
        setChatLine(generateLine());
        scheduleNext();
      }, DASHBOARD_BOT_ROTATION_MS);
    };

    setChatLine(generateLine());
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
    pulseLevel,
    rookieLevel,
    stats.roguelikeVersusMatches,
    stats.roguelikeVersusWins,
    stats.tetromazeWins,
    stats.versusMatches,
    stats.versusWins,
  ]);

  useEffect(() => {
    const level = activeBotState?.level ?? 1;
    const mood = activeBotState?.mood ?? "neutral";
    const nextTip =
      chatLine.bot === "apex" && apexTrustState === "refusing"
        ? "Non. Tu veux des conseils, mais tu refuses encore d'affronter ce qu'il faut travailler."
        : getBotTip(chatLine.bot, level, mood, {
            ...playerContext,
            recommendation: activeRecommendation,
            rookieRecommendation,
            pulseRecommendation,
            apexRecommendation,
          });
    setLastTetrobotTip(chatLine.bot, nextTip);
    setTetrobotTip(nextTip);
  }, [
    activeBotState,
    activeRecommendation,
    apexRecommendation,
    apexTrustState,
    chatLine.bot,
    chatLine.text,
    playerContext,
    pulseRecommendation,
    rookieRecommendation,
    setLastTetrobotTip,
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
    };
  }, [activeBot, canReopenLatestEvent, chatLine, relationEvent, relationSummary]);

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
    chatbot,
    closeRelationPopup,
    openLatestRelationPopup,
    relationOverlay,
    tip,
  };
}
