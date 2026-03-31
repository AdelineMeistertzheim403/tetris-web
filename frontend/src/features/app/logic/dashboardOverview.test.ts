import { beforeEach, describe, expect, it } from "vitest";
import type { AchievementStats } from "../../achievements/types/achievementStats";
import { TOTAL_GAME_MODES } from "../../game/types/GameMode";
import { PATHS } from "../../../routes/paths";
import {
  getDashboardAchievementFocus,
  getDashboardAchievementProgress,
  getDashboardPlayerContext,
  getDashboardQuickResume,
  getDashboardRecentActivity,
  readDashboardCampaignProgress,
} from "./dashboardOverview";

function createBehaviorByMode() {
  return {
    CLASSIQUE: { sessions: 6, wins: 2, losses: 4, totalDurationMs: 720_000, lastPlayedAt: null },
    SPRINT: { sessions: 2, wins: 1, losses: 1, totalDurationMs: 180_000, lastPlayedAt: null },
    VERSUS: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    BRICKFALL_SOLO: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    ROGUELIKE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    ROGUELIKE_VERSUS: {
      sessions: 0,
      wins: 0,
      losses: 0,
      totalDurationMs: 0,
      lastPlayedAt: null,
    },
    PUZZLE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    TETROMAZE: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    PIXEL_INVASION: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
    PIXEL_PROTOCOL: { sessions: 0, wins: 0, losses: 0, totalDurationMs: 0, lastPlayedAt: null },
  };
}

function createMistakeStats(overrides: Partial<Record<string, number>> = {}) {
  return {
    holes: 0,
    top_out: 0,
    slow: 0,
    unsafe_stack: 0,
    damage_taken: 0,
    misread: 0,
    panic_stack: 0,
    slow_decision: 0,
    greedy_play: 0,
    mode_avoidance: 0,
    inconsistent_precision: 0,
    ...overrides,
  };
}

function createStats(): AchievementStats {
  return {
    runsPlayed: 5,
    hardDropCount: 90,
    modesVisited: {
      CLASSIQUE: true,
      SPRINT: true,
      VERSUS: false,
      BRICKFALL_SOLO: false,
      ROGUELIKE: false,
      ROGUELIKE_VERSUS: false,
      PUZZLE: false,
      TETROMAZE: false,
      PIXEL_INVASION: false,
    },
    playerBehaviorByMode: createBehaviorByMode(),
    playerMistakesByMode: {
      CLASSIQUE: createMistakeStats(),
      SPRINT: createMistakeStats({ holes: 3, top_out: 1, slow_decision: 2 }),
      VERSUS: createMistakeStats(),
      BRICKFALL_SOLO: createMistakeStats(),
      ROGUELIKE: createMistakeStats(),
      ROGUELIKE_VERSUS: createMistakeStats(),
      PUZZLE: createMistakeStats(),
      TETROMAZE: createMistakeStats(),
      PIXEL_INVASION: createMistakeStats(),
      PIXEL_PROTOCOL: createMistakeStats(),
    },
    lastPlayedMode: "SPRINT",
    mostPlayedMode: "CLASSIQUE",
    lowestWinrateMode: "VERSUS",
    tetromazeWins: 2,
    playerLongTermMemory: {
      weakestModeFocus: null,
      regularityScore: 44,
      strategyScore: 61,
      disciplineScore: 27,
      lingeringResentment: {
        rookie: 1,
        pulse: 0,
        apex: 3,
      },
      activeConflict: {
        id: "conflict-1",
        bots: ["rookie", "apex"],
        chosenBot: null,
        reason: "alignment",
        summary: "Apex conteste la trajectoire actuelle.",
        createdAt: 1,
        resolvedAt: null,
      },
      activeExclusiveAlignment: {
        favoredBot: "apex",
        blockedBot: "rookie",
        objective: "win_sessions",
        objectiveTarget: 3,
        objectiveProgress: 1,
        favoredLine: "Prouve ta constance.",
        lockedAdvice: ["Rookie se tait pour l'instant."],
        createdAt: 1,
        rewardClaimed: false,
      },
    },
  } as unknown as AchievementStats;
}

