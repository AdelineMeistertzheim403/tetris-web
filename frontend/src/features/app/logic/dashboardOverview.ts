import type { AchievementStats } from "../../achievements/types/achievementStats";
import { TOTAL_GAME_MODES } from "../../game/types/GameMode";
import { TETROBOT_MODE_LABELS } from "../../tetrobots/data/tetrobotsContent";
import {
  type DashboardPlayerContext,
  safeWinRate,
} from "../../tetrobots/logic/dashboardNarrative";
import { PATHS } from "../../../routes/paths";

type DashboardAchievementState = {
  id: string;
  unlocked: boolean;
};

export type DashboardModeCard = {
  title: string;
  desc: string;
  path: string;
  accent: string;
  image: string;
  variant: "tetris" | "brickfall" | "tetroverse";
};

export type DashboardActionIconName =
  | "resume"
  | "hub"
  | "editor"
  | "gallery"
  | "relation"
  | "message"
  | "help";

export type DashboardShortcut = {
  label: string;
  tooltip: string;
  icon: DashboardActionIconName;
  path: string;
};

type DashboardCampaignCheckpoint = {
  highestLevel: number;
  currentLevel: number;
};

export type DashboardCampaignProgress = {
  brickfallLevel: number;
  tetromaze: DashboardCampaignCheckpoint;
  pixelProtocol: DashboardCampaignCheckpoint;
};

export type DashboardQuickResume = {
  title: string;
  detail: string;
  primaryPath: string;
  secondaryPath: string;
  primaryLabel: string;
  secondaryLabel: string;
};

export type DashboardFocusItem = {
  label: string;
  value: string;
  hint: string;
};

export type DashboardAchievementProgress = {
  curiousUnlocked: boolean;
  displayedVisitedModes: number;
  totalAchievements: number;
  unlockedCount: number;
};

type DashboardRecentActivityArgs = {
  brickfallBestWorld: number;
  pixelProtocolLevel: number;
  recentUnlockName?: string;
  tetromazeEscapesTotal: number;
  unlockedCount: number;
};

const DEFAULT_CAMPAIGN_CHECKPOINT: DashboardCampaignCheckpoint = {
  highestLevel: 1,
  currentLevel: 1,
};

export const DASHBOARD_MODE_CARDS: DashboardModeCard[] = [
  {
    title: "Mode Tetris",
    desc: "Classique, sprint, roguelike, puzzle et versus.",
    path: PATHS.tetrisHub,
    accent: "from-[#130018] to-[#2b0a45]",
    image: "/Game_Mode/tetris.png",
    variant: "tetris",
  },
  {
    title: "Brickfall Solo",
    desc: "Casse-brique solo a progression.",
    path: PATHS.brickfallSolo,
    accent: "from-[#00121a] to-[#00314a]",
    image: "/Game_Mode/brickfall_solo.png",
    variant: "brickfall",
  },
  {
    title: "Tetro-Verse",
    desc: "Tetromaze, Pixel Protocol et Pixel Invasion dans un hub dedie.",
    path: PATHS.tetroVerse,
    accent: "from-[#0a1028] to-[#21457a]",
    image: "/Game_Mode/tetroverse.png",
    variant: "tetroverse",
  },
];

export const DASHBOARD_EDITOR_SHORTCUTS: DashboardShortcut[] = [
  {
    label: "Editeur Brickfall Solo",
    tooltip: "Ouvrir l'editeur de niveaux Brickfall Solo.",
    icon: "editor",
    path: PATHS.brickfallEditor,
  },
  {
    label: "Editeur Tetromaze",
    tooltip: "Ouvrir l'editeur de niveaux Tetromaze.",
    icon: "editor",
    path: PATHS.tetromazeEditor,
  },
  {
    label: "Editeur Pixel Protocol",
    tooltip: "Ouvrir l'editeur de niveaux Pixel Protocol.",
    icon: "editor",
    path: PATHS.pixelProtocolEditor,
  },
];

export const DASHBOARD_COMMUNITY_SHORTCUTS: DashboardShortcut[] = [
  {
    label: "Galerie Brickfall Solo",
    tooltip: "Explorer les niveaux publies par la communaute Brickfall Solo.",
    icon: "gallery",
    path: PATHS.brickfallSoloCommunity,
  },
  {
    label: "Galerie Tetromaze",
    tooltip: "Explorer les niveaux publies par la communaute Tetromaze.",
    icon: "gallery",
    path: PATHS.tetromazeCommunity,
  },
  {
    label: "Galerie Pixel Protocol",
    tooltip: "Explorer les niveaux publies par la communaute Pixel Protocol.",
    icon: "gallery",
    path: PATHS.pixelProtocolCommunity,
  },
];