describe("dashboardOverview", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("lit la progression campagne depuis le storage avec fallback robuste", () => {
    localStorage.setItem("brickfall-solo-campaign-progress-v1", "4");
    localStorage.setItem(
      "tetromaze-campaign-progress-v1",
      JSON.stringify({ currentLevel: 3.7, highestLevel: 8.2 })
    );
    localStorage.setItem("pixel-protocol-progress-v1", "{invalid");

    expect(readDashboardCampaignProgress()).toEqual({
      brickfallLevel: 4,
      tetromaze: {
        currentLevel: 3,
        highestLevel: 8,
      },
      pixelProtocol: {
        currentLevel: 1,
        highestLevel: 1,
      },
    });
  });

  it("affiche tous les modes visites quand le succes Curieux est deja debloque", () => {
    const progress = getDashboardAchievementProgress(
      [
        { id: "global-curious", unlocked: true },
        { id: "other", unlocked: false },
      ],
      createStats().modesVisited
    );

    expect(progress).toEqual({
      curiousUnlocked: true,
      displayedVisitedModes: TOTAL_GAME_MODES,
      totalAchievements: 2,
      unlockedCount: 1,
    });
  });

  it("derive le contexte joueur pour le dashboard", () => {
    const stats = createStats();
    const context = getDashboardPlayerContext(
      stats,
      { totalAchievements: 10, unlockedCount: 2 },
      0
    );

    expect(context.favoriteMode).toBe("Classique");
    expect(context.weakestMode).toBe("Versus");
    expect(context.lastPlayedMode).toBe("Sprint");
    expect(context.winRate).toBe(38);
    expect(context.avgSpeed).toBe(18);
    expect(context.sessionDuration).toBe(2);
    expect(context.mistakes).toEqual(["holes", "slow_decision"]);
    expect(context.stagnation).toBe(true);
    expect(context.activeConflictSummary).toBe("Apex conteste la trajectoire actuelle.");
    expect(context.activeExclusiveAlignment?.favoredBot).toBe("apex");
  });

  it("choisit le bon raccourci de reprise selon la progression la plus avancee", () => {
    expect(
      getDashboardQuickResume({
        brickfallLevel: 2,
        tetromaze: { currentLevel: 4, highestLevel: 6 },
        pixelProtocol: { currentLevel: 7, highestLevel: 9 },
      })
    ).toEqual({
      title: "Pixel Protocol",
      detail: "Checkpoint campagne: niveau 7",
      primaryPath: `${PATHS.pixelProtocolPlay}?level=7`,
      secondaryPath: PATHS.pixelProtocolHub,
      primaryLabel: "Reprendre",
      secondaryLabel: "Voir le hub",
    });

    expect(
      getDashboardQuickResume({
        brickfallLevel: 3,
        tetromaze: { currentLevel: 1, highestLevel: 3 },
        pixelProtocol: { currentLevel: 1, highestLevel: 1 },
      }).title
    ).toBe("Brickfall Solo");
  });

  it("construit les cartes de focus et d'activite avec les bonnes variations de texte", () => {
    expect(
      getDashboardAchievementFocus(
        {
          curiousUnlocked: false,
          displayedVisitedModes: 3,
          totalAchievements: 12,
          unlockedCount: 7,
        },
        1
      )
    ).toEqual([
      {
        label: "Modes visites",
        value: `3/${TOTAL_GAME_MODES}`,
        hint: "Continue d'explorer les hubs.",
      },
      {
        label: "Succes debloques",
        value: "7/12",
        hint: "Tu approches du 100%.",
      },
      {
        label: "Tetromaze",
        value: "1 victoire",
        hint: "Continue a augmenter tes escapes.",
      },
    ]);

    expect(
      getDashboardRecentActivity({
        brickfallBestWorld: 0,
        pixelProtocolLevel: 5,
        recentUnlockName: "Architecte",
        tetromazeEscapesTotal: 2,
        unlockedCount: 9,
      })
    ).toEqual([
      "Succes recent: Architecte",
      "Brickfall Solo: monde 1 atteint",
      "Tetromaze: 2 esquives reussies",
      "Pixel Protocol: checkpoint niveau 5",
    ]);
  });
});