function readStoredLevel(key: string, fallback = 1) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = Number.parseInt(raw ?? String(fallback), 10);
    return Number.isFinite(parsed) ? Math.max(1, parsed) : fallback;
  } catch {
    return fallback;
  }
}

function readStoredCheckpoint(key: string): DashboardCampaignCheckpoint {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_CAMPAIGN_CHECKPOINT;

    const parsed = JSON.parse(raw) as {
      currentLevel?: number;
      highestLevel?: number;
    };

    return {
      highestLevel: Math.max(1, Math.floor(parsed.highestLevel ?? 1)),
      currentLevel: Math.max(1, Math.floor(parsed.currentLevel ?? 1)),
    };
  } catch {
    return DEFAULT_CAMPAIGN_CHECKPOINT;
  }
}

export function readDashboardCampaignProgress(): DashboardCampaignProgress {
  return {
    brickfallLevel: readStoredLevel("brickfall-solo-campaign-progress-v1"),
    tetromaze: readStoredCheckpoint("tetromaze-campaign-progress-v1"),
    pixelProtocol: readStoredCheckpoint("pixel-protocol-progress-v1"),
  };
}

export function getDashboardAchievementProgress(
  achievements: DashboardAchievementState[],
  modesVisited: AchievementStats["modesVisited"]
): DashboardAchievementProgress {
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const curiousUnlocked = achievements.some(
    (achievement) => achievement.id === "global-curious" && achievement.unlocked
  );
  const visitedModes = Object.values(modesVisited).filter(Boolean).length;

  return {
    curiousUnlocked,
    displayedVisitedModes: curiousUnlocked ? TOTAL_GAME_MODES : visitedModes,
    totalAchievements: achievements.length,
    unlockedCount,
  };
}

export function getDashboardPlayerContext(
  stats: AchievementStats,
  achievementProgress: Pick<DashboardAchievementProgress, "totalAchievements" | "unlockedCount">,
  recentUnlockCount: number
): DashboardPlayerContext {
  const behaviorModes = Object.entries(stats.playerBehaviorByMode);
  const playedModes = behaviorModes.filter(([, value]) => value.sessions > 0);
  const totalSessions = playedModes.reduce((sum, [, value]) => sum + value.sessions, 0);
  const totalWins = playedModes.reduce((sum, [, value]) => sum + value.wins, 0);
  const totalDurationMs = playedModes.reduce((sum, [, value]) => sum + value.totalDurationMs, 0);
  const averageSessionMinutes =
    totalSessions > 0 ? Math.round(totalDurationMs / totalSessions / 60000) : undefined;
  const recentMistakes = stats.lastPlayedMode
    ? Object.entries(stats.playerMistakesByMode[stats.lastPlayedMode] ?? {})
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([key]) => key)
    : [];
  const stagnation =
    totalSessions >= 6 &&
    totalWins / Math.max(1, totalSessions) < 0.5 &&
    recentUnlockCount === 0 &&
    achievementProgress.unlockedCount < achievementProgress.totalAchievements;

  return {
    favoriteMode: stats.mostPlayedMode ? TETROBOT_MODE_LABELS[stats.mostPlayedMode] : undefined,
    weakestMode: stats.playerLongTermMemory.weakestModeFocus
      ? TETROBOT_MODE_LABELS[stats.playerLongTermMemory.weakestModeFocus] ??
        stats.playerLongTermMemory.weakestModeFocus
      : stats.lowestWinrateMode
        ? TETROBOT_MODE_LABELS[stats.lowestWinrateMode]
        : undefined,
    lastPlayedMode: stats.lastPlayedMode ? TETROBOT_MODE_LABELS[stats.lastPlayedMode] : undefined,
    winRate: safeWinRate(totalWins, totalSessions) ?? undefined,
    avgSpeed:
      stats.runsPlayed > 0
        ? Math.round(stats.hardDropCount / Math.max(1, stats.runsPlayed))
        : undefined,
    mistakes: recentMistakes,
    sessionDuration: averageSessionMinutes,
    stagnation,
    regularityScore: stats.playerLongTermMemory.regularityScore,
    strategyScore: stats.playerLongTermMemory.strategyScore,
    disciplineScore: stats.playerLongTermMemory.disciplineScore,
    lingeringResentment: stats.playerLongTermMemory.lingeringResentment,
    activeConflictSummary:
      stats.playerLongTermMemory.activeConflict?.resolvedAt === null
        ? stats.playerLongTermMemory.activeConflict.summary
        : null,
    activeExclusiveAlignment: stats.playerLongTermMemory.activeExclusiveAlignment,
  };
}

export function getDashboardQuickResume(
  progress: DashboardCampaignProgress
): DashboardQuickResume {
  if (progress.pixelProtocol.currentLevel > 1) {
    return {
      title: "Pixel Protocol",
      detail: `Checkpoint campagne: niveau ${progress.pixelProtocol.currentLevel}`,
      primaryPath: `${PATHS.pixelProtocolPlay}?level=${progress.pixelProtocol.currentLevel}`,
      secondaryPath: PATHS.pixelProtocolHub,
      primaryLabel: "Reprendre",
      secondaryLabel: "Voir le hub",
    };
  }

  if (progress.tetromaze.currentLevel > 1) {
    return {
      title: "Tetromaze",
      detail: `Checkpoint campagne: niveau ${progress.tetromaze.currentLevel}`,
      primaryPath: `${PATHS.tetromazePlay}?level=${progress.tetromaze.currentLevel}`,
      secondaryPath: PATHS.tetromazeHub,
      primaryLabel: "Reprendre",
      secondaryLabel: "Voir le hub",
    };
  }

  if (progress.brickfallLevel > 1) {
    return {
      title: "Brickfall Solo",
      detail: `Checkpoint campagne: niveau ${progress.brickfallLevel}`,
      primaryPath: `${PATHS.brickfallSoloPlay}?level=${progress.brickfallLevel}`,
      secondaryPath: PATHS.brickfallSolo,
      primaryLabel: "Reprendre",
      secondaryLabel: "Voir le hub",
    };
  }

  return {
    title: "Mode Tetris",
    detail: "Aucune progression recente detectee, repars sur le hub central.",
    primaryPath: PATHS.tetrisHub,
    secondaryPath: PATHS.tetrisHub,
    primaryLabel: "Ouvrir le hub",
    secondaryLabel: "Explorer les modes",
  };
}

export function getDashboardAchievementFocus(
  achievementProgress: DashboardAchievementProgress,
  tetromazeWins: number
): DashboardFocusItem[] {
  return [
    {
      label: "Modes visites",
      value: `${achievementProgress.displayedVisitedModes}/${TOTAL_GAME_MODES}`,
      hint: achievementProgress.curiousUnlocked
        ? "Tous les modes ont deja ete visites."
        : "Continue d'explorer les hubs.",
    },
    {
      label: "Succes debloques",
      value: `${achievementProgress.unlockedCount}/${achievementProgress.totalAchievements}`,
      hint:
        achievementProgress.unlockedCount >=
        Math.ceil(achievementProgress.totalAchievements / 2)
          ? "Tu approches du 100%."
          : "Encore de quoi debloquer pas mal de succes.",
    },
    {
      label: "Tetromaze",
      value: `${tetromazeWins} victoire${tetromazeWins > 1 ? "s" : ""}`,
      hint:
        tetromazeWins >= 1
          ? "Continue a augmenter tes escapes."
          : "Une premiere victoire debloquera du contenu de progression.",
    },
  ];
}

export function getDashboardRecentActivity({
  brickfallBestWorld,
  pixelProtocolLevel,
  recentUnlockName,
  tetromazeEscapesTotal,
  unlockedCount,
}: DashboardRecentActivityArgs) {
  return [
    recentUnlockName
      ? `Succes recent: ${recentUnlockName}`
      : `Succes debloques: ${unlockedCount}`,
    `Brickfall Solo: monde ${Math.max(1, brickfallBestWorld)} atteint`,
    `Tetromaze: ${tetromazeEscapesTotal} esquive${tetromazeEscapesTotal > 1 ? "s" : ""} reussie${tetromazeEscapesTotal > 1 ? "s" : ""}`,
    `Pixel Protocol: checkpoint niveau ${pixelProtocolLevel}`,
  ];
}
